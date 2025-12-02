/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import 'reflect-metadata';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import type { LoaderFunctionArgs, ClientLoaderFunctionArgs } from 'react-router';
import type { ShopperSearch, ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import SearchPage, { loader, clientLoader, SearchPageMetadata, type SearchPageData } from './search';
import { createTestContext } from '@/lib/test-utils';
import { fetchSearchProducts } from '@/lib/api/search';
import { fetchPageFromLoader, collectComponentDataPromises } from '@/lib/util/pageLoader';
import { type AppConfig, getConfig } from '@/config';
import { getRegionDefinition } from '@/lib/decorators/region-definition';
import { ConfigWrapper } from '@/test-utils/context-provider';

// Mock data
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
                name: 'Product 1',
                imageGroups: [],
                variants: [],
                type: { master: true },
            },
        },
    ],
    total: 10,
    query: 'shoes',
    refinements: [],
    searchPhraseSuggestions: { suggestedTerms: [] },
    sortingOptions: [],
    start: 0,
    count: 1,
    offset: 0,
    limit: 10,
};

// Helper function to create mock Page objects
const createMockPage = (regions: any[] = []): ShopperExperience.schemas['Page'] =>
    ({
        id: 'plp',
        typeId: 'plp',
        regions,
    }) as ShopperExperience.schemas['Page'];

// Mock the Region component
vi.mock('@/components/region', () => ({
    Region: ({ region }: any) => <div data-testid="region" data-region-id={region?.id} />,
}));

// Mock ProductGrid component
vi.mock('@/components/product-grid', () => ({
    default: ({ products }: any) => (
        <div data-testid="product-grid">
            {products.map((product: any) => (
                <div key={product.productId} data-testid="product-item">
                    {product.productName}
                </div>
            ))}
        </div>
    ),
}));

// Mock other components
vi.mock('@/components/category-skeleton', () => ({
    default: () => <div data-testid="category-skeleton" />,
    CategoryHeaderSkeleton: () => <div data-testid="category-header-skeleton" />,
    CategoryRefinementsSkeleton: () => <div data-testid="category-refinements-skeleton" />,
}));

vi.mock('@/components/category-pagination', () => ({
    default: () => <div data-testid="category-pagination" />,
}));

vi.mock('@/components/category-refinements', () => ({
    default: () => <div data-testid="category-refinements" />,
}));

vi.mock('@/components/category-sorting', () => ({
    default: () => <div data-testid="category-sorting" />,
}));

// Mock API functions
vi.mock('@/lib/api/search', () => ({
    fetchSearchProducts: vi.fn(),
}));

vi.mock('@/lib/util/pageLoader', () => ({
    fetchPageFromLoader: vi.fn(),
    collectComponentDataPromises: vi.fn(),
}));

// Mock analytics
vi.mock('@/hooks/use-analytics', () => ({
    useAnalytics: () => ({
        trackViewSearch: vi.fn(),
        trackClickProductInSearch: vi.fn(),
    }),
}));

// Mock config
vi.mock('@/config', async (importOriginal) => {
    const actual = await importOriginal();
    const mockConfigValue = {
        global: {
            productListing: {
                productsPerPage: 10,
            },
        },
    } as AppConfig;
    return {
        ...actual,
        getConfig: vi.fn(() => mockConfigValue),
        useConfig: vi.fn(() => mockConfigValue),
    };
});

// Mock Page Designer mode
vi.mock('@salesforce/storefront-next-runtime/design', () => ({
    isDesignModeActive: vi.fn(() => false),
}));

describe('SearchPage', () => {
    const mockContext = createTestContext();
    const mockConfig: AppConfig = {
        global: {
            productListing: {
                productsPerPage: 10,
            },
        },
    } as AppConfig;

    beforeEach(() => {
        vi.clearAllMocks();
        (getConfig as any).mockReturnValue(mockConfig);
        (fetchSearchProducts as any).mockResolvedValue(mockSearchResult);
        (fetchPageFromLoader as any).mockResolvedValue(createMockPage());
        (collectComponentDataPromises as any).mockResolvedValue(Promise.resolve({}));
    });

    describe('Decorators', () => {
        test('should have PageType decorator', () => {
            const metadata = Reflect.getMetadata('page:type', SearchPageMetadata);
            expect(metadata).toBeDefined();
            expect(metadata.name).toBe('Product Listing Page');
            expect(metadata.description).toBe('Search results page with product listings and personalized content');
        });

        test('should have RegionDefinition decorator with three regions', () => {
            const topFullWidthRegion = getRegionDefinition(SearchPageMetadata, 'plp-top-full-width');
            expect(topFullWidthRegion).toBeDefined();
            expect(topFullWidthRegion?.id).toBe('plp-top-full-width');
            expect(topFullWidthRegion?.name).toBe('Top Full Width Region');
            expect(topFullWidthRegion?.maxComponents).toBe(5);

            const topContentRegion = getRegionDefinition(SearchPageMetadata, 'plp-top-content');
            expect(topContentRegion).toBeDefined();
            expect(topContentRegion?.id).toBe('plp-top-content');
            expect(topContentRegion?.name).toBe('Top Content Region');

            const bottomRegion = getRegionDefinition(SearchPageMetadata, 'plp-bottom');
            expect(bottomRegion).toBeDefined();
            expect(bottomRegion?.id).toBe('plp-bottom');
            expect(bottomRegion?.name).toBe('Bottom Region');
        });
    });

    describe('loader', () => {
        test('should fetch search data and page with correct parameters', () => {
            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/search?q=shoes&offset=0'),
                context: mockContext,
                params: {},
            };

            const result = loader(args);

            expect(fetchSearchProducts).toHaveBeenCalledWith(mockContext, {
                q: 'shoes',
                limit: 1,
                offset: 0,
                sort: '',
                refine: [],
                expand: ['none'],
            });

            expect(fetchSearchProducts).toHaveBeenCalledWith(mockContext, {
                q: 'shoes',
                limit: 10,
                offset: 0,
                sort: '',
                refine: [],
            });

            expect(fetchPageFromLoader).toHaveBeenCalledWith(args, { pageId: 'plp' });
            expect(result.searchTerm).toBe('shoes');
        });

        test('should handle query parameters correctly', () => {
            const args: LoaderFunctionArgs = {
                request: new Request(
                    'https://example.com/search?q=boots&offset=20&sort=price-low-to-high&refine=color:red&refine=size:10'
                ),
                context: mockContext,
                params: {},
            };

            loader(args);

            expect(fetchSearchProducts).toHaveBeenCalledWith(
                mockContext,
                expect.objectContaining({
                    q: 'boots',
                    offset: 20,
                    sort: 'price-low-to-high',
                    refine: ['color:red', 'size:10'],
                })
            );
        });
    });

    describe('clientLoader', () => {
        test('should fetch search data on client side', () => {
            const args: ClientLoaderFunctionArgs = {
                request: new Request('https://example.com/search?q=sneakers'),
                params: {},
            };

            const result = clientLoader(args);

            expect(fetchSearchProducts).toHaveBeenCalled();
            expect(result.searchTerm).toBe('sneakers');
        });
    });

    describe('SearchPage Component', () => {
        test('should render search results', async () => {
            const loaderData: SearchPageData = {
                searchTerm: 'shoes',
                refinements: Promise.resolve(mockSearchResult),
                searchResult: Promise.resolve(mockSearchResult),
                page: Promise.resolve(createMockPage()),
                componentData: Promise.resolve({}),
            };

            render(
                <ConfigWrapper>
                    <SearchPage loaderData={loaderData} />
                </ConfigWrapper>
            );

            await waitFor(() => {
                expect(screen.getByText('shoes (10)')).toBeInTheDocument();
                expect(screen.getByTestId('product-grid')).toBeInTheDocument();
            });
        });

        test('should render region when it has components', async () => {
            const mockRegion = {
                id: 'plp-top-content',
                components: [
                    {
                        id: 'hero-1',
                        typeId: 'odyssey_base.hero',
                        data: {},
                    },
                ],
            };

            const loaderData: SearchPageData = {
                searchTerm: 'shoes',
                refinements: Promise.resolve(mockSearchResult),
                searchResult: Promise.resolve(mockSearchResult),
                page: Promise.resolve(createMockPage([mockRegion])),
                componentData: Promise.resolve({}),
            };

            render(
                <ConfigWrapper>
                    <SearchPage loaderData={loaderData} />
                </ConfigWrapper>
            );

            await waitFor(() => {
                const region = screen.getByTestId('region');
                expect(region).toBeInTheDocument();
                expect(region).toHaveAttribute('data-region-id', 'plp-top-content');
            });
        });

        test('should not render regions when no components', async () => {
            const loaderData: SearchPageData = {
                searchTerm: 'shoes',
                refinements: Promise.resolve(mockSearchResult),
                searchResult: Promise.resolve(mockSearchResult),
                page: Promise.resolve(createMockPage([])),
                componentData: Promise.resolve({}),
            };

            render(
                <ConfigWrapper>
                    <SearchPage loaderData={loaderData} />
                </ConfigWrapper>
            );

            await waitFor(() => {
                expect(screen.queryByTestId('region')).not.toBeInTheDocument();
            });
        });

        test('should render pagination when results total is greater than 1', async () => {
            const loaderData: SearchPageData = {
                searchTerm: 'shoes',
                refinements: Promise.resolve(mockSearchResult),
                searchResult: Promise.resolve({ ...mockSearchResult, total: 50 }),
                page: Promise.resolve(createMockPage()),
                componentData: Promise.resolve({}),
            };

            render(
                <ConfigWrapper>
                    <SearchPage loaderData={loaderData} />
                </ConfigWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('category-pagination')).toBeInTheDocument();
            });
        });

        test('should not render pagination when total is 1 or less', async () => {
            const loaderData: SearchPageData = {
                searchTerm: 'shoes',
                refinements: Promise.resolve(mockSearchResult),
                searchResult: Promise.resolve({ ...mockSearchResult, total: 1 }),
                page: Promise.resolve(createMockPage()),
                componentData: Promise.resolve({}),
            };

            render(
                <ConfigWrapper>
                    <SearchPage loaderData={loaderData} />
                </ConfigWrapper>
            );

            await waitFor(() => {
                expect(screen.queryByTestId('category-pagination')).not.toBeInTheDocument();
            });
        });

        test('should render refinements and sorting', async () => {
            const loaderData: SearchPageData = {
                searchTerm: 'shoes',
                refinements: Promise.resolve(mockSearchResult),
                searchResult: Promise.resolve(mockSearchResult),
                page: Promise.resolve(createMockPage()),
                componentData: Promise.resolve({}),
            };

            render(
                <ConfigWrapper>
                    <SearchPage loaderData={loaderData} />
                </ConfigWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('category-refinements')).toBeInTheDocument();
                expect(screen.getByTestId('category-sorting')).toBeInTheDocument();
            });
        });

        test('should render empty regions in design mode', async () => {
            const { isDesignModeActive } = await import('@salesforce/storefront-next-runtime/design');
            vi.mocked(isDesignModeActive).mockReturnValue(true);

            const mockRegion = {
                id: 'plp-top-content',
                components: [],
            };

            const loaderData: SearchPageData = {
                searchTerm: 'shoes',
                refinements: Promise.resolve(mockSearchResult),
                searchResult: Promise.resolve(mockSearchResult),
                page: Promise.resolve(createMockPage([mockRegion])),
                componentData: Promise.resolve({}),
            };

            render(
                <ConfigWrapper>
                    <SearchPage loaderData={loaderData} />
                </ConfigWrapper>
            );

            await waitFor(() => {
                expect(screen.getByTestId('region')).toBeInTheDocument();
            });
        });

        test('should not render empty regions in normal mode', async () => {
            const { isDesignModeActive } = await import('@salesforce/storefront-next-runtime/design');
            vi.mocked(isDesignModeActive).mockReturnValue(false);

            const mockRegion = {
                id: 'plp-top-content',
                components: [],
            };

            const loaderData: SearchPageData = {
                searchTerm: 'shoes',
                refinements: Promise.resolve(mockSearchResult),
                searchResult: Promise.resolve(mockSearchResult),
                page: Promise.resolve(createMockPage([mockRegion])),
                componentData: Promise.resolve({}),
            };

            render(
                <ConfigWrapper>
                    <SearchPage loaderData={loaderData} />
                </ConfigWrapper>
            );

            await waitFor(() => {
                expect(screen.queryByTestId('region')).not.toBeInTheDocument();
            });
        });
    });
});
