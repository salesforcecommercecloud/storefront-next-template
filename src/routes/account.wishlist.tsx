/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { use, type ReactElement, useEffect, useRef, useMemo, useState, useCallback } from 'react';
import {
    useLoaderData,
    useFetcher,
    type LoaderFunctionArgs,
    type ClientLoaderFunctionArgs,
    type ShouldRevalidateFunctionArgs,
} from 'react-router';
import {
    type ShopperCustomers,
    type ShopperProducts,
    type ShopperSearch,
    ApiError,
} from '@salesforce/storefront-next-runtime/scapi';
import { Button } from '@/components/ui/button';
import { getAuth } from '@/middlewares/auth.client';
import { getAuth as getAuthServer } from '@/middlewares/auth.server';
import { createApiClients } from '@/lib/api-clients';
import { isRegisteredCustomer } from '@/lib/api/customer';
import { getConfig, useConfig } from '@/config';
import { convertProductToProductSearchHit } from '@/lib/product-conversion';
import { ProductTile } from '@/components/product-tile';
import { useToast } from '@/components/toast';
import PaginatedProductCarousel from '@/components/product-carousel/paginated-carousel';
import { useTranslation } from 'react-i18next';

type CustomerProductList = ShopperCustomers.schemas['CustomerProductList'];
type CustomerProductListItem = ShopperCustomers.schemas['CustomerProductListItem'];
type Product = ShopperProducts.schemas['Product'];
type ProductSearchHit = ShopperSearch.schemas['ProductSearchHit'];

/**
 * Fetch product details for wishlist items
 * The API has a limit based on productsPerPage config, so we batch requests if needed
 */
// eslint-disable-next-line react-refresh/only-export-components
export async function fetchProductsForWishlist(
    context: LoaderFunctionArgs['context'],
    items: CustomerProductListItem[],
    allItems?: CustomerProductListItem[]
): Promise<Record<string, Product>> {
    const productIds = items
        .map((item) => item.productId)
        .filter((id): id is string => Boolean(id) && typeof id === 'string' && id.trim().length > 0);

    if (!productIds.length) {
        return {};
    }

    const clients = createApiClients(context);
    const config = getConfig(context);
    const maxIdsPerRequest = config.global.productListing.productsPerPage;
    const productsByProductId: Record<string, Product> = {};

    // Initialize map with empty placeholder objects for ALL wishlist items if provided
    // This ensures the map has entries for all products, even unfetched ones
    // Empty objects have just the id field to track which products need fetching
    if (allItems) {
        allItems.forEach((item) => {
            if (item.productId) {
                productsByProductId[item.productId] = { id: item.productId } as Product;
            }
        });
    }

    // Batch requests if we have more than maxIdsPerRequest product IDs
    for (let i = 0; i < productIds.length; i += maxIdsPerRequest) {
        const batchIds = productIds.slice(i, i + maxIdsPerRequest);

        // Skip empty batches
        if (batchIds.length === 0) {
            continue;
        }

        try {
            const { data: productsResponse } = await clients.shopperProducts.getProducts({
                params: {
                    query: {
                        ids: batchIds,
                        allImages: true,
                        perPricebook: true,
                    },
                },
            });

            if (productsResponse.data) {
                productsResponse.data.forEach((product) => {
                    if (product.id) {
                        productsByProductId[product.id] = product;
                    }
                });
            }
        } catch (error) {
            // Log error but continue with other batches
            // eslint-disable-next-line no-console
            console.error(`Error fetching products batch (IDs: ${batchIds.join(', ')}):`, error);
            // Continue processing other batches even if one fails
        }
    }

    return productsByProductId;
}

/**
 * Server-side loader to fetch the customer's wishlist items and product details
 */
// eslint-disable-next-line custom/no-async-page-loader, react-refresh/only-export-components
export async function loader({ context }: LoaderFunctionArgs): Promise<{
    wishlist: CustomerProductList | null; // Type works at runtime despite linter schema warning
    items: CustomerProductListItem[];
    productsByProductId: Promise<Record<string, Product>>;
}> {
    const session = getAuthServer(context);

    // Check if user is authenticated as registered customer
    const isRegistered =
        session.userType === 'registered' &&
        session.customer_id &&
        session.access_token &&
        session.access_token_expiry &&
        session.access_token_expiry > Date.now();

    if (!isRegistered || !session.customer_id) {
        return {
            wishlist: null,
            items: [],
            productsByProductId: Promise.resolve({}),
        };
    }

    try {
        const customerId = session.customer_id;
        const clients = createApiClients(context);
        const config = getConfig(context);
        const initialLimit = config.global.paginatedProductCarousel.defaultLimit;

        // Get the customer's product lists
        const { data: productLists } = await clients.shopperCustomers.getCustomerProductLists({
            params: {
                path: { customerId },
            },
        });

        // Find the wishlist
        const wishlist = productLists?.data?.find((list) => list.type === 'wish_list');

        if (!wishlist) {
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        // Commerce SDK might return 'id' instead of 'listId' - use 'id' if 'listId' is not available
        // @ts-expect-error - listId and id may exist at runtime but are not in type definitions
        const listId = wishlist?.listId || wishlist?.id;
        if (!listId) {
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        // Always fetch the full wishlist to ensure we get ALL items
        // (getCustomerProductLists might only return a partial list)
        const { data: fullWishlistRaw } = await clients.shopperCustomers.getCustomerProductList({
            params: {
                path: {
                    customerId,
                    listId,
                },
            },
        });

        // Commerce SDK may return items in 'items' or 'customerProductListItems' field
        // Check both fields to ensure we get the items
        // @ts-expect-error - items and customerProductListItems may exist at runtime but are not in type definitions
        const items = fullWishlistRaw?.items || fullWishlistRaw?.customerProductListItems || [];

        // Only fetch product details for the initial batch to optimize initial load
        const initialItems = items.slice(0, initialLimit);

        return {
            wishlist: fullWishlistRaw,
            items,
            // Pass allItems to create placeholder entries for ALL products in the map
            productsByProductId: fetchProductsForWishlist(context, initialItems, items),
        };
    } catch (error) {
        // Handle authentication errors gracefully - wishlist requires authenticated registered customers
        // If auth fails, return empty wishlist (user will need to log in)
        let status_code: string | undefined;

        if (error instanceof ApiError) {
            status_code = String(error.status);
        }

        if (status_code === '401' || status_code === '403') {
            // Authentication required - return empty wishlist
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        // For other errors, also return empty wishlist
        return {
            wishlist: null,
            items: [],
            productsByProductId: Promise.resolve({}),
        };
    }
}

/**
 * Client-side loader to fetch the customer's wishlist items and product details
 */
// eslint-disable-next-line custom/no-async-page-loader,react-refresh/only-export-components,custom/no-client-loaders
export async function clientLoader({ context }: ClientLoaderFunctionArgs): Promise<{
    wishlist: CustomerProductList | null; // Type works at runtime despite linter schema warning
    items: CustomerProductListItem[];
    productsByProductId: Promise<Record<string, Product>>;
}> {
    // Check if user is authenticated as registered customer first
    if (!isRegisteredCustomer(context)) {
        return {
            wishlist: null,
            items: [],
            productsByProductId: Promise.resolve({}),
        };
    }

    const session = getAuth(context);
    if (!session.customer_id) {
        return {
            wishlist: null,
            items: [],
            productsByProductId: Promise.resolve({}),
        };
    }

    try {
        const customerId = session.customer_id;
        const clients = createApiClients(context);
        const config = getConfig(context);
        const initialLimit = config.global.paginatedProductCarousel.defaultLimit;

        // Get the customer's product lists
        const { data: productLists } = await clients.shopperCustomers.getCustomerProductLists({
            params: {
                path: { customerId },
            },
        });

        // Find the wishlist
        const wishlist = productLists?.data?.find((list) => list.type === 'wish_list');

        if (!wishlist) {
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        // Commerce SDK might return 'id' instead of 'listId' - use 'id' if 'listId' is not available
        // @ts-expect-error - listId and id may exist at runtime but are not in type definitions
        const listId = wishlist?.listId || wishlist?.id;
        if (!listId) {
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        // Always fetch the full wishlist to ensure we get ALL items
        // (getCustomerProductLists might only return a partial list)
        const { data: fullWishlistRaw } = await clients.shopperCustomers.getCustomerProductList({
            params: {
                path: {
                    customerId,
                    listId,
                },
            },
        });

        // Commerce SDK may return items in 'items' or 'customerProductListItems' field
        // Check both fields to ensure we get the items
        // @ts-expect-error - items and customerProductListItems may exist at runtime but are not in type definitions
        const items = fullWishlistRaw?.items || fullWishlistRaw?.customerProductListItems || [];

        // Only fetch product details for the initial batch to optimize initial load
        const initialItems = items.slice(0, initialLimit);

        return {
            wishlist: fullWishlistRaw,
            items,
            // Pass allItems to create placeholder entries for ALL products in the map
            productsByProductId: fetchProductsForWishlist(context, initialItems, items),
        };
    } catch (error) {
        // Handle authentication errors gracefully - wishlist requires authenticated registered customers
        // If auth fails, return empty wishlist (user will need to log in)
        let status_code: string | undefined;

        if (error instanceof ApiError) {
            status_code = String(error.status);
        }

        if (status_code === '401' || status_code === '403') {
            // Authentication required - return empty wishlist
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        // For other errors, also return empty wishlist
        return {
            wishlist: null,
            items: [],
            productsByProductId: Promise.resolve({}),
        };
    }
}

/**
 * Prevent automatic revalidation after wishlist actions
 * This allows us to manage the disabled state client-side without refetching
 */
// eslint-disable-next-line react-refresh/only-export-components
export function shouldRevalidate({ formAction, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
    // Don't revalidate after wishlist remove actions
    if (formAction === '/action/wishlist-remove') {
        return false;
    }
    // Use default behavior for everything else
    return defaultShouldRevalidate;
}

/**
 * Component for rendering a remove button in the ProductTile footer
 */
function WishlistRemoveButton({
    productId,
    isDisabled,
    onRemove,
}: {
    productId: string;
    isDisabled?: boolean;
    onRemove?: (productId: string) => void;
}) {
    const { t } = useTranslation('product');
    const removeFetcher = useFetcher();
    const { addToast } = useToast();
    const hasHandledResponse = useRef(false);

    const handleRemove = () => {
        if (removeFetcher.state !== 'idle' || !productId || isDisabled) return;

        void removeFetcher.submit(
            { productId },
            {
                method: 'POST',
                action: '/action/wishlist-remove',
            }
        );
    };

    // Handle remove response - wait for success before disabling
    useEffect(() => {
        if (removeFetcher.state === 'idle' && removeFetcher.data && !hasHandledResponse.current) {
            const result = removeFetcher.data as { success: boolean; error?: string } | undefined;
            if (result?.success) {
                hasHandledResponse.current = true;
                addToast(t('removedFromWishlist'), 'success');
                // Notify parent to mark product as disabled
                if (onRemove) {
                    onRemove(productId);
                }
            } else if (result?.success === false || result?.error) {
                hasHandledResponse.current = true;
                addToast(result.error || t('failedToRemoveFromWishlist'), 'error');
            }
        }

        // Reset flag when fetcher starts a new request
        if (removeFetcher.state === 'submitting') {
            hasHandledResponse.current = false;
        }
    }, [removeFetcher.state, removeFetcher.data, addToast, onRemove, productId, t]);

    return (
        <Button
            className="w-full text-sm font-normal"
            size="default"
            variant="default"
            onClick={handleRemove}
            disabled={removeFetcher.state !== 'idle' || isDisabled}
            aria-label="Remove">
            Remove
        </Button>
    );
}

export default function AccountWishlist(): ReactElement {
    const { t } = useTranslation('account');
    const { t: tProduct } = useTranslation('product');

    const loaderData = useLoaderData<Awaited<ReturnType<typeof clientLoader>>>();
    const { items, productsByProductId: productsPromise } = loaderData || {
        items: [] as CustomerProductListItem[],
        productsByProductId: Promise.resolve({} as Record<string, Product>),
    };

    const productsByProductId = use(productsPromise);
    const config = useConfig();
    const carouselLimit = config.global.paginatedProductCarousel.defaultLimit;
    const loadMoreFetcher = useFetcher<{
        products: (ProductSearchHit | null)[];
        productsByProductId?: Record<string, Product>;
        offset: number;
        limit: number;
        total: number;
    }>();

    // Track disabled (removed) products - persisted across revalidations using sessionStorage
    const [disabledProductIds, setDisabledProductIds] = useState<Set<string>>(() => {
        // Restore from sessionStorage if available
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('wishlist-disabled');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored) as string[];
                    return new Set(parsed);
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error('Failed to parse stored disabled IDs:', e);
                }
            }
        }
        return new Set();
    });

    // Persist disabled IDs to sessionStorage whenever they change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const ids = Array.from(disabledProductIds);
            sessionStorage.setItem('wishlist-disabled', JSON.stringify(ids));
        }
    }, [disabledProductIds]);

    // Clear sessionStorage when component unmounts (user navigates away)
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('wishlist-disabled');
            }
        };
    }, []);

    // All items from server (no filtering)
    const allItems = items;

    // Stable carousel key - only changes on navigation
    const carouselKey = useMemo(() => items.map((i) => i.id).join(','), [items]);

    // Store products by ID in state to accumulate as we load more
    const [allProductsByProductId, setAllProductsByProductId] = useState(productsByProductId);

    // Initial products to show (all items, disabled state handled in render)
    // Keep placeholder objects (with only id) for products that haven't been fetched yet
    // Use productIds from wishlist API as stable identifiers
    const initialProductsWithMeta = useMemo(() => {
        const initialItems = items.slice(0, carouselLimit);
        return initialItems.map((item) => {
            // Use productsByProductId from loader, NOT allProductsByProductId state
            const product = item.productId ? productsByProductId[item.productId] : undefined;
            // Check if product has actual data (not just a placeholder with only id)
            const hasProductData = product && product.name;
            const productHit = hasProductData ? convertProductToProductSearchHit(product) : null;
            // Return object with item metadata and product (which might be null if not fetched)
            return {
                itemId: item.id,
                productId: item.productId,
                product: productHit,
            };
        });
    }, [items, productsByProductId, carouselLimit]); // Uses initial productsByProductId from loader

    // Extract just the products for the carousel (for backward compatibility with PaginatedCarousel)
    const initialProducts = useMemo(() => {
        const products = initialProductsWithMeta.map((entry) => entry.product);
        return products;
    }, [initialProductsWithMeta]);

    // Handle successful product removal - add to disabled set
    const handleProductRemove = useCallback((productId: string) => {
        setDisabledProductIds((prev) => new Set(prev).add(productId));
    }, []);

    // Track pending load requests
    const pendingLoadRef = useRef<{
        resolve: (products: (ProductSearchHit | null)[]) => void;
        reject: (error: Error) => void;
    } | null>(null);

    // Handle fetcher data changes
    useEffect(() => {
        if (loadMoreFetcher.state === 'idle' && loadMoreFetcher.data && pendingLoadRef.current) {
            const data = loadMoreFetcher.data;
            if (data.products && Array.isArray(data.products)) {
                // Merge new product details into state if provided
                // Only merge entries with actual product data (not placeholders)
                if (data.productsByProductId) {
                    setAllProductsByProductId((prev) => {
                        const updated = { ...prev };
                        const newProducts = data.productsByProductId;
                        if (newProducts) {
                            Object.entries(newProducts).forEach(([productId, product]) => {
                                // Only update if product has actual data (not just a placeholder with only id)
                                if (product && product.name) {
                                    updated[productId] = product;
                                }
                            });
                        }
                        return updated;
                    });
                }
                pendingLoadRef.current.resolve(data.products);
            } else {
                pendingLoadRef.current.reject(new Error('Failed to load more products'));
            }
            pendingLoadRef.current = null;
        } else if (loadMoreFetcher.state === 'idle' && loadMoreFetcher.data === undefined && pendingLoadRef.current) {
            // Fetcher completed but no data - might be an error
            pendingLoadRef.current.reject(new Error('No data returned'));
            pendingLoadRef.current = null;
        }
    }, [loadMoreFetcher.state, loadMoreFetcher.data]);

    // Load more products handler
    const handleLoadMore = useCallback(
        async (carouselOffset: number, limitParam: number): Promise<(ProductSearchHit | null)[]> => {
            // Load the next batch from allItems (including disabled ones)
            const nextBatch = allItems.slice(carouselOffset, carouselOffset + limitParam);

            // Convert to ProductSearchHit format, keeping null placeholders for unfetched
            const products = nextBatch.map((item) => {
                const product = item.productId ? allProductsByProductId[item.productId] : undefined;
                // Check if product has actual data (not just a placeholder with only id)
                const hasProductData = product && product.name;
                // Return null placeholder if product not fetched yet
                if (!hasProductData) {
                    return null;
                }
                return convertProductToProductSearchHit(product);
            });

            // Check if there's any product data we need to fetch (any null placeholders)
            const needsRefetch = products.some((product) => product === null);

            if (!needsRefetch) {
                // All products already fetched, return from cache
                return Promise.resolve(products);
            }

            // Use the fetcher to load more product details
            const url = `/loader/wishlist-products?offset=${carouselOffset}&limit=${limitParam}`;

            return new Promise<(ProductSearchHit | null)[]>((resolve, reject) => {
                pendingLoadRef.current = { resolve, reject };
                void loadMoreFetcher.load(url);
            });
        },
        [allItems, allProductsByProductId, loadMoreFetcher]
    );

    // Custom render function for product tiles with remove button and variant handling
    const renderTile = useMemo(() => {
        const renderTileFunction = (product: ProductSearchHit, index: number) => {
            // Find the corresponding item to get variant information
            const item = allItems.find((wishlistItem) => wishlistItem.productId === product.productId);
            if (!item) {
                return <ProductTile key={product.productId || index} product={product} className="h-auto" />;
            }

            const productData = item.productId ? allProductsByProductId[item.productId] : undefined;
            // Check if product has actual data (not just a placeholder with only id)
            const hasProductData = productData && productData.name;
            if (!hasProductData) {
                return <ProductTile key={product.productId || index} product={product} className="h-auto" />;
            }

            // Check if this product is disabled (removed)
            const isDisabled = item.productId ? disabledProductIds.has(item.productId) : false;

            // Determine if this is a variant product and get its color value
            const isVariant = productData.variants?.some((variant) => variant.productId === item.productId);
            let selectedVariantColorValue: string | null = null;

            if (isVariant) {
                const matchedVariant = productData.variants?.find((v) => v.productId === item.productId);
                if (matchedVariant?.variationValues) {
                    selectedVariantColorValue = matchedVariant.variationValues.color || null;
                }
            }

            return (
                <div key={item.id || item.productId || index} className="relative">
                    <ProductTile
                        product={product}
                        footerAction={
                            <WishlistRemoveButton
                                productId={item.productId || ''}
                                isDisabled={isDisabled}
                                onRemove={handleProductRemove}
                            />
                        }
                        disableSwatchInteraction={true}
                        selectedVariantColorValue={selectedVariantColorValue}
                        className={`h-auto transition-opacity ${isDisabled ? 'opacity-50' : ''}`}
                    />
                    {isDisabled && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-md">
                                <span className="text-sm font-medium">{tProduct('removedLabel')}</span>
                            </div>
                        </div>
                    )}
                </div>
            );
        };
        renderTileFunction.displayName = 'RenderTile';
        return renderTileFunction;
    }, [allItems, allProductsByProductId, disabledProductIds, handleProductRemove, tProduct]);

    return (
        <div className="pb-16">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-foreground" tabIndex={0}>
                        {t('navigation.wishlist')}
                    </h1>
                </div>

                {/* Wishlist Content */}
                {allItems.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-lg text-muted-foreground">{t('wishlist.empty')}</p>
                    </div>
                ) : (
                    <div className="flex-grow">
                        {/* Item count - similar to category page header */}
                        <div className="mb-4">
                            <p className="text-sm text-muted-foreground">
                                Found {allItems.length} {allItems.length === 1 ? 'item' : 'items'} in your wishlist
                            </p>
                        </div>
                        {/* Use PaginatedProductCarousel for horizontal scrolling with on-demand loading */}
                        <PaginatedProductCarousel
                            key={carouselKey}
                            products={initialProducts}
                            total={allItems.length}
                            offset={0}
                            onLoadMore={handleLoadMore}
                            renderTile={renderTile}
                            showLoadingIndicator={true}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
