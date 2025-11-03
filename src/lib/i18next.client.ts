import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';
import I18nextFetchBackend from 'i18next-fetch-backend';
import I18nextBrowserLanguageDetector from 'i18next-browser-languagedetector';
import { getConfig } from '@/config';

/**
 * Initialize i18next on the client side.
 * This should be called once when the app loads in the browser.
 * On the server side, i18next is initialized in middlewares/i18next.ts
 */
export function initI18next(): i18n {
    void i18next
        .use(initReactI18next)
        .use(I18nextFetchBackend) // TODO: consider using a different backend, like resources-to-backend (static files)
        .use(I18nextBrowserLanguageDetector)
        .init({
            ns: [], // Do not assume the namespace; only download the necessary ones
            fallbackLng: getConfig().i18n.fallbackLng,
            // Here we only want to detect the language from the html tag
            // since the middleware already detected the language server-side
            detection: { order: ['htmlTag'], caches: [] },
            // Update this to the path where your locales will be served, with bundle id as the cache breaker
            backend: { loadPath: `/resource/api/locales/{{lng}}/{{ns}}?bundle=${window._BUNDLE_ID}` },
        });

    return i18next;
}
