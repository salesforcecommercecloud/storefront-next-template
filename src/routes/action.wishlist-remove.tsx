/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { type ActionFunctionArgs, data } from 'react-router';
import { type ShopperCustomers, ApiError } from '@salesforce/storefront-next-runtime/scapi';
import { getAuth } from '@/middlewares/auth.client';
import { extractStatusCode } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { isRegisteredCustomer } from '@/lib/api/customer';
import { getConfig } from '@/config';
import uiStrings from '@/temp-ui-string';

type CustomerProductList = ShopperCustomers.schemas['CustomerProductList'];
type CustomerProductListItem = ShopperCustomers.schemas['CustomerProductListItem'];

/**
 * Remove a product from the customer's wishlist
 */
async function removeFromWishlist(
    context: ActionFunctionArgs['context'],
    productId: string
): Promise<{
    success: boolean;
    productList?: CustomerProductList;
    error?: string;
}> {
    // Check if user is authenticated as registered customer
    if (!isRegisteredCustomer(context)) {
        return {
            success: false,
            error:
                uiStrings.account.wishlist.mustLoginToRemove ||
                'You must be logged in to remove items from your wishlist',
        };
    }

    const session = getAuth(context);
    if (!session.customer_id) {
        return {
            success: false,
            error: uiStrings.errors.customer.notAuthenticated,
        };
    }

    try {
        const customerId = session.customer_id;
        const clients = createApiClients(context);
        const config = getConfig(context);

        // Get the customer's product lists
        const { data: productLists } = await clients.shopperCustomers.getCustomerProductLists({
            params: {
                path: { organizationId: config.commerce.api.organizationId, customerId },
                query: { siteId: config.commerce.api.siteId },
            },
        });

        // Find the wishlist
        const wishlist = productLists?.data?.find((list) => list.type === 'wish_list');

        if (!wishlist) {
            return {
                success: false,
                error: uiStrings.account.wishlist.notFound,
            };
        }

        // Commerce SDK might return 'id' instead of 'listId' - use 'id' if 'listId' is not available
        const listId = wishlist.listId || wishlist.id;
        if (!listId) {
            return {
                success: false,
                error: uiStrings.account.wishlist.idNotFound,
            };
        }

        // Get the full wishlist to find the item
        const { data: fullWishlist } = await clients.shopperCustomers.getCustomerProductList({
            params: {
                path: {
                    organizationId: config.commerce.api.organizationId,
                    customerId,
                    listId,
                },
                query: { siteId: config.commerce.api.siteId },
            },
        });

        // Find the item in the wishlist
        const items = fullWishlist.customerProductListItems || [];
        const wishlistItem = items.find((item: CustomerProductListItem) => item.productId === productId);

        if (!wishlistItem || !wishlistItem.id) {
            return {
                success: false,
                error: uiStrings.account.wishlist.itemNotFound,
            };
        }

        // Remove the item from the wishlist using deleteCustomerProductListItem
        await clients.shopperCustomers.deleteCustomerProductListItem({
            params: {
                path: {
                    organizationId: config.commerce.api.organizationId,
                    customerId,
                    listId,
                    itemId: wishlistItem.id,
                },
                query: { siteId: config.commerce.api.siteId },
            },
        });

        // Fetch the updated wishlist to return it
        const { data: updatedList } = await clients.shopperCustomers.getCustomerProductList({
            params: {
                path: {
                    organizationId: config.commerce.api.organizationId,
                    customerId,
                    listId,
                },
                query: { siteId: config.commerce.api.siteId },
            },
        });

        return {
            success: true,
            productList: updatedList,
        };
    } catch (error) {
        let responseMessage: string | undefined;
        let status_code: string | undefined;

        if (error instanceof ApiError) {
            responseMessage = error.body?.message || error.message;
            status_code = String(error.status);
        } else {
            responseMessage = error instanceof Error ? error.message : String(error);
            status_code = extractStatusCode(error);
        }

        // Handle authentication/authorization errors
        if (status_code === '401' || status_code === '403') {
            return {
                success: false,
                error: uiStrings.errors.api.unauthorized,
            };
        }

        return {
            success: false,
            error: responseMessage || uiStrings.product.failedToRemoveFromWishlist,
        };
    }
}

/**
 * Client action to remove a product from the wishlist
 */
export async function clientAction({ request, context }: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        throw new Response(uiStrings.product.methodNotAllowed, { status: 405 });
    }

    try {
        const formData = await request.formData();
        const rawProductId = formData.get('productId');
        const productId = typeof rawProductId === 'string' ? rawProductId.trim() : '';

        if (!productId) {
            throw new Error(uiStrings.product.productIdRequired);
        }

        // Basic validation: productId should be a non-empty string
        if (productId.length === 0 || productId.length > 100) {
            throw new Error(uiStrings.product.productIdRequired);
        }

        const result = await removeFromWishlist(context, productId);

        return Response.json(result);
    } catch (error) {
        let responseMessage: string | undefined;
        let status_code: string | undefined;

        if (error instanceof ApiError) {
            responseMessage = error.body?.message || error.message;
            status_code = String(error.status);
        } else {
            responseMessage = error instanceof Error ? error.message : String(error);
            status_code = extractStatusCode(error);
        }

        return data(
            {
                success: false,
                error: responseMessage || uiStrings.errors.api.unexpectedError,
            },
            { status: status_code ? Number(status_code) : 500 }
        );
    }
}
