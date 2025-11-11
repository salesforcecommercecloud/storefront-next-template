import { initReactI18next } from 'react-i18next';
import { createCookie } from 'react-router';
import { createI18nextMiddleware } from 'remix-i18next/middleware';
// TODO: how to grab translations from the extensions?
import resources from '@/locales'; // Import translations from all of your locales
import config from '../../config.server'; // Import config directly for module-level initialization
import 'i18next';

// This cookie will be used to store the user locale preference
export const localeCookie = createCookie('lng', {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
});

export const [i18nextMiddleware, getLocale, getInstance] = createI18nextMiddleware({
    // Read the locale from the cookie, if it exists, and set it in the context.
    // If the cookie doesn't exist, it will use the Accept-Language header or the fallback language.
    detection: {
        cookie: localeCookie,
        fallbackLanguage: config.app.i18n.fallbackLng,
        supportedLanguages: config.app.i18n.supportedLngs,
    },
    i18next: { resources }, // Translations from all of your locales
    plugins: [initReactI18next], // Plugins you may need, like react-i18next
});

// TODO: extract into i18next.d.ts file?
// This adds type-safety to the `t` function
declare module 'i18next' {
    interface CustomTypeOptions {
        resources: typeof resources.en; // Use `en` as source of truth for the types
    }
}
