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
import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { ShopperOrders, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';
import { createTestContext } from '@/lib/test-utils';
import { fetchOrderWithProducts } from './order';

vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(),
}));

describe('fetchOrderWithProducts', () => {
    const mockGetOrder = vi.fn();
    const mockGetProducts = vi.fn();
    const mockClients = {
        shopperOrders: { getOrder: mockGetOrder },
        shopperProducts: { getProducts: mockGetProducts },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(createApiClients).mockReturnValue(mockClients as never);
    });

    test('returns orderDataPromise and orderPromise', () => {
        const mockOrder: ShopperOrders.schemas['Order'] = {
            orderNo: 'ORD-1',
            productItems: [],
        } as ShopperOrders.schemas['Order'];
        mockGetOrder.mockResolvedValue({ data: mockOrder });

        const context = createTestContext({ currency: 'USD' });
        const result = fetchOrderWithProducts(context, 'ORD-1');

        expect(result).toHaveProperty('orderDataPromise');
        expect(result).toHaveProperty('orderPromise');
        expect(result.orderDataPromise).toBeInstanceOf(Promise);
        expect(result.orderPromise).toBeInstanceOf(Promise);
    });

    test('calls createApiClients and getOrder with orderNo', () => {
        const mockOrder: ShopperOrders.schemas['Order'] = {
            orderNo: 'ORD-123',
            productItems: [],
        } as ShopperOrders.schemas['Order'];
        mockGetOrder.mockResolvedValue({ data: mockOrder });

        const context = createTestContext({ currency: 'EUR' });
        fetchOrderWithProducts(context, 'ORD-123');

        expect(createApiClients).toHaveBeenCalledWith(context);
        expect(mockGetOrder).toHaveBeenCalledWith({
            params: { path: { orderNo: 'ORD-123' } },
        });
    });

    test('orderPromise resolves to order data', async () => {
        const mockOrder: ShopperOrders.schemas['Order'] = {
            orderNo: 'ORD-1',
            productItems: [],
        } as ShopperOrders.schemas['Order'];
        mockGetOrder.mockResolvedValue({ data: mockOrder });

        const context = createTestContext({ currency: 'USD' });
        const { orderPromise } = fetchOrderWithProducts(context, 'ORD-1');

        const order = await orderPromise;
        expect(order).toEqual(mockOrder);
        expect(order.orderNo).toBe('ORD-1');
    });

    test('orderDataPromise resolves to order and productsById', async () => {
        const mockOrder: ShopperOrders.schemas['Order'] = {
            orderNo: 'ORD-1',
            productItems: [],
        } as ShopperOrders.schemas['Order'];
        mockGetOrder.mockResolvedValue({ data: mockOrder });

        const context = createTestContext({ currency: 'USD' });
        const { orderDataPromise } = fetchOrderWithProducts(context, 'ORD-1');

        const data = await orderDataPromise;
        expect(data.order).toEqual(mockOrder);
        expect(data.productsById).toEqual({});
    });

    test('calls getProducts with product IDs from order and currency from context', async () => {
        const mockOrder: ShopperOrders.schemas['Order'] = {
            orderNo: 'ORD-1',
            productItems: [
                { productId: 'prod-1', itemId: 'item-1' },
                { productId: 'prod-2', itemId: 'item-2' },
            ],
        } as ShopperOrders.schemas['Order'];
        mockGetOrder.mockResolvedValue({ data: mockOrder });

        const mockProducts = {
            data: {
                data: [
                    { id: 'prod-1', name: 'Product 1' } as ShopperProducts.schemas['Product'],
                    { id: 'prod-2', name: 'Product 2' } as ShopperProducts.schemas['Product'],
                ],
            },
        };
        mockGetProducts.mockResolvedValue(mockProducts);

        const context = createTestContext({ currency: 'GBP' });
        const { orderDataPromise } = fetchOrderWithProducts(context, 'ORD-1');

        const data = await orderDataPromise;

        expect(mockGetProducts).toHaveBeenCalledWith({
            params: {
                query: {
                    ids: ['prod-1', 'prod-2'],
                    expand: ['images', 'variations'],
                    currency: 'GBP',
                },
            },
        });
        expect(data.productsById).toEqual({
            'prod-1': { id: 'prod-1', name: 'Product 1' },
            'prod-2': { id: 'prod-2', name: 'Product 2' },
        });
    });

    test('deduplicates product IDs and skips empty productItems', async () => {
        const mockOrder: ShopperOrders.schemas['Order'] = {
            orderNo: 'ORD-1',
            productItems: [
                { productId: 'prod-1', itemId: 'item-1' },
                { productId: 'prod-1', itemId: 'item-2' },
                { productId: '', itemId: 'item-3' },
            ],
        } as ShopperOrders.schemas['Order'];
        mockGetOrder.mockResolvedValue({ data: mockOrder });
        mockGetProducts.mockResolvedValue({
            data: { data: [{ id: 'prod-1', name: 'Product 1' } as ShopperProducts.schemas['Product']] },
        });

        const context = createTestContext({ currency: 'USD' });
        const { orderDataPromise } = fetchOrderWithProducts(context, 'ORD-1');

        await orderDataPromise;

        expect(mockGetProducts).toHaveBeenCalledWith({
            params: {
                query: {
                    ids: ['prod-1'],
                    expand: ['images', 'variations'],
                    currency: 'USD',
                },
            },
        });
    });

    test('returns empty productsById when getProducts throws', async () => {
        const mockOrder: ShopperOrders.schemas['Order'] = {
            orderNo: 'ORD-1',
            productItems: [{ productId: 'prod-1', itemId: 'item-1' }],
        } as ShopperOrders.schemas['Order'];
        mockGetOrder.mockResolvedValue({ data: mockOrder });
        mockGetProducts.mockRejectedValue(new Error('API error'));

        const context = createTestContext({ currency: 'USD' });
        const { orderDataPromise } = fetchOrderWithProducts(context, 'ORD-1');

        const data = await orderDataPromise;

        expect(data.order).toEqual(mockOrder);
        expect(data.productsById).toEqual({});
    });

    test('orderDataPromise rejects when getOrder rejects', async () => {
        mockGetOrder.mockRejectedValue(new Error('Order not found'));

        const context = createTestContext({ currency: 'USD' });
        const { orderDataPromise } = fetchOrderWithProducts(context, 'ORD-999');

        await expect(orderDataPromise).rejects.toThrow('Order not found');
    });
});
