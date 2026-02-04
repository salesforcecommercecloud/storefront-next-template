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
import { createContext } from 'react-router';

const formatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Format a number as a currency string
 * @param price - The price to format
 * @param locale - The locale to use for formatting (default: en-US)
 * @param currency - The currency code to use (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(price: number, locale = 'en-US', currency = 'USD'): string {
    const key = `${locale}:${currency}`;
    if (!formatterCache.has(key)) {
        formatterCache.set(
            key,
            new Intl.NumberFormat(locale, {
                style: 'currency',
                currency,
                // this will keep the currency to use symbol for currency (e.g., $113 instead of USD 113) for all locales
                currencyDisplay: 'narrowSymbol',
            })
        );
    }
    return (formatterCache.get(key) as Intl.NumberFormat).format(price);
}

/**
 * Base currency cookie name
 */
export const COOKIE_CURRENCY = 'currency';

/**
 * Context key for currency data (shared between server middleware and client code)
 */
export const currencyContext = createContext<string | null>(null);
