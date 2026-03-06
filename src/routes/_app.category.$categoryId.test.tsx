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

import 'reflect-metadata';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { type LoaderFunctionArgs, MemoryRouter } from 'react-router';
import {
    ApiError,
    type ShopperExperience,
    type ShopperProducts,
    type ShopperSearch,
} from '@salesforce/storefront-next-runtime/scapi';
import CategoryPage, { loader, ProductListingPageMetadata } from './_app.category.$categoryId';
import { createTestContext } from '@/lib/test-utils';
import { fetchCategory } from '@/lib/api/categories';
import { fetchSearchProducts } from '@/lib/api/search';
import { fetchPageWithComponentData } from '@/lib/util/pageLoader';
import { type AppConfig, getConfig } from '@/config';
import { getRegionDefinition } from '@/lib/decorators/region-definition';
import { ConfigWrapper } from '@/test-utils/context-provider';
import { generateCategorySchema } from '@/utils/category-schema';
import { useAnalytics } from '@/hooks/use-analytics';

type CategoryPageData = Awaited<ReturnType<typeof loader>>;

// Mock data
const mockCategory: ShopperProducts.schemas['Category'] = {
    id: 'electronics',
    name: 'Electronics',
    pageDescription: 'Shop the latest electronics',
    parentCategoryTree: [
        { id: 'root', name: 'Home' },
        { id: 'tech', name: 'Technology' },
    ],
};

const mockSearchResult: ShopperSearch.schemas['ProductSearchResult'] = {
    hits: [
        {
            productId: 'product-1',
            productName: 'Product 1',
            image: { alt: 'Product 1', link: '/product1.jpg' },
            price: 29.99,
            currency: 'USD',
            inventory: { ats: 10 },
            representedProduct: {
                id: 'product-1',
                imageGroups: [],
                variants: [],
                type: { master: true },
            } as any,
        },
        {
            productId: 'product-2',
            productName: 'Product 2',
            image: { alt: 'Product 2', link: '/product2.jpg' },
            price: 49.99,
            currency: 'USD',
            inventory: { ats: 5 },
            representedProduct: {
                id: 'product-2',
                imageGroups: [],
                variants: [],
                type: { master: true },
            } as any,
        },
    ],
    total: 25,
    refinements: [],
    searchPhraseSuggestions: { suggestedTerms: [] },
    sortingOptions: [
        { id: 'best-matches', label: 'Best Matches' },
        { id: 'price-low-to-high', label: 'Price: Low to High' },
    ],
    selectedSortingOption: 'best-matches',
    selectedRefinements: {},
    offset: 0,
    limit: 10,
    query: '',
};

// Helper function to create mock Page objects
const createMockPage = (regions: any[] = []): ShopperExperience.schemas['Page'] =>
    ({
        id: 'plp',
        typeId: 'plp',
        designMetadata: {
            regionDefinitions: regions.map((region) => ({ id: region.id })),
        },
        regions,
    }) as ShopperExperience.schemas['Page'];

// Mock the Region component - simplified since we don't test region behavior
vi.mock('@/components/region', () => ({
    Region: () => null,
}));

// Mock ProductGrid component
vi.mock('@/components/product-grid', () => ({
    default: ({ critical, handleProductClick }: any) => (
        <div data-testid="product-grid">
            {critical?.map((product: any) => (
                <div key={product.productId} data-testid="product-item" onClick={() => handleProductClick?.(product)}>
                    {product.productName}
                </div>
            ))}
        </div>
    ),
}));

// Mock other components
vi.mock('@/components/category-breadcrumbs', () => ({
    default: ({ category }: any) => <div data-testid="category-breadcrumbs">{category.name}</div>,
}));

vi.mock('@/components/category-pagination', () => ({
    default: ({ limit, offset, total }: any) => (
        <div data-testid="category-pagination">
            {offset}-{Math.min(offset + limit, total)} of {total}
        </div>
    ),
}));

vi.mock('@/components/category-refinements', () => ({
    default: () => <div data-testid="category-refinements" />,
}));

vi.mock('@/components/category-refinements/active-filters', () => ({
    default: () => <div data-testid="active-filters" />,
}));

vi.mock('@/components/category-sorting', () => ({
    default: () => <div data-testid="category-sorting" />,
}));

vi.mock('@/components/json-ld', () => ({
    JsonLd: ({ id }: any) => <script data-testid={id} type="application/ld+json" />,
}));

// Mock API functions
vi.mock('@/lib/api/categories', () => ({
    fetchCategory: vi.fn(),
}));

vi.mock('@/lib/api/search', () => ({
    fetchSearchProducts: vi.fn(),
}));

vi.mock('@/lib/util/pageLoader', () => ({
    fetchPageWithComponentData: vi.fn(),
}));

vi.mock('@/utils/category-schema', () => ({
    generateCategorySchema: vi.fn(),
}));

// Mock analytics with controllable mock functions
const mockTrackViewCategory = vi.fn();
const mockTrackClickProductInCategory = vi.fn();

vi.mock('@/hooks/use-analytics', () => ({
    useAnalytics: vi.fn(() => ({
        trackViewCategory: mockTrackViewCategory,
        trackClickProductInCategory: mockTrackClickProductInCategory,
    })),
}));

// Mock config
vi.mock('@/config', async (importOriginal) => {
    const actual = await importOriginal<object>();
    const mockConfigValue = {
        commerce: {
            sites: [
                {
                    id: 'test-site',
                    defaultLocale: 'en-US',
                },
            ],
        },
        search: {
            products: {
                hits: {
                    limit: 10,
                    critical: 2,
                },
            },
        },
    } as AppConfig;
    return {
        ...actual,
        getConfig: vi.fn(() => mockConfigValue),
        useConfig: vi.fn(() => mockConfigValue),
    };
});

describe('CategoryPage', () => {
    const mockContext = createTestContext();
    const mockConfig: AppConfig = {
        commerce: {
            sites: [
                {
                    id: 'test-site',
                    defaultLocale: 'en-US',
                },
            ],
        },
        search: {
            products: {
                hits: {
                    limit: 10,
                    critical: 2,
                },
            },
        },
    } as AppConfig;

    beforeEach(() => {
        vi.clearAllMocks();
        (getConfig as any).mockReturnValue(mockConfig);
        (fetchCategory as any).mockResolvedValue(mockCategory);
        (fetchSearchProducts as any).mockResolvedValue(mockSearchResult);
        (fetchPageWithComponentData as any).mockResolvedValue({
            ...createMockPage(),
            componentData: {},
        });
        (generateCategorySchema as any).mockReturnValue({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Electronics',
        });
    });

    describe('Decorators', () => {
        test('should have PageType decorator', () => {
            const metadata = Reflect.getMetadata('page:type', ProductListingPageMetadata);
            expect(metadata).toBeDefined();
            expect(metadata.name).toBe('Product Listing Page');
            expect(metadata.description).toBe('Product listing page with product listings and personalized content');
            expect(metadata.supportedAspectTypes).toEqual(['plp']);
        });

        test('should have RegionDefinition decorator with three regions', () => {
            const topFullWidthRegion = getRegionDefinition(ProductListingPageMetadata, 'plpTopFullWidth');
            expect(topFullWidthRegion).toBeDefined();
            expect(topFullWidthRegion?.id).toBe('plpTopFullWidth');
            expect(topFullWidthRegion?.name).toBe('Top Full Width Region');
            expect(topFullWidthRegion?.maxComponents).toBe(5);

            const topContentRegion = getRegionDefinition(ProductListingPageMetadata, 'plpTopContent');
            expect(topContentRegion).toBeDefined();
            expect(topContentRegion?.id).toBe('plpTopContent');
            expect(topContentRegion?.name).toBe('Top Content Region');

            const bottomRegion = getRegionDefinition(ProductListingPageMetadata, 'plpBottom');
            expect(bottomRegion).toBeDefined();
            expect(bottomRegion?.id).toBe('plpBottom');
            expect(bottomRegion?.name).toBe('Bottom Region');
        });
    });

    describe('loader', () => {
        test('should fetch category data and search results with correct parameters', async () => {
            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/category/electronics'),
                context: mockContext,
                params: { categoryId: 'electronics' },
                unstable_pattern: '/category/:categoryId',
            };

            const result = await loader(args);

            expect(fetchCategory).toHaveBeenCalledWith(mockContext, 'electronics', 0);
            expect(fetchSearchProducts).toHaveBeenCalledWith(mockContext, {
                limit: 2,
                offset: 0,
                sort: '',
                refine: ['cgid=electronics'],
                currency: 'GBP',
            });
            expect(fetchSearchProducts).toHaveBeenCalledWith(mockContext, {
                limit: 8,
                offset: 2,
                sort: '',
                refine: ['cgid=electronics'],
                currency: 'GBP',
            });
            expect(fetchPageWithComponentData).toHaveBeenCalledWith(args, {
                pageId: 'plp',
                categoryId: 'electronics',
            });
            expect(result.categoryId).toBe('electronics');
            expect(result.category).toEqual(mockCategory);
            expect(result.searchResultCritical).toEqual(mockSearchResult);
        });

        test('should handle query parameters correctly', async () => {
            const args: LoaderFunctionArgs = {
                request: new Request(
                    'https://example.com/category/electronics?offset=20&sort=price-low-to-high&refine=color:red&refine=size:large'
                ),
                context: mockContext,
                params: { categoryId: 'electronics' },
                unstable_pattern: '/category/:categoryId',
            };

            await loader(args);

            expect(fetchSearchProducts).toHaveBeenCalledWith(
                mockContext,
                expect.objectContaining({
                    offset: 20,
                    sort: 'price-low-to-high',
                    refine: ['color:red', 'size:large', 'cgid=electronics'],
                })
            );
        });

        test('should strip existing cgid refinements and replace with route categoryId', async () => {
            const args: LoaderFunctionArgs = {
                request: new Request(
                    'https://example.com/category/electronics?refine=cgid%3Dwomens&refine=color%3Dblue'
                ),
                context: mockContext,
                params: { categoryId: 'electronics' },
                unstable_pattern: '/category/:categoryId',
            };

            const result = await loader(args);

            // The old cgid=womens should be removed and replaced with cgid=electronics
            expect(fetchSearchProducts).toHaveBeenCalledWith(
                mockContext,
                expect.objectContaining({
                    refine: ['color=blue', 'cgid=electronics'],
                })
            );
            expect(result.refine).toEqual(['color=blue', 'cgid=electronics']);
        });

        test('should return effectiveRefine as refine in loader result', async () => {
            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/category/electronics'),
                context: mockContext,
                params: { categoryId: 'electronics' },
                unstable_pattern: '/category/:categoryId',
            };

            const result = await loader(args);

            expect(result.refine).toEqual(['cgid=electronics']);
        });

        test('should throw 404 when category fetch fails with ApiError 404', async () => {
            const mockApiError = new ApiError({
                status: 404,
                statusText: 'Not Found',
                headers: new Headers({ 'content-type': 'application/json' }),
                body: {
                    type: 'https://api.example.com/errors/not-found',
                    title: 'Category Not Found',
                    detail: 'The requested category does not exist',
                },
                rawBody: JSON.stringify({
                    type: 'https://api.example.com/errors/not-found',
                    title: 'Category Not Found',
                    detail: 'The requested category does not exist',
                }),
                url: 'https://api.example.com/categories/invalid',
                method: 'GET',
            });

            (fetchCategory as any).mockRejectedValue(mockApiError);

            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/category/invalid'),
                context: mockContext,
                params: { categoryId: 'invalid' },
                unstable_pattern: '/category/:categoryId',
            };

            try {
                await loader(args);
                expect.fail('Expected loader to throw');
            } catch (error: any) {
                expect(error).toBeInstanceOf(Response);
                expect(error.status).toBe(404);
                expect(await error.text()).toBe('Category Not Found');
                expect(error.statusText).toBe('The requested category does not exist');
            }
        });

        test('should throw 500 when category fetch fails with ApiError 500', async () => {
            const mockApiError = new ApiError({
                status: 500,
                statusText: 'Internal Server Error',
                headers: new Headers({ 'content-type': 'application/json' }),
                body: {
                    type: 'https://api.example.com/errors/server-error',
                    title: 'Internal Server Error',
                    detail: 'An unexpected error occurred while processing the request',
                },
                rawBody: JSON.stringify({
                    type: 'https://api.example.com/errors/server-error',
                    title: 'Internal Server Error',
                    detail: 'An unexpected error occurred while processing the request',
                }),
                url: 'https://api.example.com/categories/electronics',
                method: 'GET',
            });

            (fetchCategory as any).mockRejectedValue(mockApiError);

            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/category/electronics'),
                context: mockContext,
                params: { categoryId: 'electronics' },
                unstable_pattern: '/category/:categoryId',
            };

            try {
                await loader(args);
                expect.fail('Expected loader to throw');
            } catch (error: any) {
                expect(error).toBeInstanceOf(Response);
                expect(error.status).toBe(500);
                expect(await error.text()).toBe('Internal Server Error');
                expect(error.statusText).toBe('An unexpected error occurred while processing the request');
            }
        });

        test('should throw 403 when category fetch fails with ApiError 403', async () => {
            const mockApiError = new ApiError({
                status: 403,
                statusText: 'Forbidden',
                headers: new Headers({ 'content-type': 'application/json' }),
                body: {
                    type: 'https://api.example.com/errors/forbidden',
                    title: 'Access Denied',
                    detail: 'You do not have permission to access this category',
                },
                rawBody: JSON.stringify({
                    type: 'https://api.example.com/errors/forbidden',
                    title: 'Access Denied',
                    detail: 'You do not have permission to access this category',
                }),
                url: 'https://api.example.com/categories/restricted',
                method: 'GET',
            });

            (fetchCategory as any).mockRejectedValue(mockApiError);

            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/category/restricted'),
                context: mockContext,
                params: { categoryId: 'restricted' },
                unstable_pattern: '/category/:categoryId',
            };

            try {
                await loader(args);
                expect.fail('Expected loader to throw');
            } catch (error: any) {
                expect(error).toBeInstanceOf(Response);
                expect(error.status).toBe(403);
                expect(await error.text()).toBe('Access Denied');
                expect(error.statusText).toBe('You do not have permission to access this category');
            }
        });

        test('should use statusText as fallback when ApiError body.title is missing', async () => {
            const mockApiError = new ApiError({
                status: 404,
                statusText: 'Not Found',
                headers: new Headers({ 'content-type': 'application/json' }),
                body: {
                    type: 'https://api.example.com/errors/not-found',
                    title: '',
                    detail: 'Category not available',
                },
                rawBody: '{}',
                url: 'https://api.example.com/categories/invalid',
                method: 'GET',
            });

            (fetchCategory as any).mockRejectedValue(mockApiError);

            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/category/invalid'),
                context: mockContext,
                params: { categoryId: 'invalid' },
                unstable_pattern: '/category/:categoryId',
            };

            try {
                await loader(args);
                expect.fail('Expected loader to throw');
            } catch (error: any) {
                expect(error).toBeInstanceOf(Response);
                expect(error.status).toBe(404);
                expect(await error.text()).toBe('Not Found');
            }
        });

        test('should use statusText as fallback when ApiError body.detail is missing', async () => {
            const mockApiError = new ApiError({
                status: 404,
                statusText: 'Not Found',
                headers: new Headers({ 'content-type': 'application/json' }),
                body: {
                    type: 'https://api.example.com/errors/not-found',
                    title: 'Category Not Found',
                    detail: '',
                },
                rawBody: '{}',
                url: 'https://api.example.com/categories/invalid',
                method: 'GET',
            });

            (fetchCategory as any).mockRejectedValue(mockApiError);

            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/category/invalid'),
                context: mockContext,
                params: { categoryId: 'invalid' },
                unstable_pattern: '/category/:categoryId',
            };

            try {
                await loader(args);
                expect.fail('Expected loader to throw');
            } catch (error: any) {
                expect(error).toBeInstanceOf(Response);
                expect(error.statusText).toBe('Not Found');
            }
        });

        test('should throw 500 when category fetch fails with generic error', async () => {
            (fetchCategory as any).mockRejectedValue(new Error('Unexpected error'));

            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/category/invalid'),
                context: mockContext,
                params: { categoryId: 'invalid' },
                unstable_pattern: '/category/:categoryId',
            };

            try {
                await loader(args);
                expect.fail('Expected loader to throw');
            } catch (error: any) {
                expect(error).toBeInstanceOf(Response);
                expect(error.status).toBe(500);
                expect(await error.text()).toBe('Internal Server Error');
            }
        });

        test('should throw 500 when category fetch fails with network error', async () => {
            (fetchCategory as any).mockRejectedValue(new TypeError('Network request failed'));

            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/category/electronics'),
                context: mockContext,
                params: { categoryId: 'electronics' },
                unstable_pattern: '/category/:categoryId',
            };

            try {
                await loader(args);
                expect.fail('Expected loader to throw');
            } catch (error: any) {
                expect(error).toBeInstanceOf(Response);
                expect(error.status).toBe(500);
                expect(await error.text()).toBe('Internal Server Error');
            }
        });

        test('should preserve headers from ApiError in response', async () => {
            const customHeaders = new Headers({
                'content-type': 'application/json',
                'x-request-id': 'test-request-123',
                'x-correlation-id': 'correlation-456',
            });

            const mockApiError = new ApiError({
                status: 404,
                statusText: 'Not Found',
                headers: customHeaders,
                body: {
                    type: 'https://api.example.com/errors/not-found',
                    title: 'Category Not Found',
                    detail: 'The requested category does not exist',
                },
                rawBody: JSON.stringify({
                    type: 'https://api.example.com/errors/not-found',
                    title: 'Category Not Found',
                    detail: 'The requested category does not exist',
                }),
                url: 'https://api.example.com/categories/invalid',
                method: 'GET',
            });

            (fetchCategory as any).mockRejectedValue(mockApiError);

            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/category/invalid'),
                context: mockContext,
                params: { categoryId: 'invalid' },
                unstable_pattern: '/category/:categoryId',
            };

            try {
                await loader(args);
                expect.fail('Expected loader to throw');
            } catch (error: any) {
                expect(error).toBeInstanceOf(Response);
                expect(error.headers.get('content-type')).toBe('application/json');
                expect(error.headers.get('x-request-id')).toBe('test-request-123');
                expect(error.headers.get('x-correlation-id')).toBe('correlation-456');
            }
        });

        test('should split search results into critical and non-critical', async () => {
            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/category/electronics'),
                context: mockContext,
                params: { categoryId: 'electronics' },
                unstable_pattern: '/category/:categoryId',
            };

            await loader(args);

            expect(fetchSearchProducts).toHaveBeenCalledTimes(2);
            expect(fetchSearchProducts).toHaveBeenNthCalledWith(1, mockContext, {
                limit: 2,
                offset: 0,
                sort: '',
                refine: ['cgid=electronics'],
                currency: 'GBP',
            });
            expect(fetchSearchProducts).toHaveBeenNthCalledWith(2, mockContext, {
                limit: 8,
                offset: 2,
                sort: '',
                refine: ['cgid=electronics'],
                currency: 'GBP',
            });
        });

        test('should generate category schema promise', async () => {
            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/category/electronics'),
                context: mockContext,
                params: { categoryId: 'electronics' },
                unstable_pattern: '/category/:categoryId',
            };

            const result = await loader(args);
            const categorySchema = await result.categorySchema;

            expect(categorySchema).toBeDefined();
            expect(generateCategorySchema).toHaveBeenCalledWith({
                category: mockCategory,
                searchResult: mockSearchResult,
                config: mockConfig,
                pageUrl: 'https://example.com/category/electronics',
                defaultCurrency: 'GBP',
            });
        });

        test('should handle category schema generation errors gracefully', async () => {
            (generateCategorySchema as any).mockImplementation(() => {
                throw new Error('Schema generation failed');
            });

            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/category/electronics'),
                context: mockContext,
                params: { categoryId: 'electronics' },
                unstable_pattern: '/category/:categoryId',
            };

            const result = await loader(args);
            const categorySchema = await result.categorySchema;

            expect(categorySchema).toBeNull();
        });
    });

    describe('CategoryPage Component', () => {
        test('should render category page with all elements', async () => {
            const loaderData: CategoryPageData = {
                category: mockCategory,
                searchResultCritical: mockSearchResult,
                searchResultNonCritical: Promise.resolve(mockSearchResult),
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
                categoryId: 'electronics',
                refine: ['cgid=electronics'],
                currency: 'USD',
                locale: 'en-US',
                categorySchema: Promise.resolve({
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: 'Electronics',
                }),
            };

            render(
                <MemoryRouter>
                    <ConfigWrapper>
                        <CategoryPage loaderData={loaderData} />
                    </ConfigWrapper>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByTestId('active-filters')).toBeInTheDocument();
                expect(screen.getByTestId('category-breadcrumbs')).toBeInTheDocument();
                expect(screen.getByText('Electronics (25)')).toBeInTheDocument();
                expect(screen.getByTestId('category-sorting')).toBeInTheDocument();
                expect(screen.getByTestId('category-refinements')).toBeInTheDocument();
                expect(screen.getByTestId('product-grid')).toBeInTheDocument();
                expect(screen.getByTestId('category-pagination')).toBeInTheDocument();
            });
        });

        test('should display category name or id as fallback', async () => {
            const categoryWithoutName = { ...mockCategory, name: undefined };
            const loaderData: CategoryPageData = {
                category: categoryWithoutName,
                searchResultCritical: mockSearchResult,
                searchResultNonCritical: Promise.resolve(mockSearchResult),
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
                categoryId: 'electronics',
                refine: ['cgid=electronics'],
                currency: 'USD',
                locale: 'en-US',
                categorySchema: Promise.resolve(null),
            };

            render(
                <MemoryRouter>
                    <ConfigWrapper>
                        <CategoryPage loaderData={loaderData} />
                    </ConfigWrapper>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('electronics (25)')).toBeInTheDocument();
            });
        });

        test('should not render sorting when no sorting options available', async () => {
            const searchResultWithoutSorting = { ...mockSearchResult, sortingOptions: [] };
            const loaderData: CategoryPageData = {
                category: mockCategory,
                searchResultCritical: searchResultWithoutSorting,
                searchResultNonCritical: Promise.resolve(searchResultWithoutSorting),
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
                categoryId: 'electronics',
                refine: ['cgid=electronics'],
                currency: 'USD',
                locale: 'en-US',
                categorySchema: Promise.resolve(null),
            };

            render(
                <MemoryRouter>
                    <ConfigWrapper>
                        <CategoryPage loaderData={loaderData} />
                    </ConfigWrapper>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.queryByTestId('category-sorting')).not.toBeInTheDocument();
            });
        });

        test('should not render pagination when total is 1 or less', async () => {
            const searchResultWithOneItem = { ...mockSearchResult, total: 1 };
            const loaderData: CategoryPageData = {
                category: mockCategory,
                searchResultCritical: searchResultWithOneItem,
                searchResultNonCritical: Promise.resolve(searchResultWithOneItem),
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
                categoryId: 'electronics',
                refine: ['cgid=electronics'],
                currency: 'USD',
                locale: 'en-US',
                categorySchema: Promise.resolve(null),
            };

            render(
                <MemoryRouter>
                    <ConfigWrapper>
                        <CategoryPage loaderData={loaderData} />
                    </ConfigWrapper>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.queryByTestId('category-pagination')).not.toBeInTheDocument();
            });
        });

        test('should remount when currency changes', async () => {
            const loaderData1: CategoryPageData = {
                category: mockCategory,
                searchResultCritical: mockSearchResult,
                searchResultNonCritical: Promise.resolve(mockSearchResult),
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
                categoryId: 'electronics',
                refine: ['cgid=electronics'],
                currency: 'USD',
                locale: 'en-US',
                categorySchema: Promise.resolve(null),
            };

            const { rerender } = render(
                <MemoryRouter>
                    <ConfigWrapper>
                        <CategoryPage loaderData={loaderData1} />
                    </ConfigWrapper>
                </MemoryRouter>
            );

            const loaderData2: CategoryPageData = {
                ...loaderData1,
                currency: 'EUR',
            };

            rerender(
                <MemoryRouter>
                    <ConfigWrapper>
                        <CategoryPage loaderData={loaderData2} />
                    </ConfigWrapper>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Electronics (25)')).toBeInTheDocument();
            });
        });

        test('should handle empty hits array', async () => {
            const searchResultWithoutHits = { ...mockSearchResult, hits: [], total: 0 };
            const loaderData: CategoryPageData = {
                category: mockCategory,
                searchResultCritical: searchResultWithoutHits,
                searchResultNonCritical: Promise.resolve(searchResultWithoutHits),
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
                categoryId: 'electronics',
                refine: ['cgid=electronics'],
                currency: 'USD',
                locale: 'en-US',
                categorySchema: Promise.resolve(null),
            };

            render(
                <MemoryRouter>
                    <ConfigWrapper>
                        <CategoryPage loaderData={loaderData} />
                    </ConfigWrapper>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Electronics (0)')).toBeInTheDocument();
                expect(screen.getByTestId('product-grid')).toBeInTheDocument();
            });
        });
    });

    describe('CategoryJsonLd Component', () => {
        test('should render JSON-LD schema when schema is provided', async () => {
            const loaderData: CategoryPageData = {
                category: mockCategory,
                searchResultCritical: mockSearchResult,
                searchResultNonCritical: Promise.resolve(mockSearchResult),
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
                categoryId: 'electronics',
                refine: ['cgid=electronics'],
                currency: 'USD',
                locale: 'en-US',
                categorySchema: Promise.resolve({
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: 'Electronics',
                }),
            };

            render(
                <MemoryRouter>
                    <ConfigWrapper>
                        <CategoryPage loaderData={loaderData} />
                    </ConfigWrapper>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByTestId('category-schema')).toBeInTheDocument();
            });
        });

        test('should not render JSON-LD schema when schema is null', async () => {
            const loaderData: CategoryPageData = {
                category: mockCategory,
                searchResultCritical: mockSearchResult,
                searchResultNonCritical: Promise.resolve(mockSearchResult),
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
                categoryId: 'electronics',
                refine: ['cgid=electronics'],
                currency: 'USD',
                locale: 'en-US',
                categorySchema: Promise.resolve(null),
            };

            render(
                <MemoryRouter>
                    <ConfigWrapper>
                        <CategoryPage loaderData={loaderData} />
                    </ConfigWrapper>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.queryByTestId('category-schema')).not.toBeInTheDocument();
            });
        });
    });

    describe('Analytics Integration', () => {
        beforeEach(() => {
            mockTrackViewCategory.mockClear();
            mockTrackClickProductInCategory.mockClear();
        });

        test('should call trackClickProductInCategory when product is clicked', async () => {
            const loaderData: CategoryPageData = {
                category: mockCategory,
                searchResultCritical: mockSearchResult,
                searchResultNonCritical: Promise.resolve(mockSearchResult),
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
                categoryId: 'electronics',
                refine: ['cgid=electronics'],
                currency: 'USD',
                locale: 'en-US',
                categorySchema: Promise.resolve(null),
            };

            render(
                <MemoryRouter>
                    <ConfigWrapper>
                        <CategoryPage loaderData={loaderData} />
                    </ConfigWrapper>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByTestId('product-grid')).toBeInTheDocument();
            });

            // Click on a product
            const productItems = screen.getAllByTestId('product-item');
            productItems[0].click();

            expect(mockTrackClickProductInCategory).toHaveBeenCalledWith({
                category: mockCategory,
                product: expect.objectContaining({ productId: 'product-1' }),
            });
        });

        test('should render without errors when analytics is not available', async () => {
            // Temporarily mock useAnalytics to return null
            vi.mocked(useAnalytics).mockReturnValueOnce(null as any);

            const loaderData: CategoryPageData = {
                category: mockCategory,
                searchResultCritical: mockSearchResult,
                searchResultNonCritical: Promise.resolve(mockSearchResult),
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
                categoryId: 'electronics',
                refine: ['cgid=electronics'],
                currency: 'USD',
                locale: 'en-US',
                categorySchema: Promise.resolve(null),
            };

            // Should render without errors even when analytics is null
            render(
                <MemoryRouter>
                    <ConfigWrapper>
                        <CategoryPage loaderData={loaderData} />
                    </ConfigWrapper>
                </MemoryRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Electronics (25)')).toBeInTheDocument();
            });
        });
    });
});
