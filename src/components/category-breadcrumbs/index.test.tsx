import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import CategoryBreadcrumbs from './index';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

const createTestWrapper = (component: React.ReactElement) => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: component,
            },
        ],
        { initialEntries: ['/'] }
    );
    return <RouterProvider router={router} />;
};

describe('CategoryBreadcrumbs', () => {
    it('should render breadcrumbs from parentCategoryTree when provided', () => {
        const category: ShopperProducts.schemas['Category'] = {
            id: 'category-3',
            name: 'Subcategory',
            parentCategoryTree: [
                { id: 'category-1', name: 'Home' },
                { id: 'category-2', name: 'Parent Category' },
                { id: 'category-3', name: 'Subcategory' },
            ],
        };

        render(createTestWrapper(<CategoryBreadcrumbs category={category} />));

        expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
        expect(screen.getByText('Home')).toBeInTheDocument();
        expect(screen.getByText('Parent Category')).toBeInTheDocument();
        expect(screen.getByText('Subcategory')).toBeInTheDocument();
    });

    it('should render single breadcrumb when parentCategoryTree is undefined', () => {
        const category: ShopperProducts.schemas['Category'] = {
            id: 'category-1',
            name: 'Root Category',
            // parentCategoryTree is undefined
        };

        render(createTestWrapper(<CategoryBreadcrumbs category={category} />));

        expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
        expect(screen.getByText('Root Category')).toBeInTheDocument();
    });

    it('should render links with correct hrefs', () => {
        const category: ShopperProducts.schemas['Category'] = {
            id: 'category-2',
            name: 'Category',
            parentCategoryTree: [
                { id: 'cat-1', name: 'First' },
                { id: 'cat-2', name: 'Second' },
            ],
        };

        render(createTestWrapper(<CategoryBreadcrumbs category={category} />));

        const firstLink = screen.getByRole('link', { name: 'First' });
        const secondLink = screen.getByRole('link', { name: 'Second' });

        expect(firstLink).toHaveAttribute('href', '/category/cat-1');
        expect(secondLink).toHaveAttribute('href', '/category/cat-2');
    });

    it('should show chevron icons between breadcrumb items', () => {
        const category: ShopperProducts.schemas['Category'] = {
            id: 'category-3',
            name: 'Third',
            parentCategoryTree: [
                { id: 'cat-1', name: 'First' },
                { id: 'cat-2', name: 'Second' },
                { id: 'cat-3', name: 'Third' },
            ],
        };

        const { container } = render(createTestWrapper(<CategoryBreadcrumbs category={category} />));

        // Should have 2 chevron icons (between 3 items)
        const chevrons = container.querySelectorAll('svg.lucide-chevron-right');
        expect(chevrons).toHaveLength(2);
    });

    it('should not show chevron before first item', () => {
        const category: ShopperProducts.schemas['Category'] = {
            id: 'cat-1',
            name: 'Single',
            parentCategoryTree: [{ id: 'cat-1', name: 'Single' }],
        };

        const { container } = render(createTestWrapper(<CategoryBreadcrumbs category={category} />));

        const chevrons = container.querySelectorAll('svg.lucide-chevron-right');
        expect(chevrons).toHaveLength(0);
    });
});
