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
import type { Url } from '../config/types';

/**
 * Parses search config string into key-value pairs, preserving ':param' placeholders.
 * '?lng=:localeId&site=:siteId' → { lng: ':localeId', site: ':siteId' }
 */
export function parseSearchConfig(search: string): Record<string, string> {
    const searchParams = new URLSearchParams(search);
    const result: Record<string, string> = {};
    for (const [key, value] of searchParams) {
        result[key] = value;
    }
    return result;
}

/**
 * Extracts parameter names from a prefix string.
 * '/:siteId/:localeId' → ['siteId', 'localeId']
 */
export function extractPrefixParams(prefix: string): string[] {
    const matches = prefix.match(/:(\w+)/g);
    return matches ? matches.map((m) => m.slice(1)) : [];
}

/**
 * Splits a URL string into its component parts.
 * '/product/123?color=red#details' → { pathname: '/product/123', search: 'color=red', hash: '#details' }
 */
export function decomposeUrl(url: string): { pathname: string; search: string; hash: string } {
    const hashIdx = url.indexOf('#');
    const hash = hashIdx >= 0 ? url.slice(hashIdx) : '';
    const withoutHash = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
    const searchIdx = withoutHash.indexOf('?');
    const search = searchIdx >= 0 ? withoutHash.slice(searchIdx + 1) : '';
    const pathname = searchIdx >= 0 ? withoutHash.slice(0, searchIdx) : withoutHash;
    return { pathname, search, hash };
}

/**
 * Resolves a prefix template by replacing parameter placeholders with values.
 * ('/:siteId/:localeId', { siteId: 'global', localeId: 'en-GB' }) → '/global/en-GB'
 */
export function resolvePrefix(prefix: string, params: Record<string, string>): string {
    let resolved = prefix;
    for (const paramName of extractPrefixParams(prefix)) {
        const value = params[paramName];
        if (value) {
            resolved = resolved.replace(`:${paramName}`, value);
        }
    }
    return resolved;
}

/**
 * Sanitize a resolved prefix from a pathname if present.
 * sanitizePrefix('/global/en-GB/product/123', '/global/en-GB') → '/product/123'
 * sanitizePrefix('/product/123', '/global/en-GB') → '/product/123'   (no-op)
 */
export function sanitizePrefix(pathname: string, pathPrefix: string): string {
    if (!pathPrefix) return pathname;
    if (pathname === pathPrefix) return '';
    if (pathname.startsWith(`${pathPrefix}/`)) return pathname.slice(pathPrefix.length);
    return pathname;
}

/**
 * Builds a fully-qualified URL with multi-site prefix and search params.
 *
 * Only keys defined in urlConfig.search are set by multi-site. Any other query params
 * already present on the `to` URL (including duplicate keys) are preserved as-is.
 * e.g. to='/api/search?refine=color:blue&refine=size:M', search='?lng=:localeId'
 *   → '/api/search?refine=color:blue&refine=size:M&lng=en-GB'
 *
 * @example
 * buildUrl({ to: '/product/123', urlConfig: { prefix: '/:siteId', search: '?lng=:localeId' }, params: { siteId: 'global', localeId: 'en-GB' } })
 * // → '/global/product/123?lng=en-GB'
 */
export function buildUrl({
    to,
    urlConfig,
    params,
}: {
    to: string;
    urlConfig?: Url;
    params: Record<string, string>;
}): string {
    if (!urlConfig) return to;
    if (!to || to === '#' || to.startsWith('http') || to.startsWith('//')) return to;

    const { pathname, search: existingSearch, hash } = decomposeUrl(to);

    const pathPrefix = urlConfig.prefix && urlConfig.prefix !== '/' ? resolvePrefix(urlConfig.prefix, params) : '';
    // sanitize prefix to make sure there is no prefix duplication at any case
    const path = pathPrefix ? `${pathPrefix}${sanitizePrefix(pathname, pathPrefix)}` : pathname;

    const searchParams = new URLSearchParams(existingSearch);
    if (urlConfig.search) {
        const searchConfig = parseSearchConfig(urlConfig.search);
        for (const [queryKey, value] of Object.entries(searchConfig)) {
            if (value.startsWith(':')) {
                const paramValue = params[value.slice(1)];
                if (paramValue) {
                    searchParams.set(queryKey, paramValue);
                }
            } else {
                searchParams.set(queryKey, value);
            }
        }
    }

    const search = searchParams.toString();
    return `${path}${search ? `?${search}` : ''}${hash}`;
}
