import Cookies from 'js-cookie';
import { getCookieConfig, getCookieNameWithSiteId, type CookieConfig } from './cookie-utils';

/**
 * Get a cookie value.
 * This matches the server-side createCookie implementation for split auth cookies.
 *
 * Automatically namespaces the cookie name with siteId from window.__APP_CONFIG__.
 *
 * @param name - Base cookie name (will be namespaced with siteId)
 * @returns Cookie value as string, or empty string if not found
 *
 * @example
 * // Reads cookie "refresh-token_RefArch" when siteId is "RefArch"
 * const token = getCookie('refresh-token');
 */
export const getCookie = (name: string): string => {
    const cookieNameWithSiteId = getCookieNameWithSiteId(name);
    const value = Cookies.get(cookieNameWithSiteId);
    return value || '';
};

/**
 * Read all cookies into a key-value map using js-cookie.
 * More efficient than calling getCookie() multiple times.
 *
 * @returns Record of cookie name to value
 */
export const getAllCookies = (): Record<string, string> => {
    if (typeof document === 'undefined') return {};

    return Cookies.get() as Record<string, string>;
};

/**
 * Remove a cookie by name.
 *
 * Automatically namespaces the cookie name with siteId from window.__APP_CONFIG__.
 *
 * @param name - Base cookie name (will be namespaced with siteId)
 */
export const removeCookie = (name: string): void => {
    const cookieNameWithSiteId = getCookieNameWithSiteId(name);
    Cookies.remove(cookieNameWithSiteId);
};

/**
 * Set a cookie value.
 * This matches the server-side createCookie implementation for split auth cookies.
 *
 * Automatically namespaces the cookie name with siteId from getConfig()
 *
 * @param name - Base cookie name (will be namespaced with siteId)
 * @param value - Cookie value (string, number, or boolean)
 * @param cookieOptions - Cookie configuration options
 * @returns The cookie string value
 *
 * @example
 * // Sets cookie "refresh-token_RefArch" when siteId is "RefArch"
 * setNamespacedCookie('refresh-token', 'abc123');
 */
export const setNamespacedCookie = (
    name: string,
    value: string | number | boolean,
    cookieOptions?: CookieConfig
): string | undefined => {
    const cookieNameWithSiteId = getCookieNameWithSiteId(name);
    const stringValue = String(value);
    const cookieConfig = getCookieConfig(cookieOptions);
    return Cookies.set(cookieNameWithSiteId, stringValue, cookieConfig);
};
