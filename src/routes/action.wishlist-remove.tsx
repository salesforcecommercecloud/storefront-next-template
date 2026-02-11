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
import { type ActionFunctionArgs, data } from 'react-router';
import { type ShopperCustomers, ApiError } from '@salesforce/storefront-next-runtime/scapi';
import { getAuth } from '@/middlewares/auth.server';
import { extractStatusCode } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { isRegisteredCustomer } from '@/lib/api/customer';
import { getTranslation } from '@/lib/i18next';
import { getWishlist } from '@/lib/api/wishlist';

type CustomerProductList = ShopperCustomers.schemas['CustomerProductList'];
type CustomerProductListItem = ShopperCustomers.schemas['CustomerProductListItem'];

/**
 * Remove a product from the customer's wishlist
 *
 * This action supports both itemId and productId parameters because different pages
 * have access to different identifiers:
 * - Product list pages (e.g., search results, category pages) have product IDs but not wishlist item IDs
 * - Wishlist page has access to wishlist item IDs, which allows for more efficient direct deletion
 *
 * @param context - The action function context
 * @param itemId - The wishlist item ID (preferred for direct deletion when available)
 * @param productId - The product ID (fallback when itemId is not available, requires lookup)
 */
async function removeFromWishlist(
    context: ActionFunctionArgs['context'],
    itemId?: string,
    productId?: string
): Promise<{
    success: boolean;
    productList?: CustomerProductList;
    error?: string;
}> {
    const { t } = getTranslation();

    // TODO: revisit the error messages returned from this function
    // Since they will be shown in a toast UI, make sure that the errors are appropriate for the end users.
    // Some of them are meant for developers only, and some are API errors that should not be leaked for security concern.

    // Validate that at least one identifier is provided
    if (!itemId && !productId) {
        return {
            success: false,
            error: t('product:productOrItemIdRequired'),
        };
    }

    // Check if user is authenticated as registered customer
    if (!isRegisteredCustomer(context)) {
        return {
            success: false,
            error:
                t('account:wishlist.mustLoginToRemove') || 'You must be logged in to remove items from your wishlist',
        };
    }

    const session = getAuth(context);
    if (!session.customerId) {
        return {
            success: false,
            error: t('errors:customer.notAuthenticated'),
        };
    }

    try {
        const customerId = session.customerId;
        const clients = createApiClients(context);

        const { wishlist, items, id: listId } = await getWishlist(context, customerId);

        if (!wishlist) {
            return {
                success: false,
                error: t('account:wishlist.notFound'),
            };
        }

        if (!listId) {
            return {
                success: false,
                error: t('account:wishlist.idNotFound'),
            };
        }

        // Determine the itemId to use for deletion
        let wishlistItemId: string | undefined = itemId;

        // If itemId not provided, we need to look it up using productId
        //
        // Note: The SFCC deleteCustomerProductListItem API requires an itemId (the unique identifier
        // of the wishlist item), not a productId. We look through the items we already have from
        // getWishlist() to find the item that matches the productId, then extract its itemId to
        // perform the deletion.
        if (!wishlistItemId && productId) {
            const wishlistItem = items.find((item: CustomerProductListItem) => item.productId === productId);

            if (!wishlistItem || !wishlistItem.id) {
                return {
                    success: false,
                    error: t('account:wishlist.itemNotFound'),
                };
            }

            wishlistItemId = wishlistItem.id;
        }

        // This should never happen due to early validation, but TypeScript needs this check
        if (!wishlistItemId) {
            return {
                success: false,
                error: t('account:wishlist.itemNotFound'),
            };
        }

        // Remove the item from the wishlist using deleteCustomerProductListItem
        // Note: The deleteCustomerProductListItem API returns a 204 No Content response with no data,
        // so we need to refetch the wishlist to get the updated state and return it to the caller
        await clients.shopperCustomers.deleteCustomerProductListItem({
            params: {
                path: {
                    customerId,
                    listId,
                    itemId: wishlistItemId,
                },
            },
        });

        // Fetch the updated wishlist to return it
        const { wishlist: updatedList } = await getWishlist(context, customerId, listId);

        return {
            success: true,
            productList: updatedList ?? undefined,
        };
    } catch (error) {
        let responseMessage: string | undefined;
        let status_code: string | undefined;

        if (error instanceof ApiError) {
            responseMessage = (error.body?.message as string | undefined) || error.message;
            status_code = String(error.status);
        } else {
            responseMessage = error instanceof Error ? error.message : String(error);
            status_code = extractStatusCode(error);
        }

        // Handle authentication/authorization errors
        if (status_code === '401' || status_code === '403') {
            return {
                success: false,
                error: t('errors:api.unauthorized'),
            };
        }

        return {
            success: false,
            error: responseMessage || t('product:failedToRemoveFromWishlist'),
        };
    }
}

/**
 * Server action to remove a product from the wishlist
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const { t } = getTranslation();

    if (request.method !== 'POST') {
        throw new Response(t('product:methodNotAllowed'), { status: 405 });
    }

    try {
        const formData = await request.formData();

        // Extract both itemId and productId (at least one is required)
        const rawItemId = formData.get('itemId');
        const itemId = typeof rawItemId === 'string' ? rawItemId.trim() : undefined;

        const rawProductId = formData.get('productId');
        const productId = typeof rawProductId === 'string' ? rawProductId.trim() : undefined;

        // Validate that at least one identifier is provided
        if (!itemId && !productId) {
            throw new Error(t('product:productOrItemIdRequired'));
        }

        // Basic validation: IDs should be non-empty strings within reasonable length
        if (
            (itemId && (itemId.length === 0 || itemId.length > 100)) ||
            (productId && (productId.length === 0 || productId.length > 100))
        ) {
            throw new Error(t('product:productOrItemIdRequired'));
        }

        const result = await removeFromWishlist(context, itemId, productId);

        return Response.json(result);
    } catch (error) {
        let responseMessage: string | undefined;
        let status_code: string | undefined;

        if (error instanceof ApiError) {
            responseMessage = (error.body?.message as string | undefined) || error.message;
            status_code = String(error.status);
        } else {
            responseMessage = error instanceof Error ? error.message : String(error);
            status_code = extractStatusCode(error);
        }

        return data(
            {
                success: false,
                error: responseMessage || t('errors:api.unexpectedError'),
            },
            { status: status_code ? Number(status_code) : 500 }
        );
    }
}
