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
 *
 * @example
 * resolvePrefix({ prefix: '/:siteId/:localeId', params: { siteId: 'global', localeId: 'en-GB' } })
 * // → '/global/en-GB'
 */
export function resolvePrefix({ prefix, params }: { prefix: string; params: Record<string, string> }): string {
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
 * Strips a URL prefix from a pathname.
 *
 * Accepts either a resolved prefix or a prefix pattern — segments may be
 * literal strings (must match the pathname exactly) or `:param` placeholders
 * (match any segment value). Mixed prefixes are supported.
 *
 * Returns `''` when the pathname matches the prefix exactly with no remainder
 * (so concatenating `prefix + result` round-trips the input), `pathname`
 * unchanged when literal segments don't match or the path is shorter than the
 * prefix, or the bare remainder otherwise. Callers that need the homepage to
 * be `'/'` should coerce: `stripPathPrefix(...) || '/'`.
 *
 * @example
 * stripPathPrefix({ pathname: '/global/en-GB/checkout', prefix: '/:siteId/:localeId' })   // → '/checkout'
 * stripPathPrefix({ pathname: '/global/en-GB/checkout', prefix: '/global/en-GB' })        // → '/checkout'
 * stripPathPrefix({ pathname: '/shop/en-GB/x',          prefix: '/shop/:localeId' })      // → '/x'
 * stripPathPrefix({ pathname: '/global/en-GB',          prefix: '/:siteId/:localeId' })   // → ''
 * stripPathPrefix({ pathname: '/checkout',              prefix: '/:siteId/:localeId' })   // → '/checkout'
 * stripPathPrefix({ pathname: '/other/x',               prefix: '/global/en-GB' })        // → '/other/x'
 * stripPathPrefix({ pathname: '/x',                     prefix: '' })                     // → '/x'
 */
export function stripPathPrefix({ pathname, prefix }: { pathname: string; prefix: string }): string {
    if (!prefix || prefix === '/') return pathname;

    const prefixSegments = prefix.split('/').filter(Boolean);
    const pathSegments = pathname.split('/').filter(Boolean);

    if (pathSegments.length < prefixSegments.length) return pathname;

    // Literal segments must match exactly; ':param' segments match anything.
    for (let i = 0; i < prefixSegments.length; i++) {
        const segment = prefixSegments[i];
        if (!segment.startsWith(':') && segment !== pathSegments[i]) {
            return pathname;
        }
    }

    const remaining = pathSegments.slice(prefixSegments.length);
    return remaining.length === 0 ? '' : `/${remaining.join('/')}`;
}

/**
 * Extracts the values of `:param` placeholders in a prefix pattern from a pathname.
 *
 * Mirrors {@link stripPathPrefix}'s matching rules: literal segments must match the
 * pathname exactly, `:param` segments capture the corresponding path segment. Returns
 * an empty object when the pathname doesn't carry the prefix (a literal segment
 * mismatches, or the path has fewer segments than the prefix) — so a non-empty result
 * is a reliable signal that the prefix was present.
 *
 * Pair this with {@link stripPathPrefix}: strip gives you the bare functional path,
 * this gives you the site/locale the path carried. Together they let a caller
 * re-decorate a path for a different URL shape without double-stacking.
 *
 * @example
 * extractPrefixParamValues({ pathname: '/global/en-GB/cart', prefix: '/:siteId/:localeId' }) // → { siteId: 'global', localeId: 'en-GB' }
 * extractPrefixParamValues({ pathname: '/uk/cart',           prefix: '/:localeId' })          // → { localeId: 'uk' }
 * extractPrefixParamValues({ pathname: '/shop/uk/x',         prefix: '/shop/:localeId' })     // → { localeId: 'uk' }
 * extractPrefixParamValues({ pathname: '/cart',              prefix: '/:siteId/:localeId' })  // → {} (too few segments)
 * extractPrefixParamValues({ pathname: '/other/x',          prefix: '/shop/:localeId' })     // → {} (literal mismatch)
 * extractPrefixParamValues({ pathname: '/cart',              prefix: '' })                    // → {}
 */
export function extractPrefixParamValues({
    pathname,
    prefix,
}: {
    pathname: string;
    prefix: string;
}): Record<string, string> {
    if (!prefix || prefix === '/') return {};

    const prefixSegments = prefix.split('/').filter(Boolean);
    const pathSegments = pathname.split('/').filter(Boolean);

    if (pathSegments.length < prefixSegments.length) return {};

    const values: Record<string, string> = {};
    for (let i = 0; i < prefixSegments.length; i++) {
        const segment = prefixSegments[i];
        if (segment.startsWith(':')) {
            values[segment.slice(1)] = pathSegments[i];
        } else if (segment !== pathSegments[i]) {
            // Literal segment doesn't match — the path doesn't carry this prefix.
            return {};
        }
    }
    return values;
}

/**
 * Builds a fully-qualified URL with site context prefix and search params.
 *
 * Only keys defined in urlConfig.search are set by site context. Any other query params
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

    const pathPrefix =
        urlConfig.prefix && urlConfig.prefix !== '/' ? resolvePrefix({ prefix: urlConfig.prefix, params }) : '';
    const path = pathPrefix ? `${pathPrefix}${stripPathPrefix({ pathname, prefix: pathPrefix })}` : pathname;

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
