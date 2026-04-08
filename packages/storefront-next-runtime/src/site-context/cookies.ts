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

import { createCookie, type Cookie, type CookieOptions } from 'react-router';

/**
 * Cookie options for site context cookies (site and locale)
 */
export const COOKIE_OPTIONS = {
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
};

/**
 * Creates a cookie instance with the given name.
 *
 * @param name - Cookie name
 * @returns Cookie instance configured with site context options
 */
export function createSiteContextCookie(name: string, options?: CookieOptions): Cookie {
    return createCookie(name, { ...COOKIE_OPTIONS, ...options });
}

/**
 * Creates a currency cookie instance with the given name.
 *
 * @param name - Cookie name
 * @returns Cookie instance configured with site context cookie options
 */
export function createCurrencyCookie(name: string, options?: CookieOptions): Cookie {
    return createCookie(name, { ...COOKIE_OPTIONS, ...options });
}

/**
 * WeakMap to pass resolved locale from site context middleware to i18next's findLocale.
 * WeakMap allows garbage collection when requests are done.
 * This is necessary because findLocale() only receives the Request object, not the router context.
 */
export const requestToLocaleMap = new WeakMap<Request, string>();
