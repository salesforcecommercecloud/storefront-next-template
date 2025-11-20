/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ClientLoaderFunctionArgs } from 'react-router';
import type { ShopperBasketsV2, ShopperOrders, ShopperStores } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';
import { getStoreIdsFromBasket } from '@/extensions/bopis/lib/basket-utils';
import { getStoreIdsFromOrder } from '@/extensions/bopis/lib/order-utils';

/**
 * Fetches store details for a list of store IDs.
 *
 * This function fetches the corresponding store data from the Commerce API.
 * @param context - Router context
 * @param storeIds - Store IDs to fetch stores for
 * @returns Promise that resolves to a Map of store IDs to store data
 */
export async function fetchStores(
    context: ClientLoaderFunctionArgs['context'],
    storeIds: string[]
): Promise<Map<string, ShopperStores.schemas['Store']>> {
    // Early return if no stores found
    if (storeIds.length === 0) {
        return new Map();
    }

    // Fetch store details for all unique store IDs
    const config = getConfig(context);
    const clients = createApiClients(context);
    const { data: storesData } = await clients.shopperStores.getStores({
        params: {
            path: {
                organizationId: config.commerce.api.organizationId,
            },
            query: {
                siteId: config.commerce.api.siteId,
                ids: storeIds.join(','),
            },
        },
    });

    if (!storesData?.data) {
        return new Map();
    }

    // Transform API response into a Map: storeId → store details
    const storesMap = new Map<string, ShopperStores.schemas['Store']>();
    storesData.data.forEach((store) => {
        if (store.id) {
            storesMap.set(store.id, store);
        }
    });

    return storesMap;
}

/**
 * Fetches store details for all pickup stores in the basket.
 *
 * This function extracts unique store IDs from basket shipments that have
 * c_fromStoreId set (indicating store pickup) and fetches the corresponding
 * store data from the Commerce API.
 * @param context - Router context
 * @param basket - Basket to fetch stores for
 * @returns Promise that resolves to a Map of store IDs to store data
 */
export async function fetchStoresForBasket(
    context: ClientLoaderFunctionArgs['context'],
    basket: ShopperBasketsV2.schemas['Basket'] | null | undefined
): Promise<Map<string, ShopperStores.schemas['Store']>> {
    const storeIds = getStoreIdsFromBasket(basket);
    return fetchStores(context, storeIds);
}

/**
 * Fetches store details for all pickup stores in the order.
 *
 * This function extracts unique store IDs from order shipments that have
 * c_fromStoreId set (indicating store pickup) and fetches the corresponding
 * store data from the Commerce API.
 * @param context - Router context
 * @param order - Order to fetch stores for
 * @returns Promise that resolves to a Map of store IDs to store data
 */
export async function fetchStoresForOrder(
    context: ClientLoaderFunctionArgs['context'],
    order: ShopperOrders.schemas['Order'] | null | undefined
): Promise<Map<string, ShopperStores.schemas['Store']>> {
    const storeIds = getStoreIdsFromOrder(order);
    return fetchStores(context, storeIds);
}
