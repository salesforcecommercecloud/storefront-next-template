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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RouterContextProvider } from 'react-router';
import type { ShopperBasketsV2, ShopperOrders, ShopperStores } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients.server';
import { fetchStoresForBasket, fetchStoresForOrder } from './stores.server';

vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: vi.fn(),
}));

const mockedCreateApiClients = vi.mocked(createApiClients);

beforeEach(() => {
    vi.resetAllMocks();
});

describe('fetchStoresForBasket', () => {
    const context = {} as RouterContextProvider;

    const setupApiClients = (storesResponse: unknown) => {
        const getStores = vi.fn().mockResolvedValue(storesResponse);

        mockedCreateApiClients.mockReturnValue({
            shopperStores: {
                getStores,
            },
        } as never);

        return getStores;
    };

    it('returns empty map when no pickup stores are in the basket', async () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [{ shipmentId: 'delivery-1' }],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = await fetchStoresForBasket(context, basket);

        expect(result.size).toBe(0);
        expect(mockedCreateApiClients).not.toHaveBeenCalled();
    });

    it('fetches store data and returns a map keyed by store id', async () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                { shipmentId: 'pickup-2', c_fromStoreId: 'store-2' },
                { shipmentId: 'pickup-1', c_fromStoreId: 'store-1' },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const storeOne = { id: 'store-1', name: 'Store One' } as ShopperStores.schemas['Store'];
        const storeTwo = { id: 'store-2', name: 'Store Two' } as ShopperStores.schemas['Store'];

        const getStores = setupApiClients({
            data: {
                data: [storeTwo, storeOne],
            },
        });

        const result = await fetchStoresForBasket(context, basket);

        expect(mockedCreateApiClients).toHaveBeenCalledWith(context);
        expect(getStores).toHaveBeenCalledWith({
            params: {
                query: {
                    ids: 'store-1,store-2',
                },
            },
        });
        expect(result.size).toBe(2);
        expect(result.get('store-1')).toBe(storeOne);
        expect(result.get('store-2')).toBe(storeTwo);
    });

    it('returns empty map when API response is missing data', async () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [{ shipmentId: 'pickup-1', c_fromStoreId: 'store-1' }],
        } as ShopperBasketsV2.schemas['Basket'];

        setupApiClients({ data: undefined });

        const result = await fetchStoresForBasket(context, basket);

        expect(result.size).toBe(0);
    });
});

describe('fetchStoresForOrder', () => {
    const context = {} as RouterContextProvider;

    const setupApiClients = (storesResponse: unknown) => {
        const getStores = vi.fn().mockResolvedValue(storesResponse);

        mockedCreateApiClients.mockReturnValue({
            shopperStores: {
                getStores,
            },
        } as never);

        return getStores;
    };

    it('returns empty map when no pickup stores are in the order', async () => {
        const order = {
            orderNo: 'order-1',
            shipments: [{ shipmentId: 'delivery-1' }],
        } as ShopperOrders.schemas['Order'];

        const result = await fetchStoresForOrder(context, order);

        expect(result.size).toBe(0);
        expect(mockedCreateApiClients).not.toHaveBeenCalled();
    });

    it('fetches store data and returns a map keyed by store id', async () => {
        const order = {
            orderNo: 'order-1',
            shipments: [
                { shipmentId: 'pickup-2', c_fromStoreId: 'store-2' },
                { shipmentId: 'pickup-1', c_fromStoreId: 'store-1' },
            ],
        } as ShopperOrders.schemas['Order'];

        const storeOne = { id: 'store-1', name: 'Store One' } as ShopperStores.schemas['Store'];
        const storeTwo = { id: 'store-2', name: 'Store Two' } as ShopperStores.schemas['Store'];

        const getStores = setupApiClients({
            data: {
                data: [storeTwo, storeOne],
            },
        });

        const result = await fetchStoresForOrder(context, order);

        expect(mockedCreateApiClients).toHaveBeenCalledWith(context);
        expect(getStores).toHaveBeenCalledWith({
            params: {
                query: {
                    ids: 'store-1,store-2',
                },
            },
        });
        expect(result.size).toBe(2);
        expect(result.get('store-1')).toBe(storeOne);
        expect(result.get('store-2')).toBe(storeTwo);
    });

    it('returns empty map when API response is missing data', async () => {
        const order = {
            orderNo: 'order-1',
            shipments: [{ shipmentId: 'pickup-1', c_fromStoreId: 'store-1' }],
        } as ShopperOrders.schemas['Order'];

        setupApiClients({ data: undefined });

        const result = await fetchStoresForOrder(context, order);

        expect(result.size).toBe(0);
    });
});
