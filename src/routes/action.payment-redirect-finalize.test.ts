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
import { action as actionImpl } from './action.payment-redirect-finalize';

const action = actionImpl as unknown as (args: {
    request: Request;
    context: never;
    params: object;
}) => Promise<Response>;
import { serializeRedirectCookie } from '@/lib/payment-redirect.server';
import type { PaymentRedirectState } from '@/lib/payment-gateway.types';

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

function makeFinalizeRequest(token: string, cookie?: string): Request {
    const url = `https://store.example.com/action/payment-redirect-finalize?token=${encodeURIComponent(token)}`;
    return new Request(url, {
        method: 'POST',
        headers: cookie ? { Cookie: cookie } : {},
    });
}

beforeEach(async () => {
    vi.clearAllMocks();
    process.env.PAYMENT_COOKIE_SECRET = 'finalize-test-secret';

    const redirectMod = await import('@/lib/payment-redirect.server');
    redirectMod.__resetSigningSecretForTests();

    const basketMod = await import('@/middlewares/basket.server');
    vi.mocked(basketMod.getBasket).mockResolvedValue({ current: { basketId: 'bskt-1' } } as never);

    const basketApiMod = await import('@/lib/api/basket.server');
    vi.mocked(basketApiMod.calculateBasket).mockResolvedValue({ basketId: 'bskt-1' } as never);

    const clientsMod = await import('@/lib/api-clients.server');
    vi.mocked(clientsMod.createApiClients).mockReturnValue({
        shopperOrders: {
            createOrder: vi.fn().mockResolvedValue({ data: { orderNo: 'ORD-9001' } }),
        },
    } as never);

    const hookMod = await import('@/targets/action-hook.server');
    // Default: hooks succeed (no errorResponse).
    vi.mocked(hookMod.runHookSafe).mockResolvedValue({ result: { data: {}, actionContext: {} as never } });
});

describe('action.payment-redirect-finalize', () => {
    it('redirects to ?error=payment_expired when no cookie present', async () => {
        const response = await action({
            request: makeFinalizeRequest('any-token'),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('/site/checkout?error=payment_expired');
    });

    it('redirects to ?error=payment_invalid when stateToken does not match', async () => {
        const cookie = makeStateCookie({ stateToken: 'cookie-token-xxxxxxxxxxxx' });
        const response = await action({
            request: makeFinalizeRequest('url-token-yyyyyyyyyyyyyyyy', cookie),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('/site/checkout?error=payment_invalid');
    });

    it('redirects to ?error=basket_changed when basket does not match cookie', async () => {
        const basketMod = await import('@/middlewares/basket.server');
        vi.mocked(basketMod.getBasket).mockResolvedValue({
            current: { basketId: 'bskt-different' },
        } as never);

        const cookie = makeStateCookie();
        const response = await action({
            request: makeFinalizeRequest('fixed-token-1234567890ab', cookie),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('/site/checkout?error=basket_changed');
        expect(response.headers.get('Set-Cookie')).toMatch(/Max-Age=0/);
    });

    it('redirects to ?error=payment_failed when onRedirectReturn hook aborts', async () => {
        const hookMod = await import('@/targets/action-hook.server');
        vi.mocked(hookMod.runHookSafe).mockResolvedValueOnce({
            errorResponse: Response.json({ success: false }, { status: 400 }),
        });

        const cookie = makeStateCookie();
        const response = await action({
            request: makeFinalizeRequest('fixed-token-1234567890ab', cookie),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('/site/checkout?error=payment_failed');
        expect(response.headers.get('Set-Cookie')).toMatch(/Max-Age=0/);
    });

    it('redirects to ?error=order_failed when createOrder throws', async () => {
        const clientsMod = await import('@/lib/api-clients.server');
        vi.mocked(clientsMod.createApiClients).mockReturnValue({
            shopperOrders: {
                createOrder: vi.fn().mockRejectedValue(new Error('SCAPI down')),
            },
        } as never);

        const cookie = makeStateCookie();
        const response = await action({
            request: makeFinalizeRequest('fixed-token-1234567890ab', cookie),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('/site/checkout?error=order_failed');
        expect(response.headers.get('Set-Cookie')).toMatch(/Max-Age=0/);
    });

    it('runs onOrderFailure hook when createOrder fails', async () => {
        const clientsMod = await import('@/lib/api-clients.server');
        vi.mocked(clientsMod.createApiClients).mockReturnValue({
            shopperOrders: {
                createOrder: vi.fn().mockRejectedValue(new Error('SCAPI down')),
            },
        } as never);

        const hookMod = await import('@/targets/action-hook.server');
        const cookie = makeStateCookie();
        await action({
            request: makeFinalizeRequest('fixed-token-1234567890ab', cookie),
            context: {} as never,
            params: {},
        });

        const calls = vi.mocked(hookMod.runHookSafe).mock.calls;
        const orderFailureCalled = calls.some(([opts]) => opts.hookId === 'sfcc.checkout.payments.onOrderFailure');
        expect(orderFailureCalled).toBe(true);
    });

    it('redirects to order confirmation on success and clears the cookie', async () => {
        const cookie = makeStateCookie();
        const response = await action({
            request: makeFinalizeRequest('fixed-token-1234567890ab', cookie),
            context: {} as never,
            params: {},
        });
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('/site/order-confirmation/ORD-9001');
        expect(response.headers.get('Set-Cookie')).toMatch(/Max-Age=0/);
    });

    it('destroys the basket on success', async () => {
        const cookie = makeStateCookie();
        await action({
            request: makeFinalizeRequest('fixed-token-1234567890ab', cookie),
            context: {} as never,
            params: {},
        });

        const basketMod = await import('@/middlewares/basket.server');
        expect(basketMod.destroyBasket).toHaveBeenCalled();
    });

    it('runs afterPlaceOrder hook on success', async () => {
        const hookMod = await import('@/targets/action-hook.server');
        const cookie = makeStateCookie();
        await action({
            request: makeFinalizeRequest('fixed-token-1234567890ab', cookie),
            context: {} as never,
            params: {},
        });

        const calls = vi.mocked(hookMod.runHookSafe).mock.calls;
        const afterPlaceCalled = calls.some(([opts]) => opts.hookId === 'sfcc.checkout.payments.afterPlaceOrder');
        expect(afterPlaceCalled).toBe(true);
    });

    it('redirects to ?error=order_failed when createOrder returns empty result', async () => {
        const clientsMod = await import('@/lib/api-clients.server');
        vi.mocked(clientsMod.createApiClients).mockReturnValue({
            shopperOrders: {
                createOrder: vi.fn().mockResolvedValue({ data: {} }),
            },
        } as never);

        const cookie = makeStateCookie();
        const response = await action({
            request: makeFinalizeRequest('fixed-token-1234567890ab', cookie),
            context: {} as never,
            params: {},
        });
        expect(response.headers.get('Location')).toBe('/site/checkout?error=order_failed');
    });
});
