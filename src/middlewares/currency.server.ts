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
import { type MiddlewareFunction, createContext as createRouterContext } from 'react-router';
import { currencyContext, COOKIE_CURRENCY } from '@/lib/currency';
import { siteContext } from '@salesforce/storefront-next-runtime/site-context';
import { createCookie, getCookieConfig } from '@/lib/cookie-utils';
import { getLogger } from '@/lib/logger.server';

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
 * Priority: Cookie → Locale's preferred currency → First supported currency
 * This must run AFTER site context middleware to access locale and site
 */
export const currencyMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
    const logger = getLogger(context);

    // Before calling the handler: Set currency from cookies or defaults
    const siteCtx = context.get(siteContext);
    if (!siteCtx) {
        logger.error('Currency: site context missing');
        throw new Error('Site context middleware must run before currency middleware');
    }

    const { site, locale } = siteCtx;

    const currencyCookie = createCurrencyCookie(context);

    // Create currency storage (like authStorage)
    const currencyStorage = new Map<string, string | boolean>();
    context.set(currencyStorageContext, currencyStorage);

    // Get supported currencies from site configuration
    const supportedCurrencies = site.supportedCurrencies;
    if (!supportedCurrencies || supportedCurrencies.length === 0) {
        logger.error('Currency: no supported currencies configured', { siteId: site.id });
        throw new Error(`Site "${site.id}" must have supportedCurrencies configured.`);
    }

    // Try to read currency from cookie
    let userSelectedCurrency: string | null = null;
    const requestCookieHeader = request.headers.get('Cookie');
    const parsedCookie = requestCookieHeader ? await currencyCookie.parse(requestCookieHeader) : null;
    userSelectedCurrency = typeof parsedCookie === 'string' ? parsedCookie : null;

    // Priority: Cookie → Locale's preferred currency → First supported currency
    let currency: string;
    let currencySource: string;
    if (userSelectedCurrency && supportedCurrencies.includes(userSelectedCurrency)) {
        currency = userSelectedCurrency;
        currencySource = 'cookie';
    } else if (locale.preferredCurrency && supportedCurrencies.includes(locale.preferredCurrency)) {
        currency = locale.preferredCurrency;
        currencySource = 'locale';
    } else {
        currency = site.defaultCurrency;
        currencySource = 'default';
    }

    logger.debug('Currency: resolved', { currency, source: currencySource });

    context.set(currencyContext, currency);

    // Execute handler (loader/action/render)
    const response = await next();

    // After calling the handler: Check if currency was updated and set cookie
    if (currencyStorage.has('isUpdated')) {
        // Clean up storage metadata
        currencyStorage.delete('isUpdated');

        const updatedCurrency = currencyStorage.get('currency') as string;
        if (updatedCurrency && supportedCurrencies.includes(updatedCurrency)) {
            // Set currency cookie automatically
            const setCurrencyCookieHeader = await currencyCookie.serialize(updatedCurrency);
            response.headers.append('Set-Cookie', setCurrencyCookieHeader);

            // Update context immediately for current request (triggers provider update)
            context.set(currencyContext, updatedCurrency);
            logger.info('Currency: updated via action', { currency: updatedCurrency });
        }
    }

    return response;
};
