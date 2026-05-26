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
import { describe, it, expect } from 'vitest';
import { shouldSkipProxy, rewriteCookieForLocalhost, rewriteLocationForProxy } from './hybridProxy';

describe('shouldSkipProxy', () => {
    describe('Vite internals — always skip', () => {
        it.each([
            '/@vite/client',
            '/@fs/Users/dev/src/app.tsx',
            '/@id/virtual:react-router/browser-manifest',
            '/__vite_ping',
            '/__open-in-editor',
        ])('skips %s', (path) => {
            expect(shouldSkipProxy(path)).toBe(true);
        });
    });

    describe('source and asset files — skip', () => {
        it.each([
            '/src/components/header/index.tsx',
            '/node_modules/react/index.js',
            '/route.data',
            '/product/123.data',
            '/mobify/proxy/api/shopper-products',
            '/bundle.js',
            '/styles.css',
            '/logo.svg',
            '/font.woff2',
            '/image.png',
            '/image.jpg',
            '/image.jpeg',
            '/image.webp',
            '/favicon.ico',
            '/data.json',
            '/sourcemap.js.map',
        ])('skips %s', (path) => {
            expect(shouldSkipProxy(path)).toBe(true);
        });
    });

    describe('SFRA paths — never skip (must proxy to SFCC)', () => {
        it.each([
            '/on/demandware.static/Sites-RefArchGlobal-Site/default/styles.css',
            '/on/demandware.static/Sites-RefArchGlobal-Site/default/logo.png',
            '/on/demandware.store/Sites-RefArchGlobal-Site/en_GB/Cart-Show',
            '/on/demandware.store/Sites-RefArchGlobal-Site/en_GB/Product-Show',
        ])('does not skip %s', (path) => {
            expect(shouldSkipProxy(path)).toBe(false);
        });
    });

    describe('app routes — do not skip (proxy decision deferred to routing rules)', () => {
        it.each(['/cart', '/checkout', '/s/RefArchGlobal/en_GB/Cart-Show', '/my-account'])(
            'does not skip %s',
            (path) => {
                expect(shouldSkipProxy(path)).toBe(false);
            }
        );
    });
});

describe('rewriteCookieForLocalhost', () => {
    it('rewrites SFCC domain to localhost', () => {
        const input = 'dwsid=abc123; Domain=.salesforce.com; Path=/; HttpOnly';
        expect(rewriteCookieForLocalhost(input)).toBe('dwsid=abc123; Domain=localhost; Path=/; HttpOnly');
    });

    it('preserves the Secure flag (localhost is a secure context)', () => {
        const input = 'dwsid=abc123; Path=/; Secure; HttpOnly';
        expect(rewriteCookieForLocalhost(input)).toContain('Secure');
    });

    it('rewrites domain and preserves Secure and SameSite', () => {
        const input = 'dwsid=abc123; Domain=.salesforce.com; Path=/; Secure; SameSite=None; HttpOnly';
        const result = rewriteCookieForLocalhost(input);
        expect(result).toContain('Domain=localhost');
        expect(result).toContain('Secure');
        expect(result).toContain('SameSite=None');
        expect(result).not.toContain('.salesforce.com');
    });

    it('adds Domain=localhost when no Domain attribute is present', () => {
        const input = 'dwsid=abc123; Path=/; HttpOnly';
        expect(rewriteCookieForLocalhost(input)).toContain('Domain=localhost');
    });

    it('handles Domain= case-insensitively', () => {
        const input = 'sid=xyz; DOMAIN=.example.com; Path=/';
        const result = rewriteCookieForLocalhost(input);
        expect(result).toContain('Domain=localhost');
        expect(result).not.toContain('.example.com');
    });

    it('does not double-add Domain when it is already localhost', () => {
        const input = 'sid=xyz; Domain=localhost; Path=/';
        const result = rewriteCookieForLocalhost(input);
        expect(result.match(/Domain=/gi)).toHaveLength(1);
    });

    it('rewrites the full SFCC cookie pattern: only Domain changes', () => {
        const input = 'dwsid=abc123; Domain=.salesforce.com; Path=/; Secure; SameSite=None; HttpOnly';
        const result = rewriteCookieForLocalhost(input);
        expect(result).toBe('dwsid=abc123; Domain=localhost; Path=/; Secure; SameSite=None; HttpOnly');
    });

    it('leaves SameSite=Lax, SameSite=Strict, and SameSite=None unchanged', () => {
        expect(rewriteCookieForLocalhost('sid=xyz; SameSite=Lax')).toContain('SameSite=Lax');
        expect(rewriteCookieForLocalhost('sid=xyz; SameSite=Strict')).toContain('SameSite=Strict');
        expect(rewriteCookieForLocalhost('sid=xyz; SameSite=None; Secure')).toContain('SameSite=None');
    });
});

describe('rewriteLocationForProxy', () => {
    const targetOrigin = 'https://zzrf-001.dx.commercecloud.salesforce.com';
    const proxyOrigin = 'http://localhost:5173';

    it('rewrites SFCC origin in absolute Location URLs to the proxy origin', () => {
        const result = rewriteLocationForProxy({
            locationHeader: `${targetOrigin}/s/RefArchGlobal/en-GB/cart`,
            requestUrl: '/cart',
            targetOrigin,
            proxyOrigin,
        });
        expect(result).toEqual({ kind: 'rewritten', url: `${proxyOrigin}/s/RefArchGlobal/en-GB/cart` });
    });

    it('preserves the original request query params when SFCC strips them on redirect', () => {
        // Repro for W-22582530: user visits /cart?foo=bar; SFCC redirects to its
        // canonical Cart-Show URL without the user's query string. The proxy must
        // carry foo=bar through so the destination page receives it.
        const result = rewriteLocationForProxy({
            locationHeader: `${targetOrigin}/s/RefArchGlobal/en-GB/Cart-Show`,
            requestUrl: '/cart?foo=bar',
            targetOrigin,
            proxyOrigin,
        });
        expect(result).toEqual({
            kind: 'rewritten',
            url: `${proxyOrigin}/s/RefArchGlobal/en-GB/Cart-Show?foo=bar`,
        });
    });

    it('preserves multi-value request query keys when the redirect target has none', () => {
        // SFRA refinements and promo lists commonly repeat the same key
        // (e.g. ?pmid=PROMO1&pmid=PROMO2). All values must survive the merge.
        const result = rewriteLocationForProxy({
            locationHeader: `${targetOrigin}/s/RefArchGlobal/en-GB/Cart-Show`,
            requestUrl: '/cart?pmid=PROMO1&pmid=PROMO2',
            targetOrigin,
            proxyOrigin,
        });
        expect(result.kind).toBe('rewritten');
        const parsed = new URL((result as { kind: 'rewritten'; url: string }).url);
        expect(parsed.searchParams.getAll('pmid')).toEqual(['PROMO1', 'PROMO2']);
    });

    it('lets the redirect target win on key collisions', () => {
        // If SFCC intentionally sets ?step=2 on the redirect, that wins over the
        // user's ?step=1 — SFCC owns the destination page semantics.
        const result = rewriteLocationForProxy({
            locationHeader: `${targetOrigin}/s/RefArchGlobal/en-GB/checkout?step=2`,
            requestUrl: '/checkout?step=1&foo=bar',
            targetOrigin,
            proxyOrigin,
        });
        expect(result.kind).toBe('rewritten');
        const parsed = new URL((result as { kind: 'rewritten'; url: string }).url);
        expect(parsed.searchParams.get('step')).toBe('2');
        expect(parsed.searchParams.get('foo')).toBe('bar');
    });

    it('preserves the hash fragment from the redirect target', () => {
        const result = rewriteLocationForProxy({
            locationHeader: `${targetOrigin}/s/RefArchGlobal/en-GB/cart#summary`,
            requestUrl: '/cart?foo=bar',
            targetOrigin,
            proxyOrigin,
        });
        expect(result).toEqual({
            kind: 'rewritten',
            url: `${proxyOrigin}/s/RefArchGlobal/en-GB/cart?foo=bar#summary`,
        });
    });

    it('handles relative Location headers as same-origin', () => {
        // SFCC sometimes returns relative paths in Location.
        const result = rewriteLocationForProxy({
            locationHeader: '/s/RefArchGlobal/en-GB/Cart-Show',
            requestUrl: '/cart?foo=bar',
            targetOrigin,
            proxyOrigin,
        });
        expect(result).toEqual({
            kind: 'rewritten',
            url: `${proxyOrigin}/s/RefArchGlobal/en-GB/Cart-Show?foo=bar`,
        });
    });

    it('returns off-origin for Location headers pointing elsewhere', () => {
        const result = rewriteLocationForProxy({
            locationHeader: 'https://example.com/somewhere',
            requestUrl: '/cart?foo=bar',
            targetOrigin,
            proxyOrigin,
        });
        expect(result).toEqual({ kind: 'off-origin' });
    });

    it('returns malformed for unparseable Location headers', () => {
        const result = rewriteLocationForProxy({
            locationHeader: 'http://[::bad-url',
            requestUrl: '/cart',
            targetOrigin,
            proxyOrigin,
        });
        expect(result).toEqual({ kind: 'malformed' });
    });
});
