/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { use, type ReactElement, useEffect, useRef } from 'react';
import { useLoaderData, useFetcher, type LoaderFunctionArgs, type ClientLoaderFunctionArgs } from 'react-router';
import type { ShopperCustomersTypes, ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import { Button } from '@/components/ui/button';
import { getAuth } from '@/middlewares/auth.client';
import createClient from '@/lib/scapi';
import { isRegisteredCustomer } from '@/lib/api/customer';
import { extractResponseError } from '@/lib/utils';
import { convertProductToProductSearchHit } from '@/lib/product-conversion';
import { ProductTile } from '@/components/product-tile';
import { useToast } from '@/components/toast';
import uiStrings from '@/temp-ui-string';

/**
 * Fetch product details for wishlist items
 */
async function fetchProductsForWishlist(
    context: LoaderFunctionArgs['context'],
    items: ShopperCustomersTypes.CustomerProductListItem[]
): Promise<Record<string, ShopperProductsTypes.Product>> {
    const productIds = items.map((item) => item.productId).filter(Boolean) as string[];

    if (!productIds.length) {
        return {};
    }

    const client = createClient(context);
    const productsResponse = await client.ShopperProducts.getProducts({
        parameters: {
            ids: productIds,
            allImages: true,
            perPricebook: true,
        },
    });

    if (!productsResponse.data) {
        return {};
    }

    const productsByProductId = productsResponse.data.reduce(
        (acc, product) => {
            if (product.id) {
                acc[product.id] = product;
            }
            return acc;
        },
        {} as Record<string, ShopperProductsTypes.Product>
    );

    return productsByProductId;
}

/**
 * Server-side loader to fetch the customer's wishlist items and product details
 */
// eslint-disable-next-line custom/no-async-page-loader, react-refresh/only-export-components
export async function loader({ context }: LoaderFunctionArgs): Promise<{
    wishlist: ShopperCustomersTypes.CustomerProductList | null;
    items: ShopperCustomersTypes.CustomerProductListItem[];
    productsByProductId: Promise<Record<string, ShopperProductsTypes.Product>>;
}> {
    const { getAuth: getAuthServer } = await import('@/middlewares/auth.server');
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
        const client = createClient(context).ShopperCustomers;

        // Get the customer's product lists
        const productLists = await client.getCustomerProductLists({
            parameters: { customerId },
        });

        // Find the wishlist
        const wishlist = productLists.data?.find((list) => list.type === 'wish_list');

        if (!wishlist) {
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        // Type assertion to access customerProductListItems field (may be present in API response but not in TypeScript types)
        const wishlistWithItems = wishlist as ShopperCustomersTypes.CustomerProductList & {
            customerProductListItems?: ShopperCustomersTypes.CustomerProductListItem[];
        };

        // Commerce SDK might return 'id' instead of 'listId' - use 'id' if 'listId' is not available
        const listId = wishlist.listId || wishlist.id;
        if (!listId) {
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        // Try to get items from the initial response first (items may already be included in customerProductListItems)
        let items: ShopperCustomersTypes.CustomerProductListItem[] =
            wishlistWithItems.items || wishlistWithItems.customerProductListItems || [];

        // If items are already in the initial response, use them
        // Otherwise, fetch the full wishlist
        if (items.length > 0) {
            return {
                wishlist: wishlistWithItems,
                items,
                productsByProductId: fetchProductsForWishlist(context, items),
            };
        }

        // Get the full wishlist with items (if not already included)
        const fullWishlistRaw = await client.getCustomerProductList({
            parameters: {
                customerId,
                listId,
            },
        });

        // Type assertion to access customerProductListItems field
        const fullWishlist = fullWishlistRaw as ShopperCustomersTypes.CustomerProductList & {
            customerProductListItems?: ShopperCustomersTypes.CustomerProductListItem[];
        };

        // Commerce SDK may return items in 'items' or 'customerProductListItems' field
        // Check both fields to ensure we get the items
        items = fullWishlist.items || fullWishlist.customerProductListItems || [];

        return {
            wishlist: fullWishlist,
            items,
            productsByProductId: fetchProductsForWishlist(context, items),
        };
    } catch (error) {
        // Handle authentication errors gracefully - wishlist requires authenticated registered customers
        // If auth fails, return empty wishlist (user will need to log in)
        const { status_code } = await extractResponseError(error).catch(() => ({
            status_code: undefined,
        }));

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
// eslint-disable-next-line custom/no-async-page-loader, react-refresh/only-export-components
export async function clientLoader({ context }: ClientLoaderFunctionArgs): Promise<{
    wishlist: ShopperCustomersTypes.CustomerProductList | null;
    items: ShopperCustomersTypes.CustomerProductListItem[];
    productsByProductId: Promise<Record<string, ShopperProductsTypes.Product>>;
}> {
    // Check if user is authenticated as registered customer
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
        const client = createClient(context).ShopperCustomers;

        // Get the customer's product lists
        const productLists = await client.getCustomerProductLists({
            parameters: { customerId },
        });

        // Find the wishlist
        const wishlist = productLists.data?.find((list) => list.type === 'wish_list');

        if (!wishlist) {
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        // Type assertion to access customerProductListItems field (may be present in API response but not in TypeScript types)
        const wishlistWithItems = wishlist as ShopperCustomersTypes.CustomerProductList & {
            customerProductListItems?: ShopperCustomersTypes.CustomerProductListItem[];
        };

        // Commerce SDK might return 'id' instead of 'listId' - use 'id' if 'listId' is not available
        const listId = wishlist.listId || wishlist.id;
        if (!listId) {
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        // Try to get items from the initial response first (items may already be included in customerProductListItems)
        let items: ShopperCustomersTypes.CustomerProductListItem[] =
            wishlistWithItems.items || wishlistWithItems.customerProductListItems || [];

        // If items are already in the initial response, use them
        // Otherwise, fetch the full wishlist
        if (items.length > 0) {
            return {
                wishlist: wishlistWithItems,
                items,
                productsByProductId: fetchProductsForWishlist(context, items),
            };
        }

        // Get the full wishlist with items (if not already included)
        const fullWishlistRaw = await client.getCustomerProductList({
            parameters: {
                customerId,
                listId,
            },
        });

        // Type assertion to access customerProductListItems field
        const fullWishlist = fullWishlistRaw as ShopperCustomersTypes.CustomerProductList & {
            customerProductListItems?: ShopperCustomersTypes.CustomerProductListItem[];
        };

        // Commerce SDK may return items in 'items' or 'customerProductListItems' field
        // Check both fields to ensure we get the items
        items = fullWishlist.items || fullWishlist.customerProductListItems || [];

        return {
            wishlist: fullWishlist,
            items,
            productsByProductId: fetchProductsForWishlist(context, items),
        };
    } catch (error) {
        // Handle authentication errors gracefully - wishlist requires authenticated registered customers
        // If auth fails, return empty wishlist (user will need to log in)
        const { status_code } = await extractResponseError(error).catch(() => ({
            status_code: undefined,
        }));

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
 * Component for rendering a remove button in the ProductTile footer
 */
function WishlistRemoveButton({ productId }: { productId: string }) {
    const removeFetcher = useFetcher();
    const { addToast } = useToast();
    const hasHandledResponse = useRef(false);

    const handleRemove = () => {
        if (removeFetcher.state !== 'idle' || !productId) return;

        void removeFetcher.submit(
            { productId },
            {
                method: 'POST',
                action: '/action/wishlist-remove',
            }
        );
    };

    // Handle remove response
    useEffect(() => {
        if (removeFetcher.state === 'idle' && removeFetcher.data && !hasHandledResponse.current) {
            const result = removeFetcher.data as { success: boolean; error?: string } | undefined;
            if (result?.success) {
                hasHandledResponse.current = true;
                addToast(uiStrings.product.removedFromWishlist, 'success');
            } else if (result?.success === false || result?.error) {
                hasHandledResponse.current = true;
                addToast(result.error || uiStrings.product.failedToRemoveFromWishlist, 'error');
            }
        }

        // Reset flag when fetcher starts a new request
        if (removeFetcher.state === 'submitting') {
            hasHandledResponse.current = false;
        }
    }, [removeFetcher.state, removeFetcher.data, addToast]);

    return (
        <Button
            className="w-full text-sm font-normal"
            size="default"
            variant="default"
            onClick={handleRemove}
            disabled={removeFetcher.state !== 'idle'}
            aria-label="Remove">
            Remove
        </Button>
    );
}

export default function AccountWishlist(): ReactElement {
    const loaderData = useLoaderData<Awaited<ReturnType<typeof clientLoader>>>();
    const { items, productsByProductId: productsPromise } = loaderData || {
        items: [] as ShopperCustomersTypes.CustomerProductListItem[],
        productsByProductId: Promise.resolve({} as Record<string, ShopperProductsTypes.Product>),
    };

    const productsByProductId = use(productsPromise);

    // Convert products to ProductSearchHit format and create tiles with remove buttons
    const productTiles = items
        .map((item) => {
            const product = item.productId ? productsByProductId[item.productId] : undefined;
            if (!product) {
                return null;
            }

            // Determine if this is a variant product and get its color value
            // If product has variants and item.productId matches a variant's productId, it's a variant
            const isVariant = product.variants?.some((variant) => variant.productId === item.productId);
            let selectedVariantColorValue: string | null = null;

            if (isVariant) {
                // Find the variant that matches the item's productId and get its color value
                const matchedVariant = product.variants?.find((v) => v.productId === item.productId);
                if (matchedVariant?.variationValues) {
                    selectedVariantColorValue = matchedVariant.variationValues.color || null;
                }
            }

            const productSearchHit = convertProductToProductSearchHit(product);
            return (
                <ProductTile
                    key={item.id || item.productId}
                    product={productSearchHit}
                    footerAction={<WishlistRemoveButton productId={item.productId || ''} />}
                    disableSwatchInteraction={true}
                    selectedVariantColorValue={selectedVariantColorValue}
                />
            );
        })
        .filter(Boolean);

    return (
        <div className="pb-16">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-foreground" tabIndex={0}>
                        {uiStrings.account.navigation.wishlist}
                    </h1>
                </div>

                {/* Wishlist Content */}
                {items.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-lg text-muted-foreground">{uiStrings.account.wishlist.empty}</p>
                    </div>
                ) : (
                    <div className="flex-grow">
                        {/* Item count - similar to category page header */}
                        <div className="mb-4">
                            <p className="text-sm text-muted-foreground">
                                Found {items.length} {items.length === 1 ? 'item' : 'items'} in your wishlist
                            </p>
                        </div>
                        {/* Use same grid styling as ProductGrid component */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-8">
                            {productTiles}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
