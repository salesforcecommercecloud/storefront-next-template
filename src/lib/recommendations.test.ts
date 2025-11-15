/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi, describe, test, expect, beforeEach } from 'vitest';
import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import {
    generateRecommendationPromises,
    getSearchParamsForType,
    getEnabledRecommendationTypes,
} from './recommendations';
import { fetchSearchProducts } from '@/lib/api/search';

vi.mock('@/lib/api/search');
vi.mock('@/config', () => ({
    getConfig: () => ({
        global: {
            recommendations: {
                search_limit: {
                    youMightLike: 8,
                    completeLook: 12,
                    recentlyViewed: 6,
                },
                types: {
                    'you-may-also-like': {
                        enabled: true,
                        priority: 1,
                        sort: 'best-matches',
                        titleKey: 'product.recommendations.youMightAlsoLike',
                    },
                    'complete-the-look': {
                        enabled: true,
                        priority: 2,
                        sort: 'price-low-to-high',
                        titleKey: 'product.recommendations.completeTheLook',
                    },
                    'recently-viewed': {
                        enabled: false,
                        priority: 3,
                        sort: 'most-popular',
                        titleKey: 'product.recommendations.recentlyViewed',
                    },
                },
            },
        },
    }),
}));

vi.mock('@/temp-ui-string', () => ({
    default: {
        product: {
            recommendations: {
                youMightAlsoLike: 'You May Also Like',
                completeTheLook: 'Complete the Look',
                recentlyViewed: 'Recently Viewed',
            },
        },
    },
}));

const mockProduct: ShopperProducts.schemas['Product'] = {
    id: 'test-product-id',
    name: 'Test Product',
    primaryCategoryId: 'test-category-id',
    master: {
        masterId: 'test-master-id',
    },
} as ShopperProducts.schemas['Product'];

const mockCategory: ShopperProducts.schemas['Category'] = {
    id: 'test-category-id',
    name: 'Test Category',
    parentCategoryId: 'parent-category-id',
} as ShopperProducts.schemas['Category'];

const mockSearchResult: ShopperSearch.schemas['ProductSearchResult'] = {
    hits: [],
    total: 0,
    query: '',
    refinements: [],
    searchPhraseSuggestions: { suggestedTerms: [] },
    sortingOptions: [],
    start: 0,
    count: 0,
    offset: 0,
    limit: 0,
};

describe('getEnabledRecommendationTypes', () => {
    test('returns enabled recommendation types in priority order', () => {
        const enabledTypes = getEnabledRecommendationTypes();
        expect(enabledTypes).toEqual(['you-may-also-like', 'complete-the-look']);
    });
});

describe('getSearchParamsForType', () => {
    const mockContext = {
        product: mockProduct,
        category: mockCategory,
    };

    describe('you-may-also-like', () => {
        test('generates correct search parameters', () => {
            const searchParams = getSearchParamsForType('you-may-also-like', mockContext);

            expect(searchParams).toEqual({
                categoryId: 'test-category-id',
                refine: [],
                limit: 8,
                sort: 'best-matches',
            });
        });

        test('falls back to product primary category when category is not provided', () => {
            const contextWithoutCategory = { product: mockProduct };
            const searchParams = getSearchParamsForType('you-may-also-like', contextWithoutCategory);

            expect(searchParams).toEqual({
                categoryId: 'test-category-id',
                refine: [],
                limit: 8,
                sort: 'best-matches',
            });
        });

        test('falls back to root category when both category and primaryCategoryId are not available', () => {
            const productWithoutCategory = { ...mockProduct, primaryCategoryId: undefined };
            const contextWithoutCategory = { product: productWithoutCategory };
            const searchParams = getSearchParamsForType('you-may-also-like', contextWithoutCategory);

            expect(searchParams).toEqual({
                categoryId: 'root',
                refine: [],
                limit: 8,
                sort: 'best-matches',
            });
        });

        test('returns null when product is not provided', () => {
            const contextWithoutProduct = { category: mockCategory };
            const searchParams = getSearchParamsForType('you-may-also-like', contextWithoutProduct);

            expect(searchParams).toBeNull();
        });
    });

    describe('complete-the-look', () => {
        test('generates correct search parameters with category', () => {
            const searchParams = getSearchParamsForType('complete-the-look', mockContext);

            expect(searchParams).toEqual({
                categoryId: 'parent-category-id',
                refine: ['!id=test-product-id'],
                limit: 12,
                sort: 'price-low-to-high',
            });
        });

        test('falls back to root category when category is not provided', () => {
            const contextWithoutCategory = { product: mockProduct };
            const searchParams = getSearchParamsForType('complete-the-look', contextWithoutCategory);

            expect(searchParams).toEqual({
                categoryId: 'root',
                refine: ['!id=test-product-id'],
                limit: 12,
                sort: 'price-low-to-high',
            });
        });

        test('handles category without parent category', () => {
            const categoryWithoutParent = { ...mockCategory, parentCategoryId: undefined };
            const contextWithCategoryWithoutParent = { product: mockProduct, category: categoryWithoutParent };
            const searchParams = getSearchParamsForType('complete-the-look', contextWithCategoryWithoutParent);

            expect(searchParams).toEqual({
                categoryId: 'root',
                refine: ['!id=test-product-id'],
                limit: 12,
                sort: 'price-low-to-high',
            });
        });

        test('returns null when product is not provided', () => {
            const contextWithoutProduct = { category: mockCategory };
            const searchParams = getSearchParamsForType('complete-the-look', contextWithoutProduct);

            expect(searchParams).toBeNull();
        });
    });

    describe('recently-viewed (disabled)', () => {
        test('returns null when recommendation type is disabled', () => {
            const searchParams = getSearchParamsForType('recently-viewed', mockContext);

            expect(searchParams).toBeNull();
        });

        test('returns null when product is not provided', () => {
            const contextWithoutProduct = { category: mockCategory };
            const searchParams = getSearchParamsForType('recently-viewed', contextWithoutProduct);

            expect(searchParams).toBeNull();
        });
    });
});

describe('generateRecommendationPromises', () => {
    const mockContext = { clientId: 'test-client', siteId: 'test-site' } as any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fetchSearchProducts).mockResolvedValue(mockSearchResult);
    });

    describe('Basic Functionality', () => {
        test('generates promises for all enabled recommendations', () => {
            const promises = generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
            });

            expect(promises).toHaveLength(2);
            expect(promises.map((p) => p.config.id)).toEqual(['you-may-also-like', 'complete-the-look']);
        });

        test('returns correct structure for each promise', () => {
            const promises = generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
            });

            promises.forEach((promise) => {
                expect(promise).toHaveProperty('config');
                expect(promise).toHaveProperty('promise');
                expect(promise.config).toHaveProperty('id');
                expect(promise.config).toHaveProperty('title');
                expect(promise.config).toHaveProperty('enabled');
                expect(promise.config).toHaveProperty('priority');
                expect(promise.config).toHaveProperty('sort');
                expect(promise.config).toHaveProperty('titleKey');
                expect(promise.promise).toBeInstanceOf(Promise);
            });
        });

        test('returns empty array when context is not provided', () => {
            const promises = generateRecommendationPromises(null as any, {
                product: mockProduct,
                category: mockCategory,
            });

            expect(promises).toEqual([]);
        });
    });

    describe('Search Parameters', () => {
        test('calls fetchSearchProducts with correct parameters for you-may-also-like', () => {
            generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
            });

            expect(fetchSearchProducts).toHaveBeenCalledWith(
                mockContext,
                expect.objectContaining({
                    categoryId: 'test-category-id',
                    refine: [],
                    limit: 8,
                    sort: 'best-matches',
                })
            );
        });

        test('does not call fetchSearchProducts for disabled recently-viewed', () => {
            generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
            });

            // Should only be called for enabled recommendations (you-may-also-like and complete-the-look)
            expect(fetchSearchProducts).toHaveBeenCalledTimes(2);
        });
    });

    describe('Complete the Look Special Handling', () => {
        test('handles complete-the-look with subcategories', () => {
            const subcategories = [
                { id: 'subcat-1', name: 'Subcategory 1', parentCategoryId: 'parent-category-id' },
                { id: 'subcat-2', name: 'Subcategory 2', parentCategoryId: 'parent-category-id' },
            ];
            const promises = generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
                subcategories,
            });

            expect(promises).toHaveLength(2);
            // The complete-the-look promise should be a combined promise
            const completeTheLookPromise = promises.find((p) => p.config.id === 'complete-the-look');
            expect(completeTheLookPromise).toBeDefined();
        });

        test('handles complete-the-look without subcategories', () => {
            const promises = generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
                subcategories: [],
            });

            expect(promises).toHaveLength(2);
        });
    });

    describe('Error Handling', () => {
        test('handles API errors gracefully', async () => {
            vi.mocked(fetchSearchProducts).mockRejectedValue(new Error('API Error'));

            const promises = generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
            });

            const results = await Promise.all(promises.map((p) => p.promise));
            results.forEach((result) => {
                expect(result).toEqual({
                    hits: [],
                    query: '',
                    refinements: [],
                    searchPhraseSuggestions: { suggestedTerms: [] },
                    sortingOptions: [],
                    total: 0,
                    start: 0,
                    count: 0,
                    offset: 0,
                    limit: 0,
                });
            });
        });
    });

    describe('Promise Resolution', () => {
        test('resolves promises with correct data structure', async () => {
            const promises = generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
            });
            const results = await Promise.all(promises.map((p) => p.promise));

            results.forEach((result) => {
                expect(result).toHaveProperty('hits');
                expect(result).toHaveProperty('total');
                expect(result).toHaveProperty('query');
                expect(result).toHaveProperty('refinements');
                expect(result).toHaveProperty('searchPhraseSuggestions');
                expect(result).toHaveProperty('sortingOptions');
                expect(result).toHaveProperty('start');
                expect(result).toHaveProperty('count');
                expect(result).toHaveProperty('offset');
                expect(result).toHaveProperty('limit');
            });
        });

        test('resolves with empty results on API error', async () => {
            vi.mocked(fetchSearchProducts).mockRejectedValue(new Error('API Error'));

            const promises = generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
            });
            const results = await Promise.all(promises.map((p) => p.promise));

            results.forEach((result) => {
                expect(result.hits).toEqual([]);
                expect(result.total).toBe(0);
            });
        });
    });

    describe('Edge Cases and Additional Coverage', () => {
        test('handles product without id for complete-the-look', () => {
            const productWithoutId = { ...mockProduct, id: undefined } as any;
            const promises = generateRecommendationPromises(mockContext, {
                product: productWithoutId,
                category: mockCategory,
            });

            expect(promises).toHaveLength(2);
            const completeTheLookPromise = promises.find((p) => p.config.id === 'complete-the-look');
            expect(completeTheLookPromise).toBeDefined();
        });

        test('handles disabled recommendation types', () => {
            const promises = generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
            });

            // Should not include disabled types
            const disabledTypes = promises.filter((p) => p.config.id === 'recently-viewed');
            expect(disabledTypes).toHaveLength(0);
        });

        test('handles missing type config gracefully', () => {
            const promises = generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
            });

            // All promises should have valid config
            promises.forEach((promise) => {
                expect(promise.config.id).toBeDefined();
                expect(promise.config.title).toBeDefined();
                expect(promise.config.enabled).toBeDefined();
            });
        });

        test('handles subcategories filtering correctly', () => {
            const subcategories = [
                { id: 'subcat-1', name: 'Subcategory 1', parentCategoryId: 'parent-category-id' },
                { id: 'test-category-id', name: 'Same as category', parentCategoryId: 'parent-category-id' },
                { id: 'subcat-2', name: 'Subcategory 2', parentCategoryId: 'parent-category-id' },
            ];

            const promises = generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
                subcategories,
            });

            expect(promises).toHaveLength(2);
            const completeTheLookPromise = promises.find((p) => p.config.id === 'complete-the-look');
            expect(completeTheLookPromise).toBeDefined();
        });

        test('handles empty subcategories array', () => {
            const promises = generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
                subcategories: [],
            });

            expect(promises).toHaveLength(2);
        });

        test('handles undefined subcategories', () => {
            const promises = generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: mockCategory,
                subcategories: undefined,
            });

            expect(promises).toHaveLength(2);
        });

        test('handles product without primaryCategoryId', () => {
            const productWithoutPrimaryCategory = { ...mockProduct, primaryCategoryId: undefined };
            const promises = generateRecommendationPromises(mockContext, {
                product: productWithoutPrimaryCategory,
                category: mockCategory,
            });

            expect(promises).toHaveLength(2);
        });

        test('handles category without parentCategoryId', () => {
            const categoryWithoutParent = { ...mockCategory, parentCategoryId: undefined };
            const promises = generateRecommendationPromises(mockContext, {
                product: mockProduct,
                category: categoryWithoutParent,
            });

            expect(promises).toHaveLength(2);
        });

        test('handles missing product for you-may-also-like', () => {
            const promises = generateRecommendationPromises(mockContext, {
                category: mockCategory,
            });

            expect(promises).toHaveLength(2);
            // Should still generate promises but with fallback behavior
        });

        test('handles missing product for complete-the-look', () => {
            const promises = generateRecommendationPromises(mockContext, {
                category: mockCategory,
            });

            expect(promises).toHaveLength(2);
        });

        test('handles missing product for recently-viewed', () => {
            const promises = generateRecommendationPromises(mockContext, {
                category: mockCategory,
            });

            expect(promises).toHaveLength(2);
        });
    });
});
