import { createContext } from 'react-router';

/**
 * Format a number as a currency string
 * @param price - The price to format
 * @param locale - The locale to use for formatting (default: en-US)
 * @param currency - The currency code to use (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(price: number, locale = 'en-US', currency = 'USD'): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        // this will keep the currency to use symbol for currency (e.g $113 instead of USD 113) for all locale.
        currencyDisplay: 'narrowSymbol',
    }).format(price);
}

/**
 * Base currency cookie name
 */
export const COOKIE_CURRENCY = 'currency';

/**
 * Context key for currency data (shared between server middleware and client code)
 */
export const currencyContext = createContext<string | null>(null);
