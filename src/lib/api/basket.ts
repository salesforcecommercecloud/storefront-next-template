import { createApiClients } from '@/lib/api-clients';
import type { RouterContextProvider } from 'react-router';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { getConfig } from '@/config';

/**
 * Get the appropriate currency for basket calculations
 * Priority: basket.currency > site default > USD fallback
 */
export function getBasketCurrency(basket: ShopperBasketsV2.schemas['Basket'] | undefined): string {
    // 1. Use basket's current currency if available
    if (basket?.currency) {
        return basket.currency;
    }

    // 2. Use site configuration currency or 3. Fallback to USD for backward compatibility
    return import.meta.env.PUBLIC_SITE_CURRENCY || 'USD';
}

/**
 * Add a payment instrument to the basket using the Commerce API
 */
export async function addPaymentInstrumentToBasket(
    context: Readonly<RouterContextProvider>,
    basketId: string,
    paymentInstrument: ShopperBasketsV2.schemas['OrderPaymentInstrument']
): Promise<ShopperBasketsV2.schemas['Basket']> {
    const config = getConfig(context);
    const clients = createApiClients(context);
    const { data: basket } = await clients.shopperBasketsV2.addPaymentInstrumentToBasket({
        params: {
            path: { organizationId: config.commerce.api.organizationId, basketId },
            query: {
                siteId: config.commerce.api.siteId,
            },
        },
        body: paymentInstrument,
    });
    return basket;
}

/**
 * Update the billing address for the basket using the Commerce API
 */
export async function updateBillingAddressForBasket(
    context: Readonly<RouterContextProvider>,
    basketId: string,
    billingAddress: ShopperBasketsV2.schemas['OrderAddress']
): Promise<ShopperBasketsV2.schemas['Basket']> {
    const config = getConfig(context);
    const clients = createApiClients(context);
    const { data: basket } = await clients.shopperBasketsV2.updateBillingAddressForBasket({
        params: {
            path: { organizationId: config.commerce.api.organizationId, basketId },
            query: {
                siteId: config.commerce.api.siteId,
            },
        },
        body: billingAddress,
    });
    return basket;
}

/**
 * Calculate basket totals (taxes, shipping, order total) using the Commerce API
 * This triggers the Commerce Cloud calculation engine to compute all totals
 *
 * @param context - Router context for authentication
 * @param basketId - The basket ID to calculate
 * @param currency - Currency code (should come from basket.currency, defaults to USD for backward compatibility)
 */
export async function calculateBasket(
    context: Readonly<RouterContextProvider>,
    basketId: string,
    currency?: string
): Promise<ShopperBasketsV2.schemas['Basket']> {
    // If no currency is provided, let Commerce Cloud use the basket's existing currency
    // This is safer than hardcoding USD as it respects the basket's current currency setting
    const body: { currency?: string } = {};
    if (currency) {
        body.currency = currency;
    }

    // Use updateBasket with currency to trigger calculation
    // This follows the PWA Kit pattern - updating currency forces recalculation
    const config = getConfig(context);
    const clients = createApiClients(context);
    const { data: basket } = await clients.shopperBasketsV2.updateBasket({
        params: {
            path: { organizationId: config.commerce.api.organizationId, basketId },
            query: {
                siteId: config.commerce.api.siteId,
            },
        },
        body,
    });
    return basket;
}

/**
 * Merge guest basket with registered user basket
 * Call this after login completes to preserve guest cart items
 *
 * This uses transferBasket with merge=true which:
 * - Merges guest basket items into the registered user's basket
 * - Handles case where registered user has no active basket (creates one)
 * - Automatically finds the guest basket using the session's usid
 *
 * @param context - Router context for authentication
 * @returns The merged basket
 */
export async function mergeBasket(
    context: Readonly<RouterContextProvider>
): Promise<ShopperBasketsV2.schemas['Basket']> {
    const config = getConfig(context);
    const clients = createApiClients(context);
    const { data: basket } = await clients.shopperBasketsV2.transferBasket({
        params: {
            path: {
                organizationId: config.commerce.api.organizationId,
            },
            query: {
                siteId: config.commerce.api.siteId,
                overrideExisting: true,
            },
        },
    });
    return basket;
}
