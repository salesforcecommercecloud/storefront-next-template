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
import { render, screen } from '@testing-library/react';
import PopularCategory from './index';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import type { ReactNode } from 'react';

// Mock decorators (minimal mocking to avoid testing them)
vi.mock('@/lib/decorators/component', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/decorators/component')>();
    return {
        ...actual,
        Component: () => (target: unknown) => target,
        Loader: () => (target: unknown) => target,
    };
});

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

// Mock i18n
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'categoryGrid.shopNowButton': 'Shop Now',
            };
            return translations[key] || key;
        },
    }),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
    <ConfigProvider config={mockConfig}>{children}</ConfigProvider>
);

const mockCategory: ShopperProducts.schemas['Category'] = {
    id: 'newarrivals',
    name: 'New Arrivals',
    pageDescription: 'Shop all new arrivals including women and mens clothing',
    image: '/images/new-arrivals.jpg',
    c_slotBannerImage: '/images/new-arrivals-banner.jpg',
};

const renderComponent = (component: React.ReactElement) => {
    return render(component, { wrapper });
};

describe('PopularCategory', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders category with data prop (from loader)', () => {
        renderComponent(<PopularCategory data={mockCategory} />);

        expect(screen.getByText('New Arrivals')).toBeInTheDocument();
        expect(screen.getByText('Shop all new arrivals including women and mens clothing')).toBeInTheDocument();
        expect(screen.getByText('Shop Now')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', '/category/newarrivals');
    });

    test('renders category with category prop (programmatic use)', () => {
        renderComponent(<PopularCategory category={mockCategory} />);

        expect(screen.getByText('New Arrivals')).toBeInTheDocument();
        expect(screen.getByText('Shop all new arrivals including women and mens clothing')).toBeInTheDocument();
    });

    test('prioritizes data prop over category prop', () => {
        const dataCategory = { ...mockCategory, name: 'From Data' };
        const categoryProp = { ...mockCategory, name: 'From Category' };

        renderComponent(<PopularCategory data={dataCategory} category={categoryProp} />);

        expect(screen.getByText('From Data')).toBeInTheDocument();
        expect(screen.queryByText('From Category')).not.toBeInTheDocument();
    });

    test('ignores string category prop (from Page Designer)', () => {
        renderComponent(<PopularCategory category={'newarrivals' as any} />);

        // Should show fallback since string category is ignored
        const contentCard = screen.getByTestId('content-card');
        expect(contentCard).toBeInTheDocument();
    });

    test('renders fallback when no data provided', () => {
        renderComponent(<PopularCategory />);

        const contentCard = screen.getByTestId('content-card');
        expect(contentCard).toBeInTheDocument();
        expect(screen.getByText('Shop Now')).toBeInTheDocument();
    });

    test('uses pageDescription over description', () => {
        const categoryWithBoth = {
            ...mockCategory,
            pageDescription: 'Page description',
            description: 'Regular description',
        };

        renderComponent(<PopularCategory data={categoryWithBoth} />);

        expect(screen.getByText('Page description')).toBeInTheDocument();
        expect(screen.queryByText('Regular description')).not.toBeInTheDocument();
    });

    test('falls back to description if pageDescription not available', () => {
        const categoryWithoutPageDesc = {
            ...mockCategory,
            pageDescription: undefined,
            description: 'Regular description',
        };

        renderComponent(<PopularCategory data={categoryWithoutPageDesc} />);

        expect(screen.getByText('Regular description')).toBeInTheDocument();
    });

    test('uses category image when available', () => {
        renderComponent(<PopularCategory data={mockCategory} />);

        const image = screen.getByRole('img');
        expect(image).toHaveAttribute('src', '/images/new-arrivals.jpg');
    });

    test('falls back to banner image if category image not available', () => {
        const categoryWithoutImage = {
            ...mockCategory,
            image: undefined,
        };

        renderComponent(<PopularCategory data={categoryWithoutImage} />);

        const image = screen.getByRole('img');
        expect(image).toHaveAttribute('src', '/images/new-arrivals-banner.jpg');
    });

    test('uses category name as image alt text', () => {
        renderComponent(<PopularCategory data={mockCategory} />);

        const image = screen.getByRole('img');
        expect(image).toHaveAttribute('alt', 'New Arrivals');
    });

    test('generates correct category link', () => {
        renderComponent(<PopularCategory data={mockCategory} />);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/category/newarrivals');
    });

    test('handles category with empty id', () => {
        const categoryWithEmptyId = {
            ...mockCategory,
            id: '',
        };

        renderComponent(<PopularCategory data={categoryWithEmptyId} />);

        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/category/');
    });

    test('handles category with empty name', () => {
        const categoryWithEmptyName = {
            ...mockCategory,
            name: '',
        };

        const { container } = renderComponent(<PopularCategory data={categoryWithEmptyName} />);

        // When alt is empty, image has role="presentation" and is not accessible via getByRole('img')
        // Query the image directly from the container
        const image = container.querySelector('img');
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('alt', '');
    });

    test('handles category with neither image nor banner', () => {
        const categoryNoImages = {
            ...mockCategory,
            image: undefined,
            c_slotBannerImage: undefined,
        };

        renderComponent(<PopularCategory data={categoryNoImages} />);

        // Should use fallback hero image
        const image = screen.getByRole('img');
        expect(image).toBeInTheDocument();
    });

    test('handles null category prop', () => {
        renderComponent(<PopularCategory category={null as any} />);

        // Should show fallback
        const contentCard = screen.getByTestId('content-card');
        expect(contentCard).toBeInTheDocument();
    });

    test('handles category prop with null value in type check', () => {
        renderComponent(<PopularCategory category={null as any} data={undefined} />);

        // Should show fallback since null is not an object
        const contentCard = screen.getByTestId('content-card');
        expect(contentCard).toBeInTheDocument();
    });
});
