/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { clientAction } from './action.cart-bundle-add';
import { getBasket } from '@/middlewares/basket.client';
import createClient from '@/lib/scapi';

vi.mock('@/middlewares/basket.client');
vi.mock('@/lib/scapi');
vi.mock('@/lib/utils', () => ({
    extractResponseError: vi.fn((error) => ({
        responseMessage: error instanceof Error ? error.message : 'Unknown error',
        status_code: '400',
    })),
}));
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        data: (body: any, init?: ResponseInit) => Response.json(body, init),
    };
});

describe('action.cart-bundle-add', () => {
    const mockBasket = {
        basketId: 'test-basket-123',
        productItems: [],
    };

    const mockUpdatedBasket = {
        basketId: 'test-basket-123',
        productItems: [
            {
                productId: 'bundle-123',
                quantity: 1,
                bundledProductItems: [
                    { itemId: 'item-1', productId: 'standard-product-1', quantity: 1 },
                    { itemId: 'item-2', productId: 'variant-product-1', quantity: 2 },
                ],
            },
        ],
    };

    const mockClient = {
        ShopperBasketsV2: {
            addItemToBasket: vi.fn(),
            updateItemsInBasket: vi.fn(),
            getBasket: vi.fn(),
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getBasket).mockReturnValue(mockBasket);
        vi.mocked(createClient).mockReturnValue(mockClient as any);
    });

    describe('clientAction', () => {
        test('adds bundle with standard products to cart', async () => {
            const bundleItem = { productId: 'bundle-123', quantity: 1 };
            const childSelections = [
                { productId: 'standard-product-1', quantity: 1 },
                { productId: 'standard-product-2', quantity: 1 },
            ];

            mockClient.ShopperBasketsV2.addItemToBasket.mockResolvedValue(mockUpdatedBasket);

            const formData = new FormData();
            formData.append('bundleItem', JSON.stringify(bundleItem));
            formData.append('childSelections', JSON.stringify(childSelections));

            const request = new Request('http://localhost/action/cart-bundle-add', {
                method: 'POST',
                body: formData,
            });

            const response = await clientAction({
                request,
                context: {} as any,
                params: {},
            });

            const result = await response.json();
            expect(result.success).toBe(true);
            expect(mockClient.ShopperBasketsV2.addItemToBasket).toHaveBeenCalled();
        });

        test('adds bundle with variant products to cart', async () => {
            const bundleItem = { productId: 'bundle-123', quantity: 1 };
            const childSelections = [
                { productId: 'variant-123', quantity: 1 },
                { productId: 'variant-456', quantity: 2 },
            ];

            mockClient.ShopperBasketsV2.addItemToBasket.mockResolvedValue(mockUpdatedBasket);

            const formData = new FormData();
            formData.append('bundleItem', JSON.stringify(bundleItem));
            formData.append('childSelections', JSON.stringify(childSelections));

            const request = new Request('http://localhost/action/cart-bundle-add', {
                method: 'POST',
                body: formData,
            });

            const response = await clientAction({
                request,
                context: {} as any,
                params: {},
            });

            const result = await response.json();
            expect(result.success).toBe(true);
        });

        test('adds bundle with mix of standard and variant products', async () => {
            const bundleItem = { productId: 'bundle-123', quantity: 2 };
            const childSelections = [
                { productId: 'standard-product-1', quantity: 1 },
                { productId: 'variant-123', quantity: 2 },
            ];

            mockClient.ShopperBasketsV2.addItemToBasket.mockResolvedValue(mockUpdatedBasket);

            const formData = new FormData();
            formData.append('bundleItem', JSON.stringify(bundleItem));
            formData.append('childSelections', JSON.stringify(childSelections));

            const request = new Request('http://localhost/action/cart-bundle-add', {
                method: 'POST',
                body: formData,
            });

            const response = await clientAction({
                request,
                context: {} as any,
                params: {},
            });

            const result = await response.json();
            expect(result.success).toBe(true);
            expect(mockClient.ShopperBasketsV2.addItemToBasket).toHaveBeenCalledWith({
                parameters: { basketId: 'test-basket-123' },
                body: [
                    {
                        productId: 'bundle-123',
                        quantity: 2,
                        bundledProductItems: childSelections,
                    },
                ],
            });
        });

        test('returns error when bundle data is missing', async () => {
            const formData = new FormData();

            const request = new Request('http://localhost/action/cart-bundle-add', {
                method: 'POST',
                body: formData,
            });

            const response = await clientAction({
                request,
                context: {} as any,
                params: {},
            });

            const result = await response.json();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('returns error for non-POST requests', async () => {
            const request = new Request('http://localhost/action/cart-bundle-add', {
                method: 'GET',
            });

            await expect(
                clientAction({
                    request,
                    context: {} as any,
                    params: {},
                })
            ).rejects.toThrow();
        });
    });
});
