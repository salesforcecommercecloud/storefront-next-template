/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClientLoaderFunctionArgs } from 'react-router';
import type { ShopperBasketsV2, ShopperOrders, ShopperStores } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';
import { fetchStoresForBasket, fetchStoresForOrder } from './stores';

vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(),
}));

vi.mock('@/config', () => ({
    getConfig: vi.fn(),
}));

const mockedCreateApiClients = vi.mocked(createApiClients);
const mockedGetConfig = vi.mocked(getConfig);

beforeEach(() => {
    vi.resetAllMocks();
});

describe('fetchStoresForBasket', () => {
    const context = {} as ClientLoaderFunctionArgs['context'];

    const setupApiClients = (storesResponse: unknown) => {
        mockedGetConfig.mockReturnValue({
            commerce: {
                api: {
                    organizationId: 'org-123',
                    siteId: 'site-456',
                },
            },
        } as never);

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
        expect(mockedGetConfig).not.toHaveBeenCalled();
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

        expect(mockedGetConfig).toHaveBeenCalledWith(context);
        expect(mockedCreateApiClients).toHaveBeenCalledWith(context);
        expect(getStores).toHaveBeenCalledWith({
            params: {
                path: {
                    organizationId: 'org-123',
                },
                query: {
                    siteId: 'site-456',
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
    const context = {} as ClientLoaderFunctionArgs['context'];

    const setupApiClients = (storesResponse: unknown) => {
        mockedGetConfig.mockReturnValue({
            commerce: {
                api: {
                    organizationId: 'org-123',
                    siteId: 'site-456',
                },
            },
        } as never);

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
        expect(mockedGetConfig).not.toHaveBeenCalled();
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

        expect(mockedGetConfig).toHaveBeenCalledWith(context);
        expect(mockedCreateApiClients).toHaveBeenCalledWith(context);
        expect(getStores).toHaveBeenCalledWith({
            params: {
                path: {
                    organizationId: 'org-123',
                },
                query: {
                    siteId: 'site-456',
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
