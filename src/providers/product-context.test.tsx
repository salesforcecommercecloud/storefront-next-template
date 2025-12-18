/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ProductProvider, useProduct } from './product-context';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

describe('providers/product-context.tsx', () => {
    describe('ProductProvider', () => {
        it('should provide product data to children via useProduct hook', () => {
            const mockProduct: ShopperProducts.schemas['Product'] = {
                id: 'test-product-id',
                name: 'Test Product',
                productName: 'Test Product',
                type: {
                    master: true,
                },
            } as ShopperProducts.schemas['Product'];

            const { result } = renderHook(() => useProduct(), {
                wrapper: ({ children }) => <ProductProvider product={mockProduct}>{children}</ProductProvider>,
            });

            expect(result.current).toEqual(mockProduct);
            expect(result.current?.id).toBe('test-product-id');
            expect(result.current?.name).toBe('Test Product');
        });

        it('should provide product with all properties to children', () => {
            const mockProduct: ShopperProducts.schemas['Product'] = {
                id: 'product-123',
                name: 'Premium T-Shirt',
                productName: 'Premium T-Shirt',
                price: 29.99,
                currency: 'USD',
                shortDescription: 'A premium quality t-shirt',
                imageGroups: [
                    {
                        viewType: 'large',
                        images: [
                            {
                                link: 'https://example.com/image.jpg',
                                alt: 'Product image',
                            },
                        ],
                    },
                ],
            } as ShopperProducts.schemas['Product'];

            const { result } = renderHook(() => useProduct(), {
                wrapper: ({ children }) => <ProductProvider product={mockProduct}>{children}</ProductProvider>,
            });

            expect(result.current).toEqual(mockProduct);
            expect(result.current?.id).toBe('product-123');
            expect(result.current?.price).toBe(29.99);
            expect(result.current?.currency).toBe('USD');
        });
    });

    describe('useProduct', () => {
        it('should return null when used outside ProductProvider', () => {
            const { result } = renderHook(() => useProduct());
            expect(result.current).toBeNull();
        });

        it('should return the product when used within ProductProvider', () => {
            const mockProduct: ShopperProducts.schemas['Product'] = {
                id: 'test-product',
                name: 'Test Product',
            } as ShopperProducts.schemas['Product'];

            const { result } = renderHook(() => useProduct(), {
                wrapper: ({ children }) => <ProductProvider product={mockProduct}>{children}</ProductProvider>,
            });

            expect(result.current).toBe(mockProduct);
        });

        it('should return null when context value is null', () => {
            // This tests the nullish coalescing behavior
            const { result } = renderHook(() => useProduct());
            expect(result.current).toBeNull();
        });
    });
});
