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
import type { ShopperCustomers, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';
import { currencyContext } from '@/lib/currency';

type CustomerProductList = ShopperCustomers.schemas['CustomerProductList'];
type CustomerProductListItem = ShopperCustomers.schemas['CustomerProductListItem'];
type Product = ShopperProducts.schemas['Product'];

// TODO: for later refactoring, there are similar product-fetch functions for Cart and Checkout.
/**
 * Fetch product details for wishlist items
 * The API has a limit based on productsPerPage config, so we batch requests if needed
 */
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

    const currency = context.get(currencyContext) as string;

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
            // Log error but continue with other batches
            // eslint-disable-next-line no-console
            console.error(`Error fetching products batch (IDs: ${batchIds.join(', ')}):`, error);
            // Continue processing other batches even if one fails
        }
    }

    return productsByProductId;
}

/**
 * Get the customer's wishlist with items. It's the first list with `wish_list` type.
 * Returns the wishlist metadata, items, and extracted ID
 *
 * @param context - Loader function context
 * @param customerId - The customer ID
 * @param listId - Optional list ID for direct fetch. If provided, fetches the specific list directly.
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
    const clients = createApiClients(context);

    try {
        // If listId is provided, fetch the wishlist directly
        if (listId) {
            const { data: wishlist } = await clients.shopperCustomers.getCustomerProductList({
                params: {
                    path: { customerId, listId },
                },
            });

            // Extract the ID using the defensive pattern (listId may exist at runtime but not in types)
            // @ts-expect-error - listId may exist at runtime but is not in type definitions
            const id = wishlist.listId || wishlist.id || null;

            // Commerce SDK may return items in 'items' or 'customerProductListItems' field
            // @ts-expect-error - items and customerProductListItems may exist at runtime but are not in type definitions
            const items = wishlist.items || wishlist.customerProductListItems || [];

            return {
                wishlist,
                items,
                id,
            };
        }

        // Otherwise, get all product lists and find the wishlist
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
                id: null,
            };
        }

        // Extract the ID using the defensive pattern (listId may exist at runtime but not in types)
        // @ts-expect-error - listId may exist at runtime but is not in type definitions
        const id = wishlist.listId || wishlist.id || null;
        // It's possible that id does not exist yet, if Commerce Cloud is still indexing the newly created wishlist

        // Commerce SDK may return items in 'items' or 'customerProductListItems' field
        // @ts-expect-error - items and customerProductListItems may exist at runtime but are not in type definitions
        const items = wishlist.items || wishlist.customerProductListItems || [];

        return {
            wishlist,
            items,
            id,
        };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error fetching wishlist:', error);
        return {
            wishlist: null,
            items: [],
            id: null,
        };
    }
}
