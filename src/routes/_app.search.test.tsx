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
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperSearch, ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import SearchPage, { loader, SearchPageMetadata, type SearchPageData } from './_app.search';
import { createTestContext } from '@/lib/test-utils';
import { fetchSearchProducts } from '@/lib/api/search';
import { fetchPageWithComponentData } from '@/lib/util/pageLoader';
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
                imageGroups: [],
                variants: [],
                type: { master: true },
            } as any,
        },
    ],
    total: 10,
    query: 'shoes',
    refinements: [],
    searchPhraseSuggestions: { suggestedTerms: [] },
    sortingOptions: [],
    offset: 0,
    limit: 10,
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

// Mock Page Designer mode - must be before Region mock
vi.mock('@salesforce/storefront-next-runtime/design/mode', () => ({
    isDesignModeActive: vi.fn(() => false),
}));

// Mock the Region component
vi.mock('@/components/region', async () => {
    const { isDesignModeActive } = await import('@salesforce/storefront-next-runtime/design/mode');

    return {
        Region: ({ page, regionId }: any) => {
            // Simulate the real Region component behavior
            const MockRegion = () => {
                const [resolvedPage, setResolvedPage] = React.useState<any>(null);

                React.useEffect(() => {
                    // eslint-disable-next-line react/prop-types
                    page.then((p: any) => setResolvedPage(p));
                }, []);

                if (!resolvedPage) return null;

                const region = resolvedPage.regions?.find((r: any) => r.id === regionId);
                if (!region) return null;

                const isDesignMode = isDesignModeActive();

                // Don't render if no components and not in design mode
                if (!region.components?.length && !isDesignMode) return null;

                return <div data-testid="region" data-region-id={regionId} />;
            };

            return <MockRegion />;
        },
    };
});

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
    fetchPageWithComponentData: vi.fn(),
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
    const actual = await importOriginal<object>();
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
vi.mock('@salesforce/storefront-next-runtime/design/mode', () => ({
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
        (fetchPageWithComponentData as any).mockResolvedValue({
            ...createMockPage(),
            componentData: {},
        });
    });

    describe('Decorators', () => {
        test('should have PageType decorator', () => {
            const metadata = Reflect.getMetadata('page:type', SearchPageMetadata);
            expect(metadata).toBeDefined();
            expect(metadata.name).toBe('Search Results Page');
            expect(metadata.description).toBe('Search results page with product listings and personalized content');
        });

        test('should have RegionDefinition decorator with three regions', () => {
            const topFullWidthRegion = getRegionDefinition(SearchPageMetadata, 'searchTopFullWidth');
            expect(topFullWidthRegion).toBeDefined();
            expect(topFullWidthRegion?.id).toBe('searchTopFullWidth');
            expect(topFullWidthRegion?.name).toBe('Top Full Width Region');
            expect(topFullWidthRegion?.maxComponents).toBe(5);

            const topContentRegion = getRegionDefinition(SearchPageMetadata, 'searchTopContent');
            expect(topContentRegion).toBeDefined();
            expect(topContentRegion?.id).toBe('searchTopContent');
            expect(topContentRegion?.name).toBe('Top Content Region');

            const bottomRegion = getRegionDefinition(SearchPageMetadata, 'searchBottom');
            expect(bottomRegion).toBeDefined();
            expect(bottomRegion?.id).toBe('searchBottom');
            expect(bottomRegion?.name).toBe('Bottom Region');
        });
    });

    describe('loader', () => {
        test('should fetch search data and page with correct parameters', () => {
            const args: LoaderFunctionArgs = {
                request: new Request('https://example.com/search?q=shoes&offset=0'),
                context: mockContext,
                params: {},
                unstable_pattern: '/search',
            };

            const result = loader(args);

            expect(fetchSearchProducts).toHaveBeenCalledWith(mockContext, {
                q: 'shoes',
                limit: 1,
                offset: 0,
                sort: '',
                refine: [],
                expand: ['none'],
                currency: 'USD',
            });

            expect(fetchSearchProducts).toHaveBeenCalledWith(mockContext, {
                q: 'shoes',
                limit: 10,
                offset: 0,
                sort: '',
                refine: [],
                currency: 'USD',
            });

            expect(fetchPageWithComponentData).toHaveBeenCalledWith(args, { pageId: 'search' });
            expect(result.searchTerm).toBe('shoes');
        });

        test('should handle query parameters correctly', () => {
            const args: LoaderFunctionArgs = {
                request: new Request(
                    'https://example.com/search?q=boots&offset=20&sort=price-low-to-high&refine=color:red&refine=size:10'
                ),
                context: mockContext,
                params: {},
                unstable_pattern: '/search',
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

    describe('SearchPage Component', () => {
        test('should render search results', async () => {
            const loaderData: SearchPageData = {
                searchTerm: 'shoes',
                refinements: Promise.resolve(mockSearchResult),
                searchResult: Promise.resolve(mockSearchResult),
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
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
                id: 'searchTopContent',
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
                page: Promise.resolve({ ...createMockPage([mockRegion]), componentData: {} }),
            };

            render(
                <ConfigWrapper>
                    <SearchPage loaderData={loaderData} />
                </ConfigWrapper>
            );

            await waitFor(() => {
                const regions = screen.queryAllByTestId('region');
                expect(regions.length).toBe(1);
                expect(regions[0]).toHaveAttribute('data-region-id', 'searchTopContent');
            });
        });

        test('should not render regions when no components', async () => {
            const loaderData: SearchPageData = {
                searchTerm: 'shoes',
                refinements: Promise.resolve(mockSearchResult),
                searchResult: Promise.resolve(mockSearchResult),
                page: Promise.resolve(createMockPage([])),
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
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
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
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
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
                page: Promise.resolve({ ...createMockPage(), componentData: {} }),
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
            const { isDesignModeActive } = await import('@salesforce/storefront-next-runtime/design/mode');
            vi.mocked(isDesignModeActive).mockReturnValue(true);

            const mockRegion = {
                id: 'searchTopContent',
                components: [],
            };

            const loaderData: SearchPageData = {
                searchTerm: 'shoes',
                refinements: Promise.resolve(mockSearchResult),
                searchResult: Promise.resolve(mockSearchResult),
                page: Promise.resolve({ ...createMockPage([mockRegion]), componentData: {} }),
            };

            render(
                <ConfigWrapper>
                    <SearchPage loaderData={loaderData} />
                </ConfigWrapper>
            );

            await waitFor(() => {
                const regions = screen.queryAllByTestId('region');
                expect(regions.length).toBeGreaterThan(0);
                const searchTopContentRegion = regions.find(
                    (r) => r.getAttribute('data-region-id') === 'searchTopContent'
                );
                expect(searchTopContentRegion).toBeInTheDocument();
            });
        });

        test('should not render empty regions in normal mode', async () => {
            const { isDesignModeActive } = await import('@salesforce/storefront-next-runtime/design/mode');
            vi.mocked(isDesignModeActive).mockReturnValue(false);

            const mockRegion = {
                id: 'searchTopContent',
                components: [],
            };

            const loaderData: SearchPageData = {
                searchTerm: 'shoes',
                refinements: Promise.resolve(mockSearchResult),
                searchResult: Promise.resolve(mockSearchResult),
                page: Promise.resolve({ ...createMockPage([mockRegion]), componentData: {} }),
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
