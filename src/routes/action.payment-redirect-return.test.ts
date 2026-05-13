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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loader as loaderImpl } from './action.payment-redirect-return';

const loader = loaderImpl as unknown as (args: { request: Request; context: never; params: object }) => Response;
import { serializeRedirectCookie } from '@/lib/payment-redirect.server';
import type { PaymentRedirectState } from '@/lib/payment-gateway.types';

vi.mock('@/lib/payment/framework-enabled.server', () => ({
    isPaymentFrameworkEnabled: () => true,
    frameworkDisabledResponse: () => new Response('Not Found', { status: 404 }),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: () => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
}));

vi.mock('@/lib/url.server', () => ({
    buildUrlFromContext: (to: string) => `/site${to}`,
}));

const FUTURE_EXPIRY = () => new Date(Date.now() + 30 * 60 * 1000).toISOString();

function makeStateCookie(overrides: Partial<PaymentRedirectState> = {}): string {
    const state: PaymentRedirectState = {
        stateToken: 'fixed-token-1234567890ab',
        basketId: 'bskt-1',
        providerName: 'test-provider',
        idempotencyKey: 'idem-1',
        expiresAt: FUTURE_EXPIRY(),
        providerState: '',
        shouldCreateAccount: false,
        contactPhone: '',
        ...overrides,
    };
    return serializeRedirectCookie(state).split(';')[0];
}

function makeReturnRequest(token: string, cookie?: string): Request {
    const url = `https://store.example.com/action/payment-redirect-return?token=${encodeURIComponent(token)}`;
    return new Request(url, cookie ? { headers: { Cookie: cookie } } : undefined);
}

beforeEach(async () => {
    process.env.PAYMENT_COOKIE_SECRET = 'return-route-secret';
    const redirectMod = await import('@/lib/payment-redirect.server');
    redirectMod.__resetSigningSecretForTests();
});

describe('action.payment-redirect-return loader', () => {
    it('renders the auto-submitting form when cookie + token are valid', async () => {
        const cookie = makeStateCookie();
        const response = loader({
            request: makeReturnRequest('fixed-token-1234567890ab', cookie),
            context: {} as never,
            params: {},
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toMatch(/text\/html/);
        expect(response.headers.get('Cache-Control')).toBe('no-store');

        const html = await response.text();
        expect(html).toContain('<form');
        expect(html).toContain('method="post"');
        expect(html).toContain('/site/action/payment-redirect-finalize?token=fixed-token-1234567890ab');
        // The form auto-submits via inline script (wrapped in IIFE).
        expect(html).toContain('f.submit()');
        // <noscript> fallback is present.
        expect(html).toContain('<noscript>');
        // Visible status message and spinner.
        expect(html).toContain('Completing your payment');
        expect(html).toContain('class="spinner"');
        // Cache-busting headers.
        expect(html).not.toContain('autocomplete'); // sanity: not a credentials form
    });

    it('HTML-escapes the action attribute to prevent injection from query strings', () => {
        const cookie = makeStateCookie();
        const url =
            'https://store.example.com/action/payment-redirect-return?token=fixed-token-1234567890ab&evil=%22%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E';
        const response = loader({
            request: new Request(url, { headers: { Cookie: cookie } }),
            context: {} as never,
            params: {},
        });
        // Once the URL is decoded back into the URL object then re-stringified into the
        // form action, the attacker-controlled chars must be HTML-escaped, not raw.
        // We don't need a perfect-fidelity test of escapeHtmlAttr; presence of <script>
        // outside the attribute would mean injection.
        // (response is sync now)
        // Use an async IIFE to read the body; this test is async-only by virtue of
        // its expectation block below.
        return response.text().then((html) => {
            expect(html).not.toContain('<script>alert(1)');
            // The escaped form must contain &lt; or &amp; somewhere in the action attr.
            expect(html).toMatch(/action="[^"]*&(amp|lt);/);
        });
    });

    it('redirects to /checkout?error=payment_expired when no cookie is present', () => {
        const response = loader({
            request: makeReturnRequest('any-token'),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('/site/checkout?error=payment_expired');
    });

    it('redirects to /checkout?error=payment_invalid when stateToken does not match', () => {
        const cookie = makeStateCookie({ stateToken: 'cookie-token-xxxxxxxxxxxx' });
        const response = loader({
            request: makeReturnRequest('url-token-yyyyyyyyyyyyyyyy', cookie),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('/site/checkout?error=payment_invalid');
    });

    it('redirects to /checkout?error=payment_expired when cookie is past TTL', () => {
        const cookie = makeStateCookie({ expiresAt: new Date(Date.now() - 1000).toISOString() });
        const response = loader({
            request: makeReturnRequest('fixed-token-1234567890ab', cookie),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('/site/checkout?error=payment_expired');
    });

    it('forwards original query params (other than token) into the finalize URL', async () => {
        const cookie = makeStateCookie();
        const url =
            'https://store.example.com/action/payment-redirect-return?token=fixed-token-1234567890ab&payment_intent=pi_abc&PayerID=p123';
        const response = loader({
            request: new Request(url, { headers: { Cookie: cookie } }),
            context: {} as never,
            params: {},
        });
        const html = await response.text();
        // Param names + values are present; & is HTML-escaped to &amp; inside attr.
        expect(html).toContain('payment_intent=pi_abc');
        expect(html).toContain('PayerID=p123');
        // The form action attribute uses &amp; not raw & between params.
        expect(html).toMatch(/action="[^"]*payment_intent=pi_abc&amp;PayerID=p123"/);
    });
});
