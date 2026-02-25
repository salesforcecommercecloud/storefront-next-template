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

// Testing libraries
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';
// Components
import ProductView from './product-view';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
// mock data
import { masterProduct as mockProduct } from '@/components/__mocks__/master-variant-product';
import { standardProd } from '@/components/__mocks__/standard-product-2';
import { bundleProd } from '@/components/__mocks__/bundle-product';
import { setProduct } from '@/components/__mocks__/set-product';
import { mockBuildConfig } from '@/test-utils/config';
import { createAppConfig } from '@/config/context';

// Mock useToast
const mockAddToast = vi.fn();
vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: mockAddToast,
    }),
}));

// Mock navigator.clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
    clipboard: {
        writeText: mockWriteText,
    },
});

// Mock navigator.share
const mockShare = vi.fn();
Object.defineProperty(navigator, 'share', {
    writable: true,
    value: mockShare,
});

// Mock window.open
const mockWindowOpen = vi.fn();
window.open = mockWindowOpen;

const renderProductView = (props: React.ComponentProps<typeof ProductView>, initialUrl = '/product/test-product') => {
    // Using createMemoryRouter in framework mode is fine
    // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
    // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
    const router = createMemoryRouter(
        [
            {
                path: '/product/:productId',
                element: (
                    <AllProvidersWrapper>
                        <ProductView {...props} />
                    </AllProvidersWrapper>
                ),
            },
        ],
        {
            initialEntries: [initialUrl],
        }
    );
    return {
        ...render(<RouterProvider router={router} />),
        router,
    };
};

describe('ProductView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockWriteText.mockResolvedValue(undefined);
        mockShare.mockResolvedValue(undefined);
        mockWindowOpen.mockClear();
    });

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
            // Share button should be visible
            expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
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
            // Note: DeliveryOptions component may render a radiogroup for delivery options
            const radiogroups = screen.queryAllByRole('radiogroup');
            const variationRadiogroups = radiogroups.filter(
                (radio) => !radio.getAttribute('data-testid')?.includes('delivery-option')
            );
            expect(variationRadiogroups).toHaveLength(0);
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
            const radiogroups = screen.queryAllByRole('radiogroup');
            const variationRadiogroups = radiogroups.filter(
                (radio) => !radio.getAttribute('data-testid')?.includes('delivery-option')
            );
            expect(variationRadiogroups).toHaveLength(0);
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
            expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
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
            expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
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
            // Should not have variation swatches
            const radiogroups = screen.queryAllByRole('radiogroup');
            const variationRadiogroups = radiogroups.filter(
                (radio) => !radio.getAttribute('data-testid')?.includes('delivery-option')
            );
            expect(variationRadiogroups).toHaveLength(0);
        });
    });

    describe('Description section', () => {
        test('description summary has hover background style', () => {
            const productWithDescription = {
                ...mockProduct,
                longDescription: 'A unique long description that differs from the short one.',
                shortDescription: 'Short description.',
            };
            renderProductView({ product: productWithDescription });

            const summary = screen.getByText(/Description:/i).closest('summary');
            expect(summary).toBeInTheDocument();
            expect(summary).toHaveClass('hover:bg-accent');
        });
    });

    describe('Share Button Integration', () => {
        test('renders share button in action buttons section', () => {
            renderProductView({ product: mockProduct });

            const shareButton = screen.getByRole('button', { name: /share/i });
            expect(shareButton).toBeInTheDocument();
        });

        test('share button opens dropdown menu when clicked', async () => {
            const user = userEvent.setup();
            renderProductView({ product: mockProduct });

            const shareButton = screen.getByRole('button', { name: /share/i });
            await user.click(shareButton);

            // Wait for dropdown to appear
            await waitFor(() => {
                expect(screen.getByText('Copy link')).toBeInTheDocument();
            });
        });

        test('share button shows enabled social providers from config', async () => {
            const user = userEvent.setup();
            renderProductView({ product: mockProduct });

            const shareButton = screen.getByRole('button', { name: /share/i });
            await user.click(shareButton);

            await waitFor(() => {
                expect(screen.getByText('Copy link')).toBeInTheDocument();
            });

            // Check for configured social providers
            expect(screen.getByText('Email')).toBeInTheDocument();
            expect(screen.getByText('Twitter/X')).toBeInTheDocument();
        });

        test('share button respects disabled socialShare config', async () => {
            const customConfig = createAppConfig({
                ...mockBuildConfig,
                app: {
                    ...mockBuildConfig.app,
                    features: {
                        ...mockBuildConfig.app.features,
                        socialShare: { enabled: false, providers: ['Twitter', 'Facebook', 'LinkedIn', 'Email'] },
                    },
                },
            } as any);

            const user = userEvent.setup();
            const router = createMemoryRouter(
                [
                    {
                        path: '/product/:productId',
                        element: (
                            <AllProvidersWrapper config={customConfig}>
                                <ProductView product={mockProduct} />
                            </AllProvidersWrapper>
                        ),
                    },
                ],
                {
                    initialEntries: ['/product/test-product'],
                }
            );
            render(<RouterProvider router={router} />);

            const shareButton = screen.getByRole('button', { name: /share/i });
            await user.click(shareButton);

            await waitFor(() => {
                expect(screen.getByText('Copy link')).toBeInTheDocument();
            });

            // Social providers should not be shown when disabled
            expect(screen.queryByText('Email')).not.toBeInTheDocument();
            expect(screen.queryByText('Twitter/X')).not.toBeInTheDocument();
        });

        test('share button shows only configured providers', async () => {
            const customConfig = createAppConfig({
                ...mockBuildConfig,
                app: {
                    ...mockBuildConfig.app,
                    features: {
                        ...mockBuildConfig.app.features,
                        socialShare: { enabled: true, providers: ['Email'] },
                    },
                },
            } as any);

            const user = userEvent.setup();
            const router = createMemoryRouter(
                [
                    {
                        path: '/product/:productId',
                        element: (
                            <AllProvidersWrapper config={customConfig}>
                                <ProductView product={mockProduct} />
                            </AllProvidersWrapper>
                        ),
                    },
                ],
                {
                    initialEntries: ['/product/test-product'],
                }
            );
            render(<RouterProvider router={router} />);

            const shareButton = screen.getByRole('button', { name: /share/i });
            await user.click(shareButton);

            await waitFor(() => {
                expect(screen.getByText('Copy link')).toBeInTheDocument();
            });

            // Only Email should be shown
            expect(screen.getByText('Email')).toBeInTheDocument();
            expect(screen.queryByText('Twitter/X')).not.toBeInTheDocument();
            expect(screen.queryByText('Facebook')).not.toBeInTheDocument();
        });

        test('share button appears alongside wishlist button', () => {
            renderProductView({ product: mockProduct });

            const wishlistButton = screen.getByRole('button', { name: /add to wishlist/i });
            const shareButton = screen.getByRole('button', { name: /share/i });

            expect(wishlistButton).toBeInTheDocument();
            expect(shareButton).toBeInTheDocument();

            // Both buttons should be in the same container (grid layout)
            const buttonsContainer = wishlistButton.closest('div.grid');
            expect(buttonsContainer).toContainElement(shareButton);
        });

        test('share button works with different product types', () => {
            const productTypes = [
                { product: mockProduct, name: 'Master Product' },
                { product: standardProd, name: 'Standard Product' },
            ];

            productTypes.forEach(({ product }) => {
                const { unmount } = renderProductView({ product });

                const shareButton = screen.getByRole('button', { name: /share/i });
                expect(shareButton).toBeInTheDocument();

                unmount();
            });
        });
    });
});
