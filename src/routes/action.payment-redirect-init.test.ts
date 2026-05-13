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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { action as actionImpl } from './action.payment-redirect-init';

const action = actionImpl as unknown as (args: {
    request: Request;
    context: never;
    params: object;
}) => Promise<Response>;

vi.mock('@/lib/payment/framework-enabled.server', () => ({
    isPaymentFrameworkEnabled: () => true,
    frameworkDisabledResponse: () => new Response('Not Found', { status: 404 }),
}));

vi.mock('@/middlewares/basket.server', () => ({
    getBasket: vi.fn(),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: () => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
}));

const VALID_UUID = '11111111-2222-3333-4444-555555555555';

function makeRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
    return new Request('https://store.example.com/action/payment-redirect-init', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            origin: 'https://store.example.com',
            ...headers,
        },
        body: JSON.stringify(body),
    });
}

const VALID_BODY = {
    basketId: 'bskt-1',
    providerName: 'test-provider',
    idempotencyKey: VALID_UUID,
    providerState: '',
    shouldCreateAccount: false,
    contactPhone: '',
};

beforeEach(async () => {
    process.env.PAYMENT_COOKIE_SECRET = 'test-signing-secret';
    const redirectMod = await import('@/lib/payment-redirect.server');
    redirectMod.__resetSigningSecretForTests();

    const basketMod = await import('@/middlewares/basket.server');
    vi.mocked(basketMod.getBasket).mockResolvedValue({
        current: { basketId: 'bskt-1' },
    } as never);
});

describe('action.payment-redirect-init', () => {
    it('returns 200 with stateToken + Set-Cookie for a valid request', async () => {
        const response = await action({
            request: makeRequest(VALID_BODY),
            context: {} as never,
            params: {},
        });

        expect(response.status).toBe(200);
        expect(response.headers.get('Set-Cookie')).toMatch(/^__sfdc_payment_redirect=/);

        const body = (await response.json()) as { success: boolean; stateToken: string };
        expect(body.success).toBe(true);
        expect(body.stateToken).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('returns 403 when Origin header host does not match request host', async () => {
        const response = await action({
            request: makeRequest(VALID_BODY, { origin: 'https://attacker.example.com' }),
            context: {} as never,
            params: {},
        });

        expect(response.status).toBe(403);
        const body = (await response.json()) as { error: string };
        expect(body.error).toMatch(/cross-origin/i);
    });

    it('falls back to Referer when Origin is absent and accepts a same-host Referer', async () => {
        const request = new Request('https://store.example.com/action/payment-redirect-init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                referer: 'https://store.example.com/checkout',
            },
            body: JSON.stringify(VALID_BODY),
        });

        const response = await action({ request, context: {} as never, params: {} });
        expect(response.status).toBe(200);
    });

    it('returns 403 when both Origin and Referer are missing', async () => {
        const request = new Request('https://store.example.com/action/payment-redirect-init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(VALID_BODY),
        });

        const response = await action({ request, context: {} as never, params: {} });
        expect(response.status).toBe(403);
    });

    it('returns 400 when basketId is missing', async () => {
        const response = await action({
            request: makeRequest({ ...VALID_BODY, basketId: '' }),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(400);
        const body = (await response.json()) as { error: string };
        expect(body.error).toMatch(/basketId/i);
    });

    it('returns 400 when basketId is the wrong type', async () => {
        const response = await action({
            request: makeRequest({ ...VALID_BODY, basketId: 12345 }),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(400);
    });

    it('returns 400 when providerName is missing', async () => {
        const response = await action({
            request: makeRequest({ ...VALID_BODY, providerName: '' }),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(400);
    });

    it('returns 400 when providerName exceeds 64 chars', async () => {
        const response = await action({
            request: makeRequest({ ...VALID_BODY, providerName: 'p'.repeat(65) }),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(400);
    });

    it('returns 400 when idempotencyKey is missing', async () => {
        const response = await action({
            request: makeRequest({ ...VALID_BODY, idempotencyKey: '' }),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(400);
    });

    it('returns 400 when idempotencyKey is not UUID-shaped', async () => {
        const response = await action({
            request: makeRequest({ ...VALID_BODY, idempotencyKey: 'not-a-uuid' }),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(400);
    });

    it('returns 400 when providerState exceeds 1KB', async () => {
        const response = await action({
            request: makeRequest({ ...VALID_BODY, providerState: 'a'.repeat(1025) }),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(400);
    });

    it('returns 403 when basketId does not match current shopper basket', async () => {
        const basketMod = await import('@/middlewares/basket.server');
        vi.mocked(basketMod.getBasket).mockResolvedValue({
            current: { basketId: 'bskt-different' },
        } as never);

        const response = await action({
            request: makeRequest(VALID_BODY),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(403);
    });

    it('returns 403 when there is no current basket', async () => {
        const basketMod = await import('@/middlewares/basket.server');
        vi.mocked(basketMod.getBasket).mockResolvedValue({ current: null } as never);

        const response = await action({
            request: makeRequest(VALID_BODY),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(403);
    });

    it('returns 500 when JSON body is malformed', async () => {
        const request = new Request('https://store.example.com/action/payment-redirect-init', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                origin: 'https://store.example.com',
            },
            body: 'not-json',
        });

        const response = await action({ request, context: {} as never, params: {} });
        expect(response.status).toBe(500);
    });

    it('encodes shouldCreateAccount and contactPhone into the cookie payload', async () => {
        const response = await action({
            request: makeRequest({
                ...VALID_BODY,
                shouldCreateAccount: true,
                contactPhone: '+1 555 123 4567',
            }),
            context: {} as never,
            params: {},
        });

        expect(response.status).toBe(200);
        const setCookie = response.headers.get('Set-Cookie') || '';
        const value = setCookie.split(';')[0].split('=')[1];
        const lastDot = value.lastIndexOf('.');
        const json = decodeURIComponent(value.substring(0, lastDot));
        const parsed = JSON.parse(json);
        expect(parsed.shouldCreateAccount).toBe(true);
        expect(parsed.contactPhone).toBe('+1 555 123 4567');
    });
});
