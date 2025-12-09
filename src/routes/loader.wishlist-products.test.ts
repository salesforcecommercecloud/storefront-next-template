/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { ShopperCustomersTypes, ShopperProductsTypes, ShopperSearchTypes } from 'commerce-sdk-isomorphic';
import { clientLoader } from './loader.wishlist-products';
import { createTestContext } from '@/lib/test-utils';
import type { ClientLoaderFunctionArgs } from 'react-router';

// Mock dependencies
const mockGetAuth = vi.fn();
const mockIsRegisteredCustomer = vi.fn();
const mockGetCustomerProductLists = vi.fn();
const mockGetCustomerProductList = vi.fn();
const mockGetProducts = vi.fn();
const mockConvertProductToProductSearchHit = vi.fn();
const mockGetConfig = vi.fn();

vi.mock('@/middlewares/auth.client', () => ({
    getAuth: () => mockGetAuth(),
}));

vi.mock('@/lib/api/customer', () => ({
    isRegisteredCustomer: () => mockIsRegisteredCustomer(),
}));

vi.mock('@/config', async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
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
vi.mock('@/routes/account.wishlist', async () => {
    const actual = await vi.importActual('@/routes/account.wishlist');
    return {
        ...actual,
        fetchProductsForWishlist: vi.fn(),
    };
});

describe('loader.wishlist-products', () => {
    const mockContext = createTestContext();
    let mockFetchProductsForWishlist: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Get the mocked function
        const accountWishlistModule = await import('@/routes/account.wishlist');
        mockFetchProductsForWishlist = accountWishlistModule.fetchProductsForWishlist as ReturnType<typeof vi.fn>;

        // Default mocks
        mockIsRegisteredCustomer.mockReturnValue(true);
        mockGetAuth.mockReturnValue({
            customer_id: 'test-customer-id',
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

            const result = await clientLoader({
                request: new Request('http://localhost/loader/wishlist-products'),
                context: mockContext,
            } as ClientLoaderFunctionArgs);

            expect(result.products).toEqual([]);
            expect(result.offset).toBe(0);
            expect(result.limit).toBe(0);
            expect(result.total).toBe(0);
            expect(mockGetCustomerProductLists).not.toHaveBeenCalled();
        });

        test('should return empty result when customer_id is missing', async () => {
            mockGetAuth.mockReturnValue({
                customer_id: null,
            });

            const result = await clientLoader({
                request: new Request('http://localhost/loader/wishlist-products'),
                context: mockContext,
            } as ClientLoaderFunctionArgs);

            expect(result.products).toEqual([]);
            expect(result.offset).toBe(0);
            expect(result.limit).toBe(0);
            expect(result.total).toBe(0);
        });
    });

    describe('query parameters', () => {
        test('should use default offset and limit when not provided', async () => {
            const mockWishlist: ShopperCustomersTypes.CustomerProductList = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: [
                    { id: 'item-1', productId: 'product-1' },
                    { id: 'item-2', productId: 'product-2' },
                ] as ShopperCustomersTypes.CustomerProductListItem[],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockGetCustomerProductList.mockResolvedValue({ data: mockWishlist });

            mockFetchProductsForWishlist.mockResolvedValue({
                'product-1': { id: 'product-1', name: 'Product 1' },
                'product-2': { id: 'product-2', name: 'Product 2' },
            });

            mockConvertProductToProductSearchHit.mockImplementation((product: ShopperProductsTypes.Product) => ({
                productId: product.id,
                productName: product.name,
            }));

            const result = await clientLoader({
                request: new Request('http://localhost/loader/wishlist-products'),
                context: mockContext,
            } as ClientLoaderFunctionArgs);

            expect(result.offset).toBe(0);
            expect(result.limit).toBe(8);
            expect(result.total).toBe(2);
        });

        test('should parse offset and limit from query parameters', async () => {
            const mockWishlist: ShopperCustomersTypes.CustomerProductList = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: Array.from({ length: 20 }, (_, i) => ({
                    id: `item-${i}`,
                    productId: `product-${i}`,
                })) as ShopperCustomersTypes.CustomerProductListItem[],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockGetCustomerProductList.mockResolvedValue({ data: mockWishlist });

            mockFetchProductsForWishlist.mockResolvedValue({});

            const result = await clientLoader({
                request: new Request('http://localhost/loader/wishlist-products?offset=10&limit=5'),
                context: mockContext,
            } as ClientLoaderFunctionArgs);

            expect(result.offset).toBe(10);
            expect(result.limit).toBe(5);
            expect(result.total).toBe(20);
        });
    });

    describe('parameter validation', () => {
        test('should throw error for invalid offset (NaN)', async () => {
            await expect(
                clientLoader({
                    request: new Request('http://localhost/loader/wishlist-products?offset=invalid'),
                    context: mockContext,
                } as ClientLoaderFunctionArgs)
            ).rejects.toThrow('Invalid offset parameter: must be a non-negative integer');
        });

        test('should throw error for negative offset', async () => {
            await expect(
                clientLoader({
                    request: new Request('http://localhost/loader/wishlist-products?offset=-5'),
                    context: mockContext,
                } as ClientLoaderFunctionArgs)
            ).rejects.toThrow('Invalid offset parameter: must be a non-negative integer');
        });

        test('should throw error for invalid limit (NaN)', async () => {
            await expect(
                clientLoader({
                    request: new Request('http://localhost/loader/wishlist-products?limit=abc'),
                    context: mockContext,
                } as ClientLoaderFunctionArgs)
            ).rejects.toThrow('Invalid limit parameter: must be a positive integer not exceeding 24');
        });

        test('should throw error for zero limit', async () => {
            await expect(
                clientLoader({
                    request: new Request('http://localhost/loader/wishlist-products?limit=0'),
                    context: mockContext,
                } as ClientLoaderFunctionArgs)
            ).rejects.toThrow('Invalid limit parameter: must be a positive integer not exceeding 24');
        });

        test('should throw error for negative limit', async () => {
            await expect(
                clientLoader({
                    request: new Request('http://localhost/loader/wishlist-products?limit=-10'),
                    context: mockContext,
                } as ClientLoaderFunctionArgs)
            ).rejects.toThrow('Invalid limit parameter: must be a positive integer not exceeding 24');
        });

        test('should throw error for limit exceeding maximum (24)', async () => {
            await expect(
                clientLoader({
                    request: new Request('http://localhost/loader/wishlist-products?limit=25'),
                    context: mockContext,
                } as ClientLoaderFunctionArgs)
            ).rejects.toThrow('Invalid limit parameter: must be a positive integer not exceeding 24');
        });

        test('should allow valid edge case values (offset=0, limit=24)', async () => {
            const mockWishlist: ShopperCustomersTypes.CustomerProductList = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: Array.from({ length: 24 }, (_, i) => ({
                    id: `item-${i}`,
                    productId: `product-${i}`,
                })) as ShopperCustomersTypes.CustomerProductListItem[],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockGetCustomerProductList.mockResolvedValue({ data: mockWishlist });

            mockFetchProductsForWishlist.mockResolvedValue({});

            const result = await clientLoader({
                request: new Request('http://localhost/loader/wishlist-products?offset=0&limit=24'),
                context: mockContext,
            } as ClientLoaderFunctionArgs);

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

            const result = await clientLoader({
                request: new Request('http://localhost/loader/wishlist-products'),
                context: mockContext,
            } as ClientLoaderFunctionArgs);

            expect(result.products).toEqual([]);
            expect(result.total).toBe(0);
        });

        test('should return empty result when listId is missing', async () => {
            const mockWishlist: ShopperCustomersTypes.CustomerProductList = {
                id: undefined,
                listId: undefined,
                type: 'wish_list',
            } as any;

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            const result = await clientLoader({
                request: new Request('http://localhost/loader/wishlist-products'),
                context: mockContext,
            } as ClientLoaderFunctionArgs);

            expect(result.products).toEqual([]);
            expect(result.total).toBe(0);
        });

        test('should use id field when listId is not available', async () => {
            const mockWishlist: ShopperCustomersTypes.CustomerProductList = {
                id: 'wishlist-1',
                listId: undefined,
                type: 'wish_list',
                items: [{ id: 'item-1', productId: 'product-1' }] as ShopperCustomersTypes.CustomerProductListItem[],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockGetCustomerProductList.mockResolvedValue({ data: mockWishlist });

            mockFetchProductsForWishlist.mockResolvedValue({
                'product-1': { id: 'product-1', name: 'Product 1' },
            });

            mockConvertProductToProductSearchHit.mockImplementation((product: ShopperProductsTypes.Product) => ({
                productId: product.id,
                productName: product.name,
            }));

            const result = await clientLoader({
                request: new Request('http://localhost/loader/wishlist-products'),
                context: mockContext,
            } as ClientLoaderFunctionArgs);

            expect(mockGetCustomerProductList).toHaveBeenCalledWith({
                params: {
                    path: {
                        customerId: 'test-customer-id',
                        listId: 'wishlist-1',
                    },
                },
            });
            expect(result.products).toHaveLength(1);
        });
    });

    describe('pagination', () => {
        test('should slice items based on offset and limit', async () => {
            const allItems = Array.from({ length: 20 }, (_, i) => ({
                id: `item-${i}`,
                productId: `product-${i}`,
            })) as ShopperCustomersTypes.CustomerProductListItem[];

            const mockWishlist: ShopperCustomersTypes.CustomerProductList = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: allItems,
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockGetCustomerProductList.mockResolvedValue({ data: mockWishlist });

            // Mock products for items 5-9 (offset 5, limit 5)
            const slicedItems = allItems.slice(5, 10);
            const productsByProductId: Record<string, ShopperProductsTypes.Product> = {};
            slicedItems.forEach((item) => {
                if (item.productId) {
                    productsByProductId[item.productId] = {
                        id: item.productId,
                        name: `Product ${item.productId}`,
                    } as ShopperProductsTypes.Product;
                }
            });

            mockFetchProductsForWishlist.mockResolvedValue(productsByProductId);

            mockConvertProductToProductSearchHit.mockImplementation((product: ShopperProductsTypes.Product) => ({
                productId: product.id,
                productName: product.name,
            }));

            const result = await clientLoader({
                request: new Request('http://localhost/loader/wishlist-products?offset=5&limit=5'),
                context: mockContext,
            } as ClientLoaderFunctionArgs);

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
            const mockWishlist: ShopperCustomersTypes.CustomerProductList = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: [
                    { id: 'item-1', productId: 'product-1' },
                    { id: 'item-2', productId: 'product-2' },
                ] as ShopperCustomersTypes.CustomerProductListItem[],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockGetCustomerProductList.mockResolvedValue({ data: mockWishlist });

            const result = await clientLoader({
                request: new Request('http://localhost/loader/wishlist-products?offset=10&limit=5'),
                context: mockContext,
            } as ClientLoaderFunctionArgs);

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
                ] as ShopperCustomersTypes.CustomerProductListItem[],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockGetCustomerProductList.mockResolvedValue({ data: mockWishlist });

            mockFetchProductsForWishlist.mockResolvedValue({
                'product-1': { id: 'product-1', name: 'Product 1' },
                'product-2': { id: 'product-2', name: 'Product 2' },
            });

            mockConvertProductToProductSearchHit.mockImplementation((product: ShopperProductsTypes.Product) => ({
                productId: product.id,
                productName: product.name,
            }));

            const result = await clientLoader({
                request: new Request('http://localhost/loader/wishlist-products'),
                context: mockContext,
            } as ClientLoaderFunctionArgs);

            expect(result.total).toBe(2);
            expect(result.products).toHaveLength(2);
        });
    });

    describe('product conversion', () => {
        test('should convert products to ProductSearchHit format', async () => {
            const mockWishlist: ShopperCustomersTypes.CustomerProductList = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: [
                    { id: 'item-1', productId: 'product-1' },
                    { id: 'item-2', productId: 'product-2' },
                ] as ShopperCustomersTypes.CustomerProductListItem[],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockGetCustomerProductList.mockResolvedValue({ data: mockWishlist });

            const mockProduct1: ShopperProductsTypes.Product = {
                id: 'product-1',
                name: 'Product 1',
            } as ShopperProductsTypes.Product;

            const mockProduct2: ShopperProductsTypes.Product = {
                id: 'product-2',
                name: 'Product 2',
            } as ShopperProductsTypes.Product;

            mockFetchProductsForWishlist.mockResolvedValue({
                'product-1': mockProduct1,
                'product-2': mockProduct2,
            });

            const mockSearchHit1: ShopperSearchTypes.ProductSearchHit = {
                productId: 'product-1',
                productName: 'Product 1',
            } as ShopperSearchTypes.ProductSearchHit;

            const mockSearchHit2: ShopperSearchTypes.ProductSearchHit = {
                productId: 'product-2',
                productName: 'Product 2',
            } as ShopperSearchTypes.ProductSearchHit;

            mockConvertProductToProductSearchHit
                .mockReturnValueOnce(mockSearchHit1)
                .mockReturnValueOnce(mockSearchHit2);

            const result = await clientLoader({
                request: new Request('http://localhost/loader/wishlist-products'),
                context: mockContext,
            } as ClientLoaderFunctionArgs);

            expect(result.products).toHaveLength(2);
            expect(result.products[0]).toEqual(mockSearchHit1);
            expect(result.products[1]).toEqual(mockSearchHit2);
            expect(mockConvertProductToProductSearchHit).toHaveBeenCalledTimes(2);
        });

        test('should keep null placeholders for products without details', async () => {
            const mockWishlist: ShopperCustomersTypes.CustomerProductList = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: [
                    { id: 'item-1', productId: 'product-1' },
                    { id: 'item-2', productId: 'product-2' },
                    { id: 'item-3', productId: 'product-3' },
                ] as ShopperCustomersTypes.CustomerProductListItem[],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockGetCustomerProductList.mockResolvedValue({ data: mockWishlist });

            // Only product-1 and product-3 have actual data, product-2 is just a placeholder
            mockFetchProductsForWishlist.mockResolvedValue({
                'product-1': { id: 'product-1', name: 'Product 1' } as ShopperProductsTypes.Product,
                'product-2': { id: 'product-2' } as ShopperProductsTypes.Product, // Placeholder with only id
                'product-3': { id: 'product-3', name: 'Product 3' } as ShopperProductsTypes.Product,
            });

            mockConvertProductToProductSearchHit.mockImplementation((product: ShopperProductsTypes.Product) => {
                // Only convert products with name (real data)
                if (product.name) {
                    return {
                        productId: product.id,
                        productName: product.name,
                    };
                }
                return null;
            });

            const result = await clientLoader({
                request: new Request('http://localhost/loader/wishlist-products'),
                context: mockContext,
            } as ClientLoaderFunctionArgs);

            // Should have 3 entries: 2 real products and 1 null placeholder
            expect(result.products).toHaveLength(3);
            expect(result.products[0]?.productId).toBe('product-1');
            expect(result.products[1]).toBeNull(); // Placeholder for product-2
            expect(result.products[2]?.productId).toBe('product-3');
        });
    });

    describe('error handling', () => {
        test('should throw error when getCustomerProductLists fails', async () => {
            const apiError = new Error('API Error');
            mockGetCustomerProductLists.mockRejectedValue(apiError);

            await expect(
                clientLoader({
                    request: new Request('http://localhost/loader/wishlist-products'),
                    context: mockContext,
                } as ClientLoaderFunctionArgs)
            ).rejects.toThrow('API Error');
        });

        test('should throw error when getCustomerProductList fails', async () => {
            const mockWishlist: ShopperCustomersTypes.CustomerProductList = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            const apiError = new Error('API Error');
            mockGetCustomerProductList.mockRejectedValue(apiError);

            await expect(
                clientLoader({
                    request: new Request('http://localhost/loader/wishlist-products'),
                    context: mockContext,
                } as ClientLoaderFunctionArgs)
            ).rejects.toThrow('API Error');
        });

        test('should throw error when fetchProductsForWishlist fails', async () => {
            const mockWishlist: ShopperCustomersTypes.CustomerProductList = {
                id: 'wishlist-1',
                listId: 'wishlist-1',
                type: 'wish_list',
                items: [{ id: 'item-1', productId: 'product-1' }] as ShopperCustomersTypes.CustomerProductListItem[],
            };

            mockGetCustomerProductLists.mockResolvedValue({
                data: { data: [mockWishlist] },
            });

            mockGetCustomerProductList.mockResolvedValue({ data: mockWishlist });

            const apiError = new Error('Product fetch error');
            mockFetchProductsForWishlist.mockRejectedValue(apiError);

            await expect(
                clientLoader({
                    request: new Request('http://localhost/loader/wishlist-products'),
                    context: mockContext,
                } as ClientLoaderFunctionArgs)
            ).rejects.toThrow('Product fetch error');
        });
    });
});
