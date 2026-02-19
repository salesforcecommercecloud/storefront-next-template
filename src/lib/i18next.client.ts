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
import i18next, { type i18n, type BackendModule, type ReadCallback, type ResourceLanguage } from 'i18next';
import { initReactI18next } from 'react-i18next';
import I18nextBrowserLanguageDetector from 'i18next-browser-languagedetector';

/**
 * Custom i18next backend that dynamically imports ALL translations for a particular language.
 * Dynamic imports cause Vite to code-split translations into separate chunks per language.
 * When a language is first needed, the browser fetches its JavaScript chunk as a static asset.
 * This is more efficient than API endpoints: no server processing, better caching, CDN-friendly.
 */
function createDynamicImportBackend(instance: i18n): BackendModule {
    return {
        type: 'backend',
        init() {
            // No initialization needed
        },
        // Dynamically import all translations for the language
        read(language: string, namespace: string, callback: ReadCallback) {
            import(`@/locales/${language}/index.ts`)
                .then((module: { default: ResourceLanguage }) => {
                    const translations = module.default;

                    // Store all namespaces in i18next's cache
                    Object.entries(translations).forEach(([ns, nsTranslations]) => {
                        instance.addResourceBundle(language, ns, nsTranslations, true, true);
                    });

                    // Return the requested namespace
                    callback(null, translations[namespace] || {});
                })
                .catch((error: Error) => {
                    callback(error, false);
                });
        },
    };
}

/**
 * Initialize i18next on the client side.
 * This dynamically imports ALL translations for the current language as static JavaScript chunks.
 * On the server side, i18next is initialized in middlewares/i18next.ts
 *
 * @param options - Optional configuration object
 * @param options.language - Optional explicit language to use. If provided, skips language detection.
 * @param options.instance - Optional i18next instance to use. If not provided, uses the global i18next instance.
 * @returns The initialized i18next instance
 */
export function initI18next(options?: { language?: string; instance?: i18n }): i18n {
    // NOTE: For any changes to this function, please verify that Vite HMR still works with translations

    const language = options?.language;
    const instance = options?.instance ?? i18next;

    // Set the language synchronously BEFORE initializing to prevent race conditions during hydration
    if (language) {
        instance.language = language;
    }

    const i18nextInstance = instance.use(initReactI18next).use(createDynamicImportBackend(instance));

    // Only use the language detector if no explicit language is provided
    if (!language) {
        i18nextInstance.use(I18nextBrowserLanguageDetector);
    }

    void i18nextInstance.init({
        ns: [], // Do not download any namespace during this init
        // NOTE: do not set the fallbackLng option, as the server-side middleware should've taken care of that.

        // If language is provided, use it directly. Otherwise, detect from html tag.
        ...(language
            ? {
                  lng: language,
              }
            : {
                  // Here we only want to detect the language from the html tag
                  // since the middleware already detected the language server-side
                  detection: { order: ['htmlTag'], caches: [] },
              }),
        interpolation: {
            escapeValue: false,
            format: (value, format) => {
                if (format === 'number' && typeof value === 'number') {
                    return value.toLocaleString();
                }
                return value;
            },
        },
    });

    return instance;
}
