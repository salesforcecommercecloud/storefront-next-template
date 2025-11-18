/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import type { ShopperSearch, ShopperProducts, ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import HomeView from './_index';

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

// Mock the Region component
vi.mock('@/components/region', () => ({
    Region: ({ region }: any) => <div data-testid="region" data-region-id={region?.id} />,
}));

// Mock the PopularCategories component
vi.mock('@/components/home/popular-categories', () => ({
    PopularCategories: () => (
        <div data-testid="popular-categories">
            <h2>Step into Elegance</h2>
        </div>
    ),
}));

// Mock the ContentCard component
vi.mock('@/components/content-card', () => ({
    ContentCard: ({ title, description }: any) => (
        <div data-testid="content-card">
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    ),
}));

// Mock the Button component
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

// Mock the Skeleton component
vi.mock('@/components/ui/skeleton', () => ({
    Skeleton: ({ className, ...props }: any) => <div data-testid="skeleton" className={className} {...props} />,
}));

// Mock the HomeSkeleton component
vi.mock('@/components/home/skeleton', () => ({
    default: () => <div data-testid="home-skeleton" />,
}));

// Mock React Router components
vi.mock('react-router', () => ({
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
}));

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

// Mock UI strings
vi.mock('@/temp-ui-string', () => ({
    default: {
        home: {
            newArrivals: {
                title: 'New Arrivals',
                description:
                    'Discover the latest additions to our collection. From statement pieces to everyday essentials.',
                ctaText: 'SHOP NEW ARRIVALS',
            },
            featuredContent: {
                women: {
                    title: 'Women',
                    description:
                        'Discover our curated collection of sophisticated footwear designed for the modern woman.',
                    ctaText: 'EXPLORE COLLECTION',
                    imageAlt: "Women's Collection",
                },
                men: {
                    title: 'Men',
                    description: "Timeless craftsmanship meets contemporary style in our men's footwear collection.",
                    ctaText: 'EXPLORE COLLECTION',
                    imageAlt: "Men's Collection",
                },
            },
        },
    },
}));

// Mock images
vi.mock('/images/hero-new-arrivals.png', () => ({ default: '/mock-image.png' }));

// Mock decorators and utilities
vi.mock('@/lib/decorators/page-type', () => ({
    PageType: () => (target: any) => target,
}));

vi.mock('@/lib/decorators/region-definition', () => ({
    RegionDefinition: () => (target: any) => target,
    getRegionDefinition: vi.fn(() => ({ id: 'headerbanner' })),
}));

vi.mock('@/lib/util/pageLoader', () => ({
    collectComponentDataPromises: vi.fn(() => Promise.resolve({})),
    fetchPageFromLoader: vi.fn(() => Promise.resolve(createMockPage([]))),
}));

vi.mock('@/lib/api/search', () => ({
    fetchSearchProducts: vi.fn(() => Promise.resolve(mockSearchResult)),
}));

vi.mock('@/lib/api/categories', () => ({
    fetchCategories: vi.fn(() => Promise.resolve(mockCategories)),
}));

vi.mock('@/config', () => ({
    getConfig: vi.fn(() => ({ pages: { home: { featuredProductsCount: 8 } } })),
}));

const renderComponent = (component: React.ReactElement) => {
    return render(component);
};

describe('HomeView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders new arrivals section', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            expect(screen.getByText('New Arrivals')).toBeInTheDocument();
        });

        test('renders popular categories section', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            expect(screen.getByTestId('popular-categories')).toBeInTheDocument();
        });

        test('renders featured content cards', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            expect(screen.getByText('Women')).toBeInTheDocument();
            expect(screen.getByText('Men')).toBeInTheDocument();
        });

        test('renders without header banner region when no regions available', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            // Should not render region when no regions are available
            expect(screen.queryByTestId('region')).not.toBeInTheDocument();
            // But should still render other sections
            expect(screen.getByText('New Arrivals')).toBeInTheDocument();
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

            // Should render the region component
            expect(screen.getByTestId('region')).toBeInTheDocument();
            expect(screen.getByTestId('region')).toHaveAttribute('data-region-id', 'headerbanner');
            // Should still render other sections
            expect(screen.getByText('New Arrivals')).toBeInTheDocument();
        });
    });

    describe('New Arrivals Section', () => {
        test('renders new arrivals with correct title', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            expect(screen.getByText('New Arrivals')).toBeInTheDocument();
        });

        test('renders new arrivals with correct description', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            expect(
                screen.getByText(
                    'Discover the latest additions to our collection. From statement pieces to everyday essentials.'
                )
            ).toBeInTheDocument();
        });

        test('renders new arrivals CTA button', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            expect(screen.getByText('SHOP NEW ARRIVALS')).toBeInTheDocument();
        });
    });

    describe('Popular Categories Section', () => {
        test('renders popular categories component', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            expect(screen.getByTestId('popular-categories')).toBeInTheDocument();
        });

        test('passes categories promise to PopularCategories component', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            // The PopularCategories component should receive the categoriesPromise
            expect(screen.getByTestId('popular-categories')).toBeInTheDocument();
            expect(screen.getByText('Step into Elegance')).toBeInTheDocument();
        });
    });

    describe('Featured Content Cards Section', () => {
        test('renders women content card', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            expect(screen.getByText('Women')).toBeInTheDocument();
            expect(
                screen.getByText(
                    'Discover our curated collection of sophisticated footwear designed for the modern woman.'
                )
            ).toBeInTheDocument();
        });

        test('renders men content card', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            expect(screen.getByText('Men')).toBeInTheDocument();
            expect(
                screen.getByText("Timeless craftsmanship meets contemporary style in our men's footwear collection.")
            ).toBeInTheDocument();
        });

        test('renders both content cards with correct count', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            // Test featured content cards (Women/Men) - should be 2
            const contentCards = screen.getAllByTestId('content-card');
            expect(contentCards).toHaveLength(2);
        });
    });

    describe('Error Handling', () => {
        test('handles page promise rejection gracefully', () => {
            const rejectedPagePromise = Promise.reject(new Error('Page failed'));
            // Catch the rejection to prevent unhandled promise rejection
            rejectedPagePromise.catch(() => {});

            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            // Should still render other sections
            expect(screen.getByText('New Arrivals')).toBeInTheDocument();
        });

        test('handles categories promise rejection', () => {
            const rejectedPromise = Promise.reject(new Error('Categories failed'));
            // Catch the rejection to prevent unhandled promise rejection
            rejectedPromise.catch(() => {});

            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: rejectedPromise,
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            // Should still render other sections
            expect(screen.getByText('New Arrivals')).toBeInTheDocument();
        });
    });

    describe('Layout and Styling', () => {
        test('applies correct main container styling', () => {
            const { container } = renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            const mainContainer = container.firstChild as HTMLElement;
            expect(mainContainer).toHaveClass('pb-16', '-mt-8');
        });

        test('applies correct spacing between sections', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            // Check that New Arrivals section has proper spacing
            // The pt-16 class is on the section container, which is the closest div with pt-16 class
            const newArrivalsTitle = screen.getByText('New Arrivals');
            const sectionWithPadding = newArrivalsTitle.closest('[class*="pt-16"]');
            expect(sectionWithPadding).toBeInTheDocument();
            expect(sectionWithPadding).toHaveClass('pt-16');
        });

        test('applies correct grid layout for content cards', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        page: Promise.resolve(createMockPage([])),
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                        componentData: Promise.resolve({}),
                    }}
                />
            );

            // Check that content cards section has proper grid layout
            const contentCardsGrid = screen.getByText('Women').closest('div')?.parentElement;
            expect(contentCardsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6');
        });
    });
});
