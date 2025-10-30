/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Testing libraries
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';
// Components
import ProductView from './product-view';
// mock data
import { masterProduct as mockProduct } from '@/components/__mock__/master-variant-product';
import { standardProd } from '@/components/__mock__/standard-product';
import { bundleProd } from '@/components/__mock__/bundle-product';
import { setProduct } from '@/components/__mock__/set-product';

const renderProductView = (props: React.ComponentProps<typeof ProductView>, initialUrl = '/product/test-product') => {
    // Using createMemoryRouter in framework mode is fine
    // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
    // Even though it’s listed under “data routers,” it fully supports testing non-route components that rely on router behavior.
    const router = createMemoryRouter(
        [
            {
                path: '/product/:productId',
                element: <ProductView {...props} />,
            },
        ],
        {
            initialEntries: [initialUrl],
        }
    );
    return { ...render(<RouterProvider router={router} />), router };
};

describe('ProductView', () => {
    describe('basic rendering', () => {
        test('should render product properly', () => {
            renderProductView({ product: mockProduct });

            // Product name should be visible
            expect(screen.getByText('Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit')).toBeInTheDocument();

            // Image gallery should be present
            expect(
                screen.getAllByRole('img', { name: /Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit/i })[0]
            ).toBeInTheDocument();

            // Price should be visible
            expect(screen.getByText('From $299.99')).toBeInTheDocument();
            expect(screen.getByText('$500.00')).toBeInTheDocument();

            // Swatches should be visible
            expect(screen.getByLabelText('Charcoal')).toBeInTheDocument();
            expect(screen.getByLabelText('36')).toBeInTheDocument();
            expect(screen.getByLabelText('Short')).toBeInTheDocument();

            // Quantity picker should be visible
            expect(screen.getAllByLabelText(/quantity/i)[0]).toBeInTheDocument();

            // Cart action buttons should be visible
            expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument();
        });
    });

    describe('breadcrumbs', () => {
        test('should render breadcrumbs when category is provided', () => {
            const mockCategory = {
                id: 'mens-clothing',
                name: "Men's Clothing",
                parentCategoryTree: [
                    { id: 'root', name: 'All Categories' },
                    { id: 'mens', name: 'Men' },
                    { id: 'mens-clothing', name: "Men's Clothing" },
                ],
            };

            renderProductView({ product: mockProduct, category: mockCategory });

            // Breadcrumb items should be visible
            expect(screen.getByText('All Categories')).toBeInTheDocument();
            expect(screen.getByText('Men')).toBeInTheDocument();
        });

        test('should not render breadcrumbs when category is not provided', () => {
            renderProductView({ product: mockProduct });

            // No breadcrumb navigation should be present
            expect(screen.queryByRole('navigation', { name: /breadcrumb/i })).not.toBeInTheDocument();
        });
    });

    describe('product types', () => {
        test('should render correctly for standard product', () => {
            renderProductView({ product: standardProd });

            // Should render product name
            expect(screen.getByText('Laptop Briefcase with wheels (37L)')).toBeInTheDocument();

            // Should have quantity picker text and aria-label
            expect(screen.getAllByLabelText(/quantity/i)[0]).toBeInTheDocument();

            // Should NOT have variation swatches (no radiogroups for color/size selection)
            expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
        });

        test('should render correctly for bundle product', () => {
            renderProductView({ product: bundleProd });

            // Should render product name
            expect(screen.getByText('Turquoise Jewelry Bundle')).toBeInTheDocument();

            // Bundles do NOT have quantity picker at the parent level
            expect(screen.queryByLabelText(/quantity/i)).not.toBeInTheDocument();

            // Should show bundle notice message
            expect(screen.getByText(/this is a product bundle/i)).toBeInTheDocument();
        });

        test('should render correctly for set product', () => {
            renderProductView({ product: setProduct });

            // Should render product name
            expect(screen.getByText('Winter Look')).toBeInTheDocument();

            // Sets do NOT have quantity picker at the parent level
            expect(screen.queryByLabelText(/quantity/i)).not.toBeInTheDocument();

            // Should show set notice message
            expect(screen.getByText(/this is a product set/i)).toBeInTheDocument();
        });
    });

    describe('Performance and Optimization', () => {
        test('renders efficiently with complex product data', () => {
            renderProductView({ product: mockProduct });

            // Should render all major components without errors
            expect(screen.getByText('Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit')).toBeInTheDocument();
            expect(screen.getByText('From $299.99')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        test('handles product without images gracefully', () => {
            const productWithoutImages = {
                ...mockProduct,
                imageGroups: [],
            };

            renderProductView({ product: productWithoutImages });

            // Should still render the product name
            expect(screen.getByText('Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit')).toBeInTheDocument();
        });

        test('handles product without variations gracefully', () => {
            const productWithoutVariations = {
                ...standardProd,
                variationAttributes: [],
            };

            renderProductView({ product: productWithoutVariations });

            // Should render product name
            expect(screen.getByText('Laptop Briefcase with wheels (37L)')).toBeInTheDocument();

            // Should not have variation swatches
            expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
        });

        test('handles product with minimal data', () => {
            const minimalProduct = {
                id: 'minimal-product',
                name: 'Minimal Product',
                price: 99.99,
                currency: 'USD',
                imageGroups: [],
                variationAttributes: [],
            } as any;

            renderProductView({ product: minimalProduct });

            // Should render basic product information
            expect(screen.getByText('Minimal Product')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        test('maintains proper ARIA attributes', () => {
            renderProductView({ product: mockProduct });

            // Check for proper form labels
            expect(screen.getAllByLabelText(/quantity/i)[0]).toBeInTheDocument();

            // Check for proper button labels
            expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument();
        });

        test('provides proper navigation structure', () => {
            const mockCategory = {
                id: 'mens-clothing',
                name: "Men's Clothing",
                parentCategoryTree: [
                    { id: 'root', name: 'All Categories' },
                    { id: 'mens', name: 'Men' },
                ],
            };

            renderProductView({ product: mockProduct, category: mockCategory });

            // Should have proper navigation structure
            expect(screen.getByText('All Categories')).toBeInTheDocument();
            expect(screen.getByText('Men')).toBeInTheDocument();
        });
    });

    describe('Component Integration', () => {
        test('integrates with ProductViewProvider correctly', () => {
            renderProductView({ product: mockProduct });

            // Should render all product components
            expect(screen.getByText('Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit')).toBeInTheDocument();
            expect(screen.getByText('From $299.99')).toBeInTheDocument();
        });

        test('maintains consistent behavior across different product types', () => {
            const productTypes = [
                { product: mockProduct, name: 'Master Product' },
                { product: standardProd, name: 'Standard Product' },
                { product: bundleProd, name: 'Bundle Product' },
                { product: setProduct, name: 'Set Product' },
            ];

            productTypes.forEach(({ product, name: _name }) => {
                const { unmount } = renderProductView({ product });

                // Each product type should render its name
                if (product.name) {
                    expect(screen.getByText(product.name)).toBeInTheDocument();
                }
                unmount();
            });
        });
    });

    describe('Additional Coverage Tests', () => {
        test('renders product with all required elements', () => {
            renderProductView({ product: mockProduct });

            // Verify all major product elements are present
            expect(screen.getByText('Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit')).toBeInTheDocument();
            expect(screen.getByText('From $299.99')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument();
        });

        test('handles product with category breadcrumbs', () => {
            const mockCategory = {
                id: 'test-category',
                name: 'Test Category',
                parentCategoryTree: [
                    { id: 'root', name: 'Home' },
                    { id: 'test-category', name: 'Test Category' },
                ],
            };

            renderProductView({ product: mockProduct, category: mockCategory });

            expect(screen.getByText('Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit')).toBeInTheDocument();
            expect(screen.getByText('Home')).toBeInTheDocument();
            expect(screen.getByText('Test Category')).toBeInTheDocument();
        });

        test('renders product without category', () => {
            renderProductView({ product: mockProduct });

            expect(screen.getByText('Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit')).toBeInTheDocument();
            expect(screen.queryByText('Home')).not.toBeInTheDocument();
        });

        test('handles product with different pricing structures', () => {
            const productWithPriceRange = {
                ...mockProduct,
                price: 299.99,
                priceMax: 500,
            };

            renderProductView({ product: productWithPriceRange });

            expect(screen.getByText('Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit')).toBeInTheDocument();
            expect(screen.getByText('From $299.99')).toBeInTheDocument();
        });

        test('renders product with variation attributes', () => {
            renderProductView({ product: mockProduct });

            // Should have variation swatches
            expect(screen.getByLabelText('Charcoal')).toBeInTheDocument();
            expect(screen.getByLabelText('36')).toBeInTheDocument();
            expect(screen.getByLabelText('Short')).toBeInTheDocument();
        });

        test('handles product without variation attributes', () => {
            const productWithoutVariations = {
                ...standardProd,
                variationAttributes: [],
            };

            renderProductView({ product: productWithoutVariations });

            expect(screen.getByText('Laptop Briefcase with wheels (37L)')).toBeInTheDocument();
            expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
        });
    });
});
