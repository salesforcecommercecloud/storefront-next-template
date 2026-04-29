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
import { type ActionFunctionArgs } from 'react-router';
import { type ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { getAuth } from '@/middlewares/auth.server';
import { createApiClients } from '@/lib/api-clients.server';
import { isRegisteredCustomer } from '@/lib/api/customer.server';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { getWishlist, type WishlistActionResponse } from '@/lib/api/wishlist.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';

type CustomerProductList = ShopperCustomers.schemas['CustomerProductList'];
type CustomerProductListItem = ShopperCustomers.schemas['CustomerProductListItem'];

/**
 * Constants for wishlist operations
 */
const WISHLIST_CREATION_DELAY_MS = 1500; // Time to wait for Commerce Cloud to index new wishlist
const WISHLIST_RETRY_DELAY_MS = 2000; // Time to wait before retrying to fetch wishlist ID

/**
 * Get or create the default wishlist (product list) for a customer
 */
async function getOrCreateWishlist(
    context: ActionFunctionArgs['context'],
    customerId: string
): Promise<CustomerProductList> {
    const { t } = getTranslation();
    const clients = createApiClients(context);

    try {
        // Try to get the default wishlist using getWishlist
        const { wishlist, id: listId } = await getWishlist(context, customerId);

        if (wishlist) {
            // Commerce Cloud may take time to index wishlists. If the wishlist exists but
            // doesn't have a listId yet, wait and retry once to handle indexing delays.
            // This ensures the function contract: always return a wishlist with valid listId.
            if (listId) {
                return wishlist; // Has valid listId
            }

            // Retry logic: wait and fetch again (Commerce Cloud indexing delay)
            await new Promise((resolve) => setTimeout(resolve, WISHLIST_RETRY_DELAY_MS));

            const { wishlist: retryWishlist, id: retryListId } = await getWishlist(context, customerId);

            if (retryWishlist && retryListId) {
                return retryWishlist;
            }

            throw new Error(t('account:wishlist.unableToRetrieveId'));
        }

        // Create a new wishlist if it doesn't exist
        // Commerce SDK createCustomerProductList might not return listId immediately
        // So we'll always fetch the list after creation to ensure we have the listId
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

        // Wait for the list to be fully created and indexed in Commerce Cloud
        // This is necessary because Commerce Cloud may not return listId in the create response
        await new Promise((resolve) => setTimeout(resolve, WISHLIST_CREATION_DELAY_MS));

        // Fetch the newly created wishlist using getWishlist
        const { wishlist: createdWishlist, id: createdListId } = await getWishlist(context, customerId);

        if (!createdWishlist || !createdListId) {
            throw new Error(t('account:wishlist.failedToCreate'));
        }
        return createdWishlist;
    } catch (error) {
        // If creating fails, try to get the first available list
        const { data: productLists } = await clients.shopperCustomers.getCustomerProductLists({
            params: {
                path: { customerId },
            },
        });
        const firstList = productLists?.data?.[0];
        if (firstList) {
            return firstList;
        }
        throw error;
    }
}

/**
 * Add a product to the customer's wishlist
 */
async function addToWishlist(
    context: ActionFunctionArgs['context'],
    productId: string
): Promise<WishlistActionResponse & { productList?: CustomerProductList }> {
    // Check if user is authenticated as registered customer
    if (!isRegisteredCustomer(context)) {
        return {
            success: false,
            error: createActionError({
                code: ErrorCode.NOT_AUTHENTICATED,
                message: 'You must be logged in to add items to your wishlist',
            }),
        };
    }

    const session = getAuth(context);
    if (!session.customerId) {
        return {
            success: false,
            error: createActionError({ code: ErrorCode.NOT_AUTHENTICATED, message: 'Session expired' }),
        };
    }

    try {
        const customerId = session.customerId;
        const clients = createApiClients(context);

        // Get or create the wishlist
        // getOrCreateWishlist guarantees a valid listId or throws an error
        const wishlist = await getOrCreateWishlist(context, customerId);

        // Commerce SDK might return 'id' instead of 'listId' - use 'id' if 'listId' is not available
        // @ts-expect-error - listId may exist at runtime but is not in type definitions
        const listId = wishlist.listId || wishlist.id;

        // Check if product is already in the wishlist using items from getOrCreateWishlist
        // The wishlist object already contains all items - no additional API call needed
        // @ts-expect-error - customerProductListItems may exist at runtime but is not in type definitions
        const wishlistItems = wishlist.customerProductListItems || wishlist.items || [];
        const existingItem = wishlistItems.find((item: CustomerProductListItem) => item.productId === productId);
        if (existingItem) {
            return {
                success: true, // Still success, just informational
                productList: wishlist,
                alreadyInWishlist: true,
            };
        }

        // Add the product to the wishlist using createCustomerProductListItem
        await clients.shopperCustomers.createCustomerProductListItem({
            params: {
                path: {
                    customerId,
                    listId,
                },
            },
            body: {
                productId,
                quantity: 1,
                type: 'product',
                public: false, // Required by API
                priority: 1, // Required by API
            },
        });

        // Fetch the updated wishlist using getWishlist
        // Since we just successfully added to it, the wishlist must exist
        const { wishlist: updatedList } = await getWishlist(context, customerId, listId);

        return {
            success: true,
            productList: updatedList ?? undefined,
            alreadyInWishlist: false,
        };
    } catch (error) {
        return { success: false, error: createActionError({ error }) };
    }
}

/**
 * Server action to add a product to the wishlist
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const logger = getLogger(context);

    if (request.method !== 'POST') {
        logger.warn('WishlistAdd: method not allowed', { method: request.method });
        return Response.json(
            {
                success: false,
                error: createActionError({
                    code: ErrorCode.METHOD_NOT_ALLOWED,
                    message: `Expected POST, got ${request.method}`,
                }),
            },
            { status: 405 }
        );
    }

    try {
        const formData = await request.formData();
        const rawProductId = formData.get('productId');
        const productId = typeof rawProductId === 'string' ? rawProductId.trim() : '';

        if (!productId) {
            logger.warn('WishlistAdd: missing productId');
            return Response.json(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'productId is required' }),
                },
                { status: 400 }
            );
        }

        // Basic validation: productId should be a non-empty string
        if (productId.length === 0 || productId.length > 100) {
            logger.warn('WishlistAdd: invalid productId', { productId });
            return Response.json(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'productId is required' }),
                },
                { status: 400 }
            );
        }

        logger.debug('WishlistAdd: starting', { productId });

        const result = await addToWishlist(context, productId);

        if (result.success) {
            logger.info('WishlistAdd: succeeded', { productId, alreadyInWishlist: result.alreadyInWishlist });
        } else {
            logger.warn('WishlistAdd: operation returned failure', { productId, error: result.error });
        }

        return result.success ? Response.json(result) : Response.json(result, { status: 500 });
    } catch (error) {
        logger.error('WishlistAdd: failed', { error });
        return Response.json({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
