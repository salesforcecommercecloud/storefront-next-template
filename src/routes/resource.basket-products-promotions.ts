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
import { getBasket } from '@/middlewares/basket.server';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';
import type { ProductWithPromotions } from '@/hooks/use-basket-with-promotions';

/**
 * Fetches product promotion data for all items in the basket
 * Returns a mapping of productId to product data with promotions
 */
// eslint-disable-next-line custom/no-async-page-loader
export async function loader({ context }: LoaderFunctionArgs): Promise<Record<string, ProductWithPromotions>> {
    const basket = (await getBasket(context)).current;

    if (!basket?.productItems?.length) {
        return {};
    }

    // Collect all unique product IDs from basket items
    const productIds = basket.productItems.map((item) => item.productId).filter((id): id is string => Boolean(id));
    const uniqueProductIds = [...new Set(productIds)];

    if (uniqueProductIds.length === 0) {
        return {};
    }

    try {
        const config = getConfig(context);
        const clients = createApiClients(context);

        // Fetch product details with promotions expanded
        const { data: productsData } = await clients.shopperProducts.getProducts({
            params: {
                path: {
                    organizationId: config.commerce.api.organizationId,
                },
                query: {
                    siteId: config.commerce.api.siteId,
                    ids: uniqueProductIds,
                    expand: ['promotions'],
                    perPricebook: true,
                    allImages: false,
                },
            },
        });

        if (!productsData?.data) {
            return {};
        }

        // Create a map of productId to product data with promotions
        return productsData.data.reduce(
            (acc, product) => {
                acc[product.id] = product as ProductWithPromotions;
                return acc;
            },
            {} as Record<string, ProductWithPromotions>
        );
    } catch {
        // Return empty object on error - component will not show callout text
        return {};
    }
}
