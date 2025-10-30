/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { ShopperProductsTypes, ShopperSearchTypes } from 'commerce-sdk-isomorphic';
import { loader, clientLoader } from './product.$productId';

// Mock the SCAPI client
const mockGetProduct = vi.fn();
const mockGetCategory = vi.fn();

vi.mock('@/lib/scapi', () => ({
    default: () => ({
        ShopperProducts: {
            getProduct: mockGetProduct,
            getCategory: mockGetCategory,
        },
    }),
}));

// Mock the recommendations function
vi.mock('@/lib/recommendations', () => ({
    generateRecommendationPromises: vi.fn(() => [
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
            } as ShopperSearchTypes.ProductSearchResult),
        },
    ]),
}));

describe('Product Route Loaders', () => {
    const mockProduct: ShopperProductsTypes.Product = {
        id: 'test-product-123',
        name: 'Test Product',
        primaryCategoryId: 'test-category-123',
        shortDescription: 'Test product description',
        longDescription: 'Long test product description',
        master: undefined,
    };

    const mockCategory: ShopperProductsTypes.Category = {
        id: 'test-category-123',
        name: 'Test Category',
        parentCategoryId: 'parent-category-123',
        categories: [],
    };

    const mockContext = {
        locale: 'en-US',
        currency: 'USD',
        siteId: 'test-site',
        get: vi.fn(),
        set: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loader function', () => {
        test('fetches product data successfully', async () => {
            mockGetProduct.mockResolvedValue(mockProduct);
            mockGetCategory.mockResolvedValue(mockCategory);

            const request = new Request('https://example.com/product/test-product-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            const result = loader({ request, params, context });

            expect(result).toHaveProperty('product');
            expect(result).toHaveProperty('category');
            expect(result).toHaveProperty('recommendations');

            // Verify the product promise resolves correctly
            const productData = await result.product;
            expect(productData).toEqual(mockProduct);

            // Verify the category promise resolves correctly
            const categoryData = await result.category;
            expect(categoryData).toEqual(mockCategory);

            // Verify recommendations promise resolves
            const recommendationsData = await result.recommendations;
            expect(Array.isArray(recommendationsData)).toBe(true);
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

            // The recommendations promise should also reject since it depends on the product
            await expect(result.recommendations).rejects.toThrow('Product not found');
        });

        test('handles category fetch failure gracefully', async () => {
            mockGetProduct.mockResolvedValue(mockProduct);
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
                .mockResolvedValueOnce(variantProduct) // First call for variant
                .mockResolvedValueOnce(masterProduct); // Second call for master
            mockGetCategory.mockResolvedValue(mockCategory);

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
            mockGetProduct.mockResolvedValue(mockProduct);
            mockGetCategory.mockResolvedValue(mockCategory);

            const request = new Request('https://example.com/product/test-product-123?pid=variant-123');
            const params = { productId: 'test-product-123' };
            const context = mockContext;

            loader({ request, params, context });

            // Should use the pid parameter instead of productId
            expect(mockGetProduct).toHaveBeenCalledWith({
                parameters: expect.objectContaining({
                    id: 'variant-123',
                }),
            });
        });
    });

    describe('clientLoader function', () => {
        test('returns same data structure as server loader', async () => {
            mockGetProduct.mockResolvedValue(mockProduct);
            mockGetCategory.mockResolvedValue(mockCategory);

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
            expect(result).toHaveProperty('recommendations');

            // Verify the structure is the same as server loader
            const productData = await result.product;
            expect(productData).toEqual(mockProduct);
        });
    });
});
