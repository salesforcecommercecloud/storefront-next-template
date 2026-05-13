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
import { finalizeOrderSuccess } from './post-order.server';

vi.mock('@/middlewares/basket.server', () => ({
    destroyBasket: vi.fn(),
}));

vi.mock('@/lib/url.server', () => ({
    buildUrlFromContext: (to: string) => `/site${to}`,
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('finalizeOrderSuccess', () => {
    it('redirects to order confirmation URL', () => {
        const response = finalizeOrderSuccess({ context: {} as never, orderNo: 'ORD-1' });
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('/site/order-confirmation/ORD-1');
    });

    it('destroys basket as part of teardown', async () => {
        finalizeOrderSuccess({ context: {} as never, orderNo: 'ORD-1' });
        const basketMod = await import('@/middlewares/basket.server');
        expect(basketMod.destroyBasket).toHaveBeenCalledTimes(1);
    });

    it('appends queryParams to the redirect URL', () => {
        const response = finalizeOrderSuccess({
            context: {} as never,
            orderNo: 'ORD-2',
            queryParams: {
                accountCreated: 'true',
                email: 'shopper@example.com',
                autoLoggedIn: 'true',
            },
        });
        const location = response.headers.get('Location') || '';
        expect(location).toContain('/site/order-confirmation/ORD-2?');
        expect(location).toContain('accountCreated=true');
        expect(location).toContain('email=shopper%40example.com');
        expect(location).toContain('autoLoggedIn=true');
    });

    it('omits query string when queryParams is empty object', () => {
        const response = finalizeOrderSuccess({
            context: {} as never,
            orderNo: 'ORD-3',
            queryParams: {},
        });
        expect(response.headers.get('Location')).toBe('/site/order-confirmation/ORD-3');
    });

    it('returns a fresh Response with extra headers when provided', () => {
        const response = finalizeOrderSuccess({
            context: {} as never,
            orderNo: 'ORD-4',
            extraHeaders: { 'Set-Cookie': 'cleared=; Max-Age=0' },
        });
        expect(response.status).toBe(302);
        expect(response.headers.get('Set-Cookie')).toBe('cleared=; Max-Age=0');
        expect(response.headers.get('Location')).toBe('/site/order-confirmation/ORD-4');
    });

    it('combines queryParams and extraHeaders', () => {
        const response = finalizeOrderSuccess({
            context: {} as never,
            orderNo: 'ORD-5',
            queryParams: { foo: 'bar' },
            extraHeaders: { 'X-Test': 'yes' },
        });
        expect(response.headers.get('Location')).toBe('/site/order-confirmation/ORD-5?foo=bar');
        expect(response.headers.get('X-Test')).toBe('yes');
    });
});
