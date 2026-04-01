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

import { createContext, type MiddlewareFunction, type RouterContextProvider } from 'react-router';
import { resolveSite } from './site-detection';
import type { SiteConfig, SiteContext, SiteSettings, Site, Locale } from './types';
import { DEFAULT_SITE_DETECTION, DEFAULT_LOCALE_DETECTION } from './configs';
import { createSiteContextCookie, requestToLocaleMap } from './cookies';
import { resolveLocale } from './locale-detection';

export const siteContext = createContext<SiteContext | null>(null);

type MiddlewareArgs = { request: Request; context: Readonly<RouterContextProvider> };

/**
 * Helper function to get site context cookies from router context.
 * Useful in server actions and loaders that need to read/set cookies.
 *
 * @param context - Router context provider
 * @returns Object with siteCookie and localeCookie instances, or null if context not set
 *
 * @example
 * ```typescript
 * export const action: ActionFunction = async ({ request, context }) => {
 *     const cookies = getSiteContextCookies(context);
 *     if (cookies) {
 *         const cookieHeader = await cookies.localeCookie.serialize(locale);
 *         // ... use cookieHeader
 *     }
 * };
 * ```
 */
export function getSiteContextCookies(context: Readonly<RouterContextProvider>) {
    const siteCtx = context.get(siteContext);
    if (!siteCtx) return null;
    return {
        siteCookie: siteCtx.siteCookie,
        localeCookie: siteCtx.localeCookie,
    };
}

/**
 * Helper function to determine if cookies should be set based on:
 * 1. Whether caching is enabled for each cookie type
 * 2. Whether the resolved value differs from the existing cookie
 * 3. Whether cookies were already set by actions/loaders in the response
 *
 * @param request - Incoming request
 * @param response - Response from next()
 * @param settings - Site context settings with cookie instances and detection config
 * @param site - Resolved site for this request
 * @param locale - Resolved locale for this request
 * @returns Object with shouldSetSiteCookie and shouldSetLocaleCookie booleans
 */
async function shouldSetCookies(
    request: Request,
    response: Response,
    settings: SiteSettings,
    site: Site,
    locale: Locale
): Promise<{ shouldSetSiteCookie: boolean; shouldSetLocaleCookie: boolean }> {
    const cacheSite = settings.siteDetectionConfig.caches?.includes('cookie');
    const cacheLocale = settings.localeDetectionConfig.caches?.includes('cookie');

    // Early return if no cookie caching is enabled
    if (!cacheSite && !cacheLocale) {
        return { shouldSetSiteCookie: false, shouldSetLocaleCookie: false };
    }

    // Check if cookies were already set by actions/loaders in the response.
    // If they were, we don't want to override them.
    const responseSetCookies = response.headers.getSetCookie?.() || [];
    const isSettingSiteCookieInResponse = responseSetCookies.some((cookie) =>
        cookie.startsWith(`${settings.siteCookie.name}=`)
    );
    const isSettingLocaleCookieInResponse = responseSetCookies.some((cookie) =>
        cookie.startsWith(`${settings.localeCookie.name}=`)
    );

    const requestCookieHeader = request.headers.get('Cookie');
    const [existingSiteCookie, existingLocaleCookie] = await Promise.all([
        settings.siteCookie.parse(requestCookieHeader),
        settings.localeCookie.parse(requestCookieHeader),
    ]);

    // Set cookie if: doesn't exist yet OR resolved value differs from existing.
    // Skip if an action/loader already set it in the response.
    return {
        shouldSetSiteCookie: cacheSite && !isSettingSiteCookieInResponse && existingSiteCookie !== site.id,
        shouldSetLocaleCookie: cacheLocale && !isSettingLocaleCookieInResponse && existingLocaleCookie !== locale.id,
    };
}

/**
 * Creates a site context middleware that resolves the current site from
 * the request (path, cookie, header, query, or default) and stores the
 * result in the router context.
 *
 * Does not import or read from app config context; the consumer supplies config.
 */
export function createSiteContextMiddleware(config: SiteConfig): MiddlewareFunction<Response> {
    // Merge config with defaults so every detection option has a value
    const siteDetectionConfig: SiteSettings['siteDetectionConfig'] = {
        ...DEFAULT_SITE_DETECTION,
        ...config.siteDetectionConfig,
    };
    const localeDetectionConfig: SiteSettings['localeDetectionConfig'] = {
        ...DEFAULT_LOCALE_DETECTION,
        ...config.localeDetectionConfig,
    };

    // Create cookies based on configured names
    const siteCookie = createSiteContextCookie(siteDetectionConfig.lookupCookie);
    const localeCookie = createSiteContextCookie(localeDetectionConfig.lookupCookie);

    const settings: SiteSettings = {
        ...config,
        siteDetectionConfig,
        localeDetectionConfig,
        siteCookie,
        localeCookie,
    };

    const siteContextMiddleware: MiddlewareFunction<Response> = async (
        { request, context }: MiddlewareArgs,
        next: () => Promise<Response>
    ): Promise<Response> => {
        const site = await resolveSite(request, settings);
        const locale = await resolveLocale(request, settings, site);

        // Store full Site, Locale, and Cookie objects in context for downstream middlewares (currency, loaders, etc.)
        context.set(siteContext, {
            site,
            locale,
            siteCookie: settings.siteCookie,
            localeCookie: settings.localeCookie,
        });

        // Store locale in a WeakMap so i18next's findLocale can access it
        // This is necessary because findLocale only receives Request and cannot access the router context
        requestToLocaleMap.set(request, locale.id);

        const response = await next();

        // Determine if cookies should be set
        const { shouldSetSiteCookie, shouldSetLocaleCookie } = await shouldSetCookies(
            request,
            response,
            settings,
            site,
            locale
        );

        // Early return if no cookies need to be set
        if (!shouldSetSiteCookie && !shouldSetLocaleCookie) {
            return response;
        }

        const [siteSetCookie, localeSetCookie] = await Promise.all([
            shouldSetSiteCookie ? settings.siteCookie.serialize(site.id, { path: '/' }) : Promise.resolve(null),
            shouldSetLocaleCookie ? settings.localeCookie.serialize(locale.id, { path: '/' }) : Promise.resolve(null),
        ]);

        if (siteSetCookie) response.headers.append('Set-Cookie', siteSetCookie);
        if (localeSetCookie) response.headers.append('Set-Cookie', localeSetCookie);

        return response;
    };

    return siteContextMiddleware;
}
