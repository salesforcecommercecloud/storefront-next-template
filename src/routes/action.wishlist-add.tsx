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
): Promise<ShopperCustomersTypes.CustomerProductList> {
    const client = createClient(context).ShopperCustomers;

    try {
        // Try to get the default wishlist (product list type 'wish_list')
        const productLists = await client.getCustomerProductLists({
            parameters: { customerId },
        });

        // Find the default wishlist
        const wishlist = productLists.data?.find((list) => list.type === 'wish_list');

        if (wishlist) {
            return wishlist;
        }

        // Create a new wishlist if it doesn't exist
        // Commerce SDK createCustomerProductList might not return listId immediately
        // So we'll always fetch the list after creation to ensure we have the listId
        await client.createCustomerProductList({
            parameters: { customerId },
            body: {
                type: 'wish_list',
                public: false,
                name: uiStrings.account.wishlist.wishlistName,
            },
        });

        // Wait for the list to be fully created and indexed in Commerce Cloud
        // This is necessary because Commerce Cloud may not return listId in the create response
        await new Promise((resolve) => setTimeout(resolve, WISHLIST_CREATION_DELAY_MS));

        // Fetch the newly created wishlist
        const productListsResponse = await client.getCustomerProductLists({
            parameters: { customerId },
        });

        const createdWishlist = productListsResponse.data?.find((list) => list.type === 'wish_list');
        // Commerce SDK might return 'id' instead of 'listId' - check both
        const createdListId = createdWishlist?.listId || createdWishlist?.id;

        if (!createdWishlist || !createdListId) {
            throw new Error(
                uiStrings.account.wishlist.failedToCreate ||
                    'Failed to create wishlist: listId not available after creation'
            );
        }
        return createdWishlist;
    } catch (error) {
        // If creating fails, try to get the first available list
        const productLists = await client.getCustomerProductLists({
            parameters: { customerId },
        });
        const firstList = productLists.data?.[0];
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
): Promise<{
    success: boolean;
    productList?: ShopperCustomersTypes.CustomerProductList;
    error?: string;
    alreadyInWishlist?: boolean;
}> {
    // Check if user is authenticated as registered customer
    if (!isRegisteredCustomer(context)) {
        return {
            success: false,
            error: uiStrings.errors.api.unauthorized,
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

        // Get or create the wishlist
        const wishlist = await getOrCreateWishlist(context, customerId);

        // Commerce SDK might return 'id' instead of 'listId' - use 'id' if 'listId' is not available
        const listId = wishlist?.listId || wishlist?.id;

        // Ensure we have a valid listId
        if (!wishlist || !listId) {
            // Try one more time to get the wishlist after a longer delay
            try {
                await new Promise((resolve) => setTimeout(resolve, WISHLIST_RETRY_DELAY_MS));
                const retryProductLists = await client.getCustomerProductLists({
                    parameters: { customerId },
                });
                const retryWishlist = retryProductLists.data?.find((list) => list.type === 'wish_list');
                const retryListId = retryWishlist?.listId || retryWishlist?.id;

                if (retryWishlist && retryListId) {
                    // Use the retry wishlist instead
                    const fullWishlist = await client.getCustomerProductList({
                        parameters: {
                            customerId,
                            listId: retryListId,
                        },
                    });

                    const existingItem = fullWishlist.items?.find(
                        (item: ShopperCustomersTypes.CustomerProductListItem) => item.productId === productId
                    );
                    if (existingItem) {
                        return {
                            success: true,
                            productList: fullWishlist,
                            alreadyInWishlist: true,
                        };
                    }

                    // Add the product to the wishlist using createCustomerProductListItem
                    try {
                        await client.createCustomerProductListItem({
                            parameters: {
                                customerId,
                                listId: retryListId,
                            },
                            body: {
                                product_id: productId,
                                quantity: 1,
                                type: 'product',
                                public: false, // Required by API
                                priority: 0, // Required by API
                            } as Parameters<typeof client.createCustomerProductListItem>[0]['body'],
                        });
                    } catch (createError) {
                        let responseMessage: string | undefined;
                        let status_code: string | undefined;

                        try {
                            const extracted = await extractResponseError(createError);
                            responseMessage = extracted.responseMessage;
                            status_code = extracted.status_code;
                        } catch {
                            // Response body may already be read, fall back to error message
                            responseMessage = createError instanceof Error ? createError.message : String(createError);
                            status_code = extractStatusCode(createError);
                        }

                        // Check if duplicate - if so, return success with alreadyInWishlist
                        if (
                            status_code === '400' &&
                            (responseMessage?.toLowerCase().includes('already') ||
                                responseMessage?.toLowerCase().includes('duplicate'))
                        ) {
                            const duplicateCheckWishlist = await client.getCustomerProductList({
                                parameters: {
                                    customerId,
                                    listId: retryListId,
                                },
                            });
                            return {
                                success: true,
                                productList: duplicateCheckWishlist,
                                alreadyInWishlist: true,
                            };
                        }
                        throw createError;
                    }

                    // Fetch the updated wishlist to return it
                    const updatedList = await client.getCustomerProductList({
                        parameters: {
                            customerId,
                            listId: retryListId,
                        },
                    });

                    return {
                        success: true,
                        productList: updatedList,
                        alreadyInWishlist: false,
                    };
                }
            } catch {
                // Retry failed, fall through to error
            }

            return {
                success: false,
                error:
                    uiStrings.account.wishlist.unableToRetrieveId ||
                    'Unable to retrieve wishlist ID. Please try again.',
            };
        }

        // Check if product is already in the wishlist
        const fullWishlist = await client.getCustomerProductList({
            parameters: {
                customerId,
                listId,
            },
        });

        const existingItem = fullWishlist.items?.find(
            (item: ShopperCustomersTypes.CustomerProductListItem) => item.productId === productId
        );
        if (existingItem) {
            return {
                success: true, // Still success, just informational
                productList: fullWishlist,
                alreadyInWishlist: true,
            };
        }

        // Add the product to the wishlist using createCustomerProductListItem
        let updatedList: ShopperCustomersTypes.CustomerProductList | undefined;

        try {
            await client.createCustomerProductListItem({
                parameters: {
                    customerId,
                    listId,
                },
                body: {
                    product_id: productId,
                    quantity: 1,
                    type: 'product',
                    public: false, // Required by API
                    priority: 0, // Required by API
                } as Parameters<typeof client.createCustomerProductListItem>[0]['body'],
            });

            // After successful creation, check if there are now duplicates
            // (Commerce API might allow duplicates without throwing an error)
            updatedList = await client.getCustomerProductList({
                parameters: {
                    customerId,
                    listId,
                },
            });

            // Check if there are multiple items with the same productId
            const itemsWithSameProductId =
                updatedList.items?.filter(
                    (item: ShopperCustomersTypes.CustomerProductListItem) => item.productId === productId
                ) || [];

            if (itemsWithSameProductId.length > 1) {
                // Product was already in wishlist, now we have a duplicate
                return {
                    success: true,
                    productList: updatedList,
                    alreadyInWishlist: true,
                };
            }
        } catch (createError) {
            let responseMessage: string | undefined;
            let status_code: string | undefined;

            try {
                const extracted = await extractResponseError(createError);
                responseMessage = extracted.responseMessage;
                status_code = extracted.status_code;
            } catch {
                // Response body may already be read, fall back to error message
                responseMessage = createError instanceof Error ? createError.message : String(createError);
                status_code = extractStatusCode(createError);
            }

            // Check if it's a duplicate error
            if (
                status_code === '400' &&
                (responseMessage?.toLowerCase().includes('already') ||
                    responseMessage?.toLowerCase().includes('duplicate') ||
                    responseMessage?.toLowerCase().includes('exists'))
            ) {
                // Product already in wishlist - return success with alreadyInWishlist flag
                const duplicateWishlist = await client.getCustomerProductList({
                    parameters: {
                        customerId,
                        listId,
                    },
                });
                return {
                    success: true,
                    productList: duplicateWishlist,
                    alreadyInWishlist: true,
                };
            }

            throw createError;
        }

        // If we reach here and didn't return earlier, the item was added successfully (no duplicate)
        // Fetch the updated wishlist to return it (already fetched in the try block above)
        if (!updatedList) {
            updatedList = await client.getCustomerProductList({
                parameters: {
                    customerId,
                    listId,
                },
            });
        }

        return {
            success: true,
            productList: updatedList,
            alreadyInWishlist: false,
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

        // Check if error is due to duplicate item (common API patterns)
        const isDuplicateError =
            status_code === '400' &&
            (responseMessage?.toLowerCase().includes('already exists') ||
                responseMessage?.toLowerCase().includes('duplicate') ||
                responseMessage?.toLowerCase().includes('already in'));

        if (isDuplicateError && session.customer_id) {
            // Try to get the current wishlist to return it
            try {
                const customerId = session.customer_id;
                const client = createClient(context).ShopperCustomers;
                const wishlist = await getOrCreateWishlist(context, customerId);
                const listId = wishlist.listId || wishlist.id;
                if (listId) {
                    const duplicateCheckList = await client.getCustomerProductList({
                        parameters: {
                            customerId,
                            listId,
                        },
                    });
                    return {
                        success: true,
                        productList: duplicateCheckList,
                        alreadyInWishlist: true,
                    };
                }
            } catch {
                // Fall through to error case
            }
        }

        return {
            success: false,
            error: responseMessage || uiStrings.product.failedToAddToWishlist,
        };
    }
}

/**
 * Client action to add a product to the wishlist
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

        const result = await addToWishlist(context, productId);

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
            { status: status_code ? parseInt(status_code, 10) : 500 }
        );
    }
}
