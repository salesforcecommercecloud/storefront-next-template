/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { type ActionFunctionArgs, data } from 'react-router';
import type { ShopperCustomersTypes } from 'commerce-sdk-isomorphic';
import { getAuth } from '@/middlewares/auth.client';
import { extractResponseError, extractStatusCode } from '@/lib/utils';
import createClient from '@/lib/scapi';
import { isRegisteredCustomer } from '@/lib/api/customer';
import uiStrings from '@/temp-ui-string';

/**
 * Remove a product from the customer's wishlist
 */
async function removeFromWishlist(
    context: ActionFunctionArgs['context'],
    productId: string
): Promise<{
    success: boolean;
    productList?: ShopperCustomersTypes.CustomerProductList;
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
        const client = createClient(context).ShopperCustomers;

        // Get the customer's product lists
        const productLists = await client.getCustomerProductLists({
            parameters: { customerId },
        });

        // Find the wishlist
        const wishlist = productLists.data?.find((list) => list.type === 'wish_list');

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

        // Find the item in the wishlist - check both 'items' and 'customerProductListItems' fields
        const items = fullWishlist.items || fullWishlist.customerProductListItems || [];
        const wishlistItem = items.find(
            (item: ShopperCustomersTypes.CustomerProductListItem) => item.productId === productId
        );

        if (!wishlistItem) {
            return {
                success: false,
                error: uiStrings.account.wishlist.itemNotFound,
            };
        }

        // Remove the item from the wishlist using deleteCustomerProductListItem
        await client.deleteCustomerProductListItem({
            parameters: {
                customerId,
                listId,
                itemId: wishlistItem.id,
            },
        });

        // Fetch the updated wishlist to return it
        const updatedList = await client.getCustomerProductList({
            parameters: {
                customerId,
                listId,
            },
        });

        return {
            success: true,
            productList: updatedList,
        };
    } catch (error) {
        let responseMessage: string | undefined;
        let status_code: string | undefined;

        try {
            const extracted = await extractResponseError(error);
            responseMessage = extracted.responseMessage;
            status_code = extracted.status_code;
        } catch {
            // Response body may already be read, fall back to error message
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

        try {
            const extracted = await extractResponseError(error);
            responseMessage = extracted.responseMessage;
            status_code = extracted.status_code;
        } catch {
            // Response body may already be read, fall back to error message
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
