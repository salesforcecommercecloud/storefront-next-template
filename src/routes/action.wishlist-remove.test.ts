/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ActionFunctionArgs } from 'react-router';
import { clientAction } from './action.wishlist-remove';
import { createTestContext } from '@/lib/test-utils';

// Mock dependencies
const mockIsRegisteredCustomer = vi.fn();
const mockGetAuth = vi.fn();
const mockCreateApiClients = vi.fn();
const mockExtractResponseError = vi.fn();

vi.mock('@/middlewares/auth.client', () => ({
    getAuth: () => mockGetAuth(),
}));

vi.mock('@/lib/api/customer', () => ({
    isRegisteredCustomer: () => mockIsRegisteredCustomer(),
}));

vi.mock('@/lib/api-clients', () => ({
    createApiClients: () => mockCreateApiClients(),
}));

vi.mock('@/config', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        getConfig: vi.fn(() => ({
            commerce: {
                api: {
                    organizationId: 'test-org-id',
                    siteId: 'test-site-id',
                },
            },
        })),
    };
});

vi.mock('@/lib/utils', async () => {
    const actual = await vi.importActual('@/lib/utils');
    return {
        ...actual,
        extractResponseError: (...args: unknown[]) => mockExtractResponseError(...args),
    };
});

// Helper to extract JSON from Response or DataWithResponseInit
async function extractResponseData(response: any): Promise<any> {
    if (!response) {
        return response;
    }

    // Handle Response objects (from Response.json())
    if (response instanceof Response) {
        return await response.json();
    }

    // Handle DataWithResponseInit (from data())
    // In react-router, data() returns an object with the data as the first element
    // or the data might be in a body property
    if (response && typeof response === 'object') {
        // Check if response has the data directly accessible
        if (
            'success' in response ||
            ('body' in response && response.body && typeof response.body === 'object' && 'success' in response.body)
        ) {
            // Already has success property - might be the data
            if ('success' in response) {
                return response;
            }
            // Or check body
            if ('body' in response && response.body && typeof response.body === 'object') {
                if ('success' in response.body) {
                    return response.body;
                }
                // Try to parse body as JSON string
                if (typeof response.body === 'string') {
                    try {
                        return JSON.parse(response.body);
                    } catch {
                        return response.body;
                    }
                }
            }
        }

        // Try to find json method
        if ('json' in response && typeof response.json === 'function') {
            try {
                return await response.json();
            } catch {
                // Continue to other checks
            }
        }
    }

    // Fallback: return as-is
    return response;
}

describe('action.wishlist-remove', () => {
    const mockContext = createTestContext();
    let mockShopperCustomers: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        mockIsRegisteredCustomer.mockReturnValue(true);
        mockGetAuth.mockReturnValue({
            customer_id: 'customer-123',
            userType: 'registered',
            access_token: 'token-123',
        } as any);

        mockExtractResponseError.mockResolvedValue({
            responseMessage: 'Default error message',
            status_code: '500',
        });

        mockShopperCustomers = {
            getCustomerProductLists: vi.fn(),
            getCustomerProductList: vi.fn(),
            deleteCustomerProductListItem: vi.fn(),
        };

        mockCreateApiClients.mockReturnValue({
            shopperCustomers: mockShopperCustomers,
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('clientAction', () => {
        const createRequest = (productId?: string): Request => {
            const formData = new FormData();
            if (productId) {
                formData.append('productId', productId);
            }
            return new Request('http://localhost/action/wishlist-remove', {
                method: 'POST',
                body: formData,
            });
        };

        test('should return error for non-POST requests', async () => {
            const request = new Request('http://localhost/action/wishlist-remove', {
                method: 'GET',
            });
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
            };

            await expect(clientAction(args)).rejects.toThrow();
        });

        test('should return error when productId is missing', async () => {
            const request = createRequest();
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
            };

            // When productId is missing, Error is thrown and caught
            // extractResponseError might fail, so the catch block falls back to error.message
            mockExtractResponseError.mockRejectedValueOnce(new Error('Response body already read'));

            const response = await clientAction(args);
            expect(response).toBeDefined();

            // data() returns DataWithResponseInit which has structure: { type: 'DataWithResponseInit', data: {...}, init: {...} }
            // Extract the data from the response
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else if (response && typeof response === 'object' && 'data' in response) {
                json = (response as any).data;
            } else {
                json = await extractResponseData(response);
            }

            expect(json).toBeDefined();
            expect(typeof json).toBe('object');
            expect(json).toHaveProperty('success');
            expect(json.success).toBe(false);
            expect(json).toHaveProperty('error');
        });

        test('should return error when user is not authenticated', async () => {
            mockIsRegisteredCustomer.mockReturnValue(false);
            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
            };

            const response = await clientAction(args);
            // data() returns DataWithResponseInit with data property
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else if (response && typeof response === 'object' && 'data' in response) {
                json = (response as any).data;
            } else {
                json = await extractResponseData(response);
            }
            expect(json.success).toBe(false);
            expect(json.error).toBeDefined();
        });

        test('should successfully remove product from wishlist', async () => {
            const wishlist = {
                id: 'wishlist-123',
                listId: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                items: [{ id: 'item-123', productId: 'product-123' }],
                customerProductListItems: [{ id: 'item-123', productId: 'product-123' }],
            };

            const wishlistAfterRemoval = {
                ...wishlist,
                items: [],
                customerProductListItems: [],
            };

            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: { data: [{ id: 'wishlist-123', listId: 'wishlist-123', type: 'wish_list' }] },
            });

            // First call: get full wishlist to find the item to remove (line 81)
            // Second call: get updated wishlist after removal (line 125)
            mockShopperCustomers.getCustomerProductList
                .mockResolvedValueOnce({ data: wishlist } as any)
                .mockResolvedValueOnce({ data: wishlistAfterRemoval } as any);

            mockShopperCustomers.deleteCustomerProductListItem.mockResolvedValue({
                data: {},
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
            };

            const response = await clientAction(args);
            // Response.json() returns a Response, so we extract JSON from it
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else {
                json = await extractResponseData(response);
            }
            expect(json.success).toBe(true);
            expect(mockShopperCustomers.deleteCustomerProductListItem).toHaveBeenCalledWith({
                params: {
                    path: expect.objectContaining({
                        customerId: 'customer-123',
                        listId: 'wishlist-123',
                        itemId: 'item-123',
                    }),
                    query: expect.any(Object),
                },
            });
        });

        test('should return error when wishlist is not found', async () => {
            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: { data: [] },
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
            };

            const response = await clientAction(args);
            // Handle both Response.json() and data() return types
            const result = response instanceof Response ? await response.json() : response;
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should return error when item is not found in wishlist', async () => {
            const wishlist = {
                id: 'wishlist-123',
                listId: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                items: [{ id: 'item-456', productId: 'product-456' }],
            };

            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: { data: [{ id: 'wishlist-123', listId: 'wishlist-123', type: 'wish_list' }] },
            });

            // Note: Commerce SDK getCustomerProductList returns the data directly (unwrapped)
            mockShopperCustomers.getCustomerProductList.mockResolvedValue({ data: wishlist } as any);

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
            };

            const response = await clientAction(args);
            // Handle both Response.json() and data() return types
            const result = response instanceof Response ? await response.json() : response;
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should handle API errors gracefully', async () => {
            mockShopperCustomers.getCustomerProductLists.mockRejectedValue(new Error('API Error'));

            mockExtractResponseError.mockResolvedValue({
                responseMessage: 'Failed to remove from wishlist',
                status_code: '500',
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
            };

            const response = await clientAction(args);
            // data() returns DataWithResponseInit with data property
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else if (response && typeof response === 'object' && 'data' in response) {
                json = (response as any).data;
            } else {
                json = await extractResponseData(response);
            }
            expect(json).toBeDefined();
            expect(json.success).toBe(false);
            expect(json.error).toBeDefined();
        });

        test('should handle 403 authentication errors in catch block', async () => {
            mockShopperCustomers.getCustomerProductLists.mockRejectedValue(new Error('Forbidden'));

            mockExtractResponseError.mockResolvedValue({
                responseMessage: 'Forbidden',
                status_code: '403',
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
            };

            const response = await clientAction(args);
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else if (response && typeof response === 'object' && 'data' in response) {
                json = (response as any).data;
            } else {
                json = await extractResponseData(response);
            }
            expect(json.success).toBe(false);
            expect(json.error).toBeDefined();
            expect(typeof json.error).toBe('string');
        });

        test('should find items in customerProductListItems field when items is empty', async () => {
            // Note: The code checks fullWishlist.items first, then customerProductListItems
            // So we need items to be empty/falsy and customerProductListItems to have the item
            const wishlistWithItemsInAltField = {
                id: 'wishlist-123',
                listId: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                items: undefined, // Explicitly undefined so || operator works
                customerProductListItems: [{ id: 'item-123', productId: 'product-123' }], // Items in alternative field
            } as any; // Use any to include customerProductListItems which may not be in the type

            const wishlistAfterRemoval = {
                id: 'wishlist-123',
                listId: 'wishlist-123',
                type: 'wish_list',
                name: 'Wishlist',
                items: [],
                customerProductListItems: [],
            };

            mockShopperCustomers.getCustomerProductLists.mockResolvedValue({
                data: { data: [{ id: 'wishlist-123', listId: 'wishlist-123', type: 'wish_list' }] },
            });

            // First call: get full wishlist to find the item (line 81)
            // Second call: get updated wishlist after removal (line 125)
            mockShopperCustomers.getCustomerProductList
                .mockResolvedValueOnce({ data: wishlistWithItemsInAltField })
                .mockResolvedValueOnce({ data: wishlistAfterRemoval } as any);

            mockShopperCustomers.deleteCustomerProductListItem.mockResolvedValue({
                data: {},
            });

            const request = createRequest('product-123');
            const args: ActionFunctionArgs = {
                request,
                context: mockContext,
                params: {},
            };

            const response = await clientAction(args);
            // Success path returns Response.json(), so we need to parse it
            let json: any;
            if (response instanceof Response) {
                json = await response.json();
            } else if (response && typeof response === 'object' && 'data' in response) {
                json = (response as any).data;
            } else {
                json = await extractResponseData(response);
            }
            expect(json).toBeDefined();
            expect(json.success).toBe(true);
            expect(mockShopperCustomers.deleteCustomerProductListItem).toHaveBeenCalledWith({
                params: {
                    path: expect.objectContaining({
                        customerId: 'customer-123',
                        listId: 'wishlist-123',
                        itemId: 'item-123',
                    }),
                    query: expect.any(Object),
                },
            });
        });
    });
});
