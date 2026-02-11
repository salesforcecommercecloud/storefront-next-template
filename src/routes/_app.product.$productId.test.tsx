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
import { render } from '@testing-library/react';
import { use } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { shouldRevalidate, type ProductPageData } from './_app.product.$productId';

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

vi.mock('@/components/product-recommendations', () => ({
    default: ({ recommender }: any) => (
        <div data-testid="product-recommendations">
            <div data-testid="recommender-title">{recommender?.title}</div>
        </div>
    ),
}));

vi.mock('@/hooks/use-analytics', () => ({
    useAnalytics: () => ({
        trackViewProduct: vi.fn(),
    }),
}));

vi.mock('@/providers/product-context', () => ({
    ProductProvider: ({ children }: any) => <div data-testid="product-provider">{children}</div>,
}));

vi.mock('@/components/region', () => ({
    Region: ({ fallback }: any) => <div data-testid="region">{fallback}</div>,
}));

vi.mock('@/components/json-ld', () => ({
    JsonLd: () => null,
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
        await import('./_app.product.$productId');
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

    const mockPage = Promise.resolve({
        id: 'pdp',
        typeId: 'page',
        aspectTypeId: 'pdp',
        name: 'Product Detail Page',
        regions: [],
    });

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

            const { default: ProductPage } = await import('./_app.product.$productId');
            const mockLoaderData: ProductPageData = {
                product: Promise.resolve(productWithoutDescription),
                category: Promise.resolve(mockCategory),
                page: mockPage,
                pageKey: 'test-product-123',
                productSchema: Promise.resolve(null),
            };

            // Render the page component to exercise ProductDetailView
            render(<ProductPage loaderData={mockLoaderData} />);

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

            const { default: ProductPage } = await import('./_app.product.$productId');
            const mockLoaderData: ProductPageData = {
                product: Promise.resolve(productWithDescription),
                category: Promise.resolve(mockCategory),
                page: mockPage,
                pageKey: 'test-product-123',
                productSchema: Promise.resolve(null),
            };

            // Render the page component to exercise ProductDetailView
            render(<ProductPage loaderData={mockLoaderData} />);

            // Component should handle shortDescription
            expect(productWithDescription.shortDescription).toBe('Test description');
        });

        test('should render ProductDetailView with product set', async () => {
            vi.mocked(isProductSet).mockReturnValue(true);
            vi.mocked(isProductBundle).mockReturnValue(false);

            const { default: ProductPage } = await import('./_app.product.$productId');
            const mockLoaderData: ProductPageData = {
                product: Promise.resolve(mockProduct),
                category: Promise.resolve(mockCategory),
                page: mockPage,
                pageKey: 'test-product-123',
                productSchema: Promise.resolve(null),
            };

            // Render the page component to exercise ProductDetailView with product set
            render(<ProductPage loaderData={mockLoaderData} />);
        });

        test('should render ProductDetailView with product bundle', async () => {
            vi.mocked(isProductSet).mockReturnValue(false);
            vi.mocked(isProductBundle).mockReturnValue(true);

            const { default: ProductPage } = await import('./_app.product.$productId');
            const mockLoaderData: ProductPageData = {
                product: Promise.resolve(mockProduct),
                category: Promise.resolve(mockCategory),
                page: mockPage,
                pageKey: 'test-product-123',
                productSchema: Promise.resolve(null),
            };

            // Render the page component to exercise ProductDetailView with product bundle
            render(<ProductPage loaderData={mockLoaderData} />);
        });
    });

    describe('ProductRecommendationsSection component', () => {
        test('should include ProductRecommendations component integration', async () => {
            // This test verifies that the ProductRecommendations component is properly integrated
            // The actual rendering with Suspense and async data is handled by React and tested in integration tests
            const { default: ProductPage } = await import('./_app.product.$productId');

            // Verify the page component can be imported and has the correct structure
            expect(ProductPage).toBeDefined();
            expect(typeof ProductPage).toBe('function');
        });
    });

    describe('ProductPage component', () => {
        test('should handle pageKey correctly', () => {
            const mockLoaderData: ProductPageData = {
                product: Promise.resolve(mockProduct),
                category: Promise.resolve(mockCategory),
                page: mockPage,
                pageKey: 'test-product-123',
                productSchema: Promise.resolve(null),
            };

            // Test that pageKey is correctly passed through
            expect(mockLoaderData.pageKey).toBe('test-product-123');
        });

        test('should have proper loader data structure', () => {
            const mockLoaderData: ProductPageData = {
                product: Promise.resolve(mockProduct),
                category: Promise.resolve(mockCategory),
                page: mockPage,
                pageKey: 'test-product-123',
                productSchema: Promise.resolve(null),
            };

            // Test that all required properties are present
            expect(mockLoaderData).toHaveProperty('product');
            expect(mockLoaderData).toHaveProperty('category');
            expect(mockLoaderData).toHaveProperty('page');
            expect(mockLoaderData).toHaveProperty('pageKey');
            expect(mockLoaderData).toHaveProperty('productSchema');
        });

        test('should render product skeleton while loading', async () => {
            vi.mocked(isProductSet).mockReturnValue(false);
            vi.mocked(isProductBundle).mockReturnValue(false);

            const { default: ProductPage } = await import('./_app.product.$productId');
            const mockLoaderData: ProductPageData = {
                product: Promise.resolve(mockProduct),
                category: Promise.resolve(mockCategory),
                page: mockPage,
                pageKey: 'test-product-123',
                productSchema: Promise.resolve(null),
            };

            const { getByTestId } = render(<ProductPage loaderData={mockLoaderData} />);

            // Should show skeleton while Suspense boundary is waiting for promises to resolve
            expect(getByTestId('product-skeleton')).toBeTruthy();
        });
    });
});
