/**
 * Resource route to fetch full product details for basket items
 * Called by the mini cart to enrich basket items with images and variation data
 */

import type { ClientLoaderFunctionArgs, LoaderFunctionArgs } from 'react-router';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { getBasket } from '@/middlewares/basket.client';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';
import { currencyContext } from '@/lib/currency';

/**
 * Fetches full product details for all items in the basket
 * Returns a mapping of productId to full product data
 */
async function fetchBasketProducts(
    context: LoaderFunctionArgs['context']
): Promise<Record<string, ShopperProducts.schemas['Product']>> {
    const basket = getBasket(context);

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

export function loader({ context }: LoaderFunctionArgs) {
    return fetchBasketProducts(context);
}

// eslint-disable-next-line custom/no-client-loaders
export function clientLoader({ context }: ClientLoaderFunctionArgs) {
    return fetchBasketProducts(context);
}
