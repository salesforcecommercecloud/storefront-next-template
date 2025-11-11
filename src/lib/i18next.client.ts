import i18next, { type i18n, type BackendModule, type ReadCallback, type ResourceLanguage } from 'i18next';
import { initReactI18next } from 'react-i18next';
import I18nextBrowserLanguageDetector from 'i18next-browser-languagedetector';
import { getConfig } from '@/config';

/**
 * Custom i18next backend that dynamically imports ALL translations for a particular language.
 * Dynamic imports cause Vite to code-split translations into separate chunks per language.
 * When a language is first needed, the browser fetches its JavaScript chunk as a static asset.
 * This is more efficient than API endpoints: no server processing, better caching, CDN-friendly.
 */
const dynamicImportBackend: BackendModule = {
    type: 'backend',
    init() {
        // No initialization needed
    },
    // Dynamically import all translations for the language
    // NOTE: make sure to manually test this with Vite HMR
    read(language: string, namespace: string, callback: ReadCallback) {
        import(`@/locales/${language}/index.ts`)
            .then((module: { default: ResourceLanguage }) => {
                const translations = module.default;

                // Store all namespaces in i18next's cache
                Object.entries(translations).forEach(([ns, nsTranslations]) => {
                    i18next.addResourceBundle(language, ns, nsTranslations, true, true);
                });

                // Return the requested namespace
                callback(null, translations[namespace] || {});
            })
            .catch((error: Error) => {
                callback(error, false);
            });
    },
};

/**
 * Initialize i18next on the client side.
 * This dynamically imports ALL translations for the current language as static JavaScript chunks.
 * On the server side, i18next is initialized in middlewares/i18next.ts
 */
export function initI18next(): i18n {
    void i18next
        .use(initReactI18next)
        .use(I18nextBrowserLanguageDetector)
        .use(dynamicImportBackend)
        .init({
            ns: [], // Do not download any namespace during this init
            fallbackLng: getConfig().i18n.fallbackLng,
            // Here we only want to detect the language from the html tag
            // since the middleware already detected the language server-side
            detection: { order: ['htmlTag'], caches: [] },
        });

    return i18next;
}
