/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Testing libraries
import { render, screen } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
// Commerce SDK
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
// React Router
import { createRoutesStub } from 'react-router';
// Components
import uiStrings from '@/temp-ui-string';
import ProductInfo from './product-info';

const renderProductInfo = (props: React.ComponentProps<typeof ProductInfo>) => {
    const Stub = createRoutesStub([
        {
            path: '/product/:productId',
            Component: () => <ProductInfo {...props} />,
        },
    ]);
    return render(<Stub initialEntries={['/product/test-product']} />);
};

describe('ProductInfo', () => {
    const mockProduct: ShopperProductsTypes.Product = {
        id: 'test-product',
        name: 'Test Product',
        shortDescription: 'Test product description',
        price: 99.99,
        priceMax: 149.99,
        inventory: { ats: 10, orderable: true, id: 'test-inventory' },
        variationAttributes: [
            {
                id: 'color',
                name: 'Color',
                values: [
                    { value: 'red', name: 'Red', orderable: true },
                    { value: 'blue', name: 'Blue', orderable: true },
                ],
            },
            {
                id: 'size',
                name: 'Size',
                values: [
                    { value: 'S', name: 'Small', orderable: true },
                    { value: 'M', name: 'Medium', orderable: true },
                ],
            },
        ],
        imageGroups: [
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
            {
                viewType: 'swatch',
                variationAttributes: [
                    {
                        id: 'color',
                        values: [{ value: 'blue', name: 'Blue' }],
                    },
                ],
                images: [
                    {
                        link: 'https://example.com/blue-swatch.jpg',
                        disBaseLink: 'https://example.com/blue-swatch.jpg',
                        alt: 'Blue swatch',
                    },
                ],
            },
        ],
    };

    describe('basic rendering', () => {
        test('should render product name and description on desktop', () => {
            renderProductInfo({ product: mockProduct });

            expect(screen.getByText('Test Product')).toBeInTheDocument();
            expect(screen.getByText('Test product description')).toBeInTheDocument();
        });

        test('should render price information', () => {
            renderProductInfo({ product: mockProduct });

            expect(screen.getByText('From $99.99')).toBeInTheDocument();
        });

        test('should render price range when priceMax is higher', () => {
            renderProductInfo({ product: mockProduct });

            expect(screen.getByText('From $99.99')).toBeInTheDocument();
            expect(screen.getByText('$149.99')).toBeInTheDocument();
        });

        test('should render single price when priceMax equals price', () => {
            const productSinglePrice = { ...mockProduct, priceMax: 99.99 };
            renderProductInfo({ product: productSinglePrice });

            expect(screen.queryByText(uiStrings.product.from)).not.toBeInTheDocument();
            expect(screen.getByText(`$99.99`)).toBeInTheDocument();
        });
    });

    describe('variant selection', () => {
        test('should render color label when color variation exists', () => {
            renderProductInfo({ product: mockProduct });

            // The component shows "Color: [SelectedColorName]" - Red is selected by default
            // Use flexible text matching for the color attribute name and value
            expect(screen.getByText(new RegExp('Color'))).toBeInTheDocument();
        });

        test('should render variant selector for non-color attributes', () => {
            renderProductInfo({ product: mockProduct });

            expect(screen.getByText(new RegExp('Size'))).toBeInTheDocument();
        });

        test('should generate correct URLs for swatch selection', () => {
            renderProductInfo({ product: mockProduct });

            // Find color swatches and verify their URLs contain the correct search params
            const redSwatch = screen.getByLabelText('Red');
            expect(redSwatch).toBeInTheDocument();
            expect(redSwatch).toHaveAttribute('href', '/product/test-product?color=red');

            const blueSwatch = screen.getByLabelText('Blue');
            expect(blueSwatch).toBeInTheDocument();
            expect(blueSwatch).toHaveAttribute('href', '/product/test-product?color=blue');

            // Find size swatches and verify their URLs contain the correct search params
            const smallSwatch = screen.getByLabelText('Small');
            expect(smallSwatch).toBeInTheDocument();
            expect(smallSwatch).toHaveAttribute('href', '/product/test-product?size=S');

            const mediumSwatch = screen.getByLabelText('Medium');
            expect(mediumSwatch).toBeInTheDocument();
            expect(mediumSwatch).toHaveAttribute('href', '/product/test-product?size=M');
        });
    });

    describe('inventory and stock handling', () => {
        test('should show out of stock message when inventory is zero', () => {
            const outOfStockProduct = {
                ...mockProduct,
                inventory: { ats: 0, orderable: false, id: 'test-inventory' },
            };

            renderProductInfo({ product: outOfStockProduct });

            expect(
                screen.getByText(uiStrings.product.outOfStock.replace('{productName}', 'Test Product'))
            ).toBeInTheDocument();
        });

        test('should render properly with low stock inventory', () => {
            const lowStockProduct = {
                ...mockProduct,
                inventory: { ats: 2, orderable: true, id: 'test-inventory' },
                variationAttributes: [], // Remove variants to simplify
            };

            renderProductInfo({ product: lowStockProduct });

            // Should still render basic elements
            expect(screen.getByText('Test Product')).toBeInTheDocument();
            expect(screen.getByText(uiStrings.product.addToCart)).toBeInTheDocument();
        });

        test('should show variant selection message when variants not fully selected', () => {
            renderProductInfo({ product: mockProduct });

            // Without selecting variants, the message should appear
            expect(screen.getByText(uiStrings.product.selectAllOptions)).toBeInTheDocument();
        });

        test('should display in-stock inventory message when product has stock', () => {
            const inStockProduct = {
                ...mockProduct,
                inventory: {
                    ats: 10,
                    orderable: true,
                    id: 'test-inventory',
                    backorderable: false,
                    preorderable: false,
                },
                variationAttributes: [],
            };

            renderProductInfo({ product: inStockProduct });

            expect(screen.getByText(uiStrings.product.inStock)).toBeInTheDocument();
        });

        test('should display pre-order inventory message when product is preorderable', () => {
            const preOrderProduct = {
                ...mockProduct,
                inventory: {
                    ats: 0,
                    orderable: true,
                    id: 'test-inventory',
                    preorderable: true,
                    backorderable: false,
                },
                variationAttributes: [],
            };

            renderProductInfo({ product: preOrderProduct });

            expect(screen.getByText(uiStrings.product.preOrder)).toBeInTheDocument();
        });

        test('should display back-order inventory message when product is backorderable', () => {
            const backOrderProduct = {
                ...mockProduct,
                inventory: {
                    ats: 0,
                    orderable: true,
                    id: 'test-inventory',
                    backorderable: true,
                    preorderable: false,
                },
                variationAttributes: [],
            };

            renderProductInfo({ product: backOrderProduct });

            expect(screen.getByText(uiStrings.product.backOrder)).toBeInTheDocument();
        });

        test('should display out-of-stock inventory message when product is not orderable', () => {
            const outOfStockProduct = {
                ...mockProduct,
                inventory: {
                    ats: 0,
                    orderable: false,
                    id: 'test-inventory',
                    backorderable: false,
                    preorderable: false,
                },
                variationAttributes: [],
            };

            renderProductInfo({ product: outOfStockProduct });

            expect(screen.getByText(uiStrings.product.outOfStockLabel)).toBeInTheDocument();
        });
    });

    describe('quantity selector', () => {
        test('should render quantity selector elements', () => {
            const simpleProduct = {
                ...mockProduct,
                variationAttributes: [], // No variants to simplify
            };

            renderProductInfo({ product: simpleProduct });

            expect(screen.getByLabelText(uiStrings.quantitySelector.quantity)).toBeInTheDocument();
            expect(
                screen.getByLabelText(
                    uiStrings.quantitySelector.decreaseQuantityForProduct.replace('{productName}', 'Test Product')
                )
            ).toBeInTheDocument();
            expect(
                screen.getByLabelText(
                    uiStrings.quantitySelector.increaseQuantityForProduct.replace('{productName}', 'Test Product')
                )
            ).toBeInTheDocument();
        });

        test('should not render quantity selector for product sets', () => {
            const productSet = { ...mockProduct, type: { set: true } };
            renderProductInfo({ product: productSet });

            expect(screen.queryByLabelText(uiStrings.quantitySelector.quantity)).not.toBeInTheDocument();
        });

        test('should not render quantity selector for product bundles', () => {
            const productBundle = { ...mockProduct, type: { bundle: true } };
            renderProductInfo({ product: productBundle });

            expect(screen.queryByLabelText(uiStrings.quantitySelector.quantity)).not.toBeInTheDocument();
        });
    });

    describe('action buttons', () => {
        test('should render add to cart and wishlist buttons', () => {
            renderProductInfo({ product: mockProduct });

            expect(screen.getByText(uiStrings.product.addToCart)).toBeInTheDocument();
            expect(screen.getByText(uiStrings.product.addToWishlist)).toBeInTheDocument();
        });

        test('should disable add to cart when variants not selected', () => {
            renderProductInfo({ product: mockProduct });

            const addToCartButton = screen.getByText(uiStrings.product.addToCart);
            expect(addToCartButton).toBeDisabled();
        });

        test('should enable add to cart for simple product', () => {
            const simpleProduct = {
                ...mockProduct,
                variationAttributes: [], // No variants
            };

            renderProductInfo({ product: simpleProduct });

            const addToCartButton = screen.getByText(uiStrings.product.addToCart);
            expect(addToCartButton).not.toBeDisabled();

            // Should be clickable (we can't test the actual cart submission in isolation)
            expect(addToCartButton).toBeInTheDocument();
        });

        test('should disable add to cart button when out of stock', () => {
            const outOfStockProduct = {
                ...mockProduct,
                inventory: { ats: 0, orderable: false, id: 'test-inventory' },
                variationAttributes: [], // No variants to simplify
            };

            renderProductInfo({ product: outOfStockProduct });

            const addToCartButton = screen.getByText(uiStrings.product.addToCart);
            expect(addToCartButton).toBeDisabled();
        });
    });

    describe('edge cases', () => {
        test('should handle standard product without variation attributes', () => {
            const standardProduct = { ...mockProduct, variationAttributes: undefined };
            renderProductInfo({ product: standardProduct });

            // Should not show any variation attribute names since there are none
            expect(screen.queryByText(/Color/)).not.toBeInTheDocument();
            expect(screen.queryByText(/Size/)).not.toBeInTheDocument();
        });

        test('should handle product with empty imageGroups', () => {
            const productWithoutImages = { ...mockProduct, imageGroups: [] };
            renderProductInfo({ product: productWithoutImages });

            // Should still render the product name and price
            expect(screen.getByText('Test Product')).toBeInTheDocument();
            expect(screen.getByText('From $99.99')).toBeInTheDocument();
        });
    });
});
