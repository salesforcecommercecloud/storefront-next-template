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
import PopularCategories from './popular-categories';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import type { ReactNode } from 'react';

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

// Mock the ContentCard component to avoid Link issues
vi.mock('@/components/content-card', () => ({
    default: ({
        title,
        description,
        imageUrl,
        imageAlt,
        buttonText,
        buttonLink,
        showBackground,
        showBorder,
        loading,
    }: any) => (
        <div data-testid="content-card">
            <h3>{title}</h3>
            <p>{description}</p>
            {imageUrl && <img src={imageUrl} alt={imageAlt} loading={loading} />}
            {buttonText && buttonLink && <a href={buttonLink}>{buttonText}</a>}
            <div data-show-background={showBackground} data-show-border={showBorder} />
        </div>
    ),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
    <ConfigProvider config={mockConfig}>{children}</ConfigProvider>
);

const mockCategories: ShopperProducts.schemas['Category'][] = [
    {
        id: 'cat1',
        name: 'Electronics',
        pageDescription: 'Latest electronics and gadgets',
        image: { link: '/images/electronics.jpg' } as any,
        c_slotBannerImage: '/images/electronics-banner.jpg',
    },
    {
        id: 'cat2',
        name: 'Clothing',
        pageDescription: 'Fashion and apparel',
        image: { link: '/images/clothing.jpg' } as any,
    },
    {
        id: 'cat3',
        name: 'Books',
        pageDescription: 'Books and literature',
        image: { link: '/images/books.jpg' } as any,
    },
    {
        id: 'cat4',
        name: 'Sports',
        pageDescription: 'Sports and fitness',
        image: { link: '/images/sports.jpg' } as any,
    },
];

const renderComponent = (component: React.ReactElement) => {
    return render(component, { wrapper });
};

describe('PopularCategories', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders component with skeleton initially', async () => {
        const categoriesPromise = Promise.resolve(mockCategories);

        renderComponent(<PopularCategories categoriesPromise={categoriesPromise} />);

        // Should show skeleton elements while loading (they don't have data-testid, just classes)
        expect(document.querySelectorAll('.animate-pulse')).toHaveLength(17); // 1 title + 4 cards * 4 elements each

        // Wait for categories to load
        await waitFor(() => {
            expect(screen.getByText('Step into Elegance')).toBeInTheDocument();
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

    test('renders with custom paddingX prop', async () => {
        const categoriesPromise = Promise.resolve(mockCategories);

        const { container } = renderComponent(
            <PopularCategories categoriesPromise={categoriesPromise} paddingX="px-2" />
        );

        // Wait for component to load
        await waitFor(
            () => {
                expect(screen.getByText('Step into Elegance')).toBeInTheDocument();
            },
            { timeout: 3000 }
        );

        // Check that the custom padding is applied to the main container
        const mainContainer = container.querySelector('.max-w-screen-2xl');
        expect(mainContainer?.className).toContain('px-2');
    });

    test('renders with default paddingX when not provided', async () => {
        const categoriesPromise = Promise.resolve(mockCategories);

        const { container } = renderComponent(<PopularCategories categoriesPromise={categoriesPromise} />);

        // Wait for component to load
        await waitFor(
            () => {
                expect(screen.getByText('Step into Elegance')).toBeInTheDocument();
            },
            { timeout: 3000 }
        );

        // Check that default padding is applied to the main container
        const mainContainer = container.querySelector('.max-w-screen-2xl');
        expect(mainContainer?.className).toContain('px-4 sm:px-6 lg:px-8');
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
