import { type MiddlewareFunction, createContext as createRouterContext } from 'react-router';
import { currencyContext, COOKIE_CURRENCY } from '@/lib/currency';
import { getConfig } from '@/config';
import { i18nextContext } from '@/lib/i18next';
import { createCookie } from '@/lib/cookies.server';
import { getCookieConfig } from '@/lib/cookie-utils';

/**
 * Currency storage context for tracking updates (like authStorageContext)
 */
export const currencyStorageContext = createRouterContext<Map<string, string | boolean> | null>(null);

/**
 * Currency cookie instance (exported for reuse)
 * Uses server-side cookie utilities with proper namespacing
 */
export const createCurrencyCookie = (context: Parameters<MiddlewareFunction>[0]['context']) => {
    return createCookie(
        COOKIE_CURRENCY,
        getCookieConfig(
            {
                path: '/',
                maxAge: 60 * 60 * 24 * 365, // 1 year
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                httpOnly: false, // Client needs to read for middleware
            },
            context
        ),
        context
    );
};

/**
 * Update currency in storage (like updateAuth)
 * Used by actions to trigger cookie setting in middleware
 */
export const updateCurrency = (context: Parameters<MiddlewareFunction>[0]['context'], currency: string) => {
    const storage = context.get(currencyStorageContext);
    if (!storage) {
        throw new Error('updateCurrency must be used within currency middleware');
    }

    storage.set('currency', currency);
    storage.set('isUpdated', true);
};

/**
 * Middleware to resolve currency and store it in context
 * Priority: Cookie → Locale's preferred currency → Site default
 * This must run AFTER i18next middleware to access locale
 */
export const currencyMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
    // Before calling the handler: Set fallback currency from cookies or defaults
    try {
        const config = getConfig(context);
        const currencyCookie = createCurrencyCookie(context);

        // Create currency storage (like authStorage)
        const currencyStorage = new Map<string, string | boolean>();
        context.set(currencyStorageContext, currencyStorage);

        // Try to read currency from cookie
        const cookieHeader = request.headers.get('Cookie');
        const userCurrency = cookieHeader ? await currencyCookie.parse(cookieHeader) : null;

        // Validate and use cookie currency if valid
        if (
            userCurrency &&
            typeof userCurrency === 'string' &&
            config.site.supportedCurrencies.includes(userCurrency)
        ) {
            context.set(currencyContext, userCurrency);
        } else {
            // Fallback: Get locale from i18next context to determine preferred currency
            const i18nextData = context.get(i18nextContext);
            if (i18nextData) {
                const currentLocale = i18nextData.getLocale();
                const supportedLocale = config.site.supportedLocales.find(
                    (loc: { id: string; preferredCurrency: string }) => loc.id === currentLocale
                );
                if (supportedLocale?.preferredCurrency) {
                    context.set(currencyContext, supportedLocale.preferredCurrency);
                } else {
                    // Final fallback: Use site default currency
                    context.set(currencyContext, config.site.currency);
                }
            } else {
                // Final fallback: Use site default currency
                context.set(currencyContext, config.site.currency);
            }
        }
    } catch {
        // On error, set to default to prevent loader failures
        const config = getConfig(context);
        context.set(currencyContext, config.site.currency);
    }

    // Execute handler (loader/action/render)
    const response = await next();

    // After calling the handler: Check if currency was updated and set cookie
    try {
        const currencyStorage = context.get(currencyStorageContext);
        if (currencyStorage?.has('isUpdated')) {
            // Clean up storage metadata
            currencyStorage.delete('isUpdated');

            const updatedCurrency = currencyStorage.get('currency') as string;
            if (updatedCurrency) {
                const config = getConfig(context);

                // Validate the currency
                if (config.site.supportedCurrencies.includes(updatedCurrency)) {
                    // Set currency cookie automatically
                    const currencyCookie = createCurrencyCookie(context);
                    const cookieHeader = await currencyCookie.serialize(updatedCurrency);
                    response.headers.append('Set-Cookie', cookieHeader);

                    // Update context immediately for current request (triggers provider update)
                    context.set(currencyContext, updatedCurrency);
                }
            }
        }
    } catch {
        // If currency update fails, continue without setting cookie
        // This ensures middleware doesn't break the request
    }

    return response;
};
