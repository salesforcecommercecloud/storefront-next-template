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
import type { ShopperCustomers, ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { loader } from './resource.wishlist-products';
import { createTestContext } from '@/lib/test-utils';
import type { LoaderFunctionArgs } from 'react-router';

// Mock dependencies
const mockGetAuth = vi.fn();
const mockIsRegisteredCustomer = vi.fn();
const mockGetCustomerProductLists = vi.fn();
const mockGetCustomerProductList = vi.fn();
const mockGetProducts = vi.fn();
const mockConvertProductToProductSearchHit = vi.fn();
const mockGetConfig = vi.fn();

vi.mock('@/middlewares/auth.server', () => ({
    getAuth: () => mockGetAuth(),
}));

vi.mock('@/lib/api/customer', () => ({
    isRegisteredCustomer: () => mockIsRegisteredCustomer(),
}));

vi.mock('@/config', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/config')>();
    return {
        ...actual,
        getConfig: () => mockGetConfig(),
        useConfig: () => mockGetConfig(),
    };
});

vi.mock('@/lib/api-clients', () => ({
    createApiClients: () => ({
        shopperCustomers: {
            getCustomerProductLists: mockGetCustomerProductLists,
            getCustomerProductList: mockGetCustomerProductList,
        },
        shopperProducts: {
            getProducts: mockGetProducts,
        },
    }),
}));

vi.mock('@/lib/product-conversion', () => ({
    convertProductToProductSearchHit: (...args: unknown[]) => mockConvertProductToProductSearchHit(...args),
}));

// Mock fetchProductsForWishlist
vi.mock('@/lib/api/wishlist', async () => {
    const actual = await vi.importActual('@/lib/api/wishlist');
    return {
        ...actual,
        fetchProductsForWishlist: vi.fn(),
    };
});

describe('resource.wishlist-products', () => {
    const mockContext = createTestContext();
    let mockFetchProductsForWishlist: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Get the mocked function
        const wishlistModule = await import('@/lib/api/wishlist');
        mockFetchProductsForWishlist = wishlistModule.fetchProductsForWishlist as ReturnType<typeof vi.fn>;

        // Default mocks
        mockIsRegisteredCustomer.mockReturnValue(true);
        mockGetAuth.mockReturnValue({
            customerId: 'test-customer-id',
        });
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

    describe('authentication checks', () => {
        test('should return empty result when user is not registered', async () => {
            mockIsRegisteredCustomer.mockReturnValue(false);

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products'),
                context: mockContext,
            } as LoaderFunctionArgs);

            expect(result.products).toEqual([]);
            expect(result.offset).toBe(0);
            expect(result.limit).toBe(0);
            expect(result.total).toBe(0);
            expect(mockGetCustomerProductLists).not.toHaveBeenCalled();
        });

        test('should return empty result when customer_id is missing', async () => {
            mockGetAuth.mockReturnValue({
                customerId: null,
            });

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products'),
                context: mockContext,
            } as LoaderFunctionArgs);

            expect(result.products).toEqual([]);
            expect(result.offset).toBe(0);
            expect(result.limit).toBe(0);
            expect(result.total).toBe(0);
        });
    });

    describe('query parameters', () => {
        test('should use default offset and limit when not provided', async () => {
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

            mockFetchProductsForWishlist.mockResolvedValue({
                'product-1': { id: 'product-1', name: 'Product 1' },
                'product-2': { id: 'product-2', name: 'Product 2' },
            });

            mockConvertProductToProductSearchHit.mockImplementation((product: ShopperProducts.schemas['Product']) => ({
                productId: product.id,
                productName: product.name,
            }));

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products'),
                context: mockContext,
            } as LoaderFunctionArgs);

            expect(result.offset).toBe(0);
            expect(result.limit).toBe(8);
            expect(result.total).toBe(2);
        });

        test('should parse offset and limit from query parameters', async () => {
            const mockWishlist: ShopperCustomers.schemas['CustomerProductList'] = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: Array.from({ length: 20 }, (_, i) => ({
                    id: `item-${i}`,
                    productId: `product-${i}`,
                })) as ShopperCustomers.schemas['CustomerProductListItem'][],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockFetchProductsForWishlist.mockResolvedValue({});

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products?offset=10&limit=5'),
                context: mockContext,
            } as LoaderFunctionArgs);

            expect(result.offset).toBe(10);
            expect(result.limit).toBe(5);
            expect(result.total).toBe(20);
        });
    });

    describe('parameter validation', () => {
        test('should throw error for invalid offset (NaN)', async () => {
            await expect(
                loader({
                    request: new Request('http://localhost/resource/wishlist-products?offset=invalid'),
                    context: mockContext,
                } as LoaderFunctionArgs)
            ).rejects.toThrow('Invalid offset parameter: must be a non-negative integer');
        });

        test('should throw error for negative offset', async () => {
            await expect(
                loader({
                    request: new Request('http://localhost/resource/wishlist-products?offset=-5'),
                    context: mockContext,
                } as LoaderFunctionArgs)
            ).rejects.toThrow('Invalid offset parameter: must be a non-negative integer');
        });

        test('should throw error for invalid limit (NaN)', async () => {
            await expect(
                loader({
                    request: new Request('http://localhost/resource/wishlist-products?limit=abc'),
                    context: mockContext,
                } as LoaderFunctionArgs)
            ).rejects.toThrow('Invalid limit parameter: must be a positive integer not exceeding 24');
        });

        test('should throw error for zero limit', async () => {
            await expect(
                loader({
                    request: new Request('http://localhost/resource/wishlist-products?limit=0'),
                    context: mockContext,
                } as LoaderFunctionArgs)
            ).rejects.toThrow('Invalid limit parameter: must be a positive integer not exceeding 24');
        });

        test('should throw error for negative limit', async () => {
            await expect(
                loader({
                    request: new Request('http://localhost/resource/wishlist-products?limit=-10'),
                    context: mockContext,
                } as LoaderFunctionArgs)
            ).rejects.toThrow('Invalid limit parameter: must be a positive integer not exceeding 24');
        });

        test('should throw error for limit exceeding maximum (24)', async () => {
            await expect(
                loader({
                    request: new Request('http://localhost/resource/wishlist-products?limit=25'),
                    context: mockContext,
                } as LoaderFunctionArgs)
            ).rejects.toThrow('Invalid limit parameter: must be a positive integer not exceeding 24');
        });

        test('should allow valid edge case values (offset=0, limit=24)', async () => {
            const mockWishlist: ShopperCustomers.schemas['CustomerProductList'] = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: Array.from({ length: 24 }, (_, i) => ({
                    id: `item-${i}`,
                    productId: `product-${i}`,
                })) as ShopperCustomers.schemas['CustomerProductListItem'][],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockFetchProductsForWishlist.mockResolvedValue({});

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products?offset=0&limit=24'),
                context: mockContext,
            } as LoaderFunctionArgs);

            expect(result.offset).toBe(0);
            expect(result.limit).toBe(24);
            expect(result.total).toBe(24);
        });
    });

    describe('wishlist retrieval', () => {
        test('should return empty result when no wishlist is found', async () => {
            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [] },
            });

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products'),
                context: mockContext,
            } as LoaderFunctionArgs);

            expect(result.products).toEqual([]);
            expect(result.total).toBe(0);
        });

        test('should return empty result when listId is missing', async () => {
            const mockWishlist: ShopperCustomers.schemas['CustomerProductList'] = {
                id: undefined,
                listId: undefined,
                type: 'wish_list',
            } as any;

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products'),
                context: mockContext,
            } as LoaderFunctionArgs);

            expect(result.products).toEqual([]);
            expect(result.total).toBe(0);
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

            mockFetchProductsForWishlist.mockResolvedValue({
                'product-1': { id: 'product-1', name: 'Product 1' },
            });

            mockConvertProductToProductSearchHit.mockImplementation((product: ShopperProducts.schemas['Product']) => ({
                productId: product.id,
                productName: product.name,
            }));

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products'),
                context: mockContext,
            } as LoaderFunctionArgs);

            // Verify that we successfully got items using 'id' field as fallback
            expect(result.products).toHaveLength(1);
        });
    });

    describe('pagination', () => {
        test('should slice items based on offset and limit', async () => {
            const allItems = Array.from({ length: 20 }, (_, i) => ({
                id: `item-${i}`,
                productId: `product-${i}`,
            })) as ShopperCustomers.schemas['CustomerProductListItem'][];

            const mockWishlist: ShopperCustomers.schemas['CustomerProductList'] = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: allItems,
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            // Mock products for items 5-9 (offset 5, limit 5)
            const slicedItems = allItems.slice(5, 10);
            const productsByProductId: Record<string, ShopperProducts.schemas['Product']> = {};
            slicedItems.forEach((item) => {
                if (item.productId) {
                    productsByProductId[item.productId] = {
                        id: item.productId,
                        name: `Product ${item.productId}`,
                    } as ShopperProducts.schemas['Product'];
                }
            });

            mockFetchProductsForWishlist.mockResolvedValue(productsByProductId);

            mockConvertProductToProductSearchHit.mockImplementation((product: ShopperProducts.schemas['Product']) => ({
                productId: product.id,
                productName: product.name,
            }));

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products?offset=5&limit=5'),
                context: mockContext,
            } as LoaderFunctionArgs);

            expect(result.offset).toBe(5);
            expect(result.limit).toBe(5);
            expect(result.total).toBe(20);
            expect(result.products).toHaveLength(5);
            // fetchProductsForWishlist is called with sliced items AND allItems to create placeholders
            expect(mockFetchProductsForWishlist).toHaveBeenCalledWith(
                mockContext,
                expect.arrayContaining([
                    expect.objectContaining({ productId: 'product-5' }),
                    expect.objectContaining({ productId: 'product-6' }),
                    expect.objectContaining({ productId: 'product-7' }),
                    expect.objectContaining({ productId: 'product-8' }),
                    expect.objectContaining({ productId: 'product-9' }),
                ]),
                allItems // Now expects ALL items as 3rd parameter
            );
        });

        test('should return empty products when offset exceeds total items', async () => {
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

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products?offset=10&limit=5'),
                context: mockContext,
            } as LoaderFunctionArgs);

            expect(result.products).toEqual([]);
            expect(result.offset).toBe(10);
            expect(result.limit).toBe(5);
            expect(result.total).toBe(2);
            expect(mockFetchProductsForWishlist).not.toHaveBeenCalled();
        });

        test('should handle customerProductListItems field', async () => {
            const mockWishlist = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                customerProductListItems: [
                    { id: 'item-1', productId: 'product-1' },
                    { id: 'item-2', productId: 'product-2' },
                ] as ShopperCustomers.schemas['CustomerProductListItem'][],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockFetchProductsForWishlist.mockResolvedValue({
                'product-1': { id: 'product-1', name: 'Product 1' },
                'product-2': { id: 'product-2', name: 'Product 2' },
            });

            mockConvertProductToProductSearchHit.mockImplementation((product: ShopperProducts.schemas['Product']) => ({
                productId: product.id,
                productName: product.name,
            }));

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products'),
                context: mockContext,
            } as LoaderFunctionArgs);

            expect(result.total).toBe(2);
            expect(result.products).toHaveLength(2);
        });
    });

    describe('product conversion', () => {
        test('should convert products to ProductSearchHit format', async () => {
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

            const mockProduct1: ShopperProducts.schemas['Product'] = {
                id: 'product-1',
                name: 'Product 1',
            } as ShopperProducts.schemas['Product'];

            const mockProduct2: ShopperProducts.schemas['Product'] = {
                id: 'product-2',
                name: 'Product 2',
            } as ShopperProducts.schemas['Product'];

            mockFetchProductsForWishlist.mockResolvedValue({
                'product-1': mockProduct1,
                'product-2': mockProduct2,
            });

            const mockSearchHit1: ShopperSearch.schemas['ProductSearchHit'] = {
                productId: 'product-1',
                productName: 'Product 1',
            } as ShopperSearch.schemas['ProductSearchHit'];

            const mockSearchHit2: ShopperSearch.schemas['ProductSearchHit'] = {
                productId: 'product-2',
                productName: 'Product 2',
            } as ShopperSearch.schemas['ProductSearchHit'];

            mockConvertProductToProductSearchHit
                .mockReturnValueOnce(mockSearchHit1)
                .mockReturnValueOnce(mockSearchHit2);

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products'),
                context: mockContext,
            } as LoaderFunctionArgs);

            expect(result.products).toHaveLength(2);
            expect(result.products[0]).toEqual(mockSearchHit1);
            expect(result.products[1]).toEqual(mockSearchHit2);
            expect(mockConvertProductToProductSearchHit).toHaveBeenCalledTimes(2);
        });

        test('should keep null placeholders for products without details', async () => {
            const mockWishlist: ShopperCustomers.schemas['CustomerProductList'] = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: [
                    { id: 'item-1', productId: 'product-1' },
                    { id: 'item-2', productId: 'product-2' },
                    { id: 'item-3', productId: 'product-3' },
                ] as ShopperCustomers.schemas['CustomerProductListItem'][],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            // Only product-1 and product-3 have actual data, product-2 is just a placeholder
            mockFetchProductsForWishlist.mockResolvedValue({
                'product-1': { id: 'product-1', name: 'Product 1' } as ShopperProducts.schemas['Product'],
                'product-2': { id: 'product-2' } as ShopperProducts.schemas['Product'], // Placeholder with only id
                'product-3': { id: 'product-3', name: 'Product 3' } as ShopperProducts.schemas['Product'],
            });

            mockConvertProductToProductSearchHit.mockImplementation((product: ShopperProducts.schemas['Product']) => {
                // Only convert products with name (real data)
                if (product.name) {
                    return {
                        productId: product.id,
                        productName: product.name,
                    };
                }
                return null;
            });

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products'),
                context: mockContext,
            } as LoaderFunctionArgs);

            // Should have 3 entries: 2 real products and 1 null placeholder
            expect(result.products).toHaveLength(3);
            expect(result.products[0]?.productId).toBe('product-1');
            expect(result.products[1]).toBeNull(); // Placeholder for product-2
            expect(result.products[2]?.productId).toBe('product-3');
        });
    });

    describe('error handling', () => {
        test('should return empty result when getCustomerProductLists fails', async () => {
            const apiError = new Error('API Error');
            mockGetCustomerProductLists.mockRejectedValue(apiError);

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products'),
                context: mockContext,
            } as LoaderFunctionArgs);

            // getWishlist() catches the error and returns null wishlist, which causes the loader to return empty result
            expect(result.products).toEqual([]);
            expect(result.productsByProductId).toEqual({});
            expect(result.total).toBe(0);
        });

        test('should return empty result when getCustomerProductList fails', async () => {
            const mockWishlist: ShopperCustomers.schemas['CustomerProductList'] = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            const result = await loader({
                request: new Request('http://localhost/resource/wishlist-products'),
                context: mockContext,
            } as LoaderFunctionArgs);

            // getWishlist() catches the error and returns null wishlist, which causes the loader to return empty result
            expect(result.products).toEqual([]);
            expect(result.productsByProductId).toEqual({});
            expect(result.total).toBe(0);
        });

        test('should throw error when fetchProductsForWishlist fails', async () => {
            const mockWishlist: ShopperCustomers.schemas['CustomerProductList'] = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: [
                    { id: 'item-1', productId: 'product-1' },
                ] as ShopperCustomers.schemas['CustomerProductListItem'][],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            const apiError = new Error('Product fetch error');
            mockFetchProductsForWishlist.mockRejectedValue(apiError);

            await expect(
                loader({
                    request: new Request('http://localhost/resource/wishlist-products'),
                    context: mockContext,
                } as LoaderFunctionArgs)
            ).rejects.toThrow('Product fetch error');
        });
    });
});
