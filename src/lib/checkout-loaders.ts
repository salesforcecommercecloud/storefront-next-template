/**
 * React Router checkout loaders for server-side and client-side data fetching
 *
 * This module provides React Router loader functions for the checkout route,
 * handling both server-side rendering and client-side data fetching with
 * automatic fallbacks and optimized performance.
 */

import type { LoaderFunctionArgs, ClientLoaderFunctionArgs } from 'react-router';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import type { CustomerProfile } from '@/components/checkout/utils/checkout-context-types';
import type { SessionData } from '@/lib/api/types';
import { getAuth as getAuthClient } from '@/middlewares/auth.client';
import { getBasket } from '@/middlewares/basket.client';
import { getCustomerProfileForCheckout, isRegisteredCustomer } from '@/lib/api/customer';
import { getShippingMethodsForShipment } from '@/lib/api/shipping-methods';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';

/**
 * Checkout page data type
 */
export type CheckoutPageData = {
    shippingMethods?: Promise<ShopperBasketsV2.schemas['ShippingMethodResult'] | null>;
    customerProfile?: Promise<CustomerProfile | null>;
    productMap: Promise<Record<string, ShopperProducts.schemas['Product']>>;
    isRegisteredCustomer?: boolean;
};

/**
 * Server-side customer profile fetcher
 * Optimized to reduce dynamic imports
 * Exported for use in route loaders
 */
export function getServerCustomerProfileData(
    context: LoaderFunctionArgs['context'],
    authSession: SessionData | null
): Promise<CustomerProfile | null> {
    try {
        if (!authSession || !authSession.customer_id || authSession.userType !== 'registered') {
            return Promise.resolve(null);
        }

        // Single dynamic import for server utils
        return import('@/lib/checkout-server-utils')
            .then(({ getServerCustomerProfile }) => getServerCustomerProfile(context, authSession))
            .catch(() => null);
    } catch {
        return Promise.resolve(null);
    }
}

/**
 * Server-side shipping methods fetcher. Exported for use in route loaders.
 */
export function getServerShippingMethodsData(
    _context: LoaderFunctionArgs['context'],
    authSession: SessionData | null
): Promise<ShopperBasketsV2.schemas['ShippingMethodResult'] | null> {
    // Always return null, client loader will handle shipping methods
    if (!authSession) {
        return Promise.resolve(null);
    }
    return Promise.resolve(null);
}

/**
 * Fetches detailed product information for all items in a shopping basket.
 *
 * This function retrieves product details including images, pricing, and attributes
 * for each product in the basket. It creates a mapping from basket item IDs to
 * their corresponding product data for efficient lookup in the UI.
 * @returns Promise that resolves to a mapping of item IDs to product data.
 */
async function fetchProductsInBasket(
    context: ClientLoaderFunctionArgs['context'],
    productItems: ShopperBasketsV2.schemas['ProductItem'][]
): Promise<Record<string, ShopperProducts.schemas['Product']>> {
    // Main product IDs from basket items
    const ids = productItems.map((item) => item.productId ?? '').filter(Boolean);
    if (!ids.length) {
        return {};
    }

    const config = getConfig(context);
    const clients = createApiClients(context);
    const { data: productsData } = await clients.shopperProducts.getProducts({
        params: {
            path: {
                organizationId: config.commerce.api.organizationId,
            },
            query: {
                siteId: config.commerce.api.siteId,
                ids,
                allImages: true,
                perPricebook: true,
            },
        },
    });

    if (!productsData.data) {
        return {};
    }

    const products = productsData.data.reduce(
        (acc, product) => {
            acc[product.id] = product;
            return acc;
        },
        {} as Record<string, ShopperProducts.schemas['Product']>
    );

    // Create productsByItemId mapping
    const productsByItemId: Record<string, ShopperProducts.schemas['Product']> = {};
    productItems.forEach((productItem) => {
        if (productItem?.productId && productItem.itemId && products[productItem.productId]) {
            productsByItemId[productItem.itemId] = products[productItem.productId];
        }
    });
    return productsByItemId;
}

/**
 * Handles basket prefill for returning customers and returns updated basket
 *
 * IMPORTANT: Returns the updated basket (not the profile) because:
 * - The clientLoader needs the updated basket to check for shipping address
 * - After prefill, basket.shipments[0].shippingAddress is populated
 * - This allows clientLoader to correctly determine if shipping methods should be fetched
 *
 * @param context - Client loader context
 * @param profile - Customer profile with saved addresses/payment methods
 * @returns Updated basket with prefilled data, or current basket if no prefill needed
 */
async function handleBasketPrefill(
    context: ClientLoaderFunctionArgs['context'],
    profile: CustomerProfile
): Promise<ShopperBasketsV2.schemas['Basket'] | null> {
    try {
        const { shouldPrefillBasket, initializeBasketForReturningCustomer } = await import(
            '@/components/checkout/utils/checkout-utils'
        );
        const currentBasket = getBasket(context);

        if (shouldPrefillBasket(currentBasket, profile)) {
            // Prefill basket with customer's saved data (email, shipping address, billing address)
            const updatedBasket = await initializeBasketForReturningCustomer(context, profile);
            return updatedBasket;
        }

        // No prefill needed - basket already has required data
        return currentBasket;
    } catch {
        // Basket prefill failed, return current basket and continue
        // Better to show checkout without prefill than to fail completely
        return getBasket(context);
    }
}

/**
 * Client loader function for React Router
 *
 * IMPORTANT: This loader is async for a critical reason:
 *
 * For returning customers, we MUST prefill the basket before checking for shipping methods. The sequence is:
 * 1. Fetch customer profile (await - needed to get saved addresses)
 * 2. Prefill basket with saved address (await - updates basket.shipments[0].shippingAddress)
 * 3. Check if basket has shipping address. This is necessary to fetch applicable shipping methods for this address
 * 4. Fetch shipping methods for the prefilled address
 *
 * Performance trade-off:
 * Although it blocks for some time in the returning/registered shoppers case (profile fetch + basket prefill), this is
 * necessary to compute shippingMethods. Shipping methods and products still stream after loader returns.
 * Alternative options (such as promise chaining) have additional complexity and they don't improve performance either
 *
 * @returns CheckoutPageData with promises for streaming (shippingMethods, customerProfile, productMap)
 */
export async function clientLoader(args: ClientLoaderFunctionArgs): Promise<CheckoutPageData> {
    try {
        const { context } = args;
        const basket = getBasket(context);
        const userIsRegistered = isRegisteredCustomer(context);
        const session = getAuthClient(context);

        // Fetch product details for cart items display
        const productMapPromise = fetchProductsInBasket(context, basket?.productItems ?? []);

        // IMPORTANT: For returning shopper must prefill basket before fetching shipping methods
        if (userIsRegistered && session.customer_id) {
            // Step 1: Fetch customer profile (await for saved addresses)
            const customerProfile = await getCustomerProfileForCheckout(context, session.customer_id).catch(() => null);

            if (customerProfile) {
                // Step 2: Prefill basket with saved address (await for basket update)
                // If we don't wait, basket.shipments[0].shippingAddress is still undefined
                const updatedBasket = await handleBasketPrefill(context, customerProfile);

                // Step 3: check for shipping address
                const shippingMethodsPromise =
                    updatedBasket?.basketId && updatedBasket.shipments?.[0]?.shippingAddress
                        ? getShippingMethodsForShipment(context, updatedBasket.basketId)
                        : undefined;

                // Return with promises for streaming
                return {
                    ...(shippingMethodsPromise && { shippingMethods: shippingMethodsPromise }),
                    customerProfile: Promise.resolve(customerProfile),
                    productMap: productMapPromise,
                    isRegisteredCustomer: true,
                };
            }
        }

        // For guest users, basket might already have shipping address from previous steps
        const shippingMethodsPromise =
            basket?.basketId && basket.shipments?.[0]?.shippingAddress
                ? getShippingMethodsForShipment(context, basket.basketId)
                : undefined;

        return {
            ...(shippingMethodsPromise && { shippingMethods: shippingMethodsPromise }),
            productMap: productMapPromise,
            isRegisteredCustomer: false,
        };
    } catch {
        // Fallback to empty data on any error
        return {
            productMap: Promise.resolve({}),
            isRegisteredCustomer: false,
        };
    }
}
