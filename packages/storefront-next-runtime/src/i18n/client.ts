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
import i18next, { type i18n, type BackendModule, type ReadCallback } from 'i18next';
import { initReactI18next } from 'react-i18next';
import I18nextBrowserLanguageDetector from 'i18next-browser-languagedetector';
import { defaultInterpolation } from './defaults.js';
import type { LocaleLoader } from './types.js';

/**
 * Custom i18next backend that calls the provided `loadLocale` callback to dynamically
 * import translations. Keeping the import() call in the template lets Vite resolve the
 * dynamic path at build time and split translations into per-language chunks.
 */
function createDynamicImportBackend(instance: i18n, loadLocale: LocaleLoader): BackendModule {
    return {
        type: 'backend',
        init() {
            // No initialization needed
        },
        read(language: string, namespace: string, callback: ReadCallback) {
            loadLocale(language)
                .then((module) => {
                    const translations = module.default;
                    Object.entries(translations).forEach(([ns, nsTranslations]) => {
                        instance.addResourceBundle(language, ns, nsTranslations, true, true);
                    });
                    callback(null, translations[namespace] ?? {});
                })
                .catch((error: Error) => {
                    callback(error, false);
                });
        },
    };
}

/**
 * Initialize i18next on the client side.
 * Pass a `loadLocale` callback containing the dynamic import so Vite can resolve it
 * at build time relative to the template's source tree.
 *
 * @example
 * // In root.tsx — Vite resolves the import() relative to this file
 * initI18next({
 *     language: document.documentElement.lang || undefined,
 *     loadLocale: (language) => import(`@/locales/${language}/index.ts`),
 * });
 */
export function initI18next(options?: { language?: string; instance?: i18n; loadLocale?: LocaleLoader }): i18n {
    // NOTE: For any changes to this function, verify that Vite HMR still works with translations

    const language = options?.language;
    const instance = options?.instance ?? i18next;
    const loadLocale = options?.loadLocale;

    if (language) {
        instance.language = language;
    }

    const i18nextInstance = instance.use(initReactI18next);

    if (loadLocale) {
        i18nextInstance.use(createDynamicImportBackend(instance, loadLocale));
    }

    if (!language) {
        i18nextInstance.use(I18nextBrowserLanguageDetector);
    }

    void i18nextInstance.init({
        ns: [],
        ...(language
            ? { lng: language }
            : {
                  detection: { order: ['htmlTag'], caches: [] },
              }),
        interpolation: defaultInterpolation,
    });

    return instance;
}
