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

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ShopperCustomers, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { loader } from './_app.account.wishlist';
import { fetchProductsForWishlist } from '@/lib/api/wishlist';
import { createTestContext } from '@/lib/test-utils';
import type { LoaderFunctionArgs } from 'react-router';
import { getTranslation } from '@/lib/i18next';

const { t } = getTranslation();

// Mock the SCAPI client
const mockGetProducts = vi.fn();
const mockGetCustomerProductLists = vi.fn();
const mockGetCustomerProductList = vi.fn();

// Mock createApiClients
vi.mock('@/lib/api-clients', () => ({
    createApiClients: () => ({
        shopperProducts: {
            getProducts: mockGetProducts,
        },
        shopperCustomers: {
            getCustomerProductLists: mockGetCustomerProductLists,
            getCustomerProductList: mockGetCustomerProductList,
        },
    }),
}));

// Mock Skeleton component
vi.mock('@/components/ui/skeleton', () => ({
    Skeleton: ({ className, children, ...props }: any) => (
        <div data-testid="skeleton" className={className} {...props}>
            {children}
        </div>
    ),
}));

// Mock ProductCarouselSkeleton
vi.mock('@/components/product-carousel/skeleton', () => ({
    default: () => <div data-testid="product-carousel-skeleton">Product Carousel Skeleton</div>,
}));

// Mock auth functions
const mockGetAuthServer = vi.fn();
const mockGetAuth = vi.fn();
const mockIsRegisteredCustomer = vi.fn();
const mockGetConfig = vi.fn();

vi.mock('@/middlewares/auth.server', () => ({
    getAuth: () => mockGetAuthServer(),
}));

vi.mock('@/config', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/config')>();
    return {
        ...actual,
        getConfig: () => mockGetConfig(),
        useConfig: () => mockGetConfig(),
    };
});

describe('fetchProductsForWishlist', () => {
    const mockContext = createTestContext();

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetConfig.mockReturnValue({
            global: {
                productListing: {
                    productsPerPage: 24,
                },
            },
            commerce: {
                api: {
                    proxy: '/mobify/proxy/api',
                    organizationId: 'test-org-id',
                    siteId: 'test-site-id',
                },
            },
        });
    });

    describe('batching logic', () => {
        test('should make a single request when product IDs count is within productsPerPage limit', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = Array.from({ length: 24 }, (_, i) => ({
                id: `item-${i}`,
                productId: `product-${i}`,
                priority: 0,
                public: false,
                quantity: 1,
            }));

            const mockProducts: ShopperProducts.schemas['Product'][] = items
                .filter((item) => item.productId)
                .map((item) => ({
                    id: item.productId as string,
                    name: `Product ${item.productId}`,
                }));

            mockGetProducts.mockResolvedValue({
                data: { data: mockProducts },
            });

            const result = await fetchProductsForWishlist(mockContext, items);

            expect(mockGetProducts).toHaveBeenCalledTimes(1);
            expect(mockGetProducts).toHaveBeenCalledWith({
                params: {
                    query: {
                        ids: items.map((item) => item.productId),
                        allImages: true,
                        perPricebook: true,
                        currency: 'USD',
                    },
                },
            });
            expect(Object.keys(result)).toHaveLength(24);
        });

        test('should batch requests when product IDs exceed productsPerPage limit', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = Array.from({ length: 50 }, (_, i) => ({
                id: `item-${i}`,
                productId: `product-${i}`,
                priority: 0,
                public: false,
                quantity: 1,
            }));

            // Mock responses for each batch
            mockGetProducts
                .mockResolvedValueOnce({
                    data: {
                        data: Array.from({ length: 24 }, (_, i) => ({
                            id: `product-${i}`,
                            name: `Product ${i}`,
                        })),
                    },
                })
                .mockResolvedValueOnce({
                    data: {
                        data: Array.from({ length: 24 }, (_, i) => ({
                            id: `product-${i + 24}`,
                            name: `Product ${i + 24}`,
                        })),
                    },
                })
                .mockResolvedValueOnce({
                    data: {
                        data: Array.from({ length: 2 }, (_, i) => ({
                            id: `product-${i + 48}`,
                            name: `Product ${i + 48}`,
                        })),
                    },
                });

            const result = await fetchProductsForWishlist(mockContext, items);

            // Should make 3 requests: 24 + 24 + 2
            expect(mockGetProducts).toHaveBeenCalledTimes(3);

            // Verify first batch
            expect(mockGetProducts).toHaveBeenNthCalledWith(1, {
                params: {
                    query: {
                        ids: Array.from({ length: 24 }, (_, i) => `product-${i}`),
                        allImages: true,
                        perPricebook: true,
                        currency: 'USD',
                    },
                },
            });

            // Verify second batch
            expect(mockGetProducts).toHaveBeenNthCalledWith(2, {
                params: {
                    query: {
                        ids: Array.from({ length: 24 }, (_, i) => `product-${i + 24}`),
                        allImages: true,
                        perPricebook: true,
                        currency: 'USD',
                    },
                },
            });

            // Verify third batch
            expect(mockGetProducts).toHaveBeenNthCalledWith(3, {
                params: {
                    query: {
                        ids: Array.from({ length: 2 }, (_, i) => `product-${i + 48}`),
                        allImages: true,
                        perPricebook: true,
                        currency: 'USD',
                    },
                },
            });

            // Should return all 50 products
            expect(Object.keys(result)).toHaveLength(50);
        });

        test('should handle exactly 25 product IDs (requires 2 batches)', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = Array.from({ length: 25 }, (_, i) => ({
                id: `item-${i}`,
                productId: `product-${i}`,
                priority: 0,
                public: false,
                quantity: 1,
            }));

            mockGetProducts
                .mockResolvedValueOnce({
                    data: {
                        data: Array.from({ length: 24 }, (_, i) => ({
                            id: `product-${i}`,
                            name: `Product ${i}`,
                        })),
                    },
                })
                .mockResolvedValueOnce({
                    data: {
                        data: [
                            {
                                id: 'product-24',
                                name: 'Product 24',
                            },
                        ],
                    },
                });

            const result = await fetchProductsForWishlist(mockContext, items);

            expect(mockGetProducts).toHaveBeenCalledTimes(2);
            expect(Object.keys(result)).toHaveLength(25);
        });
    });

    describe('product ID validation', () => {
        test('should filter out null product IDs', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = [
                { id: 'item-1', productId: 'product-1', priority: 0, public: false, quantity: 1 },
                { id: 'item-2', productId: null as any, priority: 0, public: false, quantity: 1 },
                { id: 'item-3', productId: 'product-3', priority: 0, public: false, quantity: 1 },
            ];

            mockGetProducts.mockResolvedValue({
                data: {
                    data: [
                        { id: 'product-1', name: 'Product 1' },
                        { id: 'product-3', name: 'Product 3' },
                    ],
                },
            });

            const result = await fetchProductsForWishlist(mockContext, items);

            expect(mockGetProducts).toHaveBeenCalledWith({
                params: {
                    query: {
                        ids: ['product-1', 'product-3'],
                        allImages: true,
                        perPricebook: true,
                        currency: 'USD',
                    },
                },
            });
            expect(Object.keys(result)).toHaveLength(2);
        });

        test('should filter out undefined product IDs', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = [
                { id: 'item-1', productId: 'product-1', priority: 0, public: false, quantity: 1 },
                { id: 'item-2', productId: undefined as any, priority: 0, public: false, quantity: 1 },
                { id: 'item-3', productId: 'product-3', priority: 0, public: false, quantity: 1 },
            ];

            mockGetProducts.mockResolvedValue({
                data: {
                    data: [
                        { id: 'product-1', name: 'Product 1' },
                        { id: 'product-3', name: 'Product 3' },
                    ],
                },
            });

            const result = await fetchProductsForWishlist(mockContext, items);

            expect(mockGetProducts).toHaveBeenCalledWith({
                params: {
                    query: {
                        ids: ['product-1', 'product-3'],
                        allImages: true,
                        perPricebook: true,
                        currency: 'USD',
                    },
                },
            });
            expect(Object.keys(result)).toHaveLength(2);
        });

        test('should filter out empty string product IDs', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = [
                { id: 'item-1', productId: 'product-1', priority: 0, public: false, quantity: 1 },
                { id: 'item-2', productId: '', priority: 0, public: false, quantity: 1 },
                { id: 'item-3', productId: 'product-3', priority: 0, public: false, quantity: 1 },
            ];

            mockGetProducts.mockResolvedValue({
                data: {
                    data: [
                        { id: 'product-1', name: 'Product 1' },
                        { id: 'product-3', name: 'Product 3' },
                    ],
                },
            });

            const result = await fetchProductsForWishlist(mockContext, items);

            expect(mockGetProducts).toHaveBeenCalledWith({
                params: {
                    query: {
                        ids: ['product-1', 'product-3'],
                        allImages: true,
                        perPricebook: true,
                        currency: 'USD',
                    },
                },
            });
            expect(Object.keys(result)).toHaveLength(2);
        });

        test('should filter out whitespace-only product IDs', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = [
                { id: 'item-1', productId: 'product-1', priority: 0, public: false, quantity: 1 },
                { id: 'item-2', productId: '   ', priority: 0, public: false, quantity: 1 },
                { id: 'item-3', productId: '\t\n', priority: 0, public: false, quantity: 1 },
                { id: 'item-4', productId: 'product-4', priority: 0, public: false, quantity: 1 },
            ];

            mockGetProducts.mockResolvedValue({
                data: {
                    data: [
                        { id: 'product-1', name: 'Product 1' },
                        { id: 'product-4', name: 'Product 4' },
                    ],
                },
            });

            const result = await fetchProductsForWishlist(mockContext, items);

            expect(mockGetProducts).toHaveBeenCalledWith({
                params: {
                    query: {
                        ids: ['product-1', 'product-4'],
                        allImages: true,
                        perPricebook: true,
                        currency: 'USD',
                    },
                },
            });
            expect(Object.keys(result)).toHaveLength(2);
        });

        test('should return empty object when all product IDs are invalid', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = [
                { id: 'item-1', productId: null as any, priority: 0, public: false, quantity: 1 },
                { id: 'item-2', productId: '', priority: 0, public: false, quantity: 1 },
                { id: 'item-3', productId: '   ', priority: 0, public: false, quantity: 1 },
            ];

            const result = await fetchProductsForWishlist(mockContext, items);

            expect(mockGetProducts).not.toHaveBeenCalled();
            expect(result).toEqual({});
        });
    });

    describe('error handling', () => {
        test('should continue processing other batches when one batch fails', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = Array.from({ length: 50 }, (_, i) => ({
                id: `item-${i}`,
                productId: `product-${i}`,
                priority: 0,
                public: false,
                quantity: 1,
            }));

            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // First batch succeeds, second batch fails, third batch succeeds
            mockGetProducts
                .mockResolvedValueOnce({
                    data: {
                        data: Array.from({ length: 24 }, (_, i) => ({
                            id: `product-${i}`,
                            name: `Product ${i}`,
                        })),
                    },
                })
                .mockRejectedValueOnce(new Error('API Error'))
                .mockResolvedValueOnce({
                    data: {
                        data: Array.from({ length: 2 }, (_, i) => ({
                            id: `product-${i + 48}`,
                            name: `Product ${i + 48}`,
                        })),
                    },
                });

            const result = await fetchProductsForWishlist(mockContext, items);

            // Should make all 3 requests despite the error
            expect(mockGetProducts).toHaveBeenCalledTimes(3);

            // Should have products from first and third batch (26 total)
            expect(Object.keys(result)).toHaveLength(26);
            expect(result['product-0']).toBeDefined();
            expect(result['product-23']).toBeDefined();
            expect(result['product-48']).toBeDefined();
            expect(result['product-49']).toBeDefined();

            // Should log the error
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('Error fetching products batch'),
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });

        test('should return empty object when all batches fail', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = Array.from({ length: 30 }, (_, i) => ({
                id: `item-${i}`,
                productId: `product-${i}`,
                priority: 0,
                public: false,
                quantity: 1,
            }));

            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            mockGetProducts
                .mockRejectedValueOnce(new Error('API Error 1'))
                .mockRejectedValueOnce(new Error('API Error 2'));

            const result = await fetchProductsForWishlist(mockContext, items);

            expect(mockGetProducts).toHaveBeenCalledTimes(2);
            expect(result).toEqual({});
            expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

            consoleErrorSpy.mockRestore();
        });
    });

    describe('edge cases', () => {
        test('should return empty object when items array is empty', async () => {
            const result = await fetchProductsForWishlist(mockContext, []);

            expect(mockGetProducts).not.toHaveBeenCalled();
            expect(result).toEqual({});
        });

        test('should handle products without id field in response', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = [
                { id: 'item-1', productId: 'product-1', priority: 0, public: false, quantity: 1 },
                { id: 'item-2', productId: 'product-2', priority: 0, public: false, quantity: 1 },
            ];

            mockGetProducts.mockResolvedValue({
                data: {
                    data: [
                        { id: 'product-1', name: 'Product 1' },
                        { name: 'Product 2 without id' }, // Missing id field
                    ],
                },
            });

            const result = await fetchProductsForWishlist(mockContext, items);

            // Should only include product with id
            expect(Object.keys(result)).toHaveLength(1);
            expect(result['product-1']).toBeDefined();
            expect(result['product-2']).toBeUndefined();
        });

        test('should handle empty data array in response', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = [
                { id: 'item-1', productId: 'product-1', priority: 0, public: false, quantity: 1 },
            ];

            mockGetProducts.mockResolvedValue({
                data: [],
            });

            const result = await fetchProductsForWishlist(mockContext, items);

            expect(result).toEqual({});
        });

        test('should handle null/undefined data in response', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = [
                { id: 'item-1', productId: 'product-1', priority: 0, public: false, quantity: 1 },
            ];

            mockGetProducts.mockResolvedValue({
                data: null as any,
            });

            const result = await fetchProductsForWishlist(mockContext, items);

            expect(result).toEqual({});
        });
    });

    describe('product mapping', () => {
        test('should correctly map products by product ID', async () => {
            const items: ShopperCustomers.schemas['CustomerProductListItem'][] = [
                { id: 'item-1', productId: 'product-1', priority: 0, public: false, quantity: 1 },
                { id: 'item-2', productId: 'product-2', priority: 0, public: false, quantity: 1 },
                { id: 'item-3', productId: 'product-3', priority: 0, public: false, quantity: 1 },
            ];

            const mockProducts: ShopperProducts.schemas['Product'][] = [
                { id: 'product-1', name: 'Product 1' },
                { id: 'product-2', name: 'Product 2' },
                { id: 'product-3', name: 'Product 3' },
            ];

            mockGetProducts.mockResolvedValue({
                data: { data: mockProducts },
            });

            const result = await fetchProductsForWishlist(mockContext, items);

            expect(result['product-1']).toEqual(mockProducts[0]);
            expect(result['product-2']).toEqual(mockProducts[1]);
            expect(result['product-3']).toEqual(mockProducts[2]);
        });
    });
});

describe('account.wishlist loaders', () => {
    const mockContext = createTestContext();

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAuthServer.mockReturnValue({
            userType: 'registered',
            customerId: 'test-customer-id',
            accessToken: 'test-token',
            accessTokenExpiry: Date.now() + 3600000, // 1 hour from now
        });
        mockGetAuth.mockReturnValue({
            customerId: 'test-customer-id',
        });
        mockIsRegisteredCustomer.mockReturnValue(true);
        mockGetConfig.mockReturnValue({
            global: {
                productListing: {
                    productsPerPage: 24,
                },
                paginatedProductCarousel: {
                    defaultLimit: 8,
                },
            },
            commerce: {
                api: {
                    proxy: '/mobify/proxy/api',
                    organizationId: 'test-org-id',
                    siteId: 'test-site-id',
                },
            },
        });
    });

    describe('loader (server-side)', () => {
        test('should return empty wishlist when user is not authenticated', async () => {
            mockGetAuthServer.mockReturnValue({
                userType: 'guest',
                customerId: null,
            });

            const result = await loader({
                context: mockContext,
                request: new Request('http://localhost/account/wishlist'),
                params: {},
            } as LoaderFunctionArgs);

            expect(result.wishlist).toBeNull();
            expect(result.items).toEqual([]);
            expect(mockGetCustomerProductLists).not.toHaveBeenCalled();
            // getConfig should not be called when user is not authenticated
            expect(mockGetConfig).not.toHaveBeenCalled();
        });

        test('should return empty wishlist when access token is expired', async () => {
            mockGetAuthServer.mockReturnValue({
                userType: 'registered',
                customerId: 'test-customer-id',
                accessToken: 'test-token',
                accessTokenExpiry: Date.now() - 1000, // Expired
            });

            const result = await loader({
                context: mockContext,
                request: new Request('http://localhost/account/wishlist'),
                params: {},
            } as LoaderFunctionArgs);

            expect(result.wishlist).toBeNull();
            expect(result.items).toEqual([]);
        });

        test('should return wishlist with items when items are in initial response', async () => {
            const mockWishlist: ShopperCustomers.schemas['CustomerProductList'] = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: [
                    { id: 'item-1', productId: 'product-1' },
                    { id: 'item-2', productId: 'product-2' },
                ] as ShopperCustomers.schemas['CustomerProductListItem'][],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockGetProducts.mockResolvedValue({
                data: [
                    { id: 'product-1', name: 'Product 1' },
                    { id: 'product-2', name: 'Product 2' },
                ],
            });

            const result = await loader({
                context: mockContext,
                request: new Request('http://localhost/account/wishlist'),
                params: {},
            } as LoaderFunctionArgs);

            expect(result.wishlist).toEqual(mockWishlist);
            expect(result.items).toHaveLength(2);
            expect(mockGetCustomerProductLists).toHaveBeenCalledWith({
                params: {
                    path: { customerId: 'test-customer-id' },
                },
            });
            // getConfig should be called after auth check
            expect(mockGetConfig).toHaveBeenCalled();
        });

        test('should only fetch initial batch of products (initialLimit)', async () => {
            const mockWishlist: ShopperCustomers.schemas['CustomerProductList'] = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: Array.from({ length: 20 }, (_, i) => ({
                    id: `item-${i}`,
                    productId: `product-${i}`,
                    priority: 0,
                    public: false,
                    quantity: 1,
                })) as ShopperCustomers.schemas['CustomerProductListItem'][],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockGetProducts.mockResolvedValue({
                data: Array.from({ length: 8 }, (_, i) => ({
                    id: `product-${i}`,
                    name: `Product ${i}`,
                })),
            });

            const result = await loader({
                context: mockContext,
                request: new Request('http://localhost/account/wishlist'),
                params: {},
            } as LoaderFunctionArgs);

            expect(result.wishlist).toEqual(mockWishlist);
            expect(result.items).toHaveLength(20); // All items are returned
            // Await the promise to trigger the fetch
            await result.productsByProductId;
            // Only 8 products should be fetched (initialLimit)
            expect(mockGetProducts).toHaveBeenCalledTimes(1);
            expect(mockGetProducts).toHaveBeenCalledWith({
                params: {
                    query: {
                        ids: Array.from({ length: 8 }, (_, i) => `product-${i}`),
                        allImages: true,
                        perPricebook: true,
                        currency: 'USD',
                    },
                },
            });
        });

        test('should return empty wishlist when no wishlist is found', async () => {
            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [] },
            });

            const result = await loader({
                context: mockContext,
                request: new Request('http://localhost/account/wishlist'),
                params: {},
            } as LoaderFunctionArgs);

            expect(result.wishlist).toBeNull();
            expect(result.items).toEqual([]);
        });

        test('should return empty wishlist when listId is missing', async () => {
            const mockWishlist: ShopperCustomers.schemas['CustomerProductList'] = {
                id: undefined,
                listId: undefined,
                type: 'wish_list',
            } as any;

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            const result = await loader({
                context: mockContext,
                request: new Request('http://localhost/account/wishlist'),
                params: {},
            } as LoaderFunctionArgs);

            expect(result.wishlist).toBeNull();
            expect(result.items).toEqual([]);
        });

        test('should return empty wishlist when API call fails', async () => {
            const apiError = new Error('API Error');
            mockGetCustomerProductLists.mockRejectedValue(apiError);

            const result = await loader({
                context: mockContext,
                request: new Request('http://localhost/account/wishlist'),
                params: {},
            } as LoaderFunctionArgs);

            expect(result.wishlist).toBeNull();
            expect(result.items).toEqual([]);
        });

        test('should use id field when listId is not available', async () => {
            const mockWishlist: ShopperCustomers.schemas['CustomerProductList'] = {
                id: 'wishlist-1',
                listId: undefined,
                type: 'wish_list',
                items: [
                    { id: 'item-1', productId: 'product-1' },
                ] as ShopperCustomers.schemas['CustomerProductListItem'][],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockGetProducts.mockResolvedValue({
                data: [{ id: 'product-1', name: 'Product 1' }],
            });

            const result = await loader({
                context: mockContext,
                request: new Request('http://localhost/account/wishlist'),
                params: {},
            } as LoaderFunctionArgs);

            expect(result.wishlist).toEqual(mockWishlist);
            expect(result.items).toHaveLength(1);
        });
    });
});

describe('shouldRevalidate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('should return false for wishlist-remove actions', async () => {
        const { shouldRevalidate } = await import('./_app.account.wishlist');

        const result = shouldRevalidate({
            formAction: '/action/wishlist-remove',
            defaultShouldRevalidate: true,
            currentUrl: new URL('http://localhost/account/wishlist'),
            nextUrl: new URL('http://localhost/account/wishlist'),
            actionStatus: 200,
            actionResult: { success: true },
            unstable_actionStatus: 200,
        } as any);

        expect(result).toBe(false);
    });

    test('should use default behavior for non-wishlist-remove actions', async () => {
        const { shouldRevalidate } = await import('./_app.account.wishlist');

        const result = shouldRevalidate({
            formAction: '/action/cart-item-add',
            defaultShouldRevalidate: true,
            currentUrl: new URL('http://localhost/account/wishlist'),
            nextUrl: new URL('http://localhost/account/wishlist'),
            actionStatus: 200,
            actionResult: { success: true },
            unstable_actionStatus: 200,
        } as any);

        expect(result).toBe(true);
    });

    test('should use default behavior when formAction is undefined', async () => {
        const { shouldRevalidate } = await import('./_app.account.wishlist');

        const result = shouldRevalidate({
            formAction: undefined,
            defaultShouldRevalidate: false,
            currentUrl: new URL('http://localhost/account/wishlist'),
            nextUrl: new URL('http://localhost/account/wishlist'),
            actionStatus: 200,
            actionResult: { success: true },
            unstable_actionStatus: 200,
        } as any);

        expect(result).toBe(false);
    });

    test('should return false when defaultShouldRevalidate is false but action is wishlist-remove', async () => {
        const { shouldRevalidate } = await import('./_app.account.wishlist');

        const result = shouldRevalidate({
            formAction: '/action/wishlist-remove',
            defaultShouldRevalidate: false,
            currentUrl: new URL('http://localhost/account/wishlist'),
            nextUrl: new URL('http://localhost/account/wishlist'),
            actionStatus: 200,
            actionResult: { success: true },
            unstable_actionStatus: 200,
        } as any);

        expect(result).toBe(false);
    });
});

describe('WishlistSkeleton Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('should render page title and skeletons while awaiting loader data', async () => {
        const AccountWishlist = (await import('./_app.account.wishlist')).default;

        // Create a pending promise that never resolves during the test
        const pendingPromise = new Promise<Record<string, any>>(() => {});

        const loaderData = {
            wishlist: { id: 'wishlist-1', type: 'wish_list' },
            items: [
                { id: 'item-1', productId: 'product-1' },
                { id: 'item-2', productId: 'product-2' },
            ],
            productsByProductId: pendingPromise,
        };

        const { container } = render(<AccountWishlist loaderData={loaderData} />);

        // Should show the Wishlist page title from translation while loading
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent(t('account:navigation.wishlist'));

        // Should render skeleton placeholders while awaiting loader data
        const skeletons = container.querySelectorAll('[data-testid="skeleton"]');
        expect(skeletons.length).toBeGreaterThan(0);

        // Should render product carousel skeleton
        const carouselSkeleton = screen.getByTestId('product-carousel-skeleton');
        expect(carouselSkeleton).toBeInTheDocument();
    });
});
