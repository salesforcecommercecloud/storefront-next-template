/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { renderHook, act } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useProductSetsBundles } from './use-product-sets-bundles';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

describe('useProductSetsBundles', () => {
    const createMockProduct = (
        type: 'set' | 'bundle',
        childProducts: any[] = []
    ): ShopperProducts.schemas['Product'] => ({
        id: 'parent-product-123',
        name: 'Test Product',
        type: type === 'set' ? { set: true } : { bundle: true },
        setProducts: type === 'set' ? childProducts : undefined,
        bundledProducts:
            type === 'bundle' ? childProducts.map((p) => ({ product: p, quantity: p.quantity || 1 })) : undefined,
    });

    const createStandardProduct = (id: string): ShopperProducts.schemas['Product'] => ({
        id,
        name: `Standard Product ${id}`,
        type: { item: true },
        product: { id, name: `Standard Product ${id}` },
    });

    const createVariantProduct = (id: string): ShopperProducts.schemas['Product'] => ({
        id,
        name: `Variant Product ${id}`,
        type: { variant: true },
        product: { id, name: `Variant Product ${id}` },
    });

    describe('validateChildProducts', () => {
        test('skips validation for standard products', () => {
            const standardProduct = createStandardProduct('standard-1');
            const product = createMockProduct('set', [standardProduct]);

            const { result } = renderHook(() => useProductSetsBundles({ product }));

            const validation = result.current.validateChildProducts();

            expect(validation.isValid).toBe(true);
        });

        test('requires variant selection for variant products', () => {
            const variantProduct = createVariantProduct('variant-1');
            const product = createMockProduct('set', [variantProduct]);

            const { result } = renderHook(() => useProductSetsBundles({ product }));

            const validation = result.current.validateChildProducts();

            expect(validation.isValid).toBe(false);
            expect(validation.errorMessage).toBeDefined();
        });

        test('validates mix of standard and variant products', () => {
            const standardProduct = createStandardProduct('standard-1');
            const variantProduct = createVariantProduct('variant-1');
            const product = createMockProduct('set', [standardProduct, variantProduct]);

            const { result } = renderHook(() => useProductSetsBundles({ product }));

            // Standard product is auto-selected, but variant is not
            const validation = result.current.validateChildProducts();

            expect(validation.isValid).toBe(false);
        });

        test('passes validation when variant product is selected', () => {
            const standardProduct = createStandardProduct('standard-1');
            const variantProduct = createVariantProduct('variant-1');
            const product = createMockProduct('set', [standardProduct, variantProduct]);

            const { result } = renderHook(() => useProductSetsBundles({ product }));

            // Select the variant product
            act(() => {
                result.current.setChildProductSelection('variant-1', {
                    product: variantProduct,
                    variant: { productId: 'variant-1-selected' } as any,
                    quantity: 1,
                });
                result.current.setChildProductOrderability('variant-1', { isOrderable: true });
            });

            const validation = result.current.validateChildProducts();

            expect(validation.isValid).toBe(true);
        });
    });

    describe('areAllChildProductsSelected', () => {
        test('considers standard products as auto-selected', () => {
            const standardProduct = createStandardProduct('standard-1');
            const product = createMockProduct('set', [standardProduct]);

            const { result } = renderHook(() => useProductSetsBundles({ product }));

            expect(result.current.areAllChildProductsSelected).toBe(true);
        });

        test('returns false when variant products are not selected', () => {
            const variantProduct = createVariantProduct('variant-1');
            const product = createMockProduct('set', [variantProduct]);

            const { result } = renderHook(() => useProductSetsBundles({ product }));

            expect(result.current.areAllChildProductsSelected).toBe(false);
        });

        test('returns true when all products are selected or standard', () => {
            const standardProduct = createStandardProduct('standard-1');
            const variantProduct = createVariantProduct('variant-1');
            const product = createMockProduct('set', [standardProduct, variantProduct]);

            const { result } = renderHook(() => useProductSetsBundles({ product }));

            act(() => {
                result.current.setChildProductSelection('variant-1', {
                    product: variantProduct,
                    variant: { productId: 'variant-1-selected' } as any,
                    quantity: 1,
                });
            });

            expect(result.current.areAllChildProductsSelected).toBe(true);
        });

        test('handles bundle with only standard products', () => {
            const standard1 = createStandardProduct('standard-1');
            const standard2 = createStandardProduct('standard-2');
            const product = createMockProduct('bundle', [standard1, standard2]);

            const { result } = renderHook(() => useProductSetsBundles({ product }));

            expect(result.current.areAllChildProductsSelected).toBe(true);
        });
    });

    describe('selectedChildProductCount', () => {
        test('reflects only explicitly selected products', () => {
            const standardProduct = createStandardProduct('standard-1');
            const variantProduct = createVariantProduct('variant-1');
            const product = createMockProduct('set', [standardProduct, variantProduct]);

            const { result } = renderHook(() => useProductSetsBundles({ product }));

            // Initially, no explicit selections
            expect(result.current.selectedChildProductCount).toBe(0);

            act(() => {
                result.current.setChildProductSelection('variant-1', {
                    product: variantProduct,
                    variant: { productId: 'variant-1-selected' } as any,
                    quantity: 1,
                });
            });

            expect(result.current.selectedChildProductCount).toBe(1);
        });
    });
});
