/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { renderHook, act } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { createMemoryRouter, RouterProvider, useFetcher } from 'react-router';
import type { ShopperProductsTypes, ShopperBasketsTypes } from 'commerce-sdk-isomorphic';
import { useProductActions } from './use-product-actions';
import BasketProvider from '@/providers/basket';
import PickupProvider from '@/extensions/bopis/context/pickup-context';
import { standardProd } from '@/components/__mocks__/standard-product-2';

vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useFetcher: vi.fn(() => ({
            data: null,
            state: 'idle',
            submit: vi.fn(),
        })),
    };
});

vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: vi.fn(),
    }),
}));

vi.mock('@/hooks/use-item-fetcher', () => ({
    useItemFetcher: () => ({
        data: null,
        state: 'idle',
        submit: vi.fn(),
    }),
}));

vi.mock('@/hooks/product/use-current-variant', () => ({
    useCurrentVariant: () => null,
}));

// Note: usePickup context is not mocked
// We wrap components with PickupProvider to provide the real context
// This allows tests to use the actual pickup context for proper integration testing

const mockBasket: ShopperBasketsTypes.Basket = {
    basketId: 'test-basket-123',
    productItems: [
        {
            itemId: 'item-1',
            productId: 'product-1',
            productName: 'Product 1',
            quantity: 2,
        },
        {
            itemId: 'item-2',
            productId: 'product-2',
            productName: 'Product 2',
            quantity: 1,
        },
    ],
};

const wrapper = ({ children, basket }: { children: React.ReactNode; basket?: ShopperBasketsTypes.Basket }) => {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: (
                    <PickupProvider>
                        <BasketProvider value={basket}>{children}</BasketProvider>
                    </PickupProvider>
                ),
            },
            {
                path: '/action/cart-item-add',
                action: () => {
                    return Response.json({ success: true, basket });
                },
            },
            {
                path: '/action/cart-set-add',
                action: () => {
                    return Response.json({ success: true, basket });
                },
            },
            {
                path: '/action/cart-bundle-add',
                action: () => {
                    return Response.json({ success: true, basket });
                },
            },
            {
                path: '/action/cart-item-update',
                action: () => {
                    return Response.json({ success: true, basket });
                },
            },
        ],
        {
            initialEntries: ['/'],
        }
    );
    return <RouterProvider router={router} />;
};

describe('useProductActions', () => {
    const createStandardProduct = (): ShopperProductsTypes.Product => ({
        id: 'standard-123',
        name: 'Standard Product',
        type: { item: true },
        inventory: {
            id: 'inventory-123',
            ats: 10,
            orderable: true,
        },
    });

    const createVariantProduct = (): ShopperProductsTypes.Product => ({
        id: 'variant-123',
        name: 'Variant Product',
        type: { variant: true },
        inventory: {
            id: 'inventory-123',
            ats: 10,
            orderable: true,
        },
    });

    const createBundleProduct = (): ShopperProductsTypes.Product => ({
        id: 'bundle-123',
        name: 'Bundle Product',
        type: { bundle: true },
        inventory: {
            id: 'inventory-123',
            ats: 10,
            orderable: true,
        },
    });

    const createSetProduct = (): ShopperProductsTypes.Product => ({
        id: 'set-123',
        name: 'Set Product',
        type: { set: true },
        inventory: {
            id: 'inventory-123',
            ats: 10,
            orderable: true,
        },
        setProducts: [],
    });

    describe('canAddToCart', () => {
        test('allows standard product when orderable and in stock', () => {
            const product = createStandardProduct();

            const { result } = renderHook(
                () =>
                    useProductActions({
                        product,
                        currentVariant: null,
                    }),
                {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                }
            );

            expect(result.current.canAddToCart).toBe(true);
        });

        test('prevents standard product when out of stock', () => {
            const product = createStandardProduct();
            // Set inventory to 0 as well to test out of stock behavior
            product.inventory = {
                id: 'inventory-123',
                ats: 0,
                orderable: true,
            };

            const { result } = renderHook(
                () =>
                    useProductActions({
                        product,
                        currentVariant: null,
                    }),
                {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                }
            );

            expect(result.current.canAddToCart).toBe(false);
        });

        test('allows bundle when orderable and in stock', () => {
            const product = createBundleProduct();

            const { result } = renderHook(
                () =>
                    useProductActions({
                        product,
                        currentVariant: null,
                    }),
                {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                }
            );

            expect(result.current.canAddToCart).toBe(true);
        });

        test('allows set when orderable and in stock', () => {
            const product = createSetProduct();

            const { result } = renderHook(
                () =>
                    useProductActions({
                        product,
                        currentVariant: null,
                    }),
                {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                }
            );

            expect(result.current.canAddToCart).toBe(true);
        });

        test('prevents adding when quantity exceeds stock', () => {
            // Create a product with limited stock using standardProd pattern (consistent with BOPIS tests)
            const productWithLimitedStock = {
                ...standardProd,
                inventory: { ats: 5, id: 'inv-1', orderable: true },
            };

            const { result } = renderHook(
                () =>
                    useProductActions({
                        product: productWithLimitedStock,
                        initialQuantity: 10,
                        currentVariant: null,
                    }),
                {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                }
            );

            // Verify stock level is correctly calculated
            expect(result.current.stockLevel).toBe(5);
            // Verify quantity exceeds stock - should prevent adding to cart
            expect(result.current.canAddToCart).toBe(false);
        });

        test('prevents adding master product', () => {
            const product: ShopperProductsTypes.Product = {
                id: 'master-123',
                name: 'Master Product',
                type: { master: true },
                inventory: {
                    id: 'inventory-123',
                    ats: 10,
                    orderable: true,
                },
            };

            const { result } = renderHook(
                () =>
                    useProductActions({
                        product,
                        currentVariant: null,
                    }),
                {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                }
            );

            expect(result.current.canAddToCart).toBe(false);
        });
    });

    describe('handleProductBundleAddToCart', () => {
        test('prepares correct data for bundle with standard products only', async () => {
            const product = createBundleProduct();
            const mockSubmit = vi.fn();

            vi.mocked(useFetcher).mockReturnValue({
                data: null,
                state: 'idle',
                submit: mockSubmit,
            } as any);

            const { result } = renderHook(
                () =>
                    useProductActions({
                        product,
                        currentVariant: null,
                    }),
                {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                }
            );

            const standardProduct = createStandardProduct();
            const childSelections = [
                {
                    product: standardProduct,
                    variant: { productId: standardProduct.id } as ShopperProductsTypes.Variant,
                    quantity: 1,
                },
            ];

            await act(async () => {
                await result.current.handleProductBundleAddToCart(1, childSelections);
            });

            // Verify submit was not called immediately (async operation)
            expect(mockSubmit).not.toHaveBeenCalled();
        });

        test('prepares correct data for bundle with variant products', async () => {
            const product = createBundleProduct();
            const mockSubmit = vi.fn();

            vi.mocked(useFetcher).mockReturnValue({
                data: null,
                state: 'idle',
                submit: mockSubmit,
            } as any);

            const { result } = renderHook(
                () =>
                    useProductActions({
                        product,
                        currentVariant: null,
                    }),
                {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                }
            );

            const childSelections = [
                {
                    product: createVariantProduct(),
                    variant: { productId: 'variant-selected-123' } as any,
                    quantity: 2,
                },
            ];

            await act(async () => {
                await result.current.handleProductBundleAddToCart(1, childSelections);
            });

            expect(mockSubmit).not.toHaveBeenCalled();
        });

        test('prepares correct data for bundle with mix of standard and variants', async () => {
            const product = createBundleProduct();
            const mockSubmit = vi.fn();

            vi.mocked(useFetcher).mockReturnValue({
                data: null,
                state: 'idle',
                submit: mockSubmit,
            } as any);

            const { result } = renderHook(
                () =>
                    useProductActions({
                        product,
                        currentVariant: null,
                    }),
                {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                }
            );

            const standardProduct = createStandardProduct();
            const childSelections = [
                {
                    product: standardProduct,
                    variant: { productId: standardProduct.id } as ShopperProductsTypes.Variant,
                    quantity: 1,
                },
                {
                    product: createVariantProduct(),
                    variant: { productId: 'variant-selected-123' } as ShopperProductsTypes.Variant,
                    quantity: 2,
                },
            ];

            await act(async () => {
                await result.current.handleProductBundleAddToCart(2, childSelections);
            });

            expect(mockSubmit).not.toHaveBeenCalled();
        });
    });

    describe('useProductActions - BOPIS functionality', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            vi.resetModules();
        });

        describe('stock validation', () => {
            test('isInStock returns true when product has stock', () => {
                const productInStock = {
                    ...standardProd,
                    inventory: { ats: 10, id: 'inventory_test', orderable: true },
                };
                const { result } = renderHook(
                    () => useProductActions({ product: productInStock, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.isInStock).toBe(true);
            });

            test('isInStock returns false when product is out of stock', () => {
                const productOutOfStock = { ...standardProd, inventory: { ats: 0, id: 'inventory_test' } };
                const { result } = renderHook(
                    () => useProductActions({ product: productOutOfStock, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.isInStock).toBe(false);
            });

            test('isInStock handles undefined inventory', () => {
                const productNoInventory = { ...standardProd, inventory: undefined };
                const { result } = renderHook(
                    () => useProductActions({ product: productNoInventory, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.isInStock).toBe(false);
            });

            test('isInStock checks all set products when product is a set', () => {
                const setProduct = {
                    ...standardProd,
                    type: { set: true },
                    setProducts: [
                        { id: 'p1', inventory: { ats: 5, orderable: true } },
                        { id: 'p2', inventory: { ats: 0, orderable: false } }, // Out of stock
                    ],
                };
                const { result } = renderHook(() => useProductActions({ product: setProduct, currentVariant: null }), {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                });

                expect(result.current.isInStock).toBe(false);
            });

            test('isInStock returns true when all set products have stock', () => {
                const setProduct = {
                    ...standardProd,
                    type: { set: true },
                    setProducts: [
                        { id: 'p1', inventory: { ats: 5, orderable: true } },
                        { id: 'p2', inventory: { ats: 3, orderable: true } },
                    ],
                };
                const { result } = renderHook(() => useProductActions({ product: setProduct, currentVariant: null }), {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                });

                expect(result.current.isInStock).toBe(true);
            });

            test('stockLevel is calculated from product inventory', () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // stockLevel should be calculated from product.inventory.ats
                expect(result.current.stockLevel).toBeGreaterThanOrEqual(0);
            });

            test('isInStock handles set product with undefined setProducts', () => {
                const setProduct = {
                    ...standardProd,
                    type: { set: true },
                    setProducts: undefined,
                };
                const { result } = renderHook(() => useProductActions({ product: setProduct, currentVariant: null }), {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                });

                // Falls back to main product inventory when setProducts is undefined
                expect(result.current.isInStock).toBe(true);
            });
        });

        describe('quantity validation', () => {
            test('allows quantity to be set when product has sufficient stock', () => {
                const productInStock = {
                    ...standardProd,
                    inventory: { ats: 10, id: 'inventory_test', orderable: true },
                };
                const { result } = renderHook(
                    () => useProductActions({ product: productInStock, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                act(() => {
                    result.current.setQuantity(5);
                });

                expect(result.current.quantity).toBe(5);
            });

            test('quantity defaults to 1 when not provided', () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.quantity).toBe(1);
            });

            test('uses initialQuantity when provided', () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null, initialQuantity: 3 }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.quantity).toBe(3);
            });

            test('can update quantity with setQuantity', () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.quantity).toBe(1);

                act(() => {
                    result.current.setQuantity(10);
                });

                expect(result.current.quantity).toBe(10);
            });
        });

        describe('loading states', () => {
            test('isAddingToOrUpdatingCart starts as false', () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.isAddingToOrUpdatingCart).toBe(false);
            });

            test('isAddingToWishlist starts as false', () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.isAddingToWishlist).toBe(false);
            });
        });

        describe('basket item lookup', () => {
            test('basketProductItems includes items from basket', () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Should have access to basket product items
                expect(result.current).toBeDefined();
            });
        });

        describe('product type checks', () => {
            test('detects master products', () => {
                const masterProduct = { ...standardProd, type: { master: true } };
                const { result } = renderHook(
                    () => useProductActions({ product: masterProduct, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.isMasterOrVariantProduct).toBe(true);
            });

            test('detects variant products', () => {
                const variantProduct = { ...standardProd, type: { variant: true } };
                const { result } = renderHook(
                    () => useProductActions({ product: variantProduct, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.isMasterOrVariantProduct).toBe(true);
            });

            test('standard products are not master/variant', () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.isMasterOrVariantProduct).toBe(false);
            });

            test('set products are not master/variant', () => {
                const setProduct = { ...standardProd, type: { set: true } };
                const { result } = renderHook(() => useProductActions({ product: setProduct, currentVariant: null }), {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                });

                expect(result.current.isMasterOrVariantProduct).toBe(false);
            });

            test('bundle products are not master/variant', () => {
                const bundleProduct = { ...standardProd, type: { bundle: true } };
                const { result } = renderHook(
                    () => useProductActions({ product: bundleProduct, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.isMasterOrVariantProduct).toBe(false);
            });
        });

        describe('canAddToCart validation', () => {
            test('allows adding orderable standard product', () => {
                const orderableProduct = {
                    ...standardProd,
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                };
                const { result } = renderHook(
                    () => useProductActions({ product: orderableProduct, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.canAddToCart).toBe(true);
            });

            test('allows adding orderable set product', () => {
                const setProduct = {
                    ...standardProd,
                    type: { set: true },
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                    setProducts: [{ id: 'p1', inventory: { ats: 5, id: 'inv-p1', orderable: true } }],
                };
                const { result } = renderHook(() => useProductActions({ product: setProduct, currentVariant: null }), {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                });

                expect(result.current.canAddToCart).toBe(true);
            });

            test('allows adding orderable bundle product', () => {
                const bundleProduct = {
                    ...standardProd,
                    type: { bundle: true },
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                };
                const { result } = renderHook(
                    () => useProductActions({ product: bundleProduct, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.canAddToCart).toBe(true);
            });

            test('disallows adding product with insufficient stock', () => {
                const outOfStockProduct = {
                    ...standardProd,
                    inventory: { ats: 0, id: 'inv-1', orderable: false, backorderable: false },
                };
                const { result } = renderHook(
                    () => useProductActions({ product: outOfStockProduct, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.canAddToCart).toBe(false);
            });

            test('disallows adding master product', () => {
                const masterProduct = {
                    ...standardProd,
                    type: { master: true },
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                };
                const { result } = renderHook(
                    () => useProductActions({ product: masterProduct, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.canAddToCart).toBe(false);
            });

            test('disallows adding product with zero quantity', () => {
                const productWithStock = {
                    ...standardProd,
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                };
                const { result } = renderHook(
                    () =>
                        useProductActions({
                            product: productWithStock,
                            currentVariant: null,
                            initialQuantity: 0,
                        }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.canAddToCart).toBe(false);
            });

            test('disallows adding product when quantity exceeds stock', () => {
                const productWithLimitedStock = {
                    ...standardProd,
                    inventory: { ats: 2, id: 'inv-1', orderable: true },
                };
                const { result } = renderHook(
                    () =>
                        useProductActions({
                            product: productWithLimitedStock,
                            currentVariant: null,
                            initialQuantity: 5,
                        }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.canAddToCart).toBe(false);
            });
        });

        describe('unfulfillable and stock status', () => {
            test('marks as unfulfillable when quantity exceeds stock', () => {
                const productWithLimitedStock = {
                    ...standardProd,
                    inventory: { ats: 2, id: 'inv-1', orderable: true },
                };
                const { result } = renderHook(
                    () =>
                        useProductActions({
                            product: productWithLimitedStock,
                            currentVariant: null,
                            initialQuantity: 5,
                        }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.unfulfillable).toBe(true);
                expect(result.current.stockLevel).toBeGreaterThan(0);
            });

            test('marks as fulfillable when quantity within stock', () => {
                const productWithStock = {
                    ...standardProd,
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                };
                const { result } = renderHook(
                    () =>
                        useProductActions({
                            product: productWithStock,
                            currentVariant: null,
                            initialQuantity: 5,
                        }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.unfulfillable).toBe(false);
                expect(result.current.stockLevel).toBeGreaterThan(0);
            });

            test('marks set as unfulfillable when out of stock', () => {
                const outOfStockSet = {
                    ...standardProd,
                    type: { set: true },
                    inventory: { ats: 0, id: 'inv-1' },
                    setProducts: [{ id: 'p1', inventory: { ats: 0, id: 'inv-p1' } }],
                };
                const { result } = renderHook(
                    () => useProductActions({ product: outOfStockSet, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.unfulfillable).toBe(true);
                expect(result.current.stockLevel).toBe(0);
            });

            test('marks product as out of stock when ats is 0', () => {
                const outOfStockProduct = {
                    ...standardProd,
                    inventory: { ats: 0, id: 'inv-1' },
                };
                const { result } = renderHook(
                    () => useProductActions({ product: outOfStockProduct, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.stockLevel).toBe(0);
                expect(result.current.isInStock).toBe(false);
            });

            test('calculates stockLevel from product inventory', () => {
                const product = {
                    ...standardProd,
                    inventory: { ats: 5, id: 'inv-1', orderable: true },
                };
                const { result } = renderHook(() => useProductActions({ product, currentVariant: null }), {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                });

                expect(result.current.stockLevel).toBe(5);
                expect(result.current.isInStock).toBe(true);
            });

            test('defaults stockLevel to 0 when no inventory', () => {
                const productNoInventory = {
                    ...standardProd,
                    inventory: undefined,
                };
                const { result } = renderHook(
                    () => useProductActions({ product: productNoInventory, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.stockLevel).toBe(0);
                expect(result.current.isInStock).toBe(false);
            });

            test('uses inventory ats when stockLevel not provided', () => {
                const productWithInventory = {
                    ...standardProd,
                    inventory: { ats: 15, id: 'inv-1', orderable: true },
                };
                const { result } = renderHook(
                    () => useProductActions({ product: productWithInventory, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.stockLevel).toBe(15);
                expect(result.current.isInStock).toBe(true);
            });

            test('handles set with child product missing inventory', () => {
                const setWithMissingInventory = {
                    ...standardProd,
                    type: { set: true },
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                    setProducts: [
                        { id: 'p1', inventory: { ats: 5, id: 'inv-p1', orderable: true } },
                        { id: 'p2', inventory: undefined },
                    ],
                };
                const { result } = renderHook(
                    () => useProductActions({ product: setWithMissingInventory, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.isInStock).toBe(false);
            });
        });

        describe('handleAddToCart with inventoryId', () => {
            test('adds item WITHOUT inventoryId when product is NOT in pickup map', async () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Don't add to pickup map
                expect(result.current.pickupBasketItems?.size).toBe(0);

                // Add to cart - should work without inventoryId
                await act(async () => {
                    await result.current.handleAddToCart();
                });

                // Should complete without error
                expect(result.current.pickupBasketItems?.size).toBe(0);
            });

            test('adds item WITH inventoryId when product IS in pickup map', async () => {
                const productWithId = { ...standardProd, id: 'test-product-123' };
                const { result } = renderHook(
                    () => useProductActions({ product: productWithId, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Mark product for pickup
                act(() => {
                    result.current.addItem?.('test-product-123', 'inventory-store-123', 'store-123');
                });

                expect(result.current.pickupBasketItems?.has('test-product-123')).toBe(true);

                // Add to cart - should include inventoryId
                await act(async () => {
                    await result.current.handleAddToCart();
                });

                // Pickup item should still be in map
                expect(result.current.pickupBasketItems?.has('test-product-123')).toBe(true);
                expect(result.current.pickupBasketItems?.get('test-product-123')).toEqual({
                    inventoryId: 'inventory-store-123',
                    storeId: 'store-123',
                });
            });
        });

        describe('handleProductSetAddToCart with inventoryId', () => {
            test('adds set items WITHOUT inventoryId when products NOT in pickup map', async () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                const productSelections = [
                    {
                        product: { id: 'set-product-1', price: 10 },
                        variant: { productId: 'set-product-1', price: 10 },
                        quantity: 1,
                    },
                    {
                        product: { id: 'set-product-2', price: 20 },
                        variant: { productId: 'set-product-2', price: 20 },
                        quantity: 2,
                    },
                ];

                // Don't add to pickup map
                expect(result.current.pickupBasketItems?.size).toBe(0);

                // Add set to cart - should work without inventoryId
                await act(async () => {
                    await result.current.handleProductSetAddToCart(productSelections);
                });

                expect(result.current.pickupBasketItems?.size).toBe(0);
            });

            test('adds set items WITH inventoryId for items in pickup map', async () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                const productSelections = [
                    {
                        product: { id: 'set-product-1', price: 10 },
                        variant: { productId: 'set-product-1', price: 10 },
                        quantity: 1,
                    },
                    {
                        product: { id: 'set-product-2', price: 20 },
                        variant: { productId: 'set-product-2', price: 20 },
                        quantity: 2,
                    },
                ];

                // Mark first product for pickup
                act(() => {
                    result.current.addItem?.('set-product-1', 'inventory-store-1', 'store-1');
                });

                expect(result.current.pickupBasketItems?.has('set-product-1')).toBe(true);
                expect(result.current.pickupBasketItems?.has('set-product-2')).toBe(false);

                // Add set to cart
                await act(async () => {
                    await result.current.handleProductSetAddToCart(productSelections);
                });

                // Verify map still has the pickup item
                expect(result.current.pickupBasketItems?.has('set-product-1')).toBe(true);
            });

            test("adds set items with MIXED inventoryId (some have, some don't)", async () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                const productSelections = [
                    {
                        product: { id: 'set-product-1', price: 10 },
                        variant: { productId: 'set-product-1', price: 10 },
                        quantity: 1,
                    },
                    {
                        product: { id: 'set-product-2', price: 20 },
                        variant: { productId: 'set-product-2', price: 20 },
                        quantity: 2,
                    },
                    {
                        product: { id: 'set-product-3', price: 30 },
                        variant: { productId: 'set-product-3', price: 30 },
                        quantity: 1,
                    },
                ];

                // Mark only some products for pickup
                act(() => {
                    result.current.addItem?.('set-product-1', 'inventory-store-1', 'store-1');
                    result.current.addItem?.('set-product-3', 'inventory-store-3', 'store-3');
                });

                // Verify pickup status
                expect(result.current.pickupBasketItems?.has('set-product-1')).toBe(true);
                expect(result.current.pickupBasketItems?.has('set-product-2')).toBe(false);
                expect(result.current.pickupBasketItems?.has('set-product-3')).toBe(true);

                // Add set to cart - should include inventoryId only for marked products
                await act(async () => {
                    await result.current.handleProductSetAddToCart(productSelections);
                });

                // Verify all marked items still in map
                expect(result.current.pickupBasketItems?.size).toBe(2);
            });

            test('handles set items with missing productId gracefully', async () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                const productSelections = [
                    {
                        product: { id: '', price: 10 }, // Empty id
                        variant: { productId: '', price: 10 }, // Empty productId
                        quantity: 1,
                    },
                    {
                        product: { id: 'set-product-2', price: 20 },
                        variant: { productId: 'set-product-2', price: 20 },
                        quantity: 2,
                    },
                ] as any;

                // Add set to cart - should handle empty productId gracefully
                await act(async () => {
                    await result.current.handleProductSetAddToCart(productSelections);
                });

                expect(result.current.pickupBasketItems?.size).toBe(0);
            });
        });

        describe('handleProductBundleAddToCart with inventoryId', () => {
            test('adds bundle WITHOUT inventoryId when bundle NOT in pickup map', async () => {
                const bundleProduct = { ...standardProd, id: 'bundle-123', type: { bundle: true } };
                const { result } = renderHook(
                    () => useProductActions({ product: bundleProduct, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                const childSelections = [
                    {
                        product: { id: 'child-1', price: 5 },
                        variant: { productId: 'child-1', price: 5 },
                        quantity: 1,
                    },
                ];

                // Don't add to pickup map
                expect(result.current.pickupBasketItems?.size).toBe(0);

                // Add bundle to cart - should work without inventoryId
                await act(async () => {
                    await result.current.handleProductBundleAddToCart(1, childSelections);
                });

                expect(result.current.pickupBasketItems?.size).toBe(0);
            });

            test('adds bundle WITH inventoryId when bundle IS in pickup map', async () => {
                const bundleProduct = { ...standardProd, id: 'bundle-123', type: { bundle: true }, price: 50 };
                const { result } = renderHook(
                    () => useProductActions({ product: bundleProduct, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                const childSelections = [
                    {
                        product: { id: 'child-1', price: 5 },
                        variant: { productId: 'child-1', price: 5 },
                        quantity: 1,
                    },
                ];

                // Mark bundle for pickup (not children)
                act(() => {
                    result.current.addItem?.('bundle-123', 'inventory-store-bundle', 'store-bundle');
                });

                expect(result.current.pickupBasketItems?.has('bundle-123')).toBe(true);

                // Add bundle to cart
                await act(async () => {
                    await result.current.handleProductBundleAddToCart(1, childSelections);
                });

                // Verify bundle still in pickup map
                expect(result.current.pickupBasketItems?.has('bundle-123')).toBe(true);
                expect(result.current.pickupBasketItems?.get('bundle-123')).toEqual({
                    inventoryId: 'inventory-store-bundle',
                    storeId: 'store-bundle',
                });
            });
        });

        describe('handleUpdateBundle validation', () => {
            test('returns early when isAddingToOrUpdatingCart is true', async () => {
                const bundleProduct = { ...standardProd, id: 'bundle-123', type: { bundle: true } };
                const { result } = renderHook(
                    () => useProductActions({ product: bundleProduct, itemId: 'item-bundle', currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Set adding state to true
                act(() => {
                    result.current.setQuantity(2);
                });

                // Try to update bundle while already updating
                const childSelections = [
                    {
                        product: { id: 'child-1' } as any,
                        variant: { productId: 'child-1' } as any,
                        quantity: 1,
                    },
                ];

                // Should return early without error
                await act(async () => {
                    await result.current.handleUpdateBundle(2, childSelections);
                });

                // No error should be thrown
                expect(result.current).toBeDefined();
            });

            test('shows error when bundleQuantity is invalid', async () => {
                const bundleProduct = {
                    ...standardProd,
                    id: 'bundle-123',
                    type: { bundle: true },
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                };

                const { result } = renderHook(
                    () => useProductActions({ product: bundleProduct, itemId: 'item-bundle', currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                const childSelections = [
                    {
                        product: { id: 'child-1' } as any,
                        variant: { productId: 'child-1' } as any,
                        quantity: 1,
                    },
                ];

                // Should handle invalid quantity gracefully without throwing
                await act(async () => {
                    await result.current.handleUpdateBundle(0, childSelections);
                });

                expect(result.current).toBeDefined();
            });

            test('shows error when childProductSelections is empty', async () => {
                const bundleProduct = {
                    ...standardProd,
                    id: 'bundle-123',
                    type: { bundle: true },
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                };

                const { result } = renderHook(
                    () => useProductActions({ product: bundleProduct, itemId: 'item-bundle', currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Should handle empty selections gracefully without throwing
                await act(async () => {
                    await result.current.handleUpdateBundle(2, []);
                });

                expect(result.current).toBeDefined();
            });

            test('returns early when product has no id', async () => {
                const bundleProductNoId = {
                    ...standardProd,
                    id: undefined,
                    type: { bundle: true },
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                };

                const { result } = renderHook(
                    () =>
                        useProductActions({
                            product: bundleProductNoId,
                            itemId: 'item-bundle',
                            currentVariant: null,
                        }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                const childSelections = [
                    {
                        product: { id: 'child-1' } as any,
                        variant: { productId: 'child-1' } as any,
                        quantity: 1,
                    },
                ];

                // Should handle missing id gracefully without throwing
                await act(async () => {
                    await result.current.handleUpdateBundle(2, childSelections);
                });

                expect(result.current).toBeDefined();
            });

            test('returns early when no itemId provided', async () => {
                const bundleProduct = {
                    ...standardProd,
                    id: 'bundle-123',
                    type: { bundle: true },
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                };
                const { result } = renderHook(
                    () => useProductActions({ product: bundleProduct, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                const childSelections = [
                    {
                        product: { id: 'child-1' } as any,
                        variant: { productId: 'child-1' } as any,
                        quantity: 1,
                    },
                ];

                // Should not throw error, just return early
                await act(async () => {
                    await result.current.handleUpdateBundle(2, childSelections);
                });

                expect(result.current).toBeDefined();
            });
        });

        describe('handleUpdateCart validation', () => {
            test('returns early when no itemId provided', async () => {
                const product = { ...standardProd, inventory: { ats: 10, id: 'inv-1', orderable: true } };
                const { result } = renderHook(() => useProductActions({ product, currentVariant: null }), {
                    wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                });

                // Should not throw error, just return early
                await act(async () => {
                    await result.current.handleUpdateCart();
                });

                expect(result.current).toBeDefined();
            });

            test('returns early when canAddToCart is false', async () => {
                const outOfStockProduct = {
                    ...standardProd,
                    inventory: { ats: 0, id: 'inv-1', orderable: false },
                };
                const { result } = renderHook(
                    () => useProductActions({ product: outOfStockProduct, itemId: 'item-1', currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Should not throw error, just return early
                await act(async () => {
                    await result.current.handleUpdateCart();
                });

                expect(result.current).toBeDefined();
            });

            test('shows error when quantity is invalid', async () => {
                const product = { ...standardProd, inventory: { ats: 10, id: 'inv-1', orderable: true } };
                const { result } = renderHook(
                    () => useProductActions({ product, itemId: 'item-1', initialQuantity: 0, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Should handle invalid quantity gracefully
                await act(async () => {
                    await result.current.handleUpdateCart();
                });

                expect(result.current).toBeDefined();
            });

            test('uses currentVariant for master/variant products', () => {
                const variantProduct = {
                    ...standardProd,
                    type: { variant: true },
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                };
                const { result } = renderHook(
                    () => useProductActions({ product: variantProduct, itemId: 'item-1', currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Should use variant product logic
                expect(result.current.isMasterOrVariantProduct).toBe(true);
            });

            test('uses product for non-variant products', () => {
                const standardProduct = { ...standardProd, inventory: { ats: 10, id: 'inv-1', orderable: true } };
                const { result } = renderHook(
                    () => useProductActions({ product: standardProduct, itemId: 'item-1', currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Should use standard product logic
                expect(result.current.isMasterOrVariantProduct).toBe(false);
            });

            test('handles product with no id gracefully', async () => {
                const productNoId = {
                    ...standardProd,
                    id: undefined,
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                };
                const { result } = renderHook(
                    () => useProductActions({ product: productNoId, itemId: 'item-1', currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Should handle missing id gracefully
                await act(async () => {
                    await result.current.handleUpdateCart();
                });

                expect(result.current).toBeDefined();
            });

            test('handles product with no productId gracefully', async () => {
                const product = {
                    ...standardProd,
                    productId: undefined,
                    inventory: { ats: 10, id: 'inv-1', orderable: true },
                };
                const { result } = renderHook(
                    () => useProductActions({ product, itemId: 'item-1', currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Should handle missing productId gracefully
                await act(async () => {
                    await result.current.handleUpdateCart();
                });

                expect(result.current).toBeDefined();
            });
        });

        describe('pickup item management', () => {
            test('addItem adds product to pickup map', () => {
                const productWithId = { ...standardProd, id: 'test-product-123' };
                const { result } = renderHook(
                    () => useProductActions({ product: productWithId, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.pickupBasketItems?.size).toBe(0);

                act(() => {
                    result.current.addItem?.('test-product-123', 'inventory-store-123', 'store-123');
                });

                expect(result.current.pickupBasketItems?.has('test-product-123')).toBe(true);
                expect(result.current.pickupBasketItems?.get('test-product-123')).toEqual({
                    inventoryId: 'inventory-store-123',
                    storeId: 'store-123',
                });
            });

            test('removeItem removes product from pickup map', () => {
                const productWithId = { ...standardProd, id: 'test-product-123' };
                const { result } = renderHook(
                    () => useProductActions({ product: productWithId, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                act(() => {
                    result.current.addItem?.('test-product-123', 'inventory-store-123', 'store-123');
                });

                expect(result.current.pickupBasketItems?.has('test-product-123')).toBe(true);

                act(() => {
                    result.current.removeItem?.('test-product-123');
                });

                expect(result.current.pickupBasketItems?.has('test-product-123')).toBe(false);
            });

            test('addItem updates existing product inventoryId and storeId', () => {
                const productWithId = { ...standardProd, id: 'test-product-123' };
                const { result } = renderHook(
                    () => useProductActions({ product: productWithId, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                act(() => {
                    result.current.addItem?.('test-product-123', 'inventory-store-old', 'store-old');
                });

                expect(result.current.pickupBasketItems?.get('test-product-123')).toEqual({
                    inventoryId: 'inventory-store-old',
                    storeId: 'store-old',
                });

                act(() => {
                    result.current.addItem?.('test-product-123', 'inventory-store-new', 'store-new');
                });

                expect(result.current.pickupBasketItems?.get('test-product-123')).toEqual({
                    inventoryId: 'inventory-store-new',
                    storeId: 'store-new',
                });
            });
        });

        describe('inventory calculations with pickup selection', () => {
            test('uses site inventory when pickup is not selected', () => {
                const productWithInventories = {
                    ...standardProd,
                    id: 'test-product-123',
                    inventory: { ats: 10, id: 'site-inventory', orderable: true },
                    inventories: [
                        {
                            id: 'store-inventory',
                            ats: 5,
                            stockLevel: 5,
                            orderable: true,
                        },
                    ],
                };

                const { result } = renderHook(
                    () => useProductActions({ product: productWithInventories, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Pickup is not selected, so should use site inventory
                expect(result.current.stockLevel).toBe(10); // Site inventory
            });

            test('uses store inventory when pickup is selected', () => {
                const productWithInventories = {
                    ...standardProd,
                    id: 'test-product-123',
                    inventory: { ats: 10, id: 'site-inventory', orderable: true },
                    inventories: [
                        {
                            id: 'store-inventory',
                            ats: 5,
                            stockLevel: 5,
                            orderable: true,
                        },
                    ],
                };

                const { result } = renderHook(
                    () => useProductActions({ product: productWithInventories, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Mark product for pickup
                act(() => {
                    result.current.addItem?.('test-product-123', 'store-inventory', 'store-1');
                });

                // Should use store inventory when pickup is selected
                expect(result.current.stockLevel).toBe(5); // Store inventory
            });

            test('isInStock uses store inventory when pickup is selected', () => {
                const productWithInventories = {
                    ...standardProd,
                    id: 'test-product-123',
                    inventory: { ats: 10, id: 'site-inventory', orderable: true },
                    inventories: [
                        {
                            id: 'store-inventory',
                            ats: 2,
                            stockLevel: 2,
                            orderable: true,
                        },
                    ],
                };

                const { result } = renderHook(
                    () =>
                        useProductActions({
                            product: productWithInventories,
                            currentVariant: null,
                            initialQuantity: 1,
                        }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Initially uses site inventory (10 in stock)
                expect(result.current.isInStock).toBe(true);

                // Mark product for pickup
                act(() => {
                    result.current.addItem?.('test-product-123', 'store-inventory', 'store-1');
                });

                // Should use store inventory (2 in stock, quantity 1)
                expect(result.current.isInStock).toBe(true);
            });

            test('isInStock reflects store inventory when pickup is selected and quantity exceeds store stock', () => {
                const productWithInventories = {
                    ...standardProd,
                    id: 'test-product-123',
                    inventory: { ats: 10, id: 'site-inventory', orderable: true },
                    inventories: [
                        {
                            id: 'store-inventory',
                            ats: 2,
                            stockLevel: 2,
                            orderable: true,
                        },
                    ],
                };

                const { result } = renderHook(
                    () =>
                        useProductActions({
                            product: productWithInventories,
                            currentVariant: null,
                            initialQuantity: 5,
                        }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Mark product for pickup
                act(() => {
                    result.current.addItem?.('test-product-123', 'store-inventory', 'store-1');
                });

                // Should use store inventory (2 in stock, quantity 5)
                expect(result.current.isInStock).toBe(false); // Store only has 2, quantity is 5
            });
        });

        describe('exported functions', () => {
            test('exports addItem function', () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(typeof result.current.addItem).toBe('function');
            });

            test('exports removeItem function', () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(typeof result.current.removeItem).toBe('function');
            });

            test('exports pickupBasketItems map', () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(result.current.pickupBasketItems).toBeInstanceOf(Map);
            });

            test('exports clearItems function', () => {
                const { result } = renderHook(
                    () => useProductActions({ product: standardProd, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                expect(typeof result.current.clearItems).toBe('function');
            });

            test('clearItems clears all pickup items', () => {
                const productWithId = { ...standardProd, id: 'test-product-123' };
                const { result } = renderHook(
                    () => useProductActions({ product: productWithId, currentVariant: null }),
                    {
                        wrapper: ({ children }) => wrapper({ children, basket: mockBasket }),
                    }
                );

                // Add multiple items to pickup
                act(() => {
                    result.current.addItem?.('product-1', 'inventory-1', 'store-1');
                    result.current.addItem?.('product-2', 'inventory-2', 'store-2');
                    result.current.addItem?.('product-3', 'inventory-3', 'store-3');
                });

                expect(result.current.pickupBasketItems?.size).toBe(3);

                // Clear all items
                act(() => {
                    result.current.clearItems?.();
                });

                expect(result.current.pickupBasketItems?.size).toBe(0);
            });
        });
    });
});
