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
import { getCookieConfig, getCookieNameWithSiteId, type CookieConfig } from './cookie-utils';
import type { RouterContextProvider } from 'react-router';

/**
 * Cookie interface matching React Router's createCookie API
 */
export interface Cookie<T = unknown> {
    parse: (cookieHeader: string | null) => Promise<T | null>;
    serialize: (value: T | '', config?: CookieConfig) => Promise<string>;
}

/**
 * Parse all cookies from a Cookie header string into a key-value map.
 * More efficient than calling parse() multiple times on individual cookies.
 *
 * @param cookieHeader - Raw Cookie header string
 * @returns Record of cookie name to value (no decoding, raw values)
 */
export const parseAllCookies = (cookieHeader: string | null): Record<string, string> => {
    if (!cookieHeader) {
        return {};
    }

    return cookieHeader.split(';').reduce(
        (acc, cookie) => {
            const [key, ...valueParts] = cookie.trim().split('=');
            if (key) {
                acc[key] = valueParts.join('=');
            }
            return acc;
        },
        {} as Record<string, string>
    );
};

/**
 * Simple cookie implementation for server environments.
 * Creates a cookie instance that:
 * - Parses cookies from Cookie header strings
 * - Serializes cookies to Set-Cookie header strings
 * - Works in Node.js environments
 * - No signing or encryption to allow ECOM to access cookies in hybrid storefronts
 * - Values are stored as-is (no encoding/decoding)
 * - Automatically namespaces cookies by siteId
 *
 * @param name - Cookie name (will be namespaced with siteId)
 * @param defaultConfig - Default cookie configuration
 * @param context - Router context for accessing configuration (server-side only)
 * @returns Cookie instance with parse and serialize methods
 *
 * @example
 * // Server-side usage with string
 * const tokenCookie = createCookie('token', getCookieConfig({ httpOnly: false }, context), context);
 * const value = await tokenCookie.parse(request.headers.get('Cookie')); // "abc123"
 * const setCookieHeader = await tokenCookie.serialize('abc123', getCookieConfig({ expires: new Date(...) }, context));
 * // Result: "token_RefArch=abc123; Path=/; ..."
 *
 * @example
 * // Server-side usage with number
 * const expiryCookie = createCookie('expiry', getCookieConfig({ httpOnly: false }, context), context);
 * await expiryCookie.serialize(1234567890, getCookieConfig({}, context));
 * // Result: "expiry_RefArch=1234567890; Path=/; ..."
 */
export const createCookie = <T = unknown>(
    name: string,
    defaultConfig: CookieConfig,
    context?: Readonly<RouterContextProvider>
): Cookie<T> => {
    // Get the namespaced cookie name once during creation
    const namespacedName = getCookieNameWithSiteId(name, context);

    return {
        /**
         * Parse a cookie value from a Cookie header string
         * @param cookieHeader - Cookie header string (e.g., "name1=value1; name2=value2")
         * @returns Parsed cookie value or null if not found
         */
        parse: (cookieHeader: string | null): Promise<T | null> => {
            const cookies = parseAllCookies(cookieHeader);
            const value = cookies[namespacedName];

            if (!value) {
                return Promise.resolve(null);
            }

            // Return raw value, no decoding or JSON parsing
            return Promise.resolve(value as T);
        },

        /**
         * Serialize a cookie value to a Set-Cookie header string
         * @param value - Value to serialize (empty string to delete cookie)
         * @param config - Cookie configuration (merged with default config)
         * @returns Set-Cookie header string
         */
        serialize: (value: T | '', config: CookieConfig = {}): Promise<string> => {
            const finalConfig = getCookieConfig({ ...defaultConfig, ...config }, context);
            const parts: string[] = [];

            // Handle cookie name=value (first part, no semicolon prefix)
            if (value === '') {
                // Empty value for cookie deletion
                parts.push(`${namespacedName}=`);
            } else {
                // Simple string conversion, no encoding
                const stringValue = String(value);
                parts.push(`${namespacedName}=${stringValue}`);
            }

            // Add cookie attributes (separated by semicolons)
            if (finalConfig.domain) {
                parts.push(`Domain=${finalConfig.domain}`);
            }

            if (finalConfig.path) {
                parts.push(`Path=${finalConfig.path}`);
            }

            if (finalConfig.expires) {
                parts.push(`Expires=${finalConfig.expires.toUTCString()}`);
            }

            if (finalConfig.maxAge !== undefined) {
                parts.push(`Max-Age=${finalConfig.maxAge}`);
            }

            if (finalConfig.httpOnly) {
                parts.push('HttpOnly');
            }

            if (finalConfig.secure) {
                parts.push('Secure');
            }

            if (finalConfig.sameSite) {
                const sameSiteValue = finalConfig.sameSite.charAt(0).toUpperCase() + finalConfig.sameSite.slice(1);
                parts.push(`SameSite=${sameSiteValue}`);
            }

            if (finalConfig.partitioned) {
                parts.push('Partitioned');
            }

            return Promise.resolve(parts.join('; '));
        },
    };
};
