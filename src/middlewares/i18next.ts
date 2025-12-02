import { initReactI18next } from 'react-i18next';
import { createCookie } from 'react-router';
import { createI18nextMiddleware } from 'remix-i18next/middleware';
import resources from '@/locales'; // Import translations from all of your locales
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
        // Make sure the following properties are in sync with config.server.ts file
        // TODO: is there a way to call getConfig here? I can't see a way to pass in the router context.
        fallbackLanguage: 'en',
        supportedLanguages: ['es', 'en'],
    },
    i18next: { resources }, // Translations from all of your locales
    plugins: [initReactI18next], // Plugins you may need, like react-i18next
});

// This adds type-safety to the `t` function
declare module 'i18next' {
    interface CustomTypeOptions {
        resources: typeof resources.en; // Use `en` as source of truth for the types
    }
}
