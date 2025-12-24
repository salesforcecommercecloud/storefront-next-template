/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { RouterContextProvider } from 'react-router';
import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { loader, clientLoader } from './product.$productId';
import { appConfigContext } from '@/config';
import { authContext } from '@/middlewares/auth.utils';
import { currencyContext } from '@/lib/currency';

// Mock the API client creation
const mockGetProduct = vi.fn();
const mockGetCategory = vi.fn();

vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(() => ({
        shopperProducts: {
            getProduct: mockGetProduct,
            getCategory: mockGetCategory,
        },
    })),
}));

// Mock the recommendations function
const mockGenerateRecommendationPromises = vi.hoisted(() =>
    vi.fn(() => [
        {
            config: { id: 'you-may-also-like', title: 'You May Also Like' },
            promise: Promise.resolve({
                hits: [],
                total: 0,
                query: '',
                refinements: [],
                searchPhraseSuggestions: { suggestedTerms: [] },
                sortingOptions: [],
                start: 0,
                count: 0,
                offset: 0,
                limit: 8,
            } as ShopperSearch.schemas['ProductSearchResult']),
        },
    ])
);

vi.mock('@/lib/recommendations', () => ({
    generateRecommendationPromises: mockGenerateRecommendationPromises,
}));

// @sfdc-extension-block-start SFDC_EXT_BOPIS
const mockGetCookieFromRequestAs = vi.hoisted(() => vi.fn());
const mockGetCookieFromDocumentAs = vi.hoisted(() => vi.fn());
const mockGetSelectedStoreInfoCookieName = vi.hoisted(() => vi.fn(() => 'selectedStoreInfo_test'));

vi.mock('@/extensions/store-locator/utils', () => ({
    getCookieFromRequestAs: mockGetCookieFromRequestAs,
    getCookieFromDocumentAs: mockGetCookieFromDocumentAs,
    getSelectedStoreInfoCookieName: mockGetSelectedStoreInfoCookieName,
}));
// @sfdc-extension-block-end SFDC_EXT_BOPIS

describe('Product Route Loaders', () => {
    const mockProduct: ShopperProducts.schemas['Product'] = {
        id: 'test-product-123',
        name: 'Test Product',
        primaryCategoryId: 'test-category-123',
        shortDescription: 'Test product description',
        longDescription: 'Long test product description',
        master: undefined,
    };

    const mockCategory: ShopperProducts.schemas['Category'] = {
        id: 'test-category-123',
        name: 'Test Category',
        parentCategoryId: 'parent-category-123',
        categories: [],
    };

    const mockAppConfig = {
        commerce: {
            api: {
                organizationId: 'test-org',
                siteId: 'test-site',
                clientId: 'test-client-id',
                proxy: '/api/commerce',
            },
        },
        sitePreferences: {
            productDetailSitePreferences: {},
        },
    };

    const mockAuthSession = {
        ref: Promise.resolve({
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
            token_type: 'Bearer',
        }),
    };

    const mockContext = {
        locale: 'en-US',
        currency: 'USD',
        siteId: 'test-site',
        get: vi.fn((context) => {
            if (context === appConfigContext) {
                return mockAppConfig;
            }
            if (context === authContext) {
                return mockAuthSession;
            }
            if (context === currencyContext) {
                return 'USD';
            }
            return undefined;
        }),
        set: vi.fn(),
    } as unknown as Readonly<RouterContextProvider>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loader function', () => {
        test('fetches product data successfully', async () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockResolvedValue({ data: mockCategory });

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            const result = loader({ request, params, context });

            expect(result).toHaveProperty('product');
            expect(result).toHaveProperty('category');

            // Verify the product promise resolves correctly
            const productData = await result.product;
            expect(productData).toEqual(mockProduct);

            // Verify the category promise resolves correctly
            const categoryData = await result.category;
            expect(categoryData).toEqual(mockCategory);
        });

        test('handles product fetch failure gracefully', async () => {
            mockGetProduct.mockRejectedValue(new Error('Product not found'));

            const request = new Request('https://example.com/product/nonexistent');
            const params = { productId: 'nonexistent' };
            const context = mockContext;

            const result = loader({ request, params, context });

            // The product promise should reject with the error
            await expect(result.product).rejects.toThrow('Product not found');

            // The category promise should also reject since it depends on the product
            await expect(result.category).rejects.toThrow('Product not found');
        });

        test('handles category fetch failure gracefully', async () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockRejectedValue(new Error('Category not found'));

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            const result = loader({ request, params, context });

            // Product should still resolve
            const productData = await result.product;
            expect(productData).toEqual(mockProduct);

            // Category should be undefined due to error
            const categoryData = await result.category;
            expect(categoryData).toBeUndefined();
        });

        test('handles variant product with master product category', async () => {
            const variantProduct = {
                ...mockProduct,
                id: 'variant-product-123',
                primaryCategoryId: null,
                master: {
                    masterId: 'master-product-123',
                },
            };

            const masterProduct = {
                ...mockProduct,
                id: 'master-product-123',
                primaryCategoryId: 'master-category-123',
            };

            mockGetProduct
                .mockResolvedValueOnce({ data: variantProduct }) // First call for variant
                .mockResolvedValueOnce({ data: masterProduct }); // Second call for master
            mockGetCategory.mockResolvedValue({ data: mockCategory });

            const request = new Request('https://example.com/product/variant-product-123');
            const params = { productId: 'variant-product-123' };
            const context = mockContext;

            const result = loader({ request, params, context });

            const productData = await result.product;
            expect(productData).toEqual(variantProduct);

            const categoryData = await result.category;
            expect(categoryData).toEqual(mockCategory);

            // Verify both product calls were made
            expect(mockGetProduct).toHaveBeenCalledTimes(2);
        });

        test('handles product with variant ID in search params', () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockResolvedValue({ data: mockCategory });

            const request = new Request('https://example.com/product/test-product-123?pid=variant-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            loader({ request, params, context });

            // Should use the pid parameter instead of productId
            expect(mockGetProduct).toHaveBeenCalledWith({
                params: expect.objectContaining({
                    path: expect.objectContaining({
                        id: 'variant-123',
                    }),
                }),
            });
        });
    });

    describe('clientLoader function', () => {
        test('returns same data structure as server loader', async () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockResolvedValue({ data: mockCategory });
            // @sfdc-extension-line SFDC_EXT_BOPIS
            mockGetCookieFromDocumentAs.mockReturnValue(null);

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            const result = clientLoader({
                request,
                params,
                context,
                serverLoader: vi.fn().mockResolvedValue({
                    product: Promise.resolve(mockProduct),
                    category: Promise.resolve(mockCategory),
                    recommendations: Promise.resolve([]),
                }),
            });

            expect(result).toHaveProperty('product');
            expect(result).toHaveProperty('category');

            // Verify the structure is the same as server loader
            const productData = await result.product;
            expect(productData).toEqual(mockProduct);
        });

        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        test('includes inventoryIds when store is selected', () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockResolvedValue({ data: mockCategory });

            const selectedStoreInfo = {
                storeId: 'store-123',
                inventoryId: 'inventory-123',
                name: 'Test Store',
            };

            mockGetCookieFromDocumentAs.mockReturnValue(selectedStoreInfo);

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            clientLoader({
                request,
                params,
                context,
                serverLoader: vi.fn(),
            });

            // Verify getProduct was called with inventoryIds parameter
            expect(mockGetProduct).toHaveBeenCalledWith({
                params: expect.objectContaining({
                    path: expect.objectContaining({
                        id: 'test-product-123',
                    }),
                    query: expect.objectContaining({
                        inventoryIds: ['inventory-123'],
                    }),
                }),
            });
        });

        test('does not include inventoryIds when store is not selected', () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockResolvedValue({ data: mockCategory });
            mockGetCookieFromDocumentAs.mockReturnValue(null);

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            clientLoader({
                request,
                params,
                context,
                serverLoader: vi.fn(),
            });

            // Verify getProduct was called without inventoryIds parameter
            const callArgs = mockGetProduct.mock.calls[0]?.[0];
            expect(callArgs?.params?.query).not.toHaveProperty('inventoryIds');
        });
        // @sfdc-extension-block-end SFDC_EXT_BOPIS
    });

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    describe('loader function with BOPIS extension', () => {
        test('includes inventoryIds when store is selected in cookie', () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockResolvedValue({ data: mockCategory });

            const selectedStoreInfo = {
                storeId: 'store-123',
                inventoryId: 'inventory-123',
                name: 'Test Store',
            };

            mockGetCookieFromRequestAs.mockReturnValue(selectedStoreInfo);

            const request = new Request('https://example.com/product/test-product-123', {
                headers: {
                    Cookie: `selectedStoreInfo_test=${encodeURIComponent(JSON.stringify(selectedStoreInfo))}`,
                },
            });
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            loader({ request, params, context });

            // Verify getProduct was called with inventoryIds parameter
            expect(mockGetProduct).toHaveBeenCalledWith({
                params: expect.objectContaining({
                    path: expect.objectContaining({
                        id: 'test-product-123',
                    }),
                    query: expect.objectContaining({
                        inventoryIds: ['inventory-123'],
                    }),
                }),
            });
        });

        test('does not include inventoryIds when store is not selected', () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockResolvedValue({ data: mockCategory });
            mockGetCookieFromRequestAs.mockReturnValue(null);

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            loader({ request, params, context });

            // Verify getProduct was called without inventoryIds parameter
            const callArgs = mockGetProduct.mock.calls[0]?.[0];
            expect(callArgs?.params?.query).not.toHaveProperty('inventoryIds');
        });

        test('handles store info without inventoryId', () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockResolvedValue({ data: mockCategory });

            const selectedStoreInfo = {
                storeId: 'store-123',
                name: 'Test Store',
                // No inventoryId
            };

            mockGetCookieFromRequestAs.mockReturnValue(selectedStoreInfo);

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            loader({ request, params, context });

            // Verify getProduct was called without inventoryIds parameter
            const callArgs = mockGetProduct.mock.calls[0][0];
            expect(callArgs.params.query).not.toHaveProperty('inventoryIds');
        });
    });
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    describe('getPageData helper function', () => {
        test('uses pid parameter when present in URL', () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockResolvedValue({ data: mockCategory });

            const request = new Request('https://example.com/product/test-product-123?pid=variant-456');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            loader({ request, params, context });

            // Should use the pid parameter instead of productId
            expect(mockGetProduct).toHaveBeenCalledWith({
                params: expect.objectContaining({
                    path: expect.objectContaining({
                        id: 'variant-456',
                    }),
                }),
            });
        });

        test('uses productId when pid parameter is not present', () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockResolvedValue({ data: mockCategory });

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            loader({ request, params, context });

            // Should use the productId from params
            expect(mockGetProduct).toHaveBeenCalledWith({
                params: expect.objectContaining({
                    path: expect.objectContaining({
                        id: 'test-product-123',
                    }),
                }),
            });
        });

        test('includes all required expand parameters', () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockResolvedValue({ data: mockCategory });

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            loader({ request, params, context });

            const callArgs = mockGetProduct.mock.calls[0][0];
            expect(callArgs.params.query.expand).toContain('availability');
            expect(callArgs.params.query.expand).toContain('bundled_products');
            expect(callArgs.params.query.expand).toContain('images');
            expect(callArgs.params.query.expand).toContain('options');
            expect(callArgs.params.query.expand).toContain('page_meta_tags');
            expect(callArgs.params.query.expand).toContain('prices');
            expect(callArgs.params.query.expand).toContain('promotions');
            expect(callArgs.params.query.expand).toContain('set_products');
            expect(callArgs.params.query.expand).toContain('variations');
            expect(callArgs.params.query.allImages).toBe(true);
            expect(callArgs.params.query.perPricebook).toBe(true);
        });

        test('handles product without primaryCategoryId', async () => {
            const productWithoutCategory = {
                ...mockProduct,
                primaryCategoryId: null,
            };

            mockGetProduct.mockResolvedValue({ data: productWithoutCategory });

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            const result = loader({ request, params, context });

            const categoryData = await result.category;
            expect(categoryData).toBeUndefined();
            expect(mockGetCategory).not.toHaveBeenCalled();
        });

        test('handles variant product without master product ID', async () => {
            const variantProductWithoutMaster = {
                ...mockProduct,
                id: 'variant-product-123',
                primaryCategoryId: null,
                master: undefined, // No master product
            };

            mockGetProduct.mockResolvedValue({ data: variantProductWithoutMaster });

            const request = new Request('https://example.com/product/variant-product-123');
            const params = { productId: 'variant-product-123' };
            const context = mockContext;

            const result = loader({ request, params, context });

            const categoryData = await result.category;
            expect(categoryData).toBeUndefined();
            // Should not try to fetch master product category
            expect(mockGetProduct).toHaveBeenCalledTimes(1);
        });

        test('handles variant product with master but master has no category', async () => {
            const variantProduct = {
                ...mockProduct,
                id: 'variant-product-123',
                primaryCategoryId: null,
                master: {
                    masterId: 'master-product-123',
                },
            };

            const masterProductWithoutCategory = {
                ...mockProduct,
                id: 'master-product-123',
                primaryCategoryId: null, // Master also has no category
            };

            mockGetProduct
                .mockResolvedValueOnce({ data: variantProduct }) // First call for variant
                .mockResolvedValueOnce({ data: masterProductWithoutCategory }); // Second call for master

            const request = new Request('https://example.com/product/variant-product-123');
            const params = { productId: 'variant-product-123' };
            const context = mockContext;

            const result = loader({ request, params, context });

            const categoryData = await result.category;
            expect(categoryData).toBeUndefined();
            expect(mockGetProduct).toHaveBeenCalledTimes(2);
            expect(mockGetCategory).not.toHaveBeenCalled();
        });

        test('handles category fetch error gracefully', async () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockRejectedValue(new Error('Category not found'));

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            const result = loader({ request, params, context });

            const categoryData = await result.category;
            expect(categoryData).toBeUndefined();
        });

        test('handles variant product with master product category lookup', async () => {
            const variantProduct = {
                ...mockProduct,
                id: 'variant-product-123',
                primaryCategoryId: null,
                master: {
                    masterId: 'master-product-123',
                },
            };

            const masterProduct = {
                ...mockProduct,
                id: 'master-product-123',
                primaryCategoryId: 'master-category-123',
            };

            mockGetProduct
                .mockResolvedValueOnce({ data: variantProduct }) // First call for variant
                .mockResolvedValueOnce({ data: masterProduct }); // Second call for master
            mockGetCategory.mockResolvedValue({ data: mockCategory });

            const request = new Request('https://example.com/product/variant-product-123');
            const params = { productId: 'variant-product-123' };
            const context = mockContext;

            const result = loader({ request, params, context });

            const productData = await result.product;
            expect(productData).toEqual(variantProduct);

            const categoryData = await result.category;
            expect(categoryData).toEqual(mockCategory);

            // Verify both product calls were made
            expect(mockGetProduct).toHaveBeenCalledTimes(2);
            expect(mockGetProduct).toHaveBeenNthCalledWith(1, {
                params: expect.objectContaining({
                    path: expect.objectContaining({
                        id: 'variant-product-123',
                    }),
                }),
            });
            expect(mockGetProduct).toHaveBeenNthCalledWith(2, {
                params: expect.objectContaining({
                    path: expect.objectContaining({
                        id: 'master-product-123',
                    }),
                }),
            });
        });

        test.skip('generates recommendations with correct product and category data', async () => {
            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockResolvedValue({ data: mockCategory });

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            const result = loader({ request, params, context });

            // Wait for promises to resolve
            await Promise.all([result.product, result.category, result.recommendations]);

            // Verify generateRecommendationPromises was called
            expect(mockGenerateRecommendationPromises).toHaveBeenCalled();
            const callArgs = mockGenerateRecommendationPromises.mock.calls[0] as unknown[];
            if (callArgs && callArgs.length >= 2) {
                const firstArg = callArgs[0];
                const secondArg = callArgs[1];
                expect(firstArg).toBe(context);
                expect(secondArg).toHaveProperty('product');
                expect(secondArg).toHaveProperty('category');
            }
        });

        test.skip('handles category with parentCategoryId and extracts subcategories', async () => {
            const categoryWithParent: ShopperProducts.schemas['Category'] = {
                ...mockCategory,
                parentCategoryId: 'parent-category-123',
            };

            const parentCategory: ShopperProducts.schemas['Category'] = {
                id: 'parent-category-123',
                name: 'Parent Category',
                categories: [
                    { id: 'sub-1', name: 'Subcategory 1', parentCategoryId: 'parent-category-123' },
                    { id: 'sub-2', name: 'Subcategory 2', parentCategoryId: 'parent-category-123' },
                ],
            };

            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory
                .mockResolvedValueOnce({ data: categoryWithParent }) // First call for the category
                .mockResolvedValueOnce({ data: parentCategory }); // Second call for parent category

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            loader({ request, params, context });

            // Wait for promises to resolve
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify parent category was fetched
            expect(mockGetCategory).toHaveBeenCalledWith({
                params: expect.objectContaining({
                    path: expect.objectContaining({
                        id: 'parent-category-123',
                    }),
                    query: expect.objectContaining({
                        levels: 1,
                    }),
                }),
            });

            // Verify generateRecommendationPromises was called with subcategories
            expect(mockGenerateRecommendationPromises).toHaveBeenCalled();
            const callArgs = mockGenerateRecommendationPromises.mock.calls[0] as unknown[];
            if (callArgs && callArgs.length >= 2) {
                const secondArg = callArgs[1] as any;
                expect(secondArg).toHaveProperty('subcategories');
                expect(Array.isArray(secondArg.subcategories)).toBe(true);
            }
        });

        test.skip('handles product with master product ID for recommendations', async () => {
            const variantProduct = {
                ...mockProduct,
                id: 'variant-product-123',
                master: {
                    masterId: 'master-product-123',
                },
            };

            mockGetProduct.mockResolvedValue({ data: variantProduct });
            mockGetCategory.mockResolvedValue({ data: mockCategory });

            const request = new Request('https://example.com/product/variant-product-123');
            const params = { productId: 'variant-product-123' };
            const context = mockContext;

            loader({ request, params, context });

            // Wait for promises to resolve
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify generateRecommendationPromises was called
            expect(mockGenerateRecommendationPromises).toHaveBeenCalled();
            const callArgs = mockGenerateRecommendationPromises.mock.calls[0] as unknown[];
            if (callArgs && callArgs.length >= 2) {
                const secondArg = callArgs[1] as any;
                expect(secondArg.product.id).toBe('master-product-123');
            }
        });

        test.skip('handles category fetch error when parent category fails', async () => {
            const categoryWithParent: ShopperProducts.schemas['Category'] = {
                ...mockCategory,
                parentCategoryId: 'parent-category-123',
            };

            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory
                .mockResolvedValueOnce({ data: categoryWithParent }) // First call succeeds
                .mockRejectedValueOnce(new Error('Parent category not found')); // Second call fails

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            const result = loader({ request, params, context });

            // Should still return valid structure even if parent category fetch fails
            expect(result).toHaveProperty('product');
            expect(result).toHaveProperty('category');

            // Wait for promises to resolve and handle the rejection
            try {
                await result.recommendations;
            } catch {
                // The error is expected and handled internally by the code
                // The recommendations promise will reject, but that's okay for this test
            }
        });

        test.skip('handles category without parentCategoryId for recommendations', async () => {
            const categoryWithoutParent: ShopperProducts.schemas['Category'] = {
                ...mockCategory,
                parentCategoryId: undefined,
            };

            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory.mockResolvedValue({ data: categoryWithoutParent });

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            loader({ request, params, context });

            // Wait for promises to resolve
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify generateRecommendationPromises was called without subcategories
            expect(mockGenerateRecommendationPromises).toHaveBeenCalled();
            const callArgs = mockGenerateRecommendationPromises.mock.calls[0] as unknown[];
            if (callArgs && callArgs.length >= 2) {
                const secondArg = callArgs[1] as any;
                expect(secondArg).toHaveProperty('subcategories');
                expect(Array.isArray(secondArg.subcategories)).toBe(true);
                expect(secondArg.subcategories.length).toBe(0);
            }
        });

        test.skip('handles parent category with empty categories array', async () => {
            const categoryWithParent: ShopperProducts.schemas['Category'] = {
                ...mockCategory,
                parentCategoryId: 'parent-category-123',
            };

            const parentCategoryWithNoSubs: ShopperProducts.schemas['Category'] = {
                id: 'parent-category-123',
                name: 'Parent Category',
                categories: [], // Empty categories array
            };

            mockGetProduct.mockResolvedValue({ data: mockProduct });
            mockGetCategory
                .mockResolvedValueOnce({ data: categoryWithParent }) // First call for the category
                .mockResolvedValueOnce({ data: parentCategoryWithNoSubs }); // Second call for parent category

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            loader({ request, params, context });

            // Wait for promises to resolve
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Verify generateRecommendationPromises was called with empty subcategories
            expect(mockGenerateRecommendationPromises).toHaveBeenCalled();
            const callArgs = mockGenerateRecommendationPromises.mock.calls[0] as unknown[];
            if (callArgs && callArgs.length >= 2) {
                const secondArg = callArgs[1] as any;
                expect(secondArg).toHaveProperty('subcategories');
                expect(Array.isArray(secondArg.subcategories)).toBe(true);
                expect(secondArg.subcategories.length).toBe(0);
            }
        });
    });
});
