import type { MiddlewareFunction, DataStrategyResult } from 'react-router';
import { getCookie } from '@/lib/cookies.client';
import { currencyContext, COOKIE_CURRENCY } from '@/lib/currency';
import { getConfig } from '@/config';
import { getTranslation } from '@/lib/i18next';

/**
 * Client-side middleware to read currency cookie and store it in context
 * Mirrors the server middleware behavior
 */
export const currencyClientMiddleware: MiddlewareFunction<Record<string, DataStrategyResult>> = async (
    { context },
    next
) => {
    try {
        const config = getConfig(context);
        const { i18next } = getTranslation(context);
        const currentLocale = i18next.language ?? config.i18n.fallbackLng;

        // Use cookie utilities to read currency (automatically handles namespacing)
        const userCurrency = getCookie(COOKIE_CURRENCY) || null;

        // Validate and determine final currency
        let currency: string;
        if (userCurrency && config.site.supportedCurrencies.includes(userCurrency)) {
            currency = userCurrency;
        } else {
            // Fallback to locale's preferred currency or default
            const supportedLocale = config.site.supportedLocales.find(
                (loc: { id: string; preferredCurrency: string }) => loc.id === currentLocale
            );
            currency = supportedLocale?.preferredCurrency ?? config.site.currency;
        }

        // Store in context (same as server middleware)
        context.set(currencyContext, currency);
    } catch {
        // On error, set to default to prevent failures
        const config = getConfig(context);
        context.set(currencyContext, config.site.currency);
    }

    return next();
};
