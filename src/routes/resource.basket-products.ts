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
import { createApiClients } from '@/lib/api-clients.server';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { siteContext } from '@salesforce/storefront-next-runtime/site-context';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { getInventoryIdsFromPickupShipments } from '@/extensions/bopis/lib/basket-utils';
// @sfdc-extension-block-end SFDC_EXT_BOPIS
import { getLogger } from '@/lib/logger.server';

/**
 * Fetches full product details for all items in the basket
 * Returns a mapping of productId to full product data
 */
export async function loader({
    context,
}: LoaderFunctionArgs): Promise<Record<string, ShopperProducts.schemas['Product']>> {
    const logger = getLogger(context);
    logger.debug('BasketProducts: loader starting');
    const basket = (await getBasket(context)).current;

    if (!basket?.productItems?.length) {
        logger.debug('BasketProducts: no product items in basket');
        return {};
    }

    // Collect all product IDs from basket items
    const productIds = basket.productItems.map((item) => item.productId).filter((id): id is string => Boolean(id));

    if (productIds.length === 0) {
        logger.debug('BasketProducts: no valid product IDs found');
        return {};
    }

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    // Collect unique inventory IDs from pickup shipments to fetch store-level inventory
    const inventoryIds = getInventoryIdsFromPickupShipments(basket);
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    try {
        const config = getConfig<AppConfig>(context);
        const clients = createApiClients(context);
        const siteCtx = context.get(siteContext);
        if (!siteCtx) {
            logger.error('BasketProducts: site context is not available');
            throw new Response('Site context is not available', { status: 500 });
        }
        const { site, currency } = siteCtx;

        // Fetch product details
        const { data: productsData } = await clients.shopperProducts.getProducts({
            params: {
                path: {
                    organizationId: config.commerce.api.organizationId,
                },
                query: {
                    siteId: site.id,
                    ids: productIds,
                    allImages: true,
                    perPricebook: true,
                    ...(currency ? { currency } : {}),
                    // @sfdc-extension-block-start SFDC_EXT_BOPIS
                    // Include store inventory IDs for pickup items
                    ...(inventoryIds.length > 0 ? { inventoryIds } : {}),
                    // @sfdc-extension-block-end SFDC_EXT_BOPIS
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
    } catch (error) {
        logger.error('BasketProducts: failed to fetch product details', { error });
        // Return empty object on error - mini cart will show basic data
        return {};
    }
}
