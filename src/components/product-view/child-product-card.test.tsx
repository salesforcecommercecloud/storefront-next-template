/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { type ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import ChildProductCard from './child-product-card';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';

vi.mock('@/hooks/product/use-current-variant', () => ({
    useCurrentVariant: () => null,
}));

vi.mock('@/hooks/product/use-selected-variations', () => ({
    useSelectedVariations: () => ({}),
}));

vi.mock('@/hooks/product/use-product-images', () => ({
    useProductImages: () => ({
        galleryImages: [],
    }),
}));

vi.mock('@/hooks/product/use-product-actions', () => ({
    useProductActions: () => ({
        isAddingToOrUpdatingCart: false,
        canAddToCart: true,
        stockLevel: 10,
        isOutOfStock: false,
        handleAddToCart: vi.fn(),
        quantity: 1,
        setQuantity: vi.fn(),
    }),
}));

vi.mock('@/hooks/product/use-variation-attributes', () => ({
    useVariationAttributes: () => [],
}));

const createStandardProduct = (): ShopperProductsTypes.Product => ({
    id: 'standard-123',
    name: 'Standard Product',
    type: { item: true },
    inventory: {
        ats: 10,
        orderable: true,
    },
});

const createVariantProduct = (): ShopperProductsTypes.Product => ({
    id: 'variant-123',
    name: 'Variant Product',
    type: { variant: true },
    inventory: {
        ats: 10,
        orderable: true,
    },
});

const createSetProduct = (): ShopperProductsTypes.Product => ({
    id: 'set-123',
    name: 'Set Product',
    type: { set: true },
});

const renderChildProductCard = (props: ComponentProps<typeof ChildProductCard>) => {
    const router = createMemoryRouter(
        [
            {
                path: '/product/:productId',
                element: <ChildProductCard {...props} />,
            },
        ],
        {
            initialEntries: ['/product/parent-123'],
        }
    );
    return { ...render(<RouterProvider router={router} />), router };
};

describe('ChildProductCard', () => {
    const mockOnSelectionChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('standard products', () => {
        test('auto-selects standard products on mount', () => {
            const standardProduct = createStandardProduct();
            const parentProduct = createSetProduct();

            renderChildProductCard({
                childProduct: standardProduct,
                parentProduct,
                onSelectionChange: mockOnSelectionChange,
            });

            // Standard product should be auto-selected
            expect(mockOnSelectionChange).toHaveBeenCalledWith('standard-123', {
                product: standardProduct,
                quantity: 1,
            });
        });

        test('displays selected status for standard products', () => {
            const standardProduct = createStandardProduct();
            const parentProduct = createSetProduct();

            renderChildProductCard({
                childProduct: standardProduct,
                parentProduct,
                onSelectionChange: mockOnSelectionChange,
            });

            expect(screen.getByText(/selected/i)).toBeInTheDocument();
        });

        test('does not require variant selection for standard products', () => {
            const standardProduct = createStandardProduct();
            const parentProduct = createSetProduct();

            renderChildProductCard({
                childProduct: standardProduct,
                parentProduct,
                onSelectionChange: mockOnSelectionChange,
            });

            // Should not show "Select options above" message
            expect(screen.queryByText(/select options above/i)).not.toBeInTheDocument();
        });

        test('renders image gallery when images exist', async () => {
            const imagesModule = await import('@/hooks/product/use-product-images');
            vi.spyOn(imagesModule, 'useProductImages').mockReturnValue({
                galleryImages: [
                    {
                        src: 'https://example.com/primary.jpg',
                        alt: 'Primary image',
                        thumbSrc: 'https://example.com/primary.jpg',
                    },
                ],
            } as never);

            const standardProduct = createStandardProduct();
            const parentProduct = createSetProduct();

            renderChildProductCard({
                childProduct: standardProduct,
                parentProduct,
                onSelectionChange: mockOnSelectionChange,
            });

            expect(screen.queryByText(/no image available/i)).not.toBeInTheDocument();
        });
    });

    describe('variant products', () => {
        test('does not auto-select variant products', () => {
            const variantProduct = createVariantProduct();
            const parentProduct = createSetProduct();

            renderChildProductCard({
                childProduct: variantProduct,
                parentProduct,
                onSelectionChange: mockOnSelectionChange,
            });

            // Variant products should not be auto-selected
            expect(mockOnSelectionChange).not.toHaveBeenCalled();
        });

        test('displays selection prompt for variant products', () => {
            const variantProduct = createVariantProduct();
            const parentProduct = createSetProduct();

            renderChildProductCard({
                childProduct: variantProduct,
                parentProduct,
                onSelectionChange: mockOnSelectionChange,
            });

            expect(screen.getByText(/select options above/i)).toBeInTheDocument();
        });
    });

    describe('product set behavior', () => {
        test('shows quantity picker for set products', () => {
            const standardProduct = createStandardProduct();
            const parentProduct = createSetProduct();

            renderChildProductCard({
                childProduct: standardProduct,
                parentProduct,
                onSelectionChange: mockOnSelectionChange,
            });

            // Set products should have quantity pickers
            expect(screen.getByRole('spinbutton')).toBeInTheDocument();
        });

        test('shows individual add to cart button for set products', () => {
            const standardProduct = createStandardProduct();
            const parentProduct = createSetProduct();

            renderChildProductCard({
                childProduct: standardProduct,
                parentProduct,
                onSelectionChange: mockOnSelectionChange,
            });

            expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
        });
    });

    describe('product bundle behavior', () => {
        test('does not show quantity picker for bundle products', () => {
            const standardProduct = createStandardProduct();
            const parentProduct: ShopperProductsTypes.Product = {
                id: 'bundle-123',
                name: 'Bundle Product',
                type: { bundle: true },
            };

            renderChildProductCard({
                childProduct: standardProduct,
                parentProduct,
                onSelectionChange: mockOnSelectionChange,
            });

            // Bundle products should not have individual quantity pickers
            expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
        });

        test('does not show individual add to cart button for bundle products', () => {
            const standardProduct = createStandardProduct();
            const parentProduct: ShopperProductsTypes.Product = {
                id: 'bundle-123',
                name: 'Bundle Product',
                type: { bundle: true },
            };

            renderChildProductCard({
                childProduct: standardProduct,
                parentProduct,
                onSelectionChange: mockOnSelectionChange,
            });

            expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
        });
    });

    describe('variant products', () => {
        test('notifies parent when a variant is selected', async () => {
            const variantModule = await import('@/hooks/product/use-current-variant');
            vi.spyOn(variantModule, 'useCurrentVariant').mockReturnValue({
                productId: 'variant-456',
                inventory: { ats: 5 },
            } as never);

            const variantProduct = createVariantProduct();
            const parentProduct = createSetProduct();

            renderChildProductCard({
                childProduct: variantProduct,
                parentProduct,
                onSelectionChange: mockOnSelectionChange,
            });

            expect(mockOnSelectionChange).toHaveBeenCalledWith(
                'variant-123',
                expect.objectContaining({
                    product: variantProduct,
                    variant: expect.objectContaining({ productId: 'variant-456' }),
                    quantity: 1,
                })
            );
        });
    });

    describe('cart interactions', () => {
        test('disables add to cart when out of stock', async () => {
            const actionsModule = await import('@/hooks/product/use-product-actions');
            vi.spyOn(actionsModule, 'useProductActions').mockReturnValue({
                isAddingToOrUpdatingCart: false,
                canAddToCart: false,
                stockLevel: 0,
                isOutOfStock: true,
                handleAddToCart: vi.fn(),
                quantity: 1,
                setQuantity: vi.fn(),
            } as never);

            const standardProduct = createStandardProduct();
            const parentProduct = createSetProduct();

            renderChildProductCard({
                childProduct: standardProduct,
                parentProduct,
                onSelectionChange: mockOnSelectionChange,
            });

            const btn = screen.getByRole('button', { name: /add to cart/i });
            expect(btn).toBeDisabled();
        });
    });

    // (moved tests into appropriate groups below)
});
