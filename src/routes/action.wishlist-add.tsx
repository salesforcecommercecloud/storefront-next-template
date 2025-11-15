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
    const clients = createApiClients(context);
    const config = getConfig(context);

    try {
        // Try to get the default wishlist (product list type 'wish_list')
        const { data: productLists } = await clients.shopperCustomers.getCustomerProductLists({
            params: {
                path: { organizationId: config.commerce.api.organizationId, customerId },
                query: { siteId: config.commerce.api.siteId },
            },
        });

        // Find the default wishlist
        const wishlist = productLists?.data?.find((list) => list.type === 'wish_list');

        if (wishlist) {
            return wishlist;
        }

        // Create a new wishlist if it doesn't exist
        // Commerce SDK createCustomerProductList might not return listId immediately
        // So we'll always fetch the list after creation to ensure we have the listId
        await clients.shopperCustomers.createCustomerProductList({
            params: {
                path: { organizationId: config.commerce.api.organizationId, customerId },
                query: { siteId: config.commerce.api.siteId },
            },
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
        const { data: productListsResponse } = await clients.shopperCustomers.getCustomerProductLists({
            params: {
                path: { organizationId: config.commerce.api.organizationId, customerId },
                query: { siteId: config.commerce.api.siteId },
            },
        });

        const createdWishlist = productListsResponse?.data?.find((list) => list.type === 'wish_list');
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
        const { data: productLists } = await clients.shopperCustomers.getCustomerProductLists({
            params: {
                path: { organizationId: config.commerce.api.organizationId, customerId },
                query: { siteId: config.commerce.api.siteId },
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
): Promise<{
    success: boolean;
    productList?: CustomerProductList;
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
        const clients = createApiClients(context);
        const config = getConfig(context);

        // Get or create the wishlist
        const wishlist = await getOrCreateWishlist(context, customerId);

        // Commerce SDK might return 'id' instead of 'listId' - use 'id' if 'listId' is not available
        const listId = wishlist?.listId || wishlist?.id;

        // Ensure we have a valid listId
        if (!wishlist || !listId) {
            // Try one more time to get the wishlist after a longer delay
            try {
                await new Promise((resolve) => setTimeout(resolve, WISHLIST_RETRY_DELAY_MS));
                const { data: retryProductLists } = await clients.shopperCustomers.getCustomerProductLists({
                    params: {
                        path: { organizationId: config.commerce.api.organizationId, customerId },
                        query: { siteId: config.commerce.api.siteId },
                    },
                });
                const retryWishlist = retryProductLists?.data?.find((list) => list.type === 'wish_list');
                const retryListId = retryWishlist?.id;

                if (retryWishlist && retryListId) {
                    // Use the retry wishlist instead
                    const { data: fullWishlist } = await clients.shopperCustomers.getCustomerProductList({
                        params: {
                            path: {
                                organizationId: config.commerce.api.organizationId,
                                customerId,
                                listId: retryListId,
                            },
                            query: { siteId: config.commerce.api.siteId },
                        },
                    });

                    const existingItem = fullWishlist.customerProductListItems?.find(
                        (item: CustomerProductListItem) => item.productId === productId
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
                        await clients.shopperCustomers.createCustomerProductListItem({
                            params: {
                                path: {
                                    organizationId: config.commerce.api.organizationId,
                                    customerId,
                                    listId: retryListId,
                                },
                                query: { siteId: config.commerce.api.siteId },
                            },
                            body: {
                                productId,
                                quantity: 1,
                                type: 'product',
                                public: false, // Required by API
                                priority: 1, // Required by API
                            },
                        });
                    } catch (createError) {
                        let responseMessage: string | undefined;
                        let status_code: string | undefined;

                        if (createError instanceof ApiError) {
                            responseMessage = createError.body?.message || createError.message;
                            status_code = String(createError.status);
                        } else {
                            responseMessage = createError instanceof Error ? createError.message : String(createError);
                            status_code = extractStatusCode(createError);
                        }

                        // Check if duplicate - if so, return success with alreadyInWishlist
                        if (
                            status_code === '400' &&
                            (responseMessage?.toLowerCase().includes('already') ||
                                responseMessage?.toLowerCase().includes('duplicate'))
                        ) {
                            const { data: duplicateCheckWishlist } =
                                await clients.shopperCustomers.getCustomerProductList({
                                    params: {
                                        path: {
                                            organizationId: config.commerce.api.organizationId,
                                            customerId,
                                            listId: retryListId,
                                        },
                                        query: { siteId: config.commerce.api.siteId },
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
                    const { data: updatedList } = await clients.shopperCustomers.getCustomerProductList({
                        params: {
                            path: {
                                organizationId: config.commerce.api.organizationId,
                                customerId,
                                listId: retryListId,
                            },
                            query: { siteId: config.commerce.api.siteId },
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

        const existingItem = fullWishlist.customerProductListItems?.find(
            (item: CustomerProductListItem) => item.productId === productId
        );
        if (existingItem) {
            return {
                success: true, // Still success, just informational
                productList: fullWishlist,
                alreadyInWishlist: true,
            };
        }

        // Add the product to the wishlist using createCustomerProductListItem
        let updatedList: CustomerProductList | undefined;

        try {
            await clients.shopperCustomers.createCustomerProductListItem({
                params: {
                    path: {
                        organizationId: config.commerce.api.organizationId,
                        customerId,
                        listId,
                    },
                    query: { siteId: config.commerce.api.siteId },
                },
                body: {
                    productId,
                    quantity: 1,
                    type: 'product',
                    public: false, // Required by API
                    priority: 1, // Required by API
                },
            });

            // After successful creation, check if there are now duplicates
            // (Commerce API might allow duplicates without throwing an error)
            const { data: refetchedList } = await clients.shopperCustomers.getCustomerProductList({
                params: {
                    path: {
                        organizationId: config.commerce.api.organizationId,
                        customerId,
                        listId,
                    },
                    query: { siteId: config.commerce.api.siteId },
                },
            });
            updatedList = refetchedList;

            // Check if there are multiple items with the same productId
            const itemsWithSameProductId =
                updatedList.customerProductListItems?.filter(
                    (item: CustomerProductListItem) => item.productId === productId
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

            if (createError instanceof ApiError) {
                responseMessage = createError.body?.message || createError.message;
                status_code = String(createError.status);
            } else {
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
                const { data: duplicateWishlist } = await clients.shopperCustomers.getCustomerProductList({
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
                    productList: duplicateWishlist,
                    alreadyInWishlist: true,
                };
            }

            throw createError;
        }

        // If we reach here and didn't return earlier, the item was added successfully (no duplicate)
        // Fetch the updated wishlist to return it (already fetched in the try block above)
        if (!updatedList) {
            const { data: fetchedList } = await clients.shopperCustomers.getCustomerProductList({
                params: {
                    path: {
                        organizationId: config.commerce.api.organizationId,
                        customerId,
                        listId,
                    },
                    query: { siteId: config.commerce.api.siteId },
                },
            });
            updatedList = fetchedList;
        }

        return {
            success: true,
            productList: updatedList,
            alreadyInWishlist: false,
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
                const clients = createApiClients(context);
                const config = getConfig(context);
                const wishlist = await getOrCreateWishlist(context, customerId);
                const listId = wishlist.listId || wishlist.id;
                if (listId) {
                    const { data: duplicateCheckList } = await clients.shopperCustomers.getCustomerProductList({
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
            { status: status_code ? parseInt(status_code, 10) : 500 }
        );
    }
}
