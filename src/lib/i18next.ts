import i18next, { type i18n } from 'i18next';
import { createContext, type RouterContextProvider } from 'react-router';

/**
 * Context to store i18next accessor functions from the i18next middleware.
 * These functions are bound to the context so they can be called without parameters.
 * (This allows server loaders to access locale and i18next instance synchronously
 * without importing server-only code)
 */
export const i18nextContext = createContext<{
    getLocale: () => string;
    getI18nextInstance: () => i18n;
} | null>(null);

/**
 * Gets the i18next instance and translation function for use in non-component code.
 * Use `useTranslation` hook for React components. Similar to `getConfig`/`useConfig` pattern.
 * @param context - Optional router context for server-side rendering
 * @returns Object containing i18next instance and `t` translation function
 */
export function getTranslation(context?: Readonly<RouterContextProvider>) {
    if (context && typeof window === 'undefined') {
        // Get i18next accessor functions from context (stored by middleware)
        const i18nextData = context.get(i18nextContext);
        if (!i18nextData) {
            throw new Error('i18next data not found in context. Ensure i18next middleware runs before loaders.');
        }

        const i18nextInstance = i18nextData.getI18nextInstance();
        return {
            i18next: i18nextInstance,
            t: i18nextInstance.t,
        };
    }

    // Return these properties from the global i18next instance
    return {
        i18next,
        t: i18next.t,
    };
}
