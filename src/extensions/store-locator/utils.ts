/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Get the cookie name for selected store info, scoped by site ID.
 *
 * Creates a unique cookie name that includes the site ID to prevent conflicts
 * between different sites in the same domain.
 *
 * @returns Cookie name string in format `selectedStoreInfo_{siteId}`
 *
 * @example
 * ```typescript
 * const cookieName = getSelectedStoreInfoCookieName();
 * // Returns: "selectedStoreInfo_site-default" or "selectedStoreInfo_my-site"
 * ```
 */
export function getSelectedStoreInfoCookieName(): string {
    const siteId = import.meta.env.PUBLIC_COMMERCE_API_SITE_ID || 'site-default';
    return `selectedStoreInfo_${siteId}`;
}

/**
 * Get a parsed cookie value from HTTP request on the server side.
 *
 * Parses the Cookie header from the request to extract a specific cookie value
 * and automatically parses it as JSON to the specified type.
 * This function is designed for server-side rendering and loader functions.
 *
 * @template T - The type to parse the cookie value as
 * @param request - The HTTP request object containing cookie headers
 * @param cookieName - The name of the cookie to retrieve
 * @returns The parsed cookie value of type T, or null if not found/invalid
 *
 * @example
 * ```typescript
 * export function loader({ request }: LoaderFunctionArgs) {
 *   const cookieName = getSelectedStoreInfoCookieName();
 *   const selectedStoreInfo = getCookieFromRequestAs<SelectedStoreInfo>(request, cookieName);
 *   if (selectedStoreInfo) {
 *     // Use store-specific inventory data
 *     return getPageData(request, selectedStoreInfo);
 *   }
 *   return getPageData(request);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Get any other typed cookie data from request
 * const userPreferences = getCookieFromRequestAs<UserPreferences>(request, 'userPrefs');
 * const cartData = getCookieFromRequestAs<CartData>(request, 'cartData');
 * ```
 *
 * @remarks
 * This function handles various edge cases:
 * - Cookies with '=' in their values
 * - Malformed cookies (skipped gracefully)
 * - Missing or empty cookie headers
 * - URL decoding errors
 * - Invalid JSON in cookie values
 *
 * @see {@link getCookieFromDocumentAs} - Client-side equivalent for use in components/hooks
 */
export function getCookieFromRequestAs<T>(request: Request, cookieName: string): T | null {
    try {
        // Parse cookies synchronously using React Router's approach
        const cookieHeader = request.headers.get('Cookie');
        if (!cookieHeader) {
            return null;
        }

        // Parse cookies using the same logic as React Router
        const cookies = cookieHeader.split(';').reduce(
            (acc, cookie) => {
                const trimmedCookie = cookie.trim();
                const equalIndex = trimmedCookie.indexOf('=');

                if (equalIndex === -1) {
                    return acc;
                }

                const name = trimmedCookie.substring(0, equalIndex).trim();
                const value = trimmedCookie.substring(equalIndex + 1).trim();

                if (name && value) {
                    try {
                        // Use React Router's decoding approach
                        acc[name] = decodeURIComponent(value);
                    } catch {
                        return acc;
                    }
                }

                return acc;
            },
            {} as Record<string, string>
        );

        const cookieValue = cookies[cookieName];
        if (!cookieValue) {
            return null;
        }

        try {
            const parsedValue = JSON.parse(cookieValue);
            // Basic validation - ensure it has the expected structure
            if (typeof parsedValue === 'object' && parsedValue !== null) {
                return parsedValue as T;
            }
            return null;
        } catch {
            // Invalid JSON in cookie value
            return null;
        }
    } catch {
        // Ignore cookie parsing errors on server
        return null;
    }
}

/**
 * Get a parsed cookie value from document.cookie (client-only).
 *
 * Parses the browser's document.cookie to extract a specific cookie value
 * and automatically parses it as JSON to the specified type.
 * This function is designed for client-side components and hooks.
 *
 * @template T - The type to parse the cookie value as
 * @param cookieName - The name of the cookie to retrieve
 * @returns The parsed cookie value of type T, or null if not found/invalid
 *
 * @example
 * ```typescript
 * // Get selected store info from cookie
 * const cookieName = getSelectedStoreInfoCookieName();
 * const selectedStoreInfo = getCookieFromDocumentAs<SelectedStoreInfo>(cookieName);
 * if (selectedStoreInfo) {
 *   // Use store-specific data
 *   console.log('Selected store:', selectedStoreInfo.name);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Get any other typed cookie data
 * const userPreferences = getCookieFromDocumentAs<UserPreferences>('userPrefs');
 * const cartData = getCookieFromDocumentAs<CartData>('cartData');
 * ```
 *
 * @remarks
 * This function handles various edge cases:
 * - Invalid JSON in cookie values
 * - Missing or empty document.cookie
 * - URL decoding errors
 * - Malformed cookie format
 *
 * @see {@link getCookieFromRequestAs} - Server-side equivalent for use in loaders/actions
 */
export const getCookieFromDocumentAs = <T>(cookieName: string): T | null => {
    try {
        const match = document.cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]*)`));
        if (match) {
            const decoded = decodeURIComponent(match[1]);
            const parsedValue = JSON.parse(decoded);
            // Basic validation - ensure it has the expected structure
            if (typeof parsedValue === 'object' && parsedValue !== null) {
                return parsedValue as T;
            }
        }
        return null;
    } catch {
        // ignore cookie parsing errors
        return null;
    }
};
