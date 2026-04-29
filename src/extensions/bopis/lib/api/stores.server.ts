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

import type { RouterContextProvider } from 'react-router';
import type { ShopperBasketsV2, ShopperOrders, ShopperStores } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients.server';
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
    context: Readonly<RouterContextProvider>,
    storeIds: string[]
): Promise<Map<string, ShopperStores.schemas['Store']>> {
    // Early return if no stores found
    if (storeIds.length === 0) {
        return new Map();
    }

    // Fetch store details for all unique store IDs
    const clients = createApiClients(context);
    const { data: storesData } = await clients.shopperStores.getStores({
        params: {
            query: {
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
    context: Readonly<RouterContextProvider>,
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
    context: Readonly<RouterContextProvider>,
    order: ShopperOrders.schemas['Order'] | null | undefined
): Promise<Map<string, ShopperStores.schemas['Store']>> {
    const storeIds = getStoreIdsFromOrder(order);
    return fetchStores(context, storeIds);
}
