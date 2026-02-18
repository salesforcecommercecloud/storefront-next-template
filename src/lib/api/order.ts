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
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperOrders, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';
import { currencyContext } from '@/lib/currency';

export type OrderProductDataById = Record<string, ShopperProducts.schemas['Product'] | undefined>;

export type OrderWithProducts = {
    order: ShopperOrders.schemas['Order'];
    productsById: OrderProductDataById;
};

/**
 * Result of fetchOrderWithProducts: orderDataPromise (order + products) and orderPromise (order only).
 * Exposing orderPromise allows callers (e.g. order-confirmation) to start dependent work (e.g. BOPIS stores)
 * as soon as the order is available, in parallel with the products fetch.
 */
export type FetchOrderWithProductsResult = {
    orderDataPromise: Promise<OrderWithProducts>;
    orderPromise: Promise<ShopperOrders.schemas['Order']>;
};

/**
 * Fetches an order by number and its product details (images, variations).
 * Uses the same promise chain as the original order-confirmation loader: order first,
 * then products and any dependent work (e.g. BOPIS stores) can run in parallel.
 *
 * @param context - React Router loader context (for API clients and currency)
 * @param orderNo - Order number from route params
 * @returns { orderDataPromise, orderPromise }. Both promises reject if the order is not found (e.g. 404).
 */
export function fetchOrderWithProducts(
    context: LoaderFunctionArgs['context'],
    orderNo: string
): FetchOrderWithProductsResult {
    const clients = createApiClients(context);
    const currency = context.get(currencyContext) as string;

    const orderPromise = clients.shopperOrders
        .getOrder({
            params: {
                path: { orderNo },
            },
        })
        .then(({ data }) => data);

    const productsByIdPromise: Promise<OrderProductDataById> = orderPromise.then(async (order) => {
        const productIds = Array.from(
            new Set(
                (order.productItems ?? [])
                    .map((item) => item.productId)
                    .filter((id): id is string => typeof id === 'string' && id.length > 0)
            )
        );

        if (!productIds.length) {
            return {};
        }

        try {
            const { data } = await clients.shopperProducts.getProducts({
                params: {
                    query: {
                        ids: productIds,
                        expand: ['images', 'variations'],
                        currency,
                    },
                },
            });

            const productsById: OrderProductDataById = {};
            (data?.data ?? []).forEach((product) => {
                productsById[product.id] = product;
            });
            return productsById;
        } catch {
            // Return empty object on error - allows the page to render without product details
            return {};
        }
    });

    const orderDataPromise = Promise.all([orderPromise, productsByIdPromise]).then(([order, productsById]) => ({
        order,
        productsById,
    }));

    return { orderDataPromise, orderPromise };
}
