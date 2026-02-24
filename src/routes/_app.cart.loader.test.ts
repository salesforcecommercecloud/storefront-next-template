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

import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';
import { loader } from './_app.cart';
import { createTestContext } from '@/lib/test-utils';

vi.mock('@/middlewares/basket.server', () => ({
    getBasket: vi.fn(),
    getBasketSnapshot: vi.fn(),
}));

const mockGetProducts = vi.fn();
const mockGetPromotions = vi.fn();
const mockGetStores = vi.fn();

vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(() => ({
        shopperProducts: { getProducts: mockGetProducts },
        shopperPromotions: { getPromotions: mockGetPromotions },
        shopperStores: { getStores: mockGetStores },
    })),
}));

import { getBasket, getBasketSnapshot } from '@/middlewares/basket.server';

describe('Cart route loader', () => {
    const mockBasket = {
        basketId: 'basket-123',
        productItems: [{ itemId: 'item-1', productId: 'product-1', quantity: 1 }],
        currency: 'USD',
    };

    const mockProduct = {
        id: 'product-1',
        name: 'Test Product',
        imageGroups: [{ viewType: 'small', images: [{ link: 'https://example.com/1.jpg' }] }],
    };

    const createLoaderArgs = (): LoaderFunctionArgs =>
        ({
            params: {},
            context: createTestContext({ currency: 'USD' }),
            request: new Request('http://localhost/cart'),
        }) as LoaderFunctionArgs;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getBasket).mockResolvedValue({ current: mockBasket } as any);
        vi.mocked(getBasketSnapshot).mockReturnValue({
            basketId: 'basket-123',
            totalItemCount: 1,
            uniqueProductCount: 1,
            currency: 'USD',
        });
        mockGetProducts.mockResolvedValue({ data: { data: [mockProduct] } });
        mockGetPromotions.mockResolvedValue({ data: { data: [] } });
        mockGetStores.mockResolvedValue({ data: { data: [] } });
    });

    test('returns basketDataPromise and basketSnapshot', () => {
        const result = loader(createLoaderArgs());

        expect(result).toHaveProperty('basketDataPromise');
        expect(result).toHaveProperty('basketSnapshot');
        expect(result.basketSnapshot).toEqual({
            basketId: 'basket-123',
            totalItemCount: 1,
            uniqueProductCount: 1,
            currency: 'USD',
        });
    });

    test('basketDataPromise resolves to basket, products, promotions', async () => {
        const result = loader(createLoaderArgs());
        const data = await result.basketDataPromise;

        expect(data).toHaveProperty('basket');
        expect(data).toHaveProperty('productsByItemId');
        expect(data).toHaveProperty('bonusProductsById');
        expect(data).toHaveProperty('promotions');
        expect(data.basket).toEqual(mockBasket);
        expect(data.productsByItemId).toEqual({ 'item-1': mockProduct });
        expect(data.bonusProductsById).toEqual({});
        expect(data.promotions).toEqual({});
    });

    test('loader works with empty basket', async () => {
        vi.mocked(getBasket).mockResolvedValue({
            current: { basketId: 'basket-123', productItems: [], currency: 'USD' },
        } as any);
        vi.mocked(getBasketSnapshot).mockReturnValue({
            basketId: 'basket-123',
            totalItemCount: 0,
            uniqueProductCount: 0,
            currency: 'USD',
        });
        mockGetProducts.mockResolvedValue({ data: { data: [] } });

        const result = loader(createLoaderArgs());
        const data = await result.basketDataPromise;

        expect(data.basket?.productItems).toEqual([]);
        expect(data.productsByItemId).toEqual({});
        expect(data.bonusProductsById).toEqual({});
        expect(data.promotions).toEqual({});
    });
});
