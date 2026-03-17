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
