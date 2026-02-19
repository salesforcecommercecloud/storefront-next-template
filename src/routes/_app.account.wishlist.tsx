/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { type ReactElement, useEffect, useRef, useMemo, useState, useCallback, Suspense } from 'react';
import { Await, useFetcher, type LoaderFunctionArgs, type ShouldRevalidateFunctionArgs } from 'react-router';
import {
    type ShopperCustomers,
    type ShopperProducts,
    type ShopperSearch,
    ApiError,
} from '@salesforce/storefront-next-runtime/scapi';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuth } from '@/middlewares/auth.server';
import { getConfig, useConfig } from '@/config';
import { convertProductToProductSearchHit } from '@/lib/product-conversion';
import { ProductTile } from '@/components/product-tile';
import { useToast } from '@/components/toast';
import PaginatedProductCarousel from '@/components/product-carousel/paginated-carousel';
import ProductCarouselSkeleton from '@/components/product-carousel/skeleton';
import { useTranslation } from 'react-i18next';
import { fetchProductsForWishlist, getWishlist } from '@/lib/api/wishlist';

type CustomerProductList = ShopperCustomers.schemas['CustomerProductList'];
type CustomerProductListItem = ShopperCustomers.schemas['CustomerProductListItem'];
type Product = ShopperProducts.schemas['Product'];
type ProductSearchHit = ShopperSearch.schemas['ProductSearchHit'];

/**
 * Server-side loader to fetch the customer's wishlist items and product details
 */
// eslint-disable-next-line custom/no-async-page-loader, react-refresh/only-export-components
export async function loader({ context }: LoaderFunctionArgs): Promise<{
    wishlist: CustomerProductList | null; // Type works at runtime despite linter schema warning
    items: CustomerProductListItem[];
    productsByProductId: Promise<Record<string, Product>>;
}> {
    const session = getAuth(context);

    // Check if user is authenticated as registered customer
    const isRegistered =
        session.userType === 'registered' &&
        session.customerId &&
        session.accessToken &&
        session.accessTokenExpiry &&
        session.accessTokenExpiry > Date.now();

    if (!isRegistered || !session.customerId) {
        return {
            wishlist: null,
            items: [],
            productsByProductId: Promise.resolve({}),
        };
    }

    try {
        const customerId = session.customerId;
        const config = getConfig(context);
        const initialLimit = config.global.paginatedProductCarousel.defaultLimit;

        const { wishlist, items, id: listId } = await getWishlist(context, customerId);

        if (!wishlist || !listId) {
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        // Only fetch product details for the initial batch to optimize initial load
        const initialItems = items.slice(0, initialLimit);

        return {
            wishlist,
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
 * Wishlist skeleton component for loading state
 * Follows the pattern of other account page skeletons (AccountDetailSkeleton, AccountAddressesSkeleton)
 */
export function WishlistSkeleton(): ReactElement {
    const { t } = useTranslation('account');

    return (
        <div className="pb-16">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Page Header - show actual title like other account skeletons */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-foreground" tabIndex={0}>
                        {t('navigation.wishlist')}
                    </h1>
                </div>

                {/* Item count skeleton */}
                <div className="mb-4">
                    <Skeleton className="h-5 w-48" />
                </div>

                {/* Product carousel skeleton */}
                <ProductCarouselSkeleton />
            </div>
        </div>
    );
}

/**
 * Component for rendering a remove button in the ProductTile footer
 */
function WishlistRemoveButton({
    itemId,
    isDisabled,
    onRemove,
}: {
    itemId: string;
    isDisabled?: boolean;
    onRemove?: (itemId: string) => void;
}) {
    const { t } = useTranslation('product');
    const removeFetcher = useFetcher();
    const { addToast } = useToast();
    const hasHandledResponse = useRef(false);

    const handleRemove = () => {
        if (removeFetcher.state !== 'idle' || !itemId || isDisabled) return;

        void removeFetcher.submit(
            { itemId },
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
                // Notify parent to mark item as disabled
                if (onRemove) {
                    onRemove(itemId);
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
    }, [removeFetcher.state, removeFetcher.data, addToast, onRemove, itemId, t]);

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

function AccountWishlistContent({
    items,
    productsByProductId,
}: {
    items: CustomerProductListItem[];
    productsByProductId: Record<string, Product>;
}): ReactElement {
    const { t } = useTranslation('account');
    const { t: tProduct } = useTranslation('product');
    const config = useConfig();
    const carouselLimit = config.global.paginatedProductCarousel.defaultLimit;
    const loadMoreFetcher = useFetcher<{
        products: (ProductSearchHit | null)[];
        productsByProductId?: Record<string, Product>;
        offset: number;
        limit: number;
        total: number;
    }>();

    // Track disabled (removed) items - persisted across revalidations using sessionStorage
    const [disabledItemIds, setDisabledItemIds] = useState<Set<string>>(() => {
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
            const ids = Array.from(disabledItemIds);
            sessionStorage.setItem('wishlist-disabled', JSON.stringify(ids));
        }
    }, [disabledItemIds]);

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

    // Handle successful item removal - add to disabled set
    const handleItemRemove = useCallback((itemId: string) => {
        setDisabledItemIds((prev) => new Set(prev).add(itemId));
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
            const url = `/resource/wishlist-products?offset=${carouselOffset}&limit=${limitParam}`;

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

            // Guard: item.id is required for remove functionality
            if (!item.id) {
                return <ProductTile key={product.productId || index} product={product} className="h-auto" />;
            }

            // Check if this item is disabled (removed)
            const isDisabled = disabledItemIds.has(item.id);

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
                                itemId={item.id}
                                isDisabled={isDisabled}
                                onRemove={handleItemRemove}
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
    }, [allItems, allProductsByProductId, disabledItemIds, handleItemRemove, tProduct]);

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

export default function AccountWishlist({
    loaderData,
}: {
    loaderData: Awaited<ReturnType<typeof loader>>;
}): ReactElement {
    return (
        <Suspense fallback={<WishlistSkeleton />}>
            <Await resolve={loaderData.productsByProductId}>
                {(productsByProductId) => (
                    <AccountWishlistContent items={loaderData.items} productsByProductId={productsByProductId} />
                )}
            </Await>
        </Suspense>
    );
}
