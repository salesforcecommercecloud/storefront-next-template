/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import ProductCarousel, { ProductCarouselWithSuspense, ProductCarouselWithData } from './carousel';

// Mock data
const mockProducts: ShopperSearch.schemas['ProductSearchHit'][] = [
    {
        productId: 'test-product-1',
        productName: 'Test Product 1',
        image: { alt: 'Test Product 1', link: '/test1.jpg' },
        price: 29.99,
        currency: 'USD',
        inventory: { ats: 10 },
        representedProduct: {
            id: 'test-product-1',
            name: 'Test Product 1',
            imageGroups: [],
            variants: [],
            type: { master: true },
        },
    },
    {
        productId: 'test-product-2',
        productName: 'Test Product 2',
        image: { alt: 'Test Product 2', link: '/test2.jpg' },
        price: 39.99,
        currency: 'USD',
        inventory: { ats: 5 },
        representedProduct: {
            id: 'test-product-2',
            name: 'Test Product 2',
            imageGroups: [],
            variants: [],
            type: { master: true },
        },
    },
    {
        productId: 'test-product-3',
        productName: 'Test Product 3',
        image: { alt: 'Test Product 3', link: '/test3.jpg' },
        price: 49.99,
        currency: 'USD',
        inventory: { ats: 0 },
        representedProduct: {
            id: 'test-product-3',
            name: 'Test Product 3',
            imageGroups: [],
            variants: [],
            type: { master: true },
        },
    },
];

const mockProductSearchResult: ShopperSearch.schemas['ProductSearchResult'] = {
    hits: mockProducts,
    total: 3,
    query: '',
    refinements: [],
    searchPhraseSuggestions: { suggestedTerms: [] },
    sortingOptions: [],
    start: 0,
    count: 3,
    offset: 0,
    limit: 10,
};

// Mock the ProductTile component
vi.mock('@/components/product-tile', () => ({
    ProductTile: ({
        product,
        className,
    }: {
        product: ShopperSearch.schemas['ProductSearchHit'];
        className?: string;
    }) => (
        <div data-testid={`product-tile-${product.productId}`} className={className}>
            <h3>{product.productName}</h3>
            <p>${product.price}</p>
        </div>
    ),
}));

// Mock the carousel UI components
vi.mock('@/components/ui/carousel', () => ({
    Carousel: ({ children, className, opts }: { children: React.ReactNode; className?: string; opts?: any }) => (
        <div data-testid="carousel" className={className} data-opts={JSON.stringify(opts)}>
            {children}
        </div>
    ),
    CarouselContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div data-testid="carousel-content" className={className}>
            {children}
        </div>
    ),
    CarouselItem: ({ children, className, key }: { children: React.ReactNode; className?: string; key?: string }) => (
        <div data-testid="carousel-item" className={className} data-key={key}>
            {children}
        </div>
    ),
    CarouselPrevious: () => <button data-testid="carousel-previous">Previous</button>,
    CarouselNext: () => <button data-testid="carousel-next">Next</button>,
}));

// Mock withSuspense
vi.mock('@/components/with-suspense', () => ({
    default: (Component: React.ComponentType<any>, _options: any) => {
        const WrappedComponent = (props: any) => {
            if (props.resolve) {
                // Simulate promise resolution
                return <Component {...props} data={mockProductSearchResult} />;
            }
            return <Component {...props} />;
        };
        WrappedComponent.displayName = `withSuspense(${Component.displayName || Component.name})`;
        return WrappedComponent;
    },
}));

// Mock ProductCarouselSkeleton
vi.mock('./skeleton', () => ({
    default: ({ title, itemCount }: { title?: string; itemCount?: number }) => (
        <div data-testid="product-carousel-skeleton">
            {title && <h2>{title}</h2>}
            <div>Loading {itemCount || 6} items...</div>
        </div>
    ),
}));

const renderComponent = (component: React.ReactElement) => {
    return render(component);
};

describe('ProductCarousel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders carousel with products', () => {
            renderComponent(<ProductCarousel products={mockProducts} title="Featured Products" />);

            expect(screen.getByText('Featured Products')).toBeInTheDocument();
            expect(screen.getByTestId('carousel')).toBeInTheDocument();
            expect(screen.getByTestId('carousel-content')).toBeInTheDocument();
            expect(screen.getByTestId('carousel-previous')).toBeInTheDocument();
            expect(screen.getByTestId('carousel-next')).toBeInTheDocument();
        });

        test('renders without title when not provided', () => {
            renderComponent(<ProductCarousel products={mockProducts} />);

            expect(screen.queryByText('Featured Products')).not.toBeInTheDocument();
            expect(screen.getByTestId('carousel')).toBeInTheDocument();
        });

        test('renders all product tiles', () => {
            renderComponent(<ProductCarousel products={mockProducts} />);

            expect(screen.getByTestId('product-tile-test-product-1')).toBeInTheDocument();
            expect(screen.getByTestId('product-tile-test-product-2')).toBeInTheDocument();
            expect(screen.getByTestId('product-tile-test-product-3')).toBeInTheDocument();
        });

        test('applies correct carousel options', () => {
            renderComponent(<ProductCarousel products={mockProducts} />);

            const carousel = screen.getByTestId('carousel');
            const opts = JSON.parse(carousel.getAttribute('data-opts') || '{}');
            expect(opts.align).toBe('start');
        });

        test('applies correct CSS classes', () => {
            renderComponent(<ProductCarousel products={mockProducts} />);

            const carousel = screen.getByTestId('carousel');
            expect(carousel).toHaveClass('w-full');

            const content = screen.getByTestId('carousel-content');
            expect(content).toHaveClass('items-stretch', 'flex-nowrap');

            const items = screen.getAllByTestId('carousel-item');
            items.forEach((item) => {
                expect(item).toHaveClass(
                    'basis-1/2',
                    'sm:basis-1/3',
                    'md:basis-1/4',
                    'py-1',
                    'flex',
                    'justify-center',
                    'pl-0'
                );
            });
        });
    });

    describe('Empty State Handling', () => {
        test('renders "No products found" when products array is empty', () => {
            renderComponent(<ProductCarousel products={[]} title="Featured Products" />);

            expect(screen.getByText('No products found')).toBeInTheDocument();
            expect(screen.queryByTestId('carousel')).not.toBeInTheDocument();
        });

        test('renders "No products found" when products is null', () => {
            renderComponent(<ProductCarousel products={null as any} title="Featured Products" />);

            expect(screen.getByText('No products found')).toBeInTheDocument();
            expect(screen.queryByTestId('carousel')).not.toBeInTheDocument();
        });

        test('renders "No products found" when products is undefined', () => {
            renderComponent(<ProductCarousel products={undefined as any} title="Featured Products" />);

            expect(screen.getByText('No products found')).toBeInTheDocument();
            expect(screen.queryByTestId('carousel')).not.toBeInTheDocument();
        });
    });

    describe('ProductTile Integration', () => {
        test('passes correct props to ProductTile', () => {
            renderComponent(<ProductCarousel products={mockProducts} />);

            const productTile = screen.getByTestId('product-tile-test-product-1');
            expect(productTile).toHaveClass('h-auto');
            expect(screen.getByText('Test Product 1')).toBeInTheDocument();
            expect(screen.getByText('$29.99')).toBeInTheDocument();
        });

        test('renders correct number of carousel items', () => {
            renderComponent(<ProductCarousel products={mockProducts} />);

            const items = screen.getAllByTestId('carousel-item');
            expect(items).toHaveLength(mockProducts.length);
        });
    });
});

describe('ProductCarouselWithData', () => {
    describe('Data Handling', () => {
        test('renders with ProductSearchResult data', () => {
            renderComponent(<ProductCarouselWithData data={mockProductSearchResult} title="Featured Products" />);

            expect(screen.getByText('Featured Products')).toBeInTheDocument();
            expect(screen.getByTestId('product-tile-test-product-1')).toBeInTheDocument();
            expect(screen.getByTestId('product-tile-test-product-2')).toBeInTheDocument();
            expect(screen.getByTestId('product-tile-test-product-3')).toBeInTheDocument();
        });

        test('renders with direct ProductSearchHit array', () => {
            renderComponent(<ProductCarouselWithData data={mockProducts} title="Featured Products" />);

            expect(screen.getByText('Featured Products')).toBeInTheDocument();
            expect(screen.getByTestId('product-tile-test-product-1')).toBeInTheDocument();
        });

        test('renders empty state when no data provided', () => {
            renderComponent(<ProductCarouselWithData data={undefined} title="Featured Products" />);

            expect(screen.getByText('No products found')).toBeInTheDocument();
            expect(screen.queryByTestId('carousel')).not.toBeInTheDocument();
        });

        test('renders empty state when data is null', () => {
            renderComponent(<ProductCarouselWithData data={null} title="Featured Products" />);

            expect(screen.getByText('No products found')).toBeInTheDocument();
            expect(screen.queryByTestId('carousel')).not.toBeInTheDocument();
        });

        test('passes through additional props', () => {
            renderComponent(
                <ProductCarouselWithData data={mockProducts} title="Featured Products" data-testid="custom-carousel" />
            );

            expect(screen.getByText('Featured Products')).toBeInTheDocument();
            expect(screen.getByTestId('product-tile-test-product-1')).toBeInTheDocument();
        });
    });
});

describe('ProductCarouselWithSuspense', () => {
    describe('Suspense Integration', () => {
        test('renders with resolved data', () => {
            const mockPromise = Promise.resolve(mockProductSearchResult);
            renderComponent(<ProductCarouselWithSuspense resolve={mockPromise} title="Featured Products" />);

            expect(screen.getByText('Featured Products')).toBeInTheDocument();
            expect(screen.getByTestId('product-tile-test-product-1')).toBeInTheDocument();
        });

        test('passes through props correctly', () => {
            const mockPromise = Promise.resolve(mockProductSearchResult);
            renderComponent(
                <ProductCarouselWithSuspense
                    resolve={mockPromise}
                    title="Featured Products"
                    data-testid="suspense-carousel"
                />
            );

            expect(screen.getByText('Featured Products')).toBeInTheDocument();
            expect(screen.getByTestId('product-tile-test-product-1')).toBeInTheDocument();
        });
    });
});

describe('Component Integration', () => {
    test('maintains consistent behavior across all variants', () => {
        const variants = [
            <ProductCarousel key="basic" products={mockProducts} title="Basic" />,
            <ProductCarouselWithData key="data" data={mockProducts} title="With Data" />,
            <ProductCarouselWithSuspense
                key="suspense"
                resolve={Promise.resolve(mockProducts)}
                title="With Suspense"
            />,
        ];

        variants.forEach((variant) => {
            const { unmount } = renderComponent(variant);
            expect(screen.getByTestId('carousel')).toBeInTheDocument();
            expect(screen.getByTestId('product-tile-test-product-1')).toBeInTheDocument();
            unmount();
        });
    });
});
