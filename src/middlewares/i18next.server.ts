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
import { initReactI18next } from 'react-i18next';
import { createI18nextMiddleware } from 'remix-i18next/middleware';
import { type MiddlewareFunction } from 'react-router';
import resources from '@/locales'; // Import translations from all of your locales - SERVER ONLY
import 'i18next';
import { i18nextContext } from '@/lib/i18next';
import { requestToLocaleMap } from '@salesforce/storefront-next-runtime/site-context';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { getLogger } from '@/lib/logger.server';

// Lazy-initialized on first request so we can read supported languages from config
// rather than hard-coding them. Contains [middleware, getLocale, getInstance].
let cached: ReturnType<typeof createI18nextMiddleware> | null = null;

const i18nextMiddleware: MiddlewareFunction<Response> = async (args, next) => {
    const logger = getLogger(args.context);

    if (!cached) {
        const config = getConfig<AppConfig>(args.context);
        const { supportedLngs: supportedLanguages, fallbackLng: fallbackLanguage } = config.i18n;

        logger.debug('I18next: initializing middleware (first request)', {
            supportedLanguages,
            fallbackLanguage,
        });

        cached = createI18nextMiddleware({
            detection: {
                order: ['custom'],
                // eslint-disable-next-line @typescript-eslint/require-await
                findLocale: async (request: Request) => {
                    const localeId = requestToLocaleMap.get(request);
                    return localeId ?? null;
                },
                fallbackLanguage,
                supportedLanguages,
            },
            i18next: {
                resources,
                interpolation: {
                    escapeValue: false,
                    format: (value, format) => {
                        if (format === 'number' && typeof value === 'number') {
                            return value.toLocaleString();
                        }
                        return value;
                    },
                },
            },
            plugins: [initReactI18next],
        });
    }

    const [originalI18nextMiddleware, getLocale, getInstance] = cached;

    // Store bound accessor functions in context (bound to args.context)
    // These will be called AFTER originalI18nextMiddleware sets up i18next
    args.context.set(i18nextContext, {
        getLocale: () => getLocale(args.context),
        getI18nextInstance: () => getInstance(args.context),
    });

    const localeId = requestToLocaleMap.get(args.request);
    logger.debug('I18next: middleware starting', { locale: localeId ?? 'unknown' });

    return originalI18nextMiddleware(args, next);
};

export { i18nextMiddleware };

// This adds type-safety to the `t` function throughout the application
declare module 'i18next' {
    interface CustomTypeOptions {
        resources: (typeof resources)['en-GB']; // Use `en-GB` as source of truth for the types
    }
}
