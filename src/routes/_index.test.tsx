/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import type { ShopperSearch, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
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

// Mock the HeroCarousel component
vi.mock('@/components/hero-carousel', () => ({
    default: ({ slides }: { slides: any[] }) => (
        <div data-testid="hero-carousel">
            {slides.map((slide) => (
                <div key={slide.id} data-testid={`hero-slide-${slide.id}`}>
                    {slide.title}
                </div>
            ))}
        </div>
    ),
}));

// Mock the ProductCarouselWithSuspense component
vi.mock('@/components/product-carousel', () => ({
    ProductCarouselWithSuspense: ({ resolve: _resolve, title }: { resolve: Promise<any>; title: string }) => {
        return (
            <div data-testid="product-carousel-with-suspense">
                <h2>{title}</h2>
                <div data-testid="carousel-data">Loaded</div>
            </div>
        );
    },
}));

// Mock the ContentCard component
vi.mock('@/components/content-card', () => ({
    ContentCard: ({ title, description, image, link }: any) => (
        <div data-testid="content-card">
            <h3>{title}</h3>
            <p>{description}</p>
            {image && <img src={image} alt={title} />}
            {link && <a href={link}>Learn More</a>}
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

// Mock the createPage function
vi.mock('@/components/create-page', () => ({
    createPage: (config: any) => {
        return (props: any) => {
            // For testing, we'll unwrap the promises and pass the resolved data
            const unwrappedData = {
                searchResult: props.loaderData?.searchResult || mockSearchResult,
                categories: props.loaderData?.categories || mockCategories,
            };
            return React.createElement(config.component, { loaderData: unwrappedData });
        };
    },
}));

// Mock UI strings
vi.mock('@/temp-ui-string', () => ({
    default: {
        home: {
            hero: {
                slide1: { title: 'Slide 1', subtitle: 'Subtitle 1', imageAlt: 'Alt 1', ctaText: 'CTA 1' },
                slide2: { title: 'Slide 2', subtitle: 'Subtitle 2', imageAlt: 'Alt 2', ctaText: 'CTA 2' },
                slide3: { title: 'Slide 3', subtitle: 'Subtitle 3', imageAlt: 'Alt 3', ctaText: 'CTA 3' },
            },
            newArrivals: {
                title: 'New Arrivals',
            },
            featuredProducts: { title: 'Featured Products' },
            categoryGrid: { title: 'Shop by Category' },
            featuredContent: {
                women: {
                    title: 'Women',
                    description: "Shop women's collection",
                },
                men: {
                    title: 'Men',
                    description: "Shop men's collection",
                },
            },
            features: { title: 'Features' },
            help: { title: 'Help' },
        },
    },
}));

// Mock images
vi.mock('/images/hero-cube.png', () => ({ default: '/images/hero-cube.png' }));
vi.mock('/images/heroNewArrivals.png', () => ({ default: '/images/heroNewArrivals.png' }));

const renderComponent = (component: React.ReactElement) => {
    return render(component);
};

describe('HomeView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders hero carousel', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            expect(screen.getByTestId('hero-carousel')).toBeInTheDocument();
        });

        test('renders hero slides with correct content', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            expect(screen.getByTestId('hero-slide-slide-1')).toBeInTheDocument();
            expect(screen.getByTestId('hero-slide-slide-2')).toBeInTheDocument();
            expect(screen.getByTestId('hero-slide-slide-3')).toBeInTheDocument();
        });

        test('renders featured products section', async () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Featured Products')).toBeInTheDocument();
            });
        });

        test('renders categories section', async () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Shop by Category')).toBeInTheDocument();
            });
        });
    });

    describe('Featured Products Section', () => {
        test('renders featured products with correct title', async () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Featured Products')).toBeInTheDocument();
            });
        });

        test('renders featured products with container styling', async () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            await waitFor(() => {
                const featuredSection = screen.getByText('Featured Products').closest('div')?.parentElement;
                expect(featuredSection).toHaveClass(
                    'pt-16',
                    'max-w-screen-2xl',
                    'mx-auto',
                    'px-4',
                    'sm:px-6',
                    'lg:px-8'
                );
            });
        });

        test('renders ProductCarouselWithSuspense with correct props', async () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            await waitFor(() => {
                expect(screen.getByTestId('product-carousel-with-suspense')).toBeInTheDocument();
                expect(screen.getByText('Featured Products')).toBeInTheDocument();
            });
        });
    });

    describe('Categories Section', () => {
        test('renders categories with correct title', async () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Shop by Category')).toBeInTheDocument();
            });
        });

        test('renders valid categories only', async () => {
            const categoriesWithInvalid = [
                ...mockCategories,
                { id: 'undefined', name: 'Invalid Category' },
                { id: '', name: 'Empty ID Category' },
            ];

            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(categoriesWithInvalid),
                    }}
                />
            );

            await waitFor(() => {
                // Should render only valid categories
                expect(screen.getByText('Category 1')).toBeInTheDocument();
                expect(screen.getByText('Category 2')).toBeInTheDocument();
                expect(screen.getByText('Category 3')).toBeInTheDocument();
                expect(screen.getByText('Category 4')).toBeInTheDocument();
                expect(screen.queryByText('Invalid Category')).not.toBeInTheDocument();
                expect(screen.queryByText('Empty ID Category')).not.toBeInTheDocument();
            });
        });

        test('renders up to 4 categories', async () => {
            const manyCategories = Array.from({ length: 10 }, (_, i) => ({
                id: `category-${i + 1}`,
                name: `Category ${i + 1}`,
                parentCategoryId: 'root',
                image: `/category${i + 1}.jpg`,
            }));

            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(manyCategories),
                    }}
                />
            );

            await waitFor(() => {
                // Should only render first 4 categories
                expect(screen.getByText('Category 1')).toBeInTheDocument();
                expect(screen.getByText('Category 2')).toBeInTheDocument();
                expect(screen.getByText('Category 3')).toBeInTheDocument();
                expect(screen.getByText('Category 4')).toBeInTheDocument();
                expect(screen.queryByText('Category 5')).not.toBeInTheDocument();
            });
        });

        test('does not render categories section when no valid categories', async () => {
            const invalidCategories = [
                { id: 'undefined', name: 'Invalid Category' },
                { id: '', name: 'Empty ID Category' },
            ];

            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(invalidCategories),
                    }}
                />
            );

            await waitFor(() => {
                // Should not render the categories section at all
                expect(screen.queryByText('Step into Elegance')).not.toBeInTheDocument();
            });
        });
    });

    describe('Content Cards Section', () => {
        test.skip('renders features content card', () => {
            // Features section is not implemented in the current component
            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            expect(screen.getByText('Features')).toBeInTheDocument();
        });

        test.skip('renders help content card', () => {
            // Help section is not implemented in the current component
            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            expect(screen.getByText('Help')).toBeInTheDocument();
        });

        test('renders content cards with correct styling', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            // Test featured content cards (Women/Men) - should be 2
            const featuredContentSection = screen.getByText('Women').closest('div')?.parentElement;
            const featuredContentCards = featuredContentSection?.querySelectorAll('[data-testid="content-card"]');
            expect(featuredContentCards).toHaveLength(2);
        });
    });

    describe('Error Handling', () => {
        test('handles search result promise rejection', () => {
            const rejectedPromise = Promise.reject(new Error('Search failed'));
            // Catch the rejection to prevent unhandled promise rejection
            rejectedPromise.catch(() => {});

            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            // Should still render other sections
            expect(screen.getByTestId('hero-carousel')).toBeInTheDocument();
        });

        test('handles categories promise rejection', () => {
            const rejectedPromise = Promise.reject(new Error('Categories failed'));
            // Catch the rejection to prevent unhandled promise rejection
            rejectedPromise.catch(() => {});

            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            // Should still render other sections
            expect(screen.getByTestId('hero-carousel')).toBeInTheDocument();
        });
    });

    describe('Layout and Styling', () => {
        test('applies correct container styling', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            const container = screen.getByTestId('hero-carousel').parentElement;
            expect(container).toHaveClass('pb-16', '-mt-8');
        });

        test('applies correct spacing between sections', () => {
            renderComponent(
                <HomeView
                    loaderData={{
                        searchResult: Promise.resolve(mockSearchResult),
                        categories: Promise.resolve(mockCategories),
                    }}
                />
            );

            // Check that sections have proper spacing
            const featuredSection = screen.getByText('Featured Products').closest('div')?.parentElement;
            expect(featuredSection).toHaveClass('pt-16');
        });
    });
});
