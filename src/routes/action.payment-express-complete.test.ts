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
import { action as actionImpl } from './action.payment-express-complete';

// React Router v7 typegen requires unstable_pattern in ActionFunctionArgs. Tests don't
// exercise that field, so we cast to a looser signature for invocation.
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
    destroyBasket: vi.fn(),
}));

vi.mock('@/lib/api/basket.server', () => ({
    calculateBasket: vi.fn(),
    getBasketCurrency: vi.fn(() => 'USD'),
}));

vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: vi.fn(),
}));

vi.mock('@/targets/action-hook.server', async () => {
    const actual = await vi.importActual<typeof import('@/targets/action-hook.server')>('@/targets/action-hook.server');
    return {
        ...actual,
        runHookSafe: vi.fn(),
    };
});

vi.mock('@/lib/url.server', () => ({
    buildUrlFromContext: (to: string) => `/site${to}`,
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: () => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
}));

function makeRequest(): Request {
    const formData = new FormData();
    formData.append('walletToken', 'wallet-token-abc');
    return new Request('https://store.example.com/action/payment-express-complete', {
        method: 'POST',
        body: formData,
    });
}

beforeEach(async () => {
    vi.clearAllMocks();

    const basketMod = await import('@/middlewares/basket.server');
    // Default: basket present, no payment instrument (extension expected to add one).
    vi.mocked(basketMod.getBasket).mockResolvedValue({
        current: { basketId: 'bskt-1', paymentInstruments: [{ id: 'pi-1' }] },
    } as never);

    const basketApiMod = await import('@/lib/api/basket.server');
    vi.mocked(basketApiMod.calculateBasket).mockResolvedValue({ basketId: 'bskt-1' } as never);

    const clientsMod = await import('@/lib/api-clients.server');
    vi.mocked(clientsMod.createApiClients).mockReturnValue({
        shopperOrders: {
            createOrder: vi.fn().mockResolvedValue({ data: { orderNo: 'EXP-7777' } }),
        },
    } as never);

    const hookMod = await import('@/targets/action-hook.server');
    vi.mocked(hookMod.runHookSafe).mockResolvedValue({ result: { data: {}, actionContext: {} as never } });
});

describe('action.payment-express-complete', () => {
    it('returns 400 when no active basket', async () => {
        const basketMod = await import('@/middlewares/basket.server');
        vi.mocked(basketMod.getBasket).mockResolvedValue({ current: null } as never);

        const response = await action({ request: makeRequest(), context: {} as never, params: {} });
        expect(response.status).toBe(400);
        const body = (await response.json()) as { error: string };
        expect(body.error).toMatch(/basket/i);
    });

    it('refuses with 400 + code:no_extension when no instrument is attached after onExpressComplete', async () => {
        const basketMod = await import('@/middlewares/basket.server');
        // Initial fetch has a basket but no instrument; post-hook fetch still has no instrument.
        // Both calls return the same shape.
        vi.mocked(basketMod.getBasket).mockResolvedValue({
            current: { basketId: 'bskt-1', paymentInstruments: [] },
        } as never);

        const response = await action({ request: makeRequest(), context: {} as never, params: {} });
        expect(response.status).toBe(400);
        const body = (await response.json()) as { error: string; code: string };
        expect(body.code).toBe('no_extension');
    });

    it('returns the hook errorResponse when onExpressComplete aborts', async () => {
        const hookMod = await import('@/targets/action-hook.server');
        vi.mocked(hookMod.runHookSafe).mockResolvedValueOnce({
            errorResponse: Response.json({ success: false, error: 'verification failed' }, { status: 400 }),
        });

        const response = await action({ request: makeRequest(), context: {} as never, params: {} });
        expect(response.status).toBe(400);
        const body = (await response.json()) as { error: string };
        expect(body.error).toBe('verification failed');
    });

    it('returns 502 with structured error when createOrder throws', async () => {
        const clientsMod = await import('@/lib/api-clients.server');
        vi.mocked(clientsMod.createApiClients).mockReturnValue({
            shopperOrders: {
                createOrder: vi.fn().mockRejectedValue(new Error('SCAPI 500')),
            },
        } as never);

        const response = await action({ request: makeRequest(), context: {} as never, params: {} });
        expect(response.status).toBe(502);
        const body = (await response.json()) as { error: string; code: string };
        expect(body.error).toBe('SCAPI 500');
        expect(body.code).toBe('order_failed');
    });

    it('runs onOrderFailure when createOrder fails', async () => {
        const clientsMod = await import('@/lib/api-clients.server');
        vi.mocked(clientsMod.createApiClients).mockReturnValue({
            shopperOrders: {
                createOrder: vi.fn().mockRejectedValue(new Error('boom')),
            },
        } as never);

        const hookMod = await import('@/targets/action-hook.server');
        await action({ request: makeRequest(), context: {} as never, params: {} });

        const calls = vi.mocked(hookMod.runHookSafe).mock.calls;
        const orderFailureCalled = calls.some(([opts]) => opts.hookId === 'sfcc.checkout.payments.onOrderFailure');
        expect(orderFailureCalled).toBe(true);
    });

    it('returns 500 when createOrder returns empty result', async () => {
        const clientsMod = await import('@/lib/api-clients.server');
        vi.mocked(clientsMod.createApiClients).mockReturnValue({
            shopperOrders: {
                createOrder: vi.fn().mockResolvedValue({ data: {} }),
            },
        } as never);

        const response = await action({ request: makeRequest(), context: {} as never, params: {} });
        expect(response.status).toBe(500);
    });

    it('redirects to order confirmation on success', async () => {
        const response = await action({ request: makeRequest(), context: {} as never, params: {} });
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('/site/order-confirmation/EXP-7777');
    });

    it('runs afterPlaceOrder hook on success', async () => {
        const hookMod = await import('@/targets/action-hook.server');
        await action({ request: makeRequest(), context: {} as never, params: {} });

        const calls = vi.mocked(hookMod.runHookSafe).mock.calls;
        const afterPlaceCalled = calls.some(([opts]) => opts.hookId === 'sfcc.checkout.payments.afterPlaceOrder');
        expect(afterPlaceCalled).toBe(true);
    });
});
