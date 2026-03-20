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
import { describe, expect, it } from 'vitest';
import {
    buildUrl,
    parseSearchConfig,
    extractPrefixParams,
    decomposeUrl,
    resolvePrefix,
    sanitizePrefix,
    stripPathPrefix,
} from './build-url';

describe('parseSearchConfig', () => {
    it('preserves :param placeholders for a single param with leading ?', () => {
        expect(parseSearchConfig('?lng=:localeId')).toEqual({ lng: ':localeId' });
    });

    it('preserves :param placeholders without leading ?', () => {
        expect(parseSearchConfig('lng=:localeId')).toEqual({ lng: ':localeId' });
    });

    it('preserves :param placeholders for multiple params', () => {
        expect(parseSearchConfig('?lng=:localeId&site=:siteId')).toEqual({
            lng: ':localeId',
            site: ':siteId',
        });
    });

    it('preserves literal (non-param) values', () => {
        expect(parseSearchConfig('?mode=dark')).toEqual({ mode: 'dark' });
    });

    it('returns empty object for empty string', () => {
        expect(parseSearchConfig('')).toEqual({});
    });

    it('returns empty object for just ?', () => {
        expect(parseSearchConfig('?')).toEqual({});
    });
});

describe('extractPrefixParams', () => {
    it('extracts single param', () => {
        expect(extractPrefixParams('/:siteId')).toEqual(['siteId']);
    });

    it('extracts multiple params', () => {
        expect(extractPrefixParams('/:siteId/:localeId')).toEqual(['siteId', 'localeId']);
    });

    it('returns empty array for no params', () => {
        expect(extractPrefixParams('/')).toEqual([]);
    });

    it('returns empty array for empty string', () => {
        expect(extractPrefixParams('')).toEqual([]);
    });
});

describe('decomposeUrl', () => {
    it('decomposes a plain pathname', () => {
        expect(decomposeUrl('/product/123')).toEqual({ pathname: '/product/123', search: '', hash: '' });
    });

    it('decomposes pathname with search', () => {
        expect(decomposeUrl('/product/123?color=red')).toEqual({
            pathname: '/product/123',
            search: 'color=red',
            hash: '',
        });
    });

    it('decomposes pathname with hash', () => {
        expect(decomposeUrl('/product/123#details')).toEqual({
            pathname: '/product/123',
            search: '',
            hash: '#details',
        });
    });

    it('decomposes pathname with search and hash', () => {
        expect(decomposeUrl('/product/123?color=red#details')).toEqual({
            pathname: '/product/123',
            search: 'color=red',
            hash: '#details',
        });
    });

    it('handles root path', () => {
        expect(decomposeUrl('/')).toEqual({ pathname: '/', search: '', hash: '' });
    });

    it('handles empty string', () => {
        expect(decomposeUrl('')).toEqual({ pathname: '', search: '', hash: '' });
    });
});

describe('resolvePrefix', () => {
    it('resolves a single param', () => {
        expect(resolvePrefix('/:siteId', { siteId: 'global' })).toBe('/global');
    });

    it('resolves multiple params', () => {
        expect(resolvePrefix('/:siteId/:localeId', { siteId: 'global', localeId: 'en-GB' })).toBe('/global/en-GB');
    });

    it('leaves unmatched params as-is', () => {
        expect(resolvePrefix('/:siteId/:localeId', { siteId: 'global' })).toBe('/global/:localeId');
    });

    it('returns prefix unchanged when no params match', () => {
        expect(resolvePrefix('/:siteId', {})).toBe('/:siteId');
    });
});

describe('sanitizePrefix', () => {
    it('strips a matching prefix', () => {
        expect(sanitizePrefix('/global/en-GB/product/123', '/global/en-GB')).toBe('/product/123');
    });

    it('returns empty string when pathname equals prefix exactly', () => {
        expect(sanitizePrefix('/global/en-GB', '/global/en-GB')).toBe('');
    });

    it('returns pathname unchanged when prefix does not match', () => {
        expect(sanitizePrefix('/product/123', '/global/en-GB')).toBe('/product/123');
    });

    it('does not strip a partial segment match', () => {
        expect(sanitizePrefix('/global/en-GB-extra/page', '/global/en-GB')).toBe('/global/en-GB-extra/page');
    });

    it('returns pathname unchanged when resolvedPrefix is empty', () => {
        expect(sanitizePrefix('/product/123', '')).toBe('/product/123');
    });
});

describe('stripPathPrefix', () => {
    it('strips /:siteId/:localeId prefix', () => {
        expect(stripPathPrefix('/global/en-GB/checkout', '/:siteId/:localeId')).toBe('/checkout');
        expect(stripPathPrefix('/us/en-US/product/123', '/:siteId/:localeId')).toBe('/product/123');
        expect(stripPathPrefix('/global/it-IT/category/womens', '/:siteId/:localeId')).toBe('/category/womens');
    });

    it('strips /:localeId prefix', () => {
        expect(stripPathPrefix('/en-GB/checkout', '/:localeId')).toBe('/checkout');
        expect(stripPathPrefix('/en-US/product/123', '/:localeId')).toBe('/product/123');
    });

    it('strips /:siteId prefix', () => {
        expect(stripPathPrefix('/global/checkout', '/:siteId')).toBe('/checkout');
    });

    it('returns pathname unchanged when it has fewer segments than the prefix', () => {
        expect(stripPathPrefix('/checkout', '/:siteId/:localeId')).toBe('/checkout');
        expect(stripPathPrefix('/', '/:siteId/:localeId')).toBe('/');
    });

    it('returns pathname unchanged when prefix is empty', () => {
        expect(stripPathPrefix('/checkout', '')).toBe('/checkout');
        expect(stripPathPrefix('/global/en-GB/checkout', '')).toBe('/global/en-GB/checkout');
    });

    it('returns "/" when pathname equals the prefix exactly', () => {
        expect(stripPathPrefix('/global/en-GB', '/:siteId/:localeId')).toBe('/');
    });
});

describe('buildUrl', () => {
    describe('pass-through cases', () => {
        it('returns to unchanged when no urlConfig', () => {
            expect(buildUrl({ to: '/product/123', params: {} })).toBe('/product/123');
        });

        it('returns empty string unchanged', () => {
            expect(buildUrl({ to: '', urlConfig: { prefix: '/:siteId' }, params: { siteId: 'global' } })).toBe('');
        });

        it('returns hash-only unchanged', () => {
            expect(buildUrl({ to: '#', urlConfig: { prefix: '/:siteId' }, params: { siteId: 'global' } })).toBe('#');
        });

        it('returns http URLs unchanged', () => {
            expect(
                buildUrl({
                    to: 'http://example.com/page',
                    urlConfig: { prefix: '/:siteId' },
                    params: { siteId: 'global' },
                })
            ).toBe('http://example.com/page');
        });

        it('returns protocol-relative URLs unchanged', () => {
            expect(
                buildUrl({
                    to: '//example.com/page',
                    urlConfig: { prefix: '/:siteId' },
                    params: { siteId: 'global' },
                })
            ).toBe('//example.com/page');
        });

        it('returns to unchanged when prefix is /', () => {
            expect(buildUrl({ to: '/product/123', urlConfig: { prefix: '/' }, params: {} })).toBe('/product/123');
        });
    });

    describe('prefix only', () => {
        it('prepends single param prefix', () => {
            expect(
                buildUrl({
                    to: '/product/123',
                    urlConfig: { prefix: '/:siteId' },
                    params: { siteId: 'global' },
                })
            ).toBe('/global/product/123');
        });

        it('prepends multi-param prefix', () => {
            expect(
                buildUrl({
                    to: '/product/123',
                    urlConfig: { prefix: '/:siteId/:localeId' },
                    params: { siteId: 'global', localeId: 'en-GB' },
                })
            ).toBe('/global/en-GB/product/123');
        });

        it('handles root path', () => {
            expect(
                buildUrl({
                    to: '/',
                    urlConfig: { prefix: '/:siteId' },
                    params: { siteId: 'global' },
                })
            ).toBe('/global/');
        });
    });

    describe('search only', () => {
        it('appends single search param', () => {
            expect(
                buildUrl({
                    to: '/product/123',
                    urlConfig: { search: '?lng=:localeId' },
                    params: { localeId: 'en-GB' },
                })
            ).toBe('/product/123?lng=en-GB');
        });

        it('appends multiple search params', () => {
            expect(
                buildUrl({
                    to: '/product/123',
                    urlConfig: { search: '?lng=:localeId&site=:siteId' },
                    params: { localeId: 'en-GB', siteId: 'global' },
                })
            ).toBe('/product/123?lng=en-GB&site=global');
        });

        it('does not append search param when value is missing', () => {
            expect(
                buildUrl({
                    to: '/product/123',
                    urlConfig: { search: '?lng=:localeId' },
                    params: {},
                })
            ).toBe('/product/123');
        });
    });

    describe('prefix + search combined', () => {
        it('applies both prefix and search', () => {
            expect(
                buildUrl({
                    to: '/product/123',
                    urlConfig: { prefix: '/:siteId', search: '?lng=:localeId' },
                    params: { siteId: 'global', localeId: 'en-GB' },
                })
            ).toBe('/global/product/123?lng=en-GB');
        });
    });

    describe('existing query params', () => {
        it('merges with existing query params', () => {
            expect(
                buildUrl({
                    to: '/product/123?color=red',
                    urlConfig: { search: '?lng=:localeId' },
                    params: { localeId: 'en-GB' },
                })
            ).toBe('/product/123?color=red&lng=en-GB');
        });

        it('overrides existing query param with config value', () => {
            expect(
                buildUrl({
                    to: '/product/123?lng=de-DE',
                    urlConfig: { search: '?lng=:localeId' },
                    params: { localeId: 'en-GB' },
                })
            ).toBe('/product/123?lng=en-GB');
        });

        it('preserves duplicate keys not related to multi-site config', () => {
            expect(
                buildUrl({
                    to: '/api/search?refine=color:blue&refine=size:M',
                    urlConfig: { search: '?lng=:localeId' },
                    params: { localeId: 'en-GB' },
                })
            ).toBe('/api/search?refine=color%3Ablue&refine=size%3AM&lng=en-GB');
        });
    });

    describe('hash handling', () => {
        it('preserves hash', () => {
            expect(
                buildUrl({
                    to: '/product/123#details',
                    urlConfig: { prefix: '/:siteId' },
                    params: { siteId: 'global' },
                })
            ).toBe('/global/product/123#details');
        });

        it('preserves hash with search params', () => {
            expect(
                buildUrl({
                    to: '/product/123?color=red#details',
                    urlConfig: { prefix: '/:siteId', search: '?lng=:localeId' },
                    params: { siteId: 'global', localeId: 'en-GB' },
                })
            ).toBe('/global/product/123?color=red&lng=en-GB#details');
        });
    });

    describe('idempotency', () => {
        it('does not double-prefix an already-prefixed path', () => {
            expect(
                buildUrl({
                    to: '/global/en-GB/product/123',
                    urlConfig: { prefix: '/:siteId/:localeId' },
                    params: { siteId: 'global', localeId: 'en-GB' },
                })
            ).toBe('/global/en-GB/product/123');
        });

        it('does not double-prefix when path equals the resolved prefix', () => {
            expect(
                buildUrl({
                    to: '/global/en-GB',
                    urlConfig: { prefix: '/:siteId/:localeId' },
                    params: { siteId: 'global', localeId: 'en-GB' },
                })
            ).toBe('/global/en-GB');
        });

        it('still prefixes a path that only partially matches', () => {
            expect(
                buildUrl({
                    to: '/global/en-GBextra/product/123',
                    urlConfig: { prefix: '/:siteId/:localeId' },
                    params: { siteId: 'global', localeId: 'en-GB' },
                })
            ).toBe('/global/en-GB/global/en-GBextra/product/123');
        });
    });
});
