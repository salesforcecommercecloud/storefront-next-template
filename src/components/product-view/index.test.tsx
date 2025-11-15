/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Testing libraries
import { render, screen } from '@testing-library/react';
import { vi, test, beforeEach } from 'vitest';
// Commerce SDK
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';
// Components
import ProductView from './index';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import { createConfigWrapper } from '@/test-utils/config';

// Create a wrapper with default config
const defaultConfigWrapper = createConfigWrapper({
    app: {
        site: {
            locale: 'en-US',
            currency: 'USD',
            features: {
                passwordlessLogin: {
                    enabled: false,
                    callbackUri: '/passwordless-login-callback',
                    landingUri: '/passwordless-login-landing',
                },
                socialLogin: { enabled: true, providers: ['Apple', 'Google'] },
                socialShare: { enabled: true, providers: ['Twitter', 'Facebook', 'LinkedIn', 'Email'] },
                guestCheckout: true,
            },
        },
    },
} as any);

const renderProductView = (props: React.ComponentProps<typeof ProductView>) => {
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
        { initialEntries: ['/product/test-product'] }
    );
    return render(<RouterProvider router={router} />, { wrapper: defaultConfigWrapper });
};

describe('ProductView', () => {
    const mockProduct: ShopperProducts.schemas['Product'] = {
        id: 'test-product',
        name: 'Test Product',
        shortDescription: 'Test product description',
        price: 99.99,
        type: { item: true },
        imageGroups: [
            {
                viewType: 'large',
                images: [
                    {
                        link: 'https://example.com/image1.jpg',
                        disBaseLink: 'https://example.com/image1.jpg',
                        alt: 'Image 1',
                    },
                    {
                        link: 'https://example.com/image2.jpg',
                        disBaseLink: 'https://example.com/image2.jpg',
                        alt: 'Image 2',
                    },
                ],
            },
            {
                viewType: 'swatch',
                variationAttributes: [
                    {
                        id: 'color',
                        values: [{ value: 'red', name: 'Red' }],
                    },
                ],
                images: [
                    {
                        link: 'https://example.com/red-swatch.jpg',
                        disBaseLink: 'https://example.com/red-swatch.jpg',
                        alt: 'Red swatch',
                    },
                ],
            },
        ],
    };

    const mockCategory: ShopperProducts.schemas['Category'] = {
        id: 'test-category',
        name: 'Test Category',
        parentCategoryTree: [
            { id: 'root', name: 'Root' },
            { id: 'parent', name: 'Parent Category' },
        ],
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('regular product rendering', () => {
        test('should render regular product with image gallery and product info', () => {
            renderProductView({ product: mockProduct, category: mockCategory });

            // Check that regular product components are rendered
            // ImageGallery: Should have images displayed
            const images = screen.getAllByRole('img');
            expect(images.length).toBeGreaterThan(0);

            // ProductInfo: Should show product name and price
            expect(screen.getByText('Test Product')).toBeInTheDocument();
            expect(screen.getByText(`$99.99`)).toBeInTheDocument();
        });

        test('should render breadcrumbs when category with parent tree is provided', () => {
            renderProductView({ product: mockProduct, category: mockCategory });

            // Look for breadcrumb text content (path TO current category, not including it)
            expect(screen.getByText('Root')).toBeInTheDocument();
            expect(screen.getByText('Parent Category')).toBeInTheDocument();
        });

        test('should not render breadcrumbs when category has no parent tree', () => {
            const categoryWithoutParents = { ...mockCategory, parentCategoryTree: [] };
            renderProductView({ product: mockProduct, category: categoryWithoutParents });

            // Should not render breadcrumb content
            expect(screen.queryByText('Root')).not.toBeInTheDocument();
            expect(screen.queryByText('Parent Category')).not.toBeInTheDocument();
        });

        test('should not render breadcrumbs when no category is provided', () => {
            renderProductView({ product: mockProduct, category: undefined });

            // Should not render breadcrumb content
            expect(screen.queryByText('Root')).not.toBeInTheDocument();
            expect(screen.queryByText('Parent Category')).not.toBeInTheDocument();
        });

        test('should pass correct props to ProductInfo', () => {
            renderProductView({ product: mockProduct, category: mockCategory });

            // Check that ProductInfo is rendered with correct product data
            expect(screen.getByText('Test Product')).toBeInTheDocument();
            expect(screen.getByText('Test product description')).toBeInTheDocument();

            // Check that it's rendering as a regular product (has product info elements)
            expect(screen.getByText(`$99.99`)).toBeInTheDocument();
        });

        test('should pass gallery images to ImageGallery', () => {
            renderProductView({ product: mockProduct, category: mockCategory });

            // Check that images are rendered
            const images = screen.getAllByRole('img');
            expect(images.length).toBeGreaterThan(0);

            // Check for specific image alt text (using getAllBy since images appear in main + thumbnails)
            expect(screen.getAllByAltText('Image 1').length).toBeGreaterThan(0);
            expect(screen.getAllByAltText('Image 2').length).toBeGreaterThan(0);
        });
    });

    describe('product type detection', () => {
        test('should handle product without type property', () => {
            const productWithoutType = { ...mockProduct, type: undefined };
            renderProductView({ product: productWithoutType, category: mockCategory });

            // Should render as regular product with image gallery and product info
            const images = screen.getAllByRole('img');
            expect(images.length).toBeGreaterThan(0);
            expect(screen.getByText('Test Product')).toBeInTheDocument();
            expect(screen.getByText(`$99.99`)).toBeInTheDocument();
        });

        test('should handle product with empty type object', () => {
            const productWithEmptyType = { ...mockProduct, type: {} };
            renderProductView({ product: productWithEmptyType, category: mockCategory });

            // Should render as regular product with image gallery and product info
            const images = screen.getAllByRole('img');
            expect(images.length).toBeGreaterThan(0);
            expect(screen.getByText('Test Product')).toBeInTheDocument();
            expect(screen.getByText(`$99.99`)).toBeInTheDocument();
        });

        test('should handle product with type containing false values', () => {
            const productWithFalseTypes = {
                ...mockProduct,
                type: { set: false, bundle: false, item: true },
            };
            renderProductView({ product: productWithFalseTypes, category: mockCategory });

            // Should render as regular product with image gallery and product info
            const images = screen.getAllByRole('img');
            expect(images.length).toBeGreaterThan(0);
            expect(screen.getByText('Test Product')).toBeInTheDocument();
            expect(screen.getByText(`$99.99`)).toBeInTheDocument();
        });
    });
});
