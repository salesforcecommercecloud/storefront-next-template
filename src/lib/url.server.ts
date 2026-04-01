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
import type { RouterContextProvider } from 'react-router';
import { buildUrl, multiSiteContext } from '@salesforce/storefront-next-runtime/multi-site';

import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';

/**
 * Server-side counterpart of the client-side `useCurrentSiteAndLocaleRef` + `buildUrl` pattern.
 * Reads the resolved site and locale from router context, applies alias mappings,
 * and prefixes the given path with the multi-site URL prefix.
 *
 * Use this in loaders and actions where you need a prefixed URL (e.g., for `redirect()`).
 * For client-side code, use `useCurrentSiteAndLocaleRef` hook with `buildUrl` instead.
 *
 * This file is `.server.ts` to prevent accidental client-side imports, since it depends
 * on server-only APIs (`getConfig`, `multiSiteContext`).
 *
 * @example
 * ```typescript
 * import { buildUrlFromContext } from '@/lib/url.server';
 *
 * export function loader({ context }: LoaderFunctionArgs) {
 *     throw redirect(buildUrlFromContext('/login', context));
 * }
 * ```
 *
 * @param to - The bare path (e.g., '/login', '/account/orders')
 * @param context - The router context from loader/action args
 * @returns The prefixed URL (e.g., '/global/en-GB/login')
 */
export function buildUrlFromContext(to: string, context: Readonly<RouterContextProvider>): string {
    const config = getConfig<AppConfig>(context);
    const multiSite = context.get(multiSiteContext);
    if (!multiSite) return to;

    // '/' is always cookie-driven (no prefix) regardless of site/locale.
    if (to === '/') return to;

    return buildUrl({
        to,
        urlConfig: config.url,
        params: {
            siteId: multiSite.site.alias ?? multiSite.site.id,
            localeId: config.localeAliasMap?.[multiSite.locale.id] ?? multiSite.locale.id,
        },
    });
}
