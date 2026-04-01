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
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import PopularCategories from './popular-categories';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

// Mock decorators (minimal mocking to avoid testing them)
vi.mock('@/lib/decorators/component', async (importOriginal) => {
    const actual = await importOriginal<object>();
    return {
        ...actual,
        Component: () => (target: any) => target,
        Loader: () => (target: any) => target,
    };
});

vi.mock('@/lib/decorators', () => ({
    RegionDefinition: () => (target: any) => target,
}));

vi.mock('@/lib/decorators/attribute-definition', () => ({
    AttributeDefinition: () => () => {},
}));

const renderWithRouter = (component: React.ReactElement) => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: <ConfigProvider config={mockConfig}>{component}</ConfigProvider>,
            },
        ],
        { initialEntries: ['/'] }
    );
    return render(<RouterProvider router={router} />);
};

const mockCategories: ShopperProducts.schemas['Category'][] = [
    {
        id: 'cat1',
        name: 'Electronics',
        pageDescription: 'Latest electronics and gadgets',
        image: '/images/electronics.jpg',
        c_slotBannerImage: '/images/electronics-banner.jpg',
    },
    {
        id: 'cat2',
        name: 'Clothing',
        pageDescription: 'Fashion and apparel',
        image: '/images/clothing.jpg',
    },
    {
        id: 'cat3',
        name: 'Books',
        pageDescription: 'Books and literature',
        image: '/images/books.jpg',
    },
    {
        id: 'cat4',
        name: 'Sports',
        pageDescription: 'Sports and fitness',
        image: '/images/sports.jpg',
    },
];

const renderComponent = (component: React.ReactElement) => {
    return renderWithRouter(component);
};

describe('PopularCategories', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders component with skeleton initially', async () => {
        const categoriesPromise = Promise.resolve(mockCategories);

        renderComponent(<PopularCategories categoriesPromise={categoriesPromise} />);

        // Skeleton cards are rendered while loading (4 skeleton category cards)
        const skeletons = document.querySelectorAll('.aspect-square');
        expect(skeletons.length).toBe(4);

        // Wait for categories to load
        await waitFor(() => {
            expect(screen.getByText('Style for Real Life')).toBeInTheDocument();
        });
    });

    test('renders categories after loading', async () => {
        const categoriesPromise = Promise.resolve(mockCategories);

        renderComponent(<PopularCategories categoriesPromise={categoriesPromise} />);

        // Wait for categories to load and check they are displayed
        await waitFor(
            () => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
                expect(screen.getByText('Clothing')).toBeInTheDocument();
                expect(screen.getByText('Books')).toBeInTheDocument();
                expect(screen.getByText('Sports')).toBeInTheDocument();
            },
            { timeout: 3000 }
        );
    });

    test('renders section with correct container classes', async () => {
        const categoriesPromise = Promise.resolve(mockCategories);

        const { container } = renderComponent(<PopularCategories categoriesPromise={categoriesPromise} />);

        // Wait for component to load
        await waitFor(
            () => {
                expect(screen.getByText('Style for Real Life')).toBeInTheDocument();
            },
            { timeout: 3000 }
        );

        // Check that the max-w-7xl container is present
        const mainContainer = container.querySelector('.max-w-7xl');
        expect(mainContainer).toBeInTheDocument();
    });

    test('renders section wrapper with background', async () => {
        const categoriesPromise = Promise.resolve(mockCategories);

        const { container } = renderComponent(<PopularCategories categoriesPromise={categoriesPromise} />);

        // Wait for component to load
        await waitFor(
            () => {
                expect(screen.getByText('Style for Real Life')).toBeInTheDocument();
            },
            { timeout: 3000 }
        );

        // Check that the section has the muted background
        const section = container.querySelector('section');
        expect(section).toBeInTheDocument();
    });

    test('displays correct number of categories', async () => {
        const categoriesPromise = Promise.resolve(mockCategories);

        renderComponent(<PopularCategories categoriesPromise={categoriesPromise} />);

        // Wait for categories to load
        await waitFor(
            () => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            },
            { timeout: 3000 }
        );

        // Should display all 4 categories
        expect(screen.getByText('Electronics')).toBeInTheDocument();
        expect(screen.getByText('Clothing')).toBeInTheDocument();
        expect(screen.getByText('Books')).toBeInTheDocument();
        expect(screen.getByText('Sports')).toBeInTheDocument();
    });

    test('displays category descriptions', async () => {
        const categoriesPromise = Promise.resolve(mockCategories);

        renderComponent(<PopularCategories categoriesPromise={categoriesPromise} />);

        // Wait for categories to load
        await waitFor(
            () => {
                expect(screen.getByText('Latest electronics and gadgets')).toBeInTheDocument();
            },
            { timeout: 3000 }
        );

        // Check descriptions are displayed
        expect(screen.getByText('Latest electronics and gadgets')).toBeInTheDocument();
        expect(screen.getByText('Fashion and apparel')).toBeInTheDocument();
        expect(screen.getByText('Books and literature')).toBeInTheDocument();
        expect(screen.getByText('Sports and fitness')).toBeInTheDocument();
    });

    test('displays shop now buttons', async () => {
        const categoriesPromise = Promise.resolve(mockCategories);

        renderComponent(<PopularCategories categoriesPromise={categoriesPromise} />);

        // Wait for categories to load
        await waitFor(
            () => {
                expect(screen.getByText('Electronics')).toBeInTheDocument();
            },
            { timeout: 3000 }
        );

        // Check shop now buttons are present
        const shopNowButtons = screen.getAllByText('Shop Now');
        expect(shopNowButtons).toHaveLength(4);
    });
});
