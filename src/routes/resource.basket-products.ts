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
/**
 * Resource route to fetch full product details for basket items
 * Called by the mini cart to enrich basket items with images and variation data
 */

import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { getBasket } from '@/middlewares/basket.server';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';
import { currencyContext } from '@/lib/currency';

/**
 * Fetches full product details for all items in the basket
 * Returns a mapping of productId to full product data
 */
// eslint-disable-next-line custom/no-async-page-loader
export async function loader({
    context,
}: LoaderFunctionArgs): Promise<Record<string, ShopperProducts.schemas['Product']>> {
    const basket = (await getBasket(context)).current;

    if (!basket?.productItems?.length) {
        return {};
    }

    // Collect all product IDs from basket items
    const productIds = basket.productItems.map((item) => item.productId).filter((id): id is string => Boolean(id));

    if (productIds.length === 0) {
        return {};
    }

    try {
        const config = getConfig(context);
        const clients = createApiClients(context);
        const currency = context.get(currencyContext) as string;

        // Fetch product details
        const { data: productsData } = await clients.shopperProducts.getProducts({
            params: {
                path: {
                    organizationId: config.commerce.api.organizationId,
                },
                query: {
                    siteId: config.commerce.api.siteId,
                    ids: productIds,
                    allImages: true,
                    perPricebook: true,
                    ...(currency ? { currency } : {}),
                },
            },
        });

        if (!productsData?.data) {
            return {};
        }

        // Create a map of productId to full product data
        return productsData.data.reduce(
            (acc, product) => {
                acc[product.id] = product;
                return acc;
            },
            {} as Record<string, ShopperProducts.schemas['Product']>
        );
    } catch {
        // Return empty object on error - mini cart will show basic data
        return {};
    }
}
