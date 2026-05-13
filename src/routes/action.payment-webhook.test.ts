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
import { action as actionImpl } from './action.payment-webhook';

const action = actionImpl as unknown as (args: {
    request: Request;
    context: never;
    params: object;
}) => Promise<Response>;

vi.mock('@/lib/payment/framework-enabled.server', () => ({
    isPaymentFrameworkEnabled: () => true,
    frameworkDisabledResponse: () => new Response('Not Found', { status: 404 }),
}));

vi.mock('@/targets/action-hook.server', async () => {
    const actual = await vi.importActual<typeof import('@/targets/action-hook.server')>('@/targets/action-hook.server');
    return {
        ...actual,
        runHookSafe: vi.fn(),
    };
});

vi.mock('@/lib/logger.server', () => ({
    getLogger: () => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
}));

beforeEach(async () => {
    vi.clearAllMocks();
    const hookMod = await import('@/targets/action-hook.server');
    vi.mocked(hookMod.runHookSafe).mockResolvedValue({ result: { data: {}, actionContext: {} as never } });
});

function makeRequest(providerName: string | null, body: string, headers: Record<string, string> = {}): Request {
    const url = providerName
        ? `https://store.example.com/action/payment-webhook?provider=${encodeURIComponent(providerName)}`
        : 'https://store.example.com/action/payment-webhook';
    return new Request(url, { method: 'POST', body, headers });
}

describe('action.payment-webhook', () => {
    it('returns 400 when provider query param is missing', async () => {
        const response = await action({
            request: makeRequest(null, '{}'),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(400);
    });

    it('returns 400 when provider name exceeds 64 chars', async () => {
        const response = await action({
            request: makeRequest('p'.repeat(65), '{}'),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(400);
    });

    it('dispatches to onWebhook hook with raw body and headers', async () => {
        const hookMod = await import('@/targets/action-hook.server');
        const rawBody = '{"event":"payment.succeeded","amount":1234}';

        await action({
            request: makeRequest('stripe', rawBody, {
                'Content-Type': 'application/json',
                'Stripe-Signature': 't=123,v1=abc',
            }),
            context: {} as never,
            params: {},
        });

        const calls = vi.mocked(hookMod.runHookSafe).mock.calls;
        expect(calls).toHaveLength(1);
        const [opts] = calls[0];
        expect(opts.hookId).toBe('sfcc.checkout.payments.onWebhook');
        expect((opts.context.data as Record<string, unknown>).providerName).toBe('stripe');
        expect((opts.context.data as Record<string, unknown>).rawBody).toBe(rawBody);
        const dataHeaders = (opts.context.data as { headers: Record<string, string> }).headers;
        expect(dataHeaders['stripe-signature']).toBe('t=123,v1=abc');
    });

    it('returns 200 on successful hook run', async () => {
        const response = await action({
            request: makeRequest('stripe', '{}'),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(200);
        const body = (await response.json()) as { received: boolean };
        expect(body.received).toBe(true);
    });

    it('returns the hook errorResponse when extension rejects', async () => {
        const hookMod = await import('@/targets/action-hook.server');
        vi.mocked(hookMod.runHookSafe).mockResolvedValueOnce({
            errorResponse: Response.json({ success: false, error: 'invalid signature' }, { status: 400 }),
        });

        const response = await action({
            request: makeRequest('stripe', '{}'),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(400);
    });

    it('returns 200 when no extension is registered (no hook handler)', async () => {
        // runHookSafe with no registered handler returns success result (no errorResponse).
        // The default mock already returns this.
        const response = await action({
            request: makeRequest('unknown-provider', '{}'),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(200);
    });

    it('lowercases header names in the data passed to the hook', async () => {
        const hookMod = await import('@/targets/action-hook.server');
        await action({
            request: makeRequest('stripe', '{}', {
                'X-Custom-Header': 'value',
                'Stripe-Signature': 'sig',
            }),
            context: {} as never,
            params: {},
        });
        const [opts] = vi.mocked(hookMod.runHookSafe).mock.calls[0];
        const headers = (opts.context.data as { headers: Record<string, string> }).headers;
        expect(headers['x-custom-header']).toBe('value');
        expect(headers['stripe-signature']).toBe('sig');
        expect(headers['X-Custom-Header']).toBeUndefined();
    });
});
