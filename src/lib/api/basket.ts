import createClient from '@/lib/scapi';
import type { RouterContextProvider } from 'react-router';
import type { ShopperBasketsTypes } from 'commerce-sdk-isomorphic';

/**
 * Get the appropriate currency for basket calculations
 * Priority: basket.currency > site default > USD fallback
 */
export function getBasketCurrency(basket: ShopperBasketsTypes.Basket | undefined): string {
    // 1. Use basket's current currency if available
    if (basket?.currency) {
        return basket.currency;
    }

    // 2. Use site configuration currency or 3. Fallback to USD for backward compatibility
    return import.meta.env.VITE_SITE_CURRENCY || 'USD';
}

/**
 * Add a payment instrument to the basket using the Commerce API
 */
export async function addPaymentInstrumentToBasket(
    context: Readonly<RouterContextProvider>,
    basketId: string,
    paymentInstrument: ShopperBasketsTypes.OrderPaymentInstrument
): Promise<ShopperBasketsTypes.Basket> {
    return createClient(context).ShopperBaskets.addPaymentInstrumentToBasket({
        parameters: { basketId },
        body: paymentInstrument,
    });
}

/**
 * Update the billing address for the basket using the Commerce API
 */
export async function updateBillingAddressForBasket(
    context: Readonly<RouterContextProvider>,
    basketId: string,
    billingAddress: ShopperBasketsTypes.OrderAddress
): Promise<ShopperBasketsTypes.Basket> {
    return createClient(context).ShopperBaskets.updateBillingAddressForBasket({
        parameters: { basketId },
        body: billingAddress,
    });
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
): Promise<ShopperBasketsTypes.Basket> {
    // If no currency is provided, let Commerce Cloud use the basket's existing currency
    // This is safer than hardcoding USD as it respects the basket's current currency setting
    const body: { currency?: string } = {};
    if (currency) {
        body.currency = currency;
    }

    // Use updateBasket with currency to trigger calculation
    // This follows the PWA Kit pattern - updating currency forces recalculation
    return createClient(context).ShopperBaskets.updateBasket({
        parameters: { basketId },
        body,
    });
}
