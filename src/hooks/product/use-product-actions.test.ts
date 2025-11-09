/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useProductActions } from './use-product-actions';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import { useFetcher } from 'react-router';

// Mock useLocation and useNavigate
const mockNavigate = vi.fn();
const mockLocation = {
    pathname: '/product/123',
    search: '',
    hash: '',
    state: null,
    key: 'default',
};

vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useFetcher: vi.fn(() => ({
            data: null,
            state: 'idle',
            submit: vi.fn(),
        })),
        useLocation: () => mockLocation,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: vi.fn(),
    }),
}));

vi.mock('@/providers/basket', () => ({
    useBasket: () => null,
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

describe('useProductActions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset location to default
        mockLocation.pathname = '/product/123';
        mockLocation.search = '';
        mockLocation.hash = '';
    });
    const createStandardProduct = (): ShopperProductsTypes.Product => ({
        id: 'standard-123',
        name: 'Standard Product',
        type: { item: true },
        inventory: {
            id: 'inventory-standard-123',
            ats: 10,
            orderable: true,
        },
    });

    const createVariantProduct = (): ShopperProductsTypes.Product => ({
        id: 'variant-123',
        name: 'Variant Product',
        type: { variant: true },
        inventory: {
            id: 'inventory-variant-123',
            ats: 10,
            orderable: true,
        },
    });

    const createBundleProduct = (): ShopperProductsTypes.Product => ({
        id: 'bundle-123',
        name: 'Bundle Product',
        type: { bundle: true },
        inventory: {
            id: 'inventory-bundle-123',
            ats: 10,
            orderable: true,
        },
    });

    const createSetProduct = (): ShopperProductsTypes.Product => ({
        id: 'set-123',
        name: 'Set Product',
        type: { set: true },
        inventory: {
            id: 'inventory-set-123',
            ats: 10,
            orderable: true,
        },
        setProducts: [],
    });

    describe('canAddToCart', () => {
        test('allows standard product when orderable and in stock', () => {
            const product = createStandardProduct();

            const { result } = renderHook(() =>
                useProductActions({
                    product,
                    stockLevel: 10,
                })
            );

            expect(result.current.canAddToCart).toBe(true);
        });

        test('prevents standard product when out of stock', () => {
            const product = createStandardProduct();
            // Set inventory to 0 as well to test out of stock behavior
            product.inventory = {
                id: 'inventory-standard-123',
                ats: 0,
                orderable: true,
            };

            const { result } = renderHook(() =>
                useProductActions({
                    product,
                    stockLevel: 0,
                })
            );

            expect(result.current.canAddToCart).toBe(false);
        });

        test('allows bundle when orderable and in stock', () => {
            const product = createBundleProduct();

            const { result } = renderHook(() =>
                useProductActions({
                    product,
                    stockLevel: 10,
                })
            );

            expect(result.current.canAddToCart).toBe(true);
        });

        test('allows set when orderable and in stock', () => {
            const product = createSetProduct();

            const { result } = renderHook(() =>
                useProductActions({
                    product,
                    stockLevel: 10,
                })
            );

            expect(result.current.canAddToCart).toBe(true);
        });

        test('prevents adding when quantity exceeds stock', () => {
            const product = createStandardProduct();

            const { result } = renderHook(() =>
                useProductActions({
                    product,
                    stockLevel: 5,
                    initialQuantity: 10,
                })
            );

            expect(result.current.canAddToCart).toBe(false);
        });

        test('prevents adding master product', () => {
            const product: ShopperProductsTypes.Product = {
                id: 'master-123',
                name: 'Master Product',
                type: { master: true },
                inventory: {
                    id: 'inventory-master-123',
                    ats: 10,
                    orderable: true,
                },
            };

            const { result } = renderHook(() =>
                useProductActions({
                    product,
                    stockLevel: 10,
                })
            );

            expect(result.current.canAddToCart).toBe(false);
        });
    });

    describe('handleProductBundleAddToCart', () => {
        test('prepares correct data for bundle with standard products only', () => {
            const product = createBundleProduct();
            const mockSubmit = vi.fn();

            vi.mocked(useFetcher).mockReturnValue({
                data: null,
                state: 'idle',
                submit: mockSubmit,
            } as any);

            const { result } = renderHook(() =>
                useProductActions({
                    product,
                    stockLevel: 10,
                })
            );

            const childSelections = [
                {
                    product: createStandardProduct(),
                    variant: {} as ShopperProductsTypes.Variant,
                    quantity: 1,
                },
            ];

            void result.current.handleProductBundleAddToCart(1, childSelections);

            // Verify submit was not called immediately (async operation)
            expect(mockSubmit).not.toHaveBeenCalled();
        });

        test('prepares correct data for bundle with variant products', () => {
            const product = createBundleProduct();
            const mockSubmit = vi.fn();

            vi.mocked(useFetcher).mockReturnValue({
                data: null,
                state: 'idle',
                submit: mockSubmit,
            } as any);

            const { result } = renderHook(() =>
                useProductActions({
                    product,
                    stockLevel: 10,
                })
            );

            const childSelections = [
                {
                    product: createVariantProduct(),
                    variant: { productId: 'variant-selected-123' } as any,
                    quantity: 2,
                },
            ];

            void result.current.handleProductBundleAddToCart(1, childSelections);

            expect(mockSubmit).not.toHaveBeenCalled();
        });

        test('prepares correct data for bundle with mix of standard and variants', () => {
            const product = createBundleProduct();
            const mockSubmit = vi.fn();

            vi.mocked(useFetcher).mockReturnValue({
                data: null,
                state: 'idle',
                submit: mockSubmit,
            } as any);

            const { result } = renderHook(() =>
                useProductActions({
                    product,
                    stockLevel: 10,
                })
            );

            const childSelections = [
                {
                    product: createStandardProduct(),
                    variant: {} as ShopperProductsTypes.Variant,
                    quantity: 1,
                },
                {
                    product: createVariantProduct(),
                    variant: { productId: 'variant-selected-123' } as ShopperProductsTypes.Variant,
                    quantity: 2,
                },
            ];

            void result.current.handleProductBundleAddToCart(2, childSelections);

            expect(mockSubmit).not.toHaveBeenCalled();
        });
    });
});
