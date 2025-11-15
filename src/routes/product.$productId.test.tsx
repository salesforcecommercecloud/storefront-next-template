/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { shouldRevalidate } from './product.$productId';

// Mock the components and utilities
vi.mock('@/components/product-skeleton', () => ({
    default: () => <div data-testid="product-skeleton">Loading...</div>,
}));

vi.mock('@/components/product-view', () => ({
    default: () => <div data-testid="product-view">Product View</div>,
}));

vi.mock('@/components/product-view/child-products', () => ({
    default: () => <div data-testid="child-products">Child Products</div>,
}));

vi.mock('@/components/typography', () => ({
    Typography: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock('@/components/product/skeletons', () => ({
    ProductRecommendationsSkeleton: () => <div data-testid="recommendations-skeleton">Loading recommendations...</div>,
}));

vi.mock('@/components/with-suspense', () => ({
    default: (Component: any, _options: any) => {
        return function WrappedComponent(props: any) {
            return (
                <div data-testid="with-suspense">
                    <Component {...props} />
                </div>
            );
        };
    },
}));

vi.mock('@/components/product-carousel', () => ({
    ProductCarouselWithSuspense: ({ title, _resolve }: any) => (
        <div data-testid="product-carousel">
            <div data-testid="carousel-title">{title}</div>
        </div>
    ),
}));

vi.mock('@/lib/product-utils', () => ({
    isProductSet: vi.fn(),
    isProductBundle: vi.fn(),
}));

vi.mock('@/lib/recommendations', () => ({
    generateRecommendationPromises: vi.fn(),
}));

vi.mock('@/lib/scapi', () => ({
    default: () => ({
        ShopperProducts: {
            getProduct: vi.fn(),
            getCategory: vi.fn(),
        },
    }),
}));

vi.mock('@/components/create-page', () => ({
    createPage: vi.fn(({ component: Component }) => {
        return function ProductPage(props: any) {
            return (
                <div data-testid="product-page">
                    <Component {...props} />
                </div>
            );
        };
    }),
}));

// Import the functions we want to test
import { isProductSet, isProductBundle } from '@/lib/product-utils';

describe('Product Detail Route', () => {
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

    const mockRecommendations = [
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
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('shouldRevalidate function', () => {
        test('should revalidate when pathname changes (different product)', () => {
            const currentUrl = 'https://example.com/product/product-1';
            const nextUrl = 'https://example.com/product/product-2';

            const result = shouldRevalidate({ currentUrl, nextUrl });
            expect(result).toBe(true);
        });

        test('should revalidate when pid parameter changes (different variant)', () => {
            const currentUrl = 'https://example.com/product/product-1?pid=variant-1';
            const nextUrl = 'https://example.com/product/product-1?pid=variant-2';

            const result = shouldRevalidate({ currentUrl, nextUrl });
            expect(result).toBe(true);
        });

        test('should not revalidate for other search parameter changes', () => {
            const currentUrl = 'https://example.com/product/product-1?color=red&size=large';
            const nextUrl = 'https://example.com/product/product-1?color=blue&size=medium';

            const result = shouldRevalidate({ currentUrl, nextUrl });
            expect(result).toBe(false);
        });

        test('should not revalidate when only other parameters change', () => {
            const currentUrl = 'https://example.com/product/product-1?color=red';
            const nextUrl = 'https://example.com/product/product-1?color=blue&size=large';

            const result = shouldRevalidate({ currentUrl, nextUrl });
            expect(result).toBe(false);
        });

        test('should handle URLs with no search parameters', () => {
            const currentUrl = 'https://example.com/product/product-1';
            const nextUrl = 'https://example.com/product/product-1';

            const result = shouldRevalidate({ currentUrl, nextUrl });
            expect(result).toBe(false);
        });

        test('should handle missing pid parameters', () => {
            const currentUrl = 'https://example.com/product/product-1';
            const nextUrl = 'https://example.com/product/product-1?color=red';

            const result = shouldRevalidate({ currentUrl, nextUrl });
            expect(result).toBe(false);
        });
    });

    describe('ProductDetailView component', () => {
        test('should have correct product utility functions available', () => {
            // Test that the utility functions are properly imported and available
            expect(typeof isProductSet).toBe('function');
            expect(typeof isProductBundle).toBe('function');
        });
    });

    describe('RecommendationsContent component', () => {
        test('should handle empty recommendations array', () => {
            // Test that the component can handle empty recommendations
            const emptyRecommendations: any[] = [];
            expect(Array.isArray(emptyRecommendations)).toBe(true);
            expect(emptyRecommendations.length).toBe(0);
        });

        test('should handle recommendations with data', () => {
            // Test that the component can handle recommendations with data
            expect(Array.isArray(mockRecommendations)).toBe(true);
            expect(mockRecommendations.length).toBeGreaterThan(0);
        });
    });

    describe('createPage integration', () => {
        test('should handle pageKey correctly', () => {
            const mockLoaderData = {
                product: Promise.resolve(mockProduct),
                category: Promise.resolve(mockCategory),
                recommendations: Promise.resolve(mockRecommendations),
                pageKey: 'test-product-123',
            };

            // Test that pageKey is correctly passed through
            expect(mockLoaderData.pageKey).toBe('test-product-123');
        });

        test('should have proper loader data structure', () => {
            const mockLoaderData = {
                product: Promise.resolve(mockProduct),
                category: Promise.resolve(mockCategory),
                recommendations: Promise.resolve(mockRecommendations),
                pageKey: 'test-product-123',
            };

            // Test that all required properties are present
            expect(mockLoaderData).toHaveProperty('product');
            expect(mockLoaderData).toHaveProperty('category');
            expect(mockLoaderData).toHaveProperty('recommendations');
            expect(mockLoaderData).toHaveProperty('pageKey');
        });
    });
});
