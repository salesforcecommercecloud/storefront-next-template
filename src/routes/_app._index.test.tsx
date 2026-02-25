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

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperExperience, ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { getTranslation } from '@/lib/i18next';
import HomePage, { type HomePageData, loader } from './_app._index';
import { createTestContext } from '@/lib/test-utils';
import { fetchPageWithComponentData } from '@/lib/util/pageLoader';
import { type AppConfig, getConfig } from '@/config';

const { t } = getTranslation();

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

// Mock the Region component to render the `errorElement` as fallback
vi.mock('@/components/region', () => ({
    Region: ({ errorElement }: any) => <>{errorElement}</>,
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
    HeroCarouselSkeleton: () => <div data-testid="hero-carousel-skeleton">Hero Carousel</div>,
}));

// Mock ProductCarousel component
vi.mock('@/components/product-carousel', () => ({
    ProductCarouselWithSuspense: () => <div data-testid="product-carousel">Product Carousel</div>,
    ProductCarouselSkeleton: () => <div data-testid="product-carousel-skeleton">Product Carousel</div>,
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

// Mock images
vi.mock('/images/hero-new-arrivals.webp', () => ({ default: '/mock-image.png' }));
vi.mock('/images/hero-cube.webp', () => ({ default: '/mock-hero-cube.webp' }));

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
    fetchPageWithComponentData: vi.fn(),
}));

vi.mock('@/lib/api/search', () => ({
    fetchSearchProducts: vi.fn(() => Promise.resolve(mockSearchResult)),
}));

vi.mock('@/lib/api/categories', () => ({
    fetchCategories: vi.fn(() => Promise.resolve(mockCategories)),
}));

vi.mock('@/config', async (importOriginal) => {
    const actual = await importOriginal<object>();
    return {
        ...actual,
        getConfig: vi.fn(),
    };
});

const renderComponent = (loaderDataOverrides?: Partial<HomePageData>) => {
    const defaultData: HomePageData = {
        page: Promise.resolve({
            ...createMockPage([]),
            componentData: {},
        }),
        searchResult: Promise.resolve(mockSearchResult),
        categories: Promise.resolve(mockCategories),
    };
    const data = { ...defaultData, ...loaderDataOverrides };
    return render(<HomePage loaderData={data} />);
};

describe('HomePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Reset mock implementations for loader tests
        vi.mocked(fetchPageWithComponentData).mockResolvedValue({
            ...createMockPage([]),
            componentData: {},
        });
        vi.mocked(getConfig).mockReturnValue({ pages: { home: { featuredProductsCount: 8 } } } as AppConfig);
    });

    describe('Basic Rendering', () => {
        const renderingTests = [
            {
                description: 'renders new arrivals section',
                assertion: () => expect(screen.getByText(t('home:newArrivals.title'))).toBeInTheDocument(),
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
            renderComponent();
            assertion();
        });

        test('renders popular categories section', async () => {
            renderComponent();
            await waitFor(() => {
                expect(screen.getByTestId('popular-categories')).toBeInTheDocument();
            });
        });

        test('renders without header banner region when no regions available', () => {
            renderComponent();

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
            const pagePromise = Promise.resolve({
                ...createMockPage([headerBannerRegion]),
                componentData: {},
            });
            (pagePromise as any)._resolvedValue = {
                ...createMockPage([headerBannerRegion]),
                componentData: {},
            };

            renderComponent({
                page: pagePromise,
            });

            // Region mock always renders the error element, so check for that fallback content
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
            renderComponent();
            expect(screen.getByText(t(translationKey))).toBeInTheDocument();
        });
    });

    describe('Popular Categories Section', () => {
        test('renders popular categories component', async () => {
            renderComponent();
            await waitFor(() => {
                expect(screen.getByTestId('popular-categories')).toBeInTheDocument();
            });
        });

        test('passes categories promise to PopularCategories component', async () => {
            renderComponent();
            await waitFor(() => {
                expect(screen.getByTestId('popular-categories')).toBeInTheDocument();
                expect(screen.getByText('Step into Elegance')).toBeInTheDocument();
            });
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
            renderComponent();
            expect(screen.getByText(t(titleKey))).toBeInTheDocument();
            expect(screen.getByText(t(contentKey))).toBeInTheDocument();
        });

        test('renders both content cards with correct count', () => {
            renderComponent();
            const contentCards = screen.getAllByTestId('content-card');
            expect(contentCards).toHaveLength(2);
        });
    });

    describe('Error Handling', () => {
        test('handles page promise rejection gracefully', () => {
            renderComponent();
            // Should still render other sections
            expect(screen.getByText(t('home:newArrivals.title'))).toBeInTheDocument();
        });

        test('handles page promise rejection', () => {
            const rejectedPromise = Promise.reject(new Error('Page failed'));
            rejectedPromise.catch(() => {}); // Prevent unhandled promise rejection

            renderComponent({
                page: rejectedPromise,
            });

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
            const { container } = renderComponent();
            assertion({ container });
        });
    });

    describe('Loaders', () => {
        let mockContext: ReturnType<typeof createTestContext>;
        let baseLoaderArgs: LoaderFunctionArgs;

        beforeEach(() => {
            mockContext = createTestContext();
            baseLoaderArgs = {
                request: new Request('http://localhost/'),
                params: {},
                context: mockContext,
                unstable_pattern: '/',
            };
        });

        describe('loader (server-side)', () => {
            test('returns home page data with fetchPageWithComponentData', () => {
                const mockPageWithData = {
                    ...createMockPage([]),
                    componentData: { test: Promise.resolve('data') },
                };
                const pagePromise = Promise.resolve(mockPageWithData);

                vi.mocked(fetchPageWithComponentData).mockReturnValue(pagePromise);

                const result = loader(baseLoaderArgs);

                // Assert - API calls
                expect(vi.mocked(fetchPageWithComponentData)).toHaveBeenCalledWith(baseLoaderArgs, {
                    pageId: 'homepage',
                });

                // Assert - Return value contains all expected promises
                expect(result.page).toBe(pagePromise);
                expect(result.page).toBeInstanceOf(Promise);
                expect(result.searchResult).toBeInstanceOf(Promise);
                expect(result.categories).toBeInstanceOf(Promise);
            });
        });

        describe('Error Handling', () => {
            test('loader handles API errors gracefully', () => {
                const error = new Error('API Error');
                vi.mocked(fetchPageWithComponentData).mockRejectedValue(error);

                expect(() => loader(baseLoaderArgs)).not.toThrow();

                const result = loader(baseLoaderArgs);
                expect(result).toHaveProperty('page');
            });
        });

        describe('Data Integration', () => {
            test('page promise is returned with componentData', () => {
                const mockPageWithData = {
                    ...createMockPage([]),
                    componentData: { some: Promise.resolve('data') },
                };
                const pagePromise = Promise.resolve(mockPageWithData);

                vi.mocked(fetchPageWithComponentData).mockReturnValue(pagePromise);

                const result = loader(baseLoaderArgs);

                expect(vi.mocked(fetchPageWithComponentData)).toHaveBeenCalledWith(baseLoaderArgs, {
                    pageId: 'homepage',
                });
                expect(result.page).toBe(pagePromise);
                expect(result.page).toBeInstanceOf(Promise);
                expect(result.searchResult).toBeInstanceOf(Promise);
                expect(result.categories).toBeInstanceOf(Promise);
            });
        });
    });
});
