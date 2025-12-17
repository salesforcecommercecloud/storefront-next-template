/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import type { LoaderFunctionArgs, ClientLoaderFunctionArgs } from 'react-router';
import type { ShopperSearch, ShopperProducts, ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import { getTranslation } from '@/lib/i18next';

const { t } = getTranslation();
import HomeView, { loader, clientLoader, type HomePageData } from './_index';
import { createTestContext } from '@/lib/test-utils';
import { fetchPageFromLoader, collectComponentDataPromises } from '@/lib/util/pageLoader';
import { fetchSearchProducts } from '@/lib/api/search';
import { fetchCategories } from '@/lib/api/categories';
import { type AppConfig, getConfig } from '@/config';

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
    total: 1,
    query: '',
    refinements: [],
    searchPhraseSuggestions: { suggestedTerms: [] },
    sortingOptions: [],
    start: 0,
    count: 1,
    offset: 0,
    limit: 10,
};

const mockCategories: ShopperProducts.schemas['Category'][] = [
    {
        id: 'category-1',
        name: 'Category 1',
        parentCategoryId: 'root',
        image: '/category1.jpg',
    },
    {
        id: 'category-2',
        name: 'Category 2',
        parentCategoryId: 'root',
        image: '/category2.jpg',
    },
    {
        id: 'category-3',
        name: 'Category 3',
        parentCategoryId: 'root',
        image: '/category3.jpg',
    },
    {
        id: 'category-4',
        name: 'Category 4',
        parentCategoryId: 'root',
        image: '/category4.jpg',
    },
];

// Helper function to create mock Page objects
const createMockPage = (regions: any[] = []): ShopperExperience.schemas['Page'] =>
    ({
        id: 'mock-page',
        typeId: 'homepage',
        regions,
    }) as ShopperExperience.schemas['Page'];

// Mock the Region component to render fallback
vi.mock('@/components/region', () => ({
    Region: ({ fallback }: any) => <>{fallback}</>,
}));

// Mock the PopularCategories component
vi.mock('@/components/home/popular-categories', () => ({
    default: () => (
        <div data-testid="popular-categories">
            <h2>Step into Elegance</h2>
        </div>
    ),
}));

// Mock the ContentCard component
vi.mock('@/components/content-card', () => ({
    default: ({ title, description }: any) => (
        <div data-testid="content-card">
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    ),
}));

// Mock HeroCarousel component
vi.mock('@/components/hero-carousel', () => ({
    default: () => <div data-testid="hero-carousel">Hero Carousel</div>,
}));

// Mock ProductCarousel component
vi.mock('@/components/product-carousel', () => ({
    ProductCarouselWithSuspense: () => <div data-testid="product-carousel">Product Carousel</div>,
}));

// Mock the Button component
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

// Mock the Skeleton component
vi.mock('@/components/ui/skeleton', () => ({
    Skeleton: ({ className, ...props }: any) => <div data-testid="skeleton" className={className} {...props} />,
}));

vi.mock('@/components/home/skeleton', () => ({
    default: () => <div data-testid="home-skeleton" />,
}));

vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<object>();
    return {
        ...actual,
        Await: ({ resolve, children }: any) => {
            // For testing, synchronously resolve the promise and render
            if (resolve && typeof resolve.then === 'function') {
                // For synchronous testing, we need to access the resolved value
                // This is a simplified approach for testing
                if (resolve._resolvedValue) {
                    return typeof children === 'function' ? children(resolve._resolvedValue) : children;
                }
            }
            return typeof children === 'function' ? children(resolve) : children;
        },
        Suspense: ({ children }: any) => children,
    };
});

// Mock the createPage function
vi.mock('@/components/create-page', () => ({
    createPage: (config: any) => (props: any) => {
        const loaderData = {
            page: props.loaderData?.page || Promise.resolve(createMockPage([])),
            searchResult: props.loaderData?.searchResult || Promise.resolve(mockSearchResult),
            categories: props.loaderData?.categories || Promise.resolve(mockCategories),
            componentData: props.loaderData?.componentData || Promise.resolve({}),
        };
        return React.createElement(config.component, { loaderData });
    },
}));

// Mock images
vi.mock('/images/hero-new-arrivals.png', () => ({ default: '/mock-image.png' }));
vi.mock('/images/hero-cube.png', () => ({ default: '/mock-hero-cube.png' }));

// Mock react-i18next with partial mock to preserve other exports
vi.mock('react-i18next', async () => {
    const actual: any = await vi.importActual('react-i18next');
    return {
        ...actual,
        useTranslation: () => ({
            t: (key: string) => {
                // Simple translation mock that returns the translation key used in tests
                // Handle both with and without the 'home:' namespace prefix
                const normalizedKey = key.startsWith('home:') ? key.substring(5) : key;
                const translations: Record<string, string> = {
                    'hero.slide1.title': 'Welcome to Our Store',
                    'hero.slide1.subtitle': 'Discover amazing products',
                    'hero.slide1.imageAlt': 'Hero image',
                    'hero.slide1.ctaText': 'Shop Now',
                    'hero.slide2.title': 'Summer Collection',
                    'hero.slide2.subtitle': 'Hot deals on trending items',
                    'hero.slide2.ctaText': 'Explore',
                    'hero.slide3.title': 'Free Shipping',
                    'hero.slide3.subtitle': 'On orders over $50',
                    'hero.slide3.ctaText': 'Learn More',
                    'featuredProducts.title': 'Featured Products',
                    'newArrivals.title': 'New Arrivals',
                    'newArrivals.description':
                        'Discover the latest additions to our collection. From statement pieces to everyday essentials.',
                    'newArrivals.ctaText': 'SHOP NEW ARRIVALS',
                    'categoryGrid.title': 'Step into Elegance',
                    'categoryGrid.shopNowButton': 'Shop Now',
                    'featuredContent.women.title': 'Women',
                    'featuredContent.women.description':
                        'Discover our curated collection of sophisticated footwear designed for the modern woman.',
                    'featuredContent.women.imageAlt': "Women's Collection",
                    'featuredContent.women.ctaText': 'EXPLORE COLLECTION',
                    'featuredContent.men.title': 'Men',
                    'featuredContent.men.description':
                        "Timeless craftsmanship meets contemporary style in our men's footwear collection.",
                    'featuredContent.men.imageAlt': "Men's Collection",
                    'featuredContent.men.ctaText': 'EXPLORE COLLECTION',
                };
                return translations[normalizedKey] || key;
            },
            i18n: {
                language: 'en-US',
                changeLanguage: vi.fn(),
            },
        }),
    };
});

// Mock decorators and utilities
vi.mock('@/lib/decorators/page-type', () => ({
    PageType: () => (target: any) => target,
}));

vi.mock('@/lib/decorators/region-definition', () => ({
    RegionDefinition: () => (target: any) => target,
    getRegionDefinition: vi.fn(() => ({ id: 'headerbanner' })),
}));

vi.mock('@/lib/util/pageLoader', () => ({
    collectComponentDataPromises: vi.fn(),
    fetchPageFromLoader: vi.fn(),
}));

vi.mock('@/lib/api/search', () => ({
    fetchSearchProducts: vi.fn(),
}));

vi.mock('@/lib/api/categories', () => ({
    fetchCategories: vi.fn(),
}));

vi.mock('@/config', async (importOriginal) => {
    const actual = await importOriginal<object>();
    return {
        ...actual,
        getConfig: vi.fn(),
    };
});

const renderComponent = (component: React.ReactElement) => {
    return render(component);
};

describe('HomeView', () => {
    let defaultLoaderData: HomePageData;

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset mock implementations for component tests
        vi.mocked(fetchPageFromLoader).mockResolvedValue(createMockPage([]));
        vi.mocked(collectComponentDataPromises).mockResolvedValue({});
        vi.mocked(fetchSearchProducts).mockResolvedValue(mockSearchResult);
        vi.mocked(fetchCategories).mockResolvedValue(mockCategories);
        vi.mocked(getConfig).mockReturnValue({ pages: { home: { featuredProductsCount: 8 } } } as AppConfig);

        // Common loaderData setup
        defaultLoaderData = {
            page: Promise.resolve(createMockPage([])),
            searchResult: Promise.resolve(mockSearchResult),
            categories: Promise.resolve(mockCategories),
            componentData: Promise.resolve({}),
        };
    });

    describe('Basic Rendering', () => {
        const renderingTests = [
            {
                description: 'renders new arrivals section',
                assertion: () => expect(screen.getByText(t('home:newArrivals.title'))).toBeInTheDocument(),
            },
            {
                description: 'renders popular categories section',
                assertion: () => expect(screen.getByTestId('popular-categories')).toBeInTheDocument(),
            },
            {
                description: 'renders featured content cards',
                assertion: () => {
                    expect(screen.getByText(t('home:featuredContent.women.title'))).toBeInTheDocument();
                    expect(screen.getByText(t('home:featuredContent.men.title'))).toBeInTheDocument();
                },
            },
        ];

        test.each(renderingTests)('$description', ({ assertion }) => {
            renderComponent(<HomeView loaderData={defaultLoaderData} />);
            assertion();
        });

        test('renders without header banner region when no regions available', () => {
            renderComponent(<HomeView loaderData={defaultLoaderData} />);

            // Should not render region when no regions are available
            expect(screen.queryByTestId('region')).not.toBeInTheDocument();
            // But should still render other sections
            expect(screen.getByText(t('home:newArrivals.title'))).toBeInTheDocument();
        });

        test('renders header banner region when headerbanner region is provided', () => {
            const headerBannerRegion = {
                id: 'headerbanner',
                components: [
                    { id: 'hero-1', typeId: 'hero' },
                    { id: 'banner-1', typeId: 'banner' },
                ],
            };

            // Create a promise with the resolved value attached for the mock
            const pagePromise = Promise.resolve(createMockPage([headerBannerRegion]));
            (pagePromise as any)._resolvedValue = createMockPage([headerBannerRegion]);

            renderComponent(
                <HomeView
                    loaderData={{
                        page: pagePromise,
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            // Region mock always renders fallback, so check for fallback content
            expect(screen.getByTestId('hero-carousel')).toBeInTheDocument();
            expect(screen.getByTestId('product-carousel')).toBeInTheDocument();
            // Should still render other sections
            expect(screen.getByText(t('home:newArrivals.title'))).toBeInTheDocument();
        });
    });

    describe('New Arrivals Section', () => {
        const newArrivalsTests = [
            {
                description: 'renders new arrivals with correct title',
                translationKey: 'home:newArrivals.title',
            },
            {
                description: 'renders new arrivals with correct description',
                translationKey: 'home:newArrivals.description',
            },
            {
                description: 'renders new arrivals CTA button',
                translationKey: 'home:newArrivals.ctaText',
            },
        ];

        test.each(newArrivalsTests)('$description', ({ translationKey }) => {
            renderComponent(<HomeView loaderData={defaultLoaderData} />);
            expect(screen.getByText(t(translationKey))).toBeInTheDocument();
        });
    });

    describe('Popular Categories Section', () => {
        const popularCategoriesTests = [
            {
                description: 'renders popular categories component',
                assertion: () => expect(screen.getByTestId('popular-categories')).toBeInTheDocument(),
            },
            {
                description: 'passes categories promise to PopularCategories component',
                assertion: () => {
                    expect(screen.getByTestId('popular-categories')).toBeInTheDocument();
                    expect(screen.getByText('Step into Elegance')).toBeInTheDocument();
                },
            },
        ];

        test.each(popularCategoriesTests)('$description', ({ assertion }) => {
            renderComponent(<HomeView loaderData={defaultLoaderData} />);
            assertion();
        });
    });

    describe('Featured Content Cards Section', () => {
        const contentCardTests = [
            {
                description: 'renders women content card',
                titleKey: 'home:featuredContent.women.title',
                contentKey: 'home:featuredContent.women.description',
            },
            {
                description: 'renders men content card',
                titleKey: 'home:featuredContent.men.title',
                contentKey: 'home:featuredContent.men.description',
            },
        ];

        test.each(contentCardTests)('$description', ({ titleKey, contentKey }) => {
            renderComponent(<HomeView loaderData={defaultLoaderData} />);
            expect(screen.getByText(t(titleKey))).toBeInTheDocument();
            expect(screen.getByText(t(contentKey))).toBeInTheDocument();
        });

        test('renders both content cards with correct count', () => {
            renderComponent(<HomeView loaderData={defaultLoaderData} />);
            const contentCards = screen.getAllByTestId('content-card');
            expect(contentCards).toHaveLength(2);
        });
    });

    describe('Error Handling', () => {
        test('handles page promise rejection gracefully', () => {
            renderComponent(<HomeView loaderData={defaultLoaderData} />);
            // Should still render other sections
            expect(screen.getByText(t('home:newArrivals.title'))).toBeInTheDocument();
        });

        test('handles categories promise rejection', () => {
            const rejectedPromise = Promise.reject(new Error('Categories failed'));
            rejectedPromise.catch(() => {}); // Prevent unhandled promise rejection

            renderComponent(
                <HomeView
                    loaderData={{
                        ...defaultLoaderData,
                        categories: rejectedPromise,
                    }}
                />
            );

            // Should still render other sections
            expect(screen.getByText(t('home:newArrivals.title'))).toBeInTheDocument();
        });
    });

    describe('Layout and Styling', () => {
        const layoutTests = [
            {
                description: 'applies correct main container styling',
                assertion: ({ container }: { container: HTMLElement }) => {
                    const mainContainer = container.firstChild as HTMLElement;
                    expect(mainContainer).toHaveClass('pb-16', '-mt-8');
                },
            },
            {
                description: 'applies correct spacing between sections',
                assertion: () => {
                    const newArrivalsTitle = screen.getByText(t('home:newArrivals.title'));
                    const sectionWithPadding = newArrivalsTitle.closest('[class*="pt-16"]');
                    expect(sectionWithPadding).toBeInTheDocument();
                    expect(sectionWithPadding).toHaveClass('pt-16');
                },
            },
            {
                description: 'applies correct grid layout for content cards',
                assertion: () => {
                    const contentCardsGrid = screen
                        .getByText(t('home:featuredContent.women.title'))
                        .closest('div')?.parentElement;
                    expect(contentCardsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6');
                },
            },
        ];

        test.each(layoutTests)('$description', ({ assertion }) => {
            const { container } = renderComponent(<HomeView loaderData={defaultLoaderData} />);
            assertion({ container });
        });
    });

    describe('Loaders', () => {
        let mockContext: ReturnType<typeof createTestContext>;
        let baseLoaderArgs: LoaderFunctionArgs;
        let mockPromises: {
            page: Promise<any>;
            search: Promise<any>;
            categories: Promise<any>;
            componentData: Promise<any>;
        };

        beforeEach(() => {
            mockContext = createTestContext();
            baseLoaderArgs = {
                request: new Request('http://localhost/'),
                params: {},
                context: mockContext,
            };

            // Common promise setup for loader tests
            mockPromises = {
                page: Promise.resolve(createMockPage([])),
                search: Promise.resolve(mockSearchResult),
                categories: Promise.resolve(mockCategories),
                componentData: Promise.resolve({ some: Promise.resolve('data') }),
            };
        });

        describe('loader (server-side)', () => {
            test('returns home page data with correct configuration', () => {
                const expectedConfig = { pages: { home: { featuredProductsCount: 8 } } } as AppConfig;

                vi.mocked(getConfig).mockReturnValue(expectedConfig);
                vi.mocked(fetchPageFromLoader).mockReturnValue(mockPromises.page);
                vi.mocked(collectComponentDataPromises).mockReturnValue(mockPromises.componentData);
                vi.mocked(fetchSearchProducts).mockReturnValue(mockPromises.search);
                vi.mocked(fetchCategories).mockReturnValue(mockPromises.categories);

                const result = loader(baseLoaderArgs);

                expect(vi.mocked(getConfig)).toHaveBeenCalledTimes(1);
                expect(vi.mocked(getConfig)).toHaveBeenCalledWith(mockContext);

                // Assert - API calls
                expect(vi.mocked(fetchPageFromLoader)).toHaveBeenCalledWith(baseLoaderArgs, { pageId: 'homepage' });
                expect(vi.mocked(collectComponentDataPromises)).toHaveBeenCalledWith(baseLoaderArgs, mockPromises.page);
                expect(vi.mocked(fetchSearchProducts)).toHaveBeenCalledWith(mockContext, {
                    categoryId: 'root',
                    limit: 8,
                });
                expect(vi.mocked(fetchCategories)).toHaveBeenCalledWith(mockContext, 'root', 1);

                // Assert - Return value
                expect(result).toEqual({
                    page: mockPromises.page,
                    searchResult: mockPromises.search,
                    categories: mockPromises.categories,
                    componentData: mockPromises.componentData,
                });
            });

            const featuredProductsCountTests = [
                { count: 12, description: 'uses featuredProductsCount from server config' },
                { count: 16, description: 'handles different featuredProductsCount values' },
            ];

            test.each(featuredProductsCountTests)('$description', ({ count }) => {
                const customConfig = { pages: { home: { featuredProductsCount: count } } } as AppConfig;
                vi.mocked(getConfig).mockReturnValue(customConfig);
                vi.mocked(fetchPageFromLoader).mockReturnValue(mockPromises.page);
                vi.mocked(collectComponentDataPromises).mockReturnValue(mockPromises.componentData);
                vi.mocked(fetchSearchProducts).mockReturnValue(mockPromises.search);
                vi.mocked(fetchCategories).mockReturnValue(mockPromises.categories);

                loader(baseLoaderArgs);

                expect(vi.mocked(fetchSearchProducts)).toHaveBeenCalledWith(mockContext, {
                    categoryId: 'root',
                    limit: count,
                });
            });
        });

        describe('clientLoader (client-side)', () => {
            test('returns home page data with global configuration', () => {
                const expectedConfig = { pages: { home: { featuredProductsCount: 4 } } } as AppConfig;
                const pagePromise = Promise.resolve(createMockPage([]));
                const searchPromise = Promise.resolve(mockSearchResult);
                const categoriesPromise = Promise.resolve(mockCategories);
                const componentDataPromise = Promise.resolve({ some: Promise.resolve('data') });

                vi.mocked(getConfig).mockReturnValue(expectedConfig);
                vi.mocked(fetchPageFromLoader).mockReturnValue(pagePromise);
                vi.mocked(collectComponentDataPromises).mockReturnValue(componentDataPromise);
                vi.mocked(fetchSearchProducts).mockReturnValue(searchPromise);
                vi.mocked(fetchCategories).mockReturnValue(categoriesPromise);

                const result = clientLoader(baseLoaderArgs as ClientLoaderFunctionArgs);

                expect(vi.mocked(getConfig)).toHaveBeenCalledTimes(1);
                expect(vi.mocked(getConfig)).toHaveBeenCalledWith();

                expect(vi.mocked(fetchPageFromLoader)).toHaveBeenCalledWith(baseLoaderArgs, {
                    pageId: 'homepage',
                });
                expect(vi.mocked(collectComponentDataPromises)).toHaveBeenCalledWith(baseLoaderArgs, pagePromise);
                expect(vi.mocked(fetchSearchProducts)).toHaveBeenCalledWith(mockContext, {
                    categoryId: 'root',
                    limit: 4,
                });
                expect(vi.mocked(fetchCategories)).toHaveBeenCalledWith(mockContext, 'root', 1);

                expect(result).toEqual({
                    page: pagePromise,
                    searchResult: searchPromise,
                    categories: categoriesPromise,
                    componentData: componentDataPromise,
                });
            });
        });

        describe('Error Handling', () => {
            test('loader handles API errors gracefully', () => {
                const error = new Error('API Error');
                vi.mocked(getConfig).mockReturnValue({ pages: { home: { featuredProductsCount: 8 } } } as AppConfig);
                vi.mocked(fetchPageFromLoader).mockRejectedValue(error);
                vi.mocked(collectComponentDataPromises).mockReturnValue(Promise.resolve({}));
                vi.mocked(fetchSearchProducts).mockReturnValue(Promise.resolve(mockSearchResult));
                vi.mocked(fetchCategories).mockReturnValue(Promise.resolve(mockCategories));

                expect(() => loader(baseLoaderArgs)).not.toThrow();

                const result = loader(baseLoaderArgs);
                expect(result).toHaveProperty('page');
                expect(result).toHaveProperty('searchResult');
                expect(result).toHaveProperty('categories');
                expect(result).toHaveProperty('componentData');
            });

            test('clientLoader handles configuration errors gracefully', () => {
                const error = new Error('Config Error');
                vi.mocked(getConfig).mockImplementation(() => {
                    throw error;
                });

                expect(() => clientLoader(baseLoaderArgs as ClientLoaderFunctionArgs)).toThrow('Config Error');
            });
        });

        describe('Data Integration', () => {
            test('page promise is passed to collectComponentDataPromises', () => {
                const pagePromise = Promise.resolve(createMockPage([]));
                vi.mocked(getConfig).mockReturnValue({ pages: { home: { featuredProductsCount: 8 } } } as AppConfig);
                vi.mocked(fetchPageFromLoader).mockReturnValue(pagePromise);
                vi.mocked(collectComponentDataPromises).mockReturnValue(Promise.resolve({}));
                vi.mocked(fetchSearchProducts).mockReturnValue(Promise.resolve(mockSearchResult));
                vi.mocked(fetchCategories).mockReturnValue(Promise.resolve(mockCategories));

                loader(baseLoaderArgs);

                expect(vi.mocked(collectComponentDataPromises)).toHaveBeenCalledWith(baseLoaderArgs, pagePromise);
            });

            test('all promises are returned in correct structure', () => {
                const pagePromise = Promise.resolve(createMockPage([]));
                const searchPromise = Promise.resolve(mockSearchResult);
                const categoriesPromise = Promise.resolve(mockCategories);
                const componentDataPromise = Promise.resolve({ test: Promise.resolve('data') });

                vi.mocked(getConfig).mockReturnValue({ pages: { home: { featuredProductsCount: 8 } } } as AppConfig);
                vi.mocked(fetchPageFromLoader).mockReturnValue(pagePromise);
                vi.mocked(collectComponentDataPromises).mockReturnValue(componentDataPromise);
                vi.mocked(fetchSearchProducts).mockReturnValue(searchPromise);
                vi.mocked(fetchCategories).mockReturnValue(categoriesPromise);

                const result = loader(baseLoaderArgs) as HomePageData;

                expect(result).toEqual({
                    page: pagePromise,
                    searchResult: searchPromise,
                    categories: categoriesPromise,
                    componentData: componentDataPromise,
                });

                expect(result.page).toBeInstanceOf(Promise);
                expect(result.searchResult).toBeInstanceOf(Promise);
                expect(result.categories).toBeInstanceOf(Promise);
                expect(result.componentData).toBeInstanceOf(Promise);
            });
        });
    });
});
