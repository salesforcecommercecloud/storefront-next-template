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
import type { LoaderFunctionArgs } from 'react-router';
import { type ShopperCustomers, type ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients.server';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { siteContext, type SiteContext } from '@salesforce/storefront-next-runtime/site-context';
import { getLogger } from '@/lib/logger.server';
import { getAuth } from '@/middlewares/auth.server';
import { hasUsableShopperSession } from '@/middlewares/auth.utils';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import type { ActionError } from '@/lib/error-codes';
import { NormalizedApiError } from '@/lib/api/normalized-api-error';

type CustomerProductList = ShopperCustomers.schemas['CustomerProductList'];
type CustomerProductListItem = ShopperCustomers.schemas['CustomerProductListItem'];
type Product = ShopperProducts.schemas['Product'];

/** Shared response shape returned by wishlist action routes and consumed by the useWishlist hook. */
export type WishlistActionResponse = {
    success: boolean;
    error?: ActionError;
    alreadyInWishlist?: boolean;
};

/** Time to wait for Commerce Cloud to index a newly created wishlist. */
const WISHLIST_CREATION_DELAY_MS = 1500;
/** Time to wait before retrying to fetch a wishlist's listId after a stale read. */
const WISHLIST_RETRY_DELAY_MS = 2000;

// TODO: for later refactoring, there are similar product-fetch functions for Cart and Checkout.
/**
 * Fetch product details for wishlist items
 * The API has a limit based on search config, so we batch requests if needed
 */
export async function fetchProductsForWishlist(
    context: LoaderFunctionArgs['context'],
    items: CustomerProductListItem[],
    allItems?: CustomerProductListItem[]
): Promise<Record<string, Product>> {
    const logger = getLogger(context);
    const productIds = items
        .map((item) => item.productId)
        .filter((id): id is string => Boolean(id) && typeof id === 'string' && id.trim().length > 0);

    if (!productIds.length) {
        return {};
    }

    const clients = createApiClients(context);
    const config = getConfig<AppConfig>(context);
    const maxIdsPerRequest = config.search.products.hits.limit;
    const productsByProductId: Record<string, Product> = {};

    const currency = (context.get(siteContext) as SiteContext).currency;

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
                        ...(currency ? { currency } : {}),
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
            logger.error('Error fetching products batch', { ids: batchIds.join(', '), error });
            // Continue processing other batches even if one fails
        }
    }

    return productsByProductId;
}

/**
 * Get the customer's wishlist with items. It's the first list with `wish_list` type.
 * Returns the wishlist metadata, items, and extracted ID.
 *
 * Wraps SCAPI's `shopperCustomers.getCustomerProductList(s)` with operation-context logging and
 * normalizes any thrown error into `NormalizedApiError` for consistent downstream handling.
 *
 * @param context - Loader function context
 * @param customerId - The customer ID
 * @param listId - Optional list ID for direct fetch. If provided, fetches the specific list directly.
 * @throws {NormalizedApiError} When the API request fails
 */
export async function getWishlist(
    context: LoaderFunctionArgs['context'],
    customerId: string,
    listId?: string
): Promise<{
    wishlist: CustomerProductList | null;
    items: CustomerProductListItem[];
    id: string | null;
}> {
    const logger = getLogger(context);
    const clients = createApiClients(context);

    if (listId) {
        try {
            const { data: wishlist } = await clients.shopperCustomers.getCustomerProductList({
                params: {
                    path: { customerId, listId },
                },
            });

            return {
                wishlist,
                items: wishlist.customerProductListItems ?? [],
                id: wishlist.id || null,
            };
        } catch (error) {
            logger.error('shopperCustomers.getCustomerProductList failed', { customerId, listId });
            throw new NormalizedApiError(error);
        }
    }

    try {
        const { data: productLists } = await clients.shopperCustomers.getCustomerProductLists({
            params: {
                path: { customerId },
            },
        });

        // Find the wishlist
        const wishlist = productLists?.data?.find((list) => list.type === 'wish_list');

        if (!wishlist) {
            return { wishlist: null, items: [], id: null };
        }

        // It's possible that id does not exist yet, if Commerce Cloud is still indexing the newly created wishlist
        return {
            wishlist,
            items: wishlist.customerProductListItems ?? [],
            id: wishlist.id || null,
        };
    } catch (error) {
        logger.error('shopperCustomers.getCustomerProductLists failed', { customerId });
        throw new NormalizedApiError(error);
    }
}

/**
 * Get or create the default wishlist (product list) for a customer. Guarantees a
 * wishlist with a valid `listId` or throws.
 *
 * Used by both the add action and the merge path.
 */
export async function getOrCreateWishlist(
    context: LoaderFunctionArgs['context'],
    customerId: string
): Promise<CustomerProductList> {
    const { t } = getTranslation();
    const logger = getLogger(context);
    const clients = createApiClients(context);

    try {
        // Try to get the default wishlist using getWishlist
        const { wishlist, id: listId } = await getWishlist(context, customerId);

        if (wishlist) {
            // Commerce Cloud may take time to index wishlists. If the wishlist exists but
            // doesn't have a listId yet, wait and retry once to handle indexing delays.
            // This ensures the function contract: always return a wishlist with valid listId.
            if (listId) {
                return wishlist;
            }

            logger.warn('Wishlist: indexing delay, retrying getWishlist', { customerId });
            await new Promise((resolve) => setTimeout(resolve, WISHLIST_RETRY_DELAY_MS));

            const { wishlist: retryWishlist, id: retryListId } = await getWishlist(context, customerId);

            if (retryWishlist && retryListId) {
                return retryWishlist;
            }

            logger.error('Wishlist: listId still missing after retry', { customerId });
            throw new Error(t('account:wishlist.unableToRetrieveId'));
        }

        // Create a new wishlist if it doesn't exist.
        // Commerce SDK createCustomerProductList might not return listId immediately
        // so we re-fetch after creation.
        await clients.shopperCustomers.createCustomerProductList({
            params: {
                path: { customerId },
            },
            body: {
                type: 'wish_list',
                public: false,
                name: t('account:wishlist.wishlistName'),
            },
        });

        await new Promise((resolve) => setTimeout(resolve, WISHLIST_CREATION_DELAY_MS));

        const { wishlist: createdWishlist, id: createdListId } = await getWishlist(context, customerId);

        if (!createdWishlist || !createdListId) {
            logger.error('Wishlist: createCustomerProductList returned without a usable list', { customerId });
            throw new Error(t('account:wishlist.failedToCreate'));
        }
        return createdWishlist;
    } catch (error) {
        logger.warn('Wishlist: getOrCreateWishlist primary path failed, falling back to first list', { customerId });
        // If creating fails, try to get the first available list
        try {
            const { data: productLists } = await clients.shopperCustomers.getCustomerProductLists({
                params: {
                    path: { customerId },
                },
            });
            const firstList = productLists?.data?.[0];
            if (firstList) {
                return firstList;
            }
        } catch (fallbackError) {
            logger.error('Wishlist: fallback getCustomerProductLists also failed', { customerId, fallbackError });
        }
        throw error;
    }
}

/**
 * Loader-side data shape for the wishlist page. Streamed via React Router's
 * Suspense pattern: `wishlist`/`items` are awaited; `productsByProductId` is a
 * Promise so the route can render its skeleton while products resolve.
 */
export type WishlistPageData = {
    wishlist: CustomerProductList | null;
    items: CustomerProductListItem[];
    productsByProductId: Promise<Record<string, Product>>;
};

/**
 * Shared loader-side helper that powers both the registered (`/account/wishlist`)
 * and guest (`/wishlist`) routes. Reads `customerId` from the session and pulls
 * the wishlist + product details. Returns an empty payload when the session has
 * no usable token, when SCAPI says the wishlist is empty, or when the call fails
 * with 401/403 (treated as "session no longer authorized for this customer").
 * Other errors propagate so the route's error boundary can surface them.
 */
export async function loadWishlistPageData(context: LoaderFunctionArgs['context']): Promise<WishlistPageData> {
    const logger = getLogger(context);
    const session = getAuth(context);

    if (!hasUsableShopperSession(session)) {
        return {
            wishlist: null,
            items: [],
            productsByProductId: Promise.resolve({}),
        };
    }

    const { customerId } = session;

    try {
        const { wishlist, items, id: listId } = await getWishlist(context, customerId);

        if (!wishlist || !listId) {
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        return {
            wishlist,
            items,
            productsByProductId: fetchProductsForWishlist(context, items),
        };
    } catch (error) {
        if (error instanceof NormalizedApiError && (error.status === 401 || error.status === 403)) {
            logger.warn('Wishlist: auth error, returning empty wishlist', { status: error.status });
            return {
                wishlist: null,
                items: [],
                productsByProductId: Promise.resolve({}),
            };
        }

        logger.error('Wishlist: failed to load wishlist', { error });
        throw error;
    }
}
