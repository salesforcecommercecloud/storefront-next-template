/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { render, screen } from '@testing-library/react';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import { vi } from 'vitest';
import InventoryMessage from './index';

describe('InventoryMessage', () => {
    const baseProduct: ShopperProductsTypes.Product = {
        id: 'test-product',
        name: 'Test Product',
        price: 99.99,
        inventory: {
            id: 'test-inventory',
            ats: 10,
            orderable: true,
            backorderable: false,
            preorderable: false,
        },
    };

    it('renders in-stock message when product has stock', () => {
        render(<InventoryMessage product={baseProduct} />);

        expect(screen.getByText('In stock')).toBeInTheDocument();
    });

    it('renders pre-order message when product is preorderable', () => {
        const preOrderProduct = {
            ...baseProduct,
            inventory: {
                id: 'test-inventory',
                ...baseProduct.inventory,
                preorderable: true,
                ats: 0,
            },
        };

        render(<InventoryMessage product={preOrderProduct} />);

        expect(screen.getByText('Available for pre-order')).toBeInTheDocument();
    });

    it('renders back-order message when product is backorderable', () => {
        const backOrderProduct = {
            ...baseProduct,
            inventory: {
                id: 'test-inventory',
                ...baseProduct.inventory,
                backorderable: true,
                ats: 0,
            },
        };

        render(<InventoryMessage product={backOrderProduct} />);

        expect(screen.getByText('Available for back order')).toBeInTheDocument();
    });

    it('renders out-of-stock message when product is not orderable', () => {
        const outOfStockProduct = {
            ...baseProduct,
            inventory: {
                id: 'test-inventory',
                ...baseProduct.inventory,
                orderable: false,
                ats: 0,
            },
        };

        render(<InventoryMessage product={outOfStockProduct} />);

        expect(screen.getByText('Out of stock')).toBeInTheDocument();
    });

    it('renders out-of-stock message when product has no stock and is not backorderable', () => {
        const outOfStockProduct = {
            ...baseProduct,
            inventory: {
                id: 'test-inventory',
                ...baseProduct.inventory,
                ats: 0,
                backorderable: false,
            },
        };

        render(<InventoryMessage product={outOfStockProduct} />);

        expect(screen.getByText('Out of stock')).toBeInTheDocument();
    });

    it('uses variant inventory when currentVariant is provided', () => {
        const variant: ShopperProductsTypes.Variant = {
            productId: 'test-product',
            variationValues: {},
            inventory: {
                id: 'variant-inventory',
                ats: 0,
                orderable: true,
                backorderable: true,
                preorderable: false,
            },
        };

        render(<InventoryMessage product={baseProduct} currentVariant={variant} />);

        expect(screen.getByText('Available for back order')).toBeInTheDocument();
    });

    it('renders hidden element when no inventory data is available (unknown status hidden by default)', () => {
        const productWithoutInventory = {
            ...baseProduct,
            inventory: undefined,
        };

        const { container } = render(<InventoryMessage product={productWithoutInventory} />);

        // The element exists but the text should not be visible to screen readers
        expect(container.querySelector('div')).toBeInTheDocument();
        expect(container.querySelector('div')).toHaveAttribute('aria-hidden', 'true');
        // The text content exists but is visually hidden
        expect(container).toHaveTextContent('Inventory unavailable');
    });

    it('renders visible unknown status message when showUnknownStatus is true', () => {
        const productWithoutInventory = {
            ...baseProduct,
            inventory: undefined,
        };

        render(<InventoryMessage product={productWithoutInventory} showUnknownStatus={true} />);

        // The text should be visible and accessible
        expect(screen.getByText('Inventory unavailable')).toBeInTheDocument();
        // Should not have aria-hidden attribute
        expect(screen.getByText('Inventory unavailable')).not.toHaveAttribute('aria-hidden');
    });

    describe('custom getInventoryStatus function', () => {
        it('uses custom getInventoryStatus function when provided', () => {
            const customGetInventoryStatus = vi.fn().mockReturnValue('in-stock');

            render(<InventoryMessage product={baseProduct} getInventoryStatus={customGetInventoryStatus} />);

            expect(customGetInventoryStatus).toHaveBeenCalledWith(baseProduct, undefined);
            expect(screen.getByText('In stock')).toBeInTheDocument();
        });

        it('uses custom getInventoryStatus function with variant when provided', () => {
            const variant: ShopperProductsTypes.Variant = {
                productId: 'test-product',
                variationValues: {},
                inventory: {
                    id: 'variant-inventory',
                    ats: 0,
                    orderable: true,
                    backorderable: true,
                    preorderable: false,
                },
            };

            const customGetInventoryStatus = vi.fn().mockReturnValue('back-order');

            render(
                <InventoryMessage
                    product={baseProduct}
                    currentVariant={variant}
                    getInventoryStatus={customGetInventoryStatus}
                />
            );

            expect(customGetInventoryStatus).toHaveBeenCalledWith(baseProduct, variant);
            expect(screen.getByText('Available for back order')).toBeInTheDocument();
        });

        it('renders hidden unknown status when custom getInventoryStatus returns unknown', () => {
            const customGetInventoryStatus = vi.fn().mockReturnValue('unknown');

            const { container } = render(
                <InventoryMessage product={baseProduct} getInventoryStatus={customGetInventoryStatus} />
            );

            expect(customGetInventoryStatus).toHaveBeenCalledWith(baseProduct, undefined);

            // The element exists but is hidden from screen readers
            expect(container.querySelector('div')).toBeInTheDocument();
            expect(container.querySelector('div')).toHaveAttribute('aria-hidden', 'true');
            // The text content exists but is visually hidden
            expect(container).toHaveTextContent('Inventory unavailable');
        });

        it('renders visible unknown status when custom getInventoryStatus returns unknown and showUnknownStatus is true', () => {
            const customGetInventoryStatus = vi.fn().mockReturnValue('unknown');

            render(
                <InventoryMessage
                    product={baseProduct}
                    getInventoryStatus={customGetInventoryStatus}
                    showUnknownStatus={true}
                />
            );

            expect(customGetInventoryStatus).toHaveBeenCalledWith(baseProduct, undefined);
            // The text should be visible and accessible
            expect(screen.getByText('Inventory unavailable')).toBeInTheDocument();
            // Should not have aria-hidden attribute
            expect(screen.getByText('Inventory unavailable')).not.toHaveAttribute('aria-hidden');
        });

        it('falls back to default getInventoryStatus when custom function is not provided', () => {
            render(<InventoryMessage product={baseProduct} />);

            expect(screen.getByText('In stock')).toBeInTheDocument();
        });
    });
});
