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

import { render, screen } from '@testing-library/react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { vi } from 'vitest';
import InventoryMessage from './index';

describe('InventoryMessage', () => {
    const baseProduct: ShopperProducts.schemas['Product'] = {
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

    it('renders in-stock message with count when product has stock', () => {
        render(<InventoryMessage product={baseProduct} />);

        expect(screen.getByText('In Stock (10 units) ready to be shipped')).toBeInTheDocument();
    });

    it('renders in-stock message without count when ats is undefined', () => {
        const productNoAts = {
            ...baseProduct,
            inventory: {
                id: 'test-inventory',
                orderable: true,
                backorderable: false,
                preorderable: false,
            },
        };

        // ats is undefined so custom status is needed (default logic requires ats > 0 for in-stock)
        render(<InventoryMessage product={productNoAts} getInventoryStatus={() => 'in-stock'} />);

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
        const variant = {
            productId: 'test-product',
            variationValues: {},
            inventory: {
                id: 'variant-inventory',
                ats: 0,
                orderable: true,
                backorderable: true,
                preorderable: false,
            },
        } as unknown as ShopperProducts.schemas['Variant'];

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

    describe('low stock', () => {
        it('renders low-stock message when stock is at or below threshold', () => {
            const lowStockProduct = {
                ...baseProduct,
                inventory: {
                    id: 'test-inventory',
                    ats: 3,
                    orderable: true,
                    backorderable: false,
                    preorderable: false,
                },
            };

            render(<InventoryMessage product={lowStockProduct} lowStockThreshold={5} />);

            expect(screen.getByText('Low stock - Only 3 left')).toBeInTheDocument();
        });

        it('renders low-stock message at exact threshold', () => {
            const lowStockProduct = {
                ...baseProduct,
                inventory: {
                    id: 'test-inventory',
                    ats: 5,
                    orderable: true,
                    backorderable: false,
                    preorderable: false,
                },
            };

            render(<InventoryMessage product={lowStockProduct} lowStockThreshold={5} />);

            expect(screen.getByText('Low stock - Only 5 left')).toBeInTheDocument();
        });

        it('renders in-stock message when stock is above threshold', () => {
            render(<InventoryMessage product={baseProduct} lowStockThreshold={5} />);

            expect(screen.getByText('In Stock (10 units) ready to be shipped')).toBeInTheDocument();
        });

        it('does not show low-stock when threshold is 0 (default)', () => {
            const lowStockProduct = {
                ...baseProduct,
                inventory: {
                    id: 'test-inventory',
                    ats: 3,
                    orderable: true,
                    backorderable: false,
                    preorderable: false,
                },
            };

            render(<InventoryMessage product={lowStockProduct} />);

            expect(screen.getByText('In Stock (3 units) ready to be shipped')).toBeInTheDocument();
        });
    });

    describe('custom getInventoryStatus function', () => {
        it('uses custom getInventoryStatus function when provided', () => {
            const customGetInventoryStatus = vi.fn().mockReturnValue('in-stock');

            render(<InventoryMessage product={baseProduct} getInventoryStatus={customGetInventoryStatus} />);

            expect(customGetInventoryStatus).toHaveBeenCalledWith(baseProduct, undefined);
            expect(screen.getByText('In Stock (10 units) ready to be shipped')).toBeInTheDocument();
        });

        it('uses custom getInventoryStatus function with variant when provided', () => {
            const variant = {
                productId: 'test-product',
                variationValues: {},
                inventory: {
                    id: 'variant-inventory',
                    ats: 0,
                    orderable: true,
                    backorderable: true,
                    preorderable: false,
                },
            } as unknown as ShopperProducts.schemas['Variant'];

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

            expect(screen.getByText('In Stock (10 units) ready to be shipped')).toBeInTheDocument();
        });
    });
});
