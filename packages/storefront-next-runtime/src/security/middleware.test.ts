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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MiddlewareFunction, RouterContextProvider } from 'react-router';
import { createSecurityHeadersMiddleware } from './middleware';
import { securityContext } from './nonce';

type Args = Parameters<MiddlewareFunction<Response>>[0];
type Next = Parameters<MiddlewareFunction<Response>>[1];

function makeArgs(): { args: Args; context: RouterContextProvider } {
    const store = new Map<unknown, unknown>();
    const context = {
        get: (k: unknown) => store.get(k),
        set: (k: unknown, v: unknown) => store.set(k, v),
    } as unknown as RouterContextProvider;
    return {
        args: {
            request: new Request('http://localhost/'),
            context,
            params: {},
            unstable_pattern: '',
        } as Args,
        context,
    };
}

const okResponse = (): Promise<Response> => Promise.resolve(new Response('ok'));

/**
 * The RR middleware return type is `Promise<void | Response>`. In every
 * test here we drive it with a `next()` that resolves to `Response`, so
 * we narrow the result for ergonomic header assertions.
 */
async function run(
    mw: MiddlewareFunction<Response>,
    args: Args,
    next: Next = okResponse as unknown as Next
): Promise<Response> {
    return (await mw(args, next)) as Response;
}

describe('createSecurityHeadersMiddleware', () => {
    const origBundle = process.env.BUNDLE_ID;

    beforeEach(() => {
        process.env.BUNDLE_ID = 'local';
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        process.env.BUNDLE_ID = origBundle;
        vi.restoreAllMocks();
    });

    it('sets all six headers on a successful response', async () => {
        process.env.BUNDLE_ID = 'abc123';
        const mw = createSecurityHeadersMiddleware({});
        const { args } = makeArgs();
        const res = await run(mw, args);
        expect(res.headers.get('content-security-policy')).toMatch(/default-src 'self'/);
        expect(res.headers.get('strict-transport-security')).toBe('max-age=15552000; includeSubDomains');
        expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
        expect(res.headers.get('x-content-type-options')).toBe('nosniff');
        expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
        expect(res.headers.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=()');
    });

    it('omits HSTS when BUNDLE_ID is local', async () => {
        process.env.BUNDLE_ID = 'local';
        const mw = createSecurityHeadersMiddleware({});
        const { args } = makeArgs();
        const res = await run(mw, args);
        expect(res.headers.get('strict-transport-security')).toBeNull();
        expect(res.headers.get('content-security-policy')).not.toBeNull();
    });

    it('omits HSTS when BUNDLE_ID is unset', async () => {
        delete process.env.BUNDLE_ID;
        const mw = createSecurityHeadersMiddleware({});
        const { args } = makeArgs();
        const res = await run(mw, args);
        expect(res.headers.get('strict-transport-security')).toBeNull();
    });

    it('writes a per-request nonce on context that matches the CSP nonce', async () => {
        const mw = createSecurityHeadersMiddleware({});
        const { args, context } = makeArgs();
        const res = await run(mw, args, (() => {
            // Read nonce inside next() — simulating a render reading it.
            const nonceFromCtx = context.get(securityContext);
            return Promise.resolve(new Response(JSON.stringify(nonceFromCtx)));
        }) as unknown as Next);
        const csp = res.headers.get('content-security-policy') ?? '';
        const match = csp.match(/'nonce-([A-Za-z0-9+/=]{24})'/);
        if (match === null) throw new Error('CSP missing nonce');
        const nonceFromCsp = match[1];
        const body = (await res.json()) as { nonce: string };
        expect(body.nonce).toBe(nonceFromCsp);
    });

    it('uses Content-Security-Policy-Report-Only when reportOnly is true', async () => {
        const mw = createSecurityHeadersMiddleware({ csp: { reportOnly: true } });
        const { args } = makeArgs();
        const res = await run(mw, args);
        expect(res.headers.get('content-security-policy')).toBeNull();
        expect(res.headers.get('content-security-policy-report-only')).not.toBeNull();
    });

    it('csp: false wins over reportOnly (no CSP header at all)', async () => {
        const mw = createSecurityHeadersMiddleware({ csp: false });
        const { args } = makeArgs();
        const res = await run(mw, args);
        expect(res.headers.get('content-security-policy')).toBeNull();
        expect(res.headers.get('content-security-policy-report-only')).toBeNull();
    });

    it('replaces the SDK default for a directive when customer supplies one', async () => {
        const mw = createSecurityHeadersMiddleware({
            csp: { directives: { 'script-src': ["'self'", 'https://cdn.foo.com'] } },
        });
        const { args } = makeArgs();
        const res = await run(mw, args);
        const csp = res.headers.get('content-security-policy') ?? '';
        // Customer's script-src wins; default-src etc. are still present.
        expect(csp).toMatch(/script-src 'self' https:\/\/cdn\.foo\.com 'nonce-[A-Za-z0-9+/=]{24}'/);
        expect(csp).toMatch(/default-src 'self'/);
        expect(csp).not.toMatch(/script-src.*challenges\.cloudflare\.com/);
    });

    it('no-ops when enabled is false', async () => {
        const mw = createSecurityHeadersMiddleware({ enabled: false });
        const { args } = makeArgs();
        const res = await run(mw, args);
        expect(res.headers.get('content-security-policy')).toBeNull();
        expect(res.headers.get('x-frame-options')).toBeNull();
    });

    it('skips CSP only when csp is false', async () => {
        const mw = createSecurityHeadersMiddleware({ csp: false });
        const { args } = makeArgs();
        const res = await run(mw, args);
        expect(res.headers.get('content-security-policy')).toBeNull();
        expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    });

    it('logs a boot warning once when reportOnly is true', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        createSecurityHeadersMiddleware({ csp: { reportOnly: true } });
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0]?.[0]).toMatch(/CSP is in report-only mode/);
    });

    it('logs a boot warning when enabled is false', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        createSecurityHeadersMiddleware({ enabled: false });
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0]?.[0]).toMatch(/All security headers disabled/);
    });

    it('throws at factory call on invalid directive name', () => {
        expect(() =>
            createSecurityHeadersMiddleware({
                csp: { directives: { 'scrpt-src': ["'self'"] } as never },
            })
        ).toThrowError(/Invalid CSP directive name/);
    });

    it('still sets headers on an error (5xx) response', async () => {
        process.env.BUNDLE_ID = 'abc123';
        const mw = createSecurityHeadersMiddleware({});
        const { args } = makeArgs();
        const res = await run(mw, args, (() =>
            Promise.resolve(new Response('boom', { status: 500 }))) as unknown as Next);
        expect(res.status).toBe(500);
        expect(res.headers.get('content-security-policy')).not.toBeNull();
    });

    it('still sets headers on a redirect (302) response', async () => {
        process.env.BUNDLE_ID = 'abc123';
        const mw = createSecurityHeadersMiddleware({});
        const { args } = makeArgs();
        const res = await run(mw, args, (() =>
            Promise.resolve(new Response(null, { status: 302, headers: { location: '/foo' } }))) as unknown as Next);
        expect(res.status).toBe(302);
        expect(res.headers.get('content-security-policy')).not.toBeNull();
    });

    it('applies headers to a Response thrown from next() and re-throws (RR 404/redirect throw path)', async () => {
        // RR loaders throw `Response` for 404/redirect. Without try/catch in
        // the middleware, those error responses ship without security headers.
        process.env.BUNDLE_ID = 'abc123';
        const mw = createSecurityHeadersMiddleware({});
        const { args } = makeArgs();
        const thrown = new Response('not found', { status: 404 });
        let caught: unknown;
        try {
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            await mw(args, (() => Promise.reject(thrown)) as unknown as Next);
        } catch (err) {
            caught = err;
        }
        expect(caught).toBe(thrown);
        expect((caught as Response).headers.get('content-security-policy')).toMatch(/'nonce-/);
        expect((caught as Response).headers.get('x-frame-options')).toBe('SAMEORIGIN');
        expect((caught as Response).headers.get('strict-transport-security')).not.toBeNull();
    });

    it('re-throws non-Response errors unchanged (no header mutation)', async () => {
        process.env.BUNDLE_ID = 'abc123';
        const mw = createSecurityHeadersMiddleware({});
        const { args } = makeArgs();
        const boom = new Error('boom');
        let caught: unknown;
        try {
            await mw(args, (() => Promise.reject(boom)) as unknown as Next);
        } catch (err) {
            caught = err;
        }
        expect(caught).toBe(boom);
    });

    it('sets headers on a streaming response before the body is consumed', async () => {
        process.env.BUNDLE_ID = 'abc123';
        const mw = createSecurityHeadersMiddleware({});
        const { args } = makeArgs();
        // Stream that the test never reads — header assertions must succeed
        // synchronously after the middleware returns, not after the stream drains.
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('chunk-1'));
                // intentionally not closing — represents an in-flight stream.
            },
        });
        const res = await run(mw, args, (() => Promise.resolve(new Response(stream))) as unknown as Next);
        expect(res.headers.get('content-security-policy')).not.toBeNull();
        expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
        // Cancel so vitest doesn't hang on the unfinished stream.
        await res.body?.cancel();
    });

    it('emits script-src last (after the static body) so the per-request nonce is appended cleanly', async () => {
        const mw = createSecurityHeadersMiddleware({
            csp: { directives: { 'script-src': ["'self'", 'https://cdn.foo.com'] } },
        });
        const { args } = makeArgs();
        const res = await run(mw, args);
        const csp = res.headers.get('content-security-policy') ?? '';
        // script-src clause is appended after the static body so the per-request nonce concat is a single template literal.
        expect(csp.lastIndexOf('script-src')).toBeGreaterThan(csp.indexOf('default-src'));
    });

    it('preserves directive order from defaults across the static body', async () => {
        const mw = createSecurityHeadersMiddleware({});
        const { args } = makeArgs();
        const res = await run(mw, args);
        const csp = res.headers.get('content-security-policy') ?? '';
        // defaults.ts insertion order: default-src, then style-src (script-src is destructured out and appended last).
        expect(csp.indexOf('default-src')).toBeLessThan(csp.indexOf('style-src'));
        expect(csp.indexOf('style-src')).toBeLessThan(csp.indexOf('img-src'));
    });
});
