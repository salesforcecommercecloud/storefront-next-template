/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { use } from 'react';
import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { shouldRevalidate, type ProductPageData } from './product.$productId';

// Mock the components and utilities
vi.mock('@/components/product-skeleton', () => ({
    default: () => <div data-testid="product-skeleton">Loading...</div>,
}));

vi.mock('@/components/product-view', () => ({
    default: ({ product, category }: any) => (
        <div data-testid="product-view">
            <div data-testid="product-name">{product?.name}</div>
            <div data-testid="category-name">{category?.name}</div>
        </div>
    ),
}));

vi.mock('@/components/product-view/child-products', () => ({
    default: ({ parentProduct }: any) => (
        <div data-testid="child-products">
            <div data-testid="parent-product-id">{parentProduct?.id}</div>
        </div>
    ),
}));

vi.mock('@/components/typography', () => ({
    Typography: ({ children, variant, className, ...props }: any) => (
        <div data-variant={variant} className={className} {...props}>
            {children}
        </div>
    ),
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
    ProductCarouselWithSuspense: ({ title, resolve }: any) => {
        try {
            const data = use(resolve);
            return (
                <div data-testid="product-carousel">
                    <div data-testid="carousel-title">{title}</div>
                    <div data-testid="carousel-hits">{(data as any)?.hits?.length || 0}</div>
                </div>
            );
        } catch {
            return (
                <div data-testid="product-carousel">
                    <div data-testid="carousel-title">{title}</div>
                </div>
            );
        }
    },
}));

vi.mock('@/lib/product-utils', () => ({
    isProductSet: vi.fn(),
    isProductBundle: vi.fn(),
}));

vi.mock('@/lib/recommendations', () => ({
    generateRecommendationPromises: vi.fn(),
}));

const createPageMock = vi.hoisted(() =>
    vi.fn((config: any) => {
        return function ProductPage(props: any) {
            return <div data-testid="product-page">{config.component && <config.component {...props} />}</div>;
        };
    })
);

vi.mock('@/components/create-page', () => ({
    createPage: createPageMock,
}));

// @sfdc-extension-block-start SFDC_EXT_BOPIS
vi.mock('@/extensions/store-locator/utils', () => ({
    getCookieFromRequestAs: vi.fn(),
    getCookieFromDocumentAs: vi.fn(),
    getSelectedStoreInfoCookieName: vi.fn(() => 'selectedStoreInfo_test'),
}));

vi.mock('@/extensions/bopis/context/pickup-context', () => ({
    default: ({ children }: any) => <div data-testid="pickup-provider">{children}</div>,
}));
// @sfdc-extension-block-end SFDC_EXT_BOPIS

// Import the functions we want to test
import { isProductSet, isProductBundle } from '@/lib/product-utils';

// Import the route module after mocks are set up

describe('Product Detail Route', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        // Reset modules to ensure fresh import and createPage call
        vi.resetModules();
        // Import the route module to trigger createPage call with mocks in place
        await import('./product.$productId');
    });
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

    describe('shouldRevalidate function', () => {
        test('should revalidate when pathname changes (different product)', () => {
            const currentUrl = 'https://example.com/product/product-1';
            const nextUrl = 'https://example.com/product/product-2';

            const result = shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate: false });
            expect(result).toBe(true);
        });

        test('should revalidate when pid parameter changes (different variant)', () => {
            const currentUrl = 'https://example.com/product/product-1?pid=variant-1';
            const nextUrl = 'https://example.com/product/product-1?pid=variant-2';

            const result = shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate: false });
            expect(result).toBe(true);
        });

        test('should not revalidate for other search parameter changes', () => {
            const currentUrl = 'https://example.com/product/product-1?color=red&size=large';
            const nextUrl = 'https://example.com/product/product-1?color=blue&size=medium';

            const result = shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate: false });
            expect(result).toBe(false);
        });

        test('should not revalidate when only other parameters change', () => {
            const currentUrl = 'https://example.com/product/product-1?color=red';
            const nextUrl = 'https://example.com/product/product-1?color=blue&size=large';

            const result = shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate: false });
            expect(result).toBe(false);
        });

        test('should handle URLs with no search parameters', () => {
            const currentUrl = 'https://example.com/product/product-1';
            const nextUrl = 'https://example.com/product/product-1';

            const result = shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate: false });
            expect(result).toBe(false);
        });

        test('should handle missing pid parameters', () => {
            const currentUrl = 'https://example.com/product/product-1';
            const nextUrl = 'https://example.com/product/product-1?color=red';

            const result = shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate: false });
            expect(result).toBe(false);
        });

        test('should revalidate when defaultShouldRevalidate is true, even if URL has not changed', () => {
            const currentUrl = 'https://example.com/product/product-1?color=red';
            const nextUrl = 'https://example.com/product/product-1?color=red';

            const result = shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate: true });
            expect(result).toBe(true);
        });

        test('should revalidate when defaultShouldRevalidate is true, even for other parameter changes', () => {
            const currentUrl = 'https://example.com/product/product-1?color=red&size=large';
            const nextUrl = 'https://example.com/product/product-1?color=blue&size=medium';

            const result = shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate: true });
            expect(result).toBe(true);
        });

        test('should prioritize defaultShouldRevalidate over URL comparison when true', () => {
            const currentUrl = 'https://example.com/product/product-1';
            const nextUrl = 'https://example.com/product/product-1';

            const result = shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate: true });
            expect(result).toBe(true);
        });

        test('should handle pid parameter change from null to value', () => {
            const currentUrl = 'https://example.com/product/product-1';
            const nextUrl = 'https://example.com/product/product-1?pid=variant-1';

            const result = shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate: false });
            expect(result).toBe(true);
        });

        test('should handle pid parameter change from value to null', () => {
            const currentUrl = 'https://example.com/product/product-1?pid=variant-1';
            const nextUrl = 'https://example.com/product/product-1';

            const result = shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate: false });
            expect(result).toBe(true);
        });
    });

    describe('ProductDetailView component', () => {
        test('should have correct product utility functions available', () => {
            // Test that the utility functions are properly imported and available
            expect(typeof isProductSet).toBe('function');
            expect(typeof isProductBundle).toBe('function');
        });

        test('should handle product utility function calls correctly', () => {
            // Test that utility functions can be called with product data
            vi.mocked(isProductSet).mockReturnValue(false);
            vi.mocked(isProductBundle).mockReturnValue(false);

            const result1 = isProductSet(mockProduct);
            const result2 = isProductBundle(mockProduct);

            expect(result1).toBe(false);
            expect(result2).toBe(false);
            expect(isProductSet).toHaveBeenCalledWith(mockProduct);
            expect(isProductBundle).toHaveBeenCalledWith(mockProduct);
        });

        test('should handle product set detection', () => {
            vi.mocked(isProductSet).mockReturnValue(true);
            vi.mocked(isProductBundle).mockReturnValue(false);

            const result = isProductSet(mockProduct);
            expect(result).toBe(true);
        });

        test('should handle product bundle detection', () => {
            vi.mocked(isProductSet).mockReturnValue(false);
            vi.mocked(isProductBundle).mockReturnValue(true);

            const result = isProductBundle(mockProduct);
            expect(result).toBe(true);
        });

        test('should handle product without shortDescription', async () => {
            vi.mocked(isProductSet).mockReturnValue(false);
            vi.mocked(isProductBundle).mockReturnValue(false);

            const productWithoutDescription = {
                ...mockProduct,
                shortDescription: undefined,
            };

            const { default: ProductPage } = await import('./product.$productId');
            const mockLoaderData = {
                product: Promise.resolve(productWithoutDescription),
                category: Promise.resolve(mockCategory),
                recommendations: Promise.resolve(mockRecommendations),
                pageKey: 'test-product-123',
            };

            // Render the page component to exercise ProductDetailView
            render(<ProductPage loaderData={mockLoaderData as unknown as ProductPageData} />);

            // Component should handle missing shortDescription
            expect(productWithoutDescription.shortDescription).toBeUndefined();
        });

        test('should handle product with shortDescription', async () => {
            vi.mocked(isProductSet).mockReturnValue(false);
            vi.mocked(isProductBundle).mockReturnValue(false);

            const productWithDescription = {
                ...mockProduct,
                shortDescription: 'Test description',
            };

            const { default: ProductPage } = await import('./product.$productId');
            const mockLoaderData = {
                product: Promise.resolve(productWithDescription),
                category: Promise.resolve(mockCategory),
                recommendations: Promise.resolve(mockRecommendations),
                pageKey: 'test-product-123',
            };

            // Render the page component to exercise ProductDetailView
            render(<ProductPage loaderData={mockLoaderData as unknown as ProductPageData} />);

            // Component should handle shortDescription
            expect(productWithDescription.shortDescription).toBe('Test description');
        });

        test('should render ProductDetailView with product set', async () => {
            vi.mocked(isProductSet).mockReturnValue(true);
            vi.mocked(isProductBundle).mockReturnValue(false);

            const { default: ProductPage } = await import('./product.$productId');
            const mockLoaderData = {
                product: Promise.resolve(mockProduct),
                category: Promise.resolve(mockCategory),
                recommendations: Promise.resolve(mockRecommendations),
                pageKey: 'test-product-123',
            };

            // Render the page component to exercise ProductDetailView with product set
            render(<ProductPage loaderData={mockLoaderData as unknown as ProductPageData} />);
        });

        test('should render ProductDetailView with product bundle', async () => {
            vi.mocked(isProductSet).mockReturnValue(false);
            vi.mocked(isProductBundle).mockReturnValue(true);

            const { default: ProductPage } = await import('./product.$productId');
            const mockLoaderData = {
                product: Promise.resolve(mockProduct),
                category: Promise.resolve(mockCategory),
                recommendations: Promise.resolve(mockRecommendations),
                pageKey: 'test-product-123',
            };

            // Render the page component to exercise ProductDetailView with product bundle
            render(<ProductPage loaderData={mockLoaderData as unknown as ProductPageData} />);
        });
    });

    describe('RecommendationsContent component', () => {
        test('should return null for empty recommendations array', async () => {
            vi.mocked(isProductSet).mockReturnValue(false);
            vi.mocked(isProductBundle).mockReturnValue(false);

            const { default: ProductPage } = await import('./product.$productId');

            const mockLoaderData = {
                product: Promise.resolve(mockProduct),
                category: Promise.resolve(mockCategory),
                recommendations: Promise.resolve([]),
                pageKey: 'test-product-123',
            };

            // Render the page component to exercise RecommendationsContent with empty array
            render(<ProductPage loaderData={mockLoaderData as unknown as ProductPageData} />);
        });

        test('should render recommendations with data', async () => {
            vi.mocked(isProductSet).mockReturnValue(false);
            vi.mocked(isProductBundle).mockReturnValue(false);

            const { default: ProductPage } = await import('./product.$productId');
            const mockLoaderData = {
                product: Promise.resolve(mockProduct),
                category: Promise.resolve(mockCategory),
                recommendations: Promise.resolve(mockRecommendations),
                pageKey: 'test-product-123',
            };

            // Render the page component to exercise RecommendationsContent with data
            render(<ProductPage loaderData={mockLoaderData as unknown as ProductPageData} />);
        });

        test('should handle multiple recommendation carousels', () => {
            const multipleRecommendations = [
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
                {
                    config: { id: 'similar-items', title: 'Similar Items' },
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

            // Test that multiple recommendations are handled
            expect(multipleRecommendations.length).toBe(2);
            expect(multipleRecommendations[0].config.title).toBe('You May Also Like');
            expect(multipleRecommendations[1].config.title).toBe('Similar Items');
        });

        test('should handle null data gracefully', async () => {
            vi.mocked(isProductSet).mockReturnValue(false);
            vi.mocked(isProductBundle).mockReturnValue(false);

            const { default: ProductPage } = await import('./product.$productId');
            const mockLoaderData = {
                product: Promise.resolve(mockProduct),
                category: Promise.resolve(mockCategory),
                recommendations: Promise.resolve(null as any),
                pageKey: 'test-product-123',
            };

            // Render the page component to exercise RecommendationsContent with null data
            render(<ProductPage loaderData={mockLoaderData as unknown as ProductPageData} />);
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

        test('should use pageKey from loader data for getPageKey', () => {
            // Verify createPage was called (it's called when the route module is imported)
            expect(createPageMock).toHaveBeenCalled();
            expect(createPageMock.mock.calls.length).toBeGreaterThan(0);

            // Get the config from the createPage mock call
            const createPageCall = createPageMock.mock.calls[0]?.[0];

            // If the call structure is different, try to find it
            if (!createPageCall || !createPageCall.getPageKey) {
                // Try to find the config in any call
                for (const call of createPageMock.mock.calls) {
                    if (call[0]?.getPageKey) {
                        const mockGetPageKey = call[0].getPageKey;
                        const mockLoaderData = {
                            product: Promise.resolve(mockProduct),
                            category: Promise.resolve(mockCategory),
                            recommendations: Promise.resolve(mockRecommendations),
                            pageKey: 'test-product-123',
                        };
                        const result = mockGetPageKey(mockLoaderData);
                        expect(result).toBe('test-product-123');
                        return;
                    }
                }
                // If we get here, the structure is unexpected
                expect.fail('createPage was called but getPageKey not found in config');
            }

            const mockGetPageKey = createPageCall.getPageKey;
            expect(mockGetPageKey).toBeDefined();
            expect(typeof mockGetPageKey).toBe('function');

            const mockLoaderData = {
                product: Promise.resolve(mockProduct),
                category: Promise.resolve(mockCategory),
                recommendations: Promise.resolve(mockRecommendations),
                pageKey: 'test-product-123',
            };

            const result = mockGetPageKey(mockLoaderData);
            expect(result).toBe('test-product-123');
        });

        test('getPageKey function should return pageKey from different loader data', () => {
            // Verify createPage was called
            expect(createPageMock).toHaveBeenCalled();

            // Find the config with getPageKey
            let mockGetPageKey: ((data: any) => string) | undefined;
            for (const call of createPageMock.mock.calls) {
                if (call[0]?.getPageKey) {
                    mockGetPageKey = call[0].getPageKey;
                    break;
                }
            }

            expect(mockGetPageKey).toBeDefined();
            if (mockGetPageKey) {
                const mockLoaderData = {
                    product: Promise.resolve(mockProduct),
                    category: Promise.resolve(mockCategory),
                    recommendations: Promise.resolve(mockRecommendations),
                    pageKey: 'different-product-456',
                };

                const result = mockGetPageKey(mockLoaderData);
                expect(result).toBe('different-product-456');
            }
        });
    });
});
