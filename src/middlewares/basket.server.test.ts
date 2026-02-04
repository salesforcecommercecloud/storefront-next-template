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
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createCookie, type RouterContextProvider } from 'react-router';
import { createTestContext } from '@/lib/test-utils';
import { createApiClients } from '@/lib/api-clients';
import { getCookieConfig } from '@/lib/cookie-utils';
import createBasketMiddleware, {
    basketMetadataContext,
    basketResourceContext,
    destroyBasket,
    getBasket,
    type BasketSnapshot,
} from './basket.server';

vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(),
}));

vi.mock('@/lib/cookie-utils', () => ({
    getCookieConfig: vi.fn(() => ({
        path: '/',
        sameSite: 'lax',
        secure: true,
        httpOnly: false,
        encode: (value: string) => value,
        decode: (value: string) => value,
    })),
}));

describe('basket.server middleware', () => {
    let mockRequest: Request;
    let mockContext: RouterContextProvider;
    let mockNext: ReturnType<typeof vi.fn>;
    const createArgs = (request: Request, context: RouterContextProvider) =>
        ({ request, context, params: {}, unstable_pattern: '' }) as any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRequest = new Request('https://example.com');
        mockContext = createTestContext();
        mockNext = vi.fn().mockResolvedValue(new Response('ok'));
    });

    test('lazy mode does not load basket or set cookie by default', async () => {
        const middleware = createBasketMiddleware({ mode: 'lazy' });
        const response = (await middleware(createArgs(mockRequest, mockContext), mockNext)) as Response;

        expect(mockNext).toHaveBeenCalledOnce();
        expect(createApiClients).not.toHaveBeenCalled();
        const basketResource = mockContext.get(basketResourceContext);
        expect(basketResource?.hydrated).toBe(false);
        expect(response.headers.get('Set-Cookie')).toBeNull();
    });

    test('eager mode loads basket and sets cookie', async () => {
        const basket = {
            basketId: 'basket-1',
            currency: 'USD',
            productItems: [{ productId: 'sku-1', quantity: 2 }],
        };
        vi.mocked(createApiClients).mockReturnValue({
            basket: {
                getOrCreateBasket: vi.fn().mockResolvedValue(basket),
            },
        } as any);

        const middleware = createBasketMiddleware({ mode: 'eager' });
        const response = (await middleware(createArgs(mockRequest, mockContext), mockNext)) as Response;

        expect(mockNext).toHaveBeenCalledOnce();
        expect(createApiClients).toHaveBeenCalledOnce();
        const basketResource = await getBasket(mockContext);
        expect(basketResource.current).toEqual(basket);
        expect(response.headers.get('Set-Cookie')).toContain('__sfdc_basket=');
    });

    test('custom cookie name is used in Set-Cookie header', async () => {
        const basket = { basketId: 'basket-2', currency: 'USD', productItems: [] };
        vi.mocked(createApiClients).mockReturnValue({
            basket: {
                getOrCreateBasket: vi.fn().mockResolvedValue(basket),
            },
        } as any);

        const middleware = createBasketMiddleware({ mode: 'eager', cookieName: 'custom_basket' });
        const response = (await middleware(createArgs(mockRequest, mockContext), mockNext)) as Response;

        expect(response.headers.get('Set-Cookie')).toContain('custom_basket=');
    });

    test('uses cookie snapshot when provided', async () => {
        const cookieConfig = vi.mocked(getCookieConfig).mock.results[0]?.value;
        const basketCookie = createCookie('__sfdc_basket', cookieConfig);
        const snapshot: BasketSnapshot = {
            basketId: 'basket-from-cookie',
            itemsCount: 1,
        };
        const cookieHeader = await basketCookie.serialize(snapshot);
        mockRequest = new Request('https://example.com', {
            headers: { Cookie: cookieHeader },
        });

        const middleware = createBasketMiddleware({ mode: 'lazy' });
        await middleware(createArgs(mockRequest, mockContext), mockNext);

        const basketResource = mockContext.get(basketResourceContext);
        expect(basketResource?.snapshot).toEqual(snapshot);
        expect(basketResource?.hydrated).toBe(false);
    });

    test('merges custom snapshot fields while preserving defaults', async () => {
        const basket = {
            basketId: 'basket-merge',
            currency: 'USD',
            productItems: [{ productId: 'sku-1', quantity: 2 }],
        };
        vi.mocked(createApiClients).mockReturnValue({
            basket: {
                getOrCreateBasket: vi.fn().mockResolvedValue(basket),
            },
        } as any);

        const middleware = createBasketMiddleware({
            mode: 'eager',
            calculateBasketSnapshot: () => ({
                basketId: 'override-id',
                itemsCount: 99,
                hasPickupItems: true,
            }),
        });
        const response = (await middleware(createArgs(mockRequest, mockContext), mockNext)) as Response;

        const snapshot = mockContext.get(basketResourceContext)?.snapshot;
        expect(snapshot).toMatchObject({
            basketId: 'basket-merge',
            itemsCount: 2,
            hasPickupItems: true,
        });

        const cookieConfig = vi.mocked(getCookieConfig).mock.results[0]?.value;
        const basketCookie = createCookie('__sfdc_basket', cookieConfig);
        const cookieHeader = response.headers.get('Set-Cookie') ?? '';
        const cookieSnapshot = (await basketCookie.parse(cookieHeader)) as BasketSnapshot;
        expect(cookieSnapshot).toMatchObject({
            basketId: 'basket-merge',
            itemsCount: 2,
            hasPickupItems: true,
        });
    });

    test('load rethrows and stores error when hydration fails', async () => {
        const loadError = new Error('boom');
        vi.mocked(createApiClients).mockReturnValue({
            basket: {
                getOrCreateBasket: vi.fn().mockRejectedValue(loadError),
            },
        } as any);

        const middleware = createBasketMiddleware({ mode: 'lazy' });
        await middleware(createArgs(mockRequest, mockContext), mockNext);

        await expect(getBasket(mockContext)).rejects.toThrow('boom');
        const basketResource = mockContext.get(basketResourceContext);
        expect(basketResource?.hydrated).toBe(true);
        expect(basketResource?.error).toBe(loadError);
    });

    test('marks basket for deletion and expires cookie', async () => {
        const middleware = createBasketMiddleware({ mode: 'lazy' });
        const next = vi.fn().mockImplementation(async () => {
            destroyBasket(mockContext);
            await Promise.resolve();
            return new Response('ok');
        });

        const response = (await middleware(createArgs(mockRequest, mockContext), next)) as Response;

        const metadata = mockContext.get(basketMetadataContext);
        expect(metadata?.basketMarkedForDeletion).toBe(true);
        expect(response.headers.get('Set-Cookie')).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });
});
