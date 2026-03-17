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
        const currentSite = config.commerce.sites[0];
        const { i18next } = getTranslation(context);
        const currentLocale = i18next.language ?? config.i18n.fallbackLng;

        // Use cookie utilities to read currency (automatically handles namespacing)
        const userCurrency = getCookie(COOKIE_CURRENCY) || null;

        // Validate and determine final currency
        let currency: string;
        if (userCurrency && currentSite.supportedCurrencies.includes(userCurrency)) {
            currency = userCurrency;
        } else {
            // Fallback to locale's preferred currency or default
            const supportedLocale = currentSite.supportedLocales.find(
                (loc: { id: string; preferredCurrency: string }) => loc.id === currentLocale
            );
            const defaultLocaleConfig = currentSite.supportedLocales.find(
                (loc) => loc.id === currentSite.defaultLocale
            );
            currency = supportedLocale?.preferredCurrency ?? defaultLocaleConfig?.preferredCurrency ?? 'USD';
        }

        // Store in context (same as server middleware)
        context.set(currencyContext, currency);
    } catch {
        // On error, set to default to prevent failures
        const config = getConfig(context);
        // this will change when multi site implementation is done, for now use first site on the list
        const currentSite = config.commerce.sites[0];
        const defaultLocaleConfig = currentSite.supportedLocales.find(
            (loc) => loc.id === config.commerce.sites[0].defaultLocale
        );
        context.set(
            currencyContext,
            defaultLocaleConfig?.preferredCurrency ?? config.commerce.sites[0].defaultCurrency
        );
    }

    return next();
};
