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
import { createCookie, RouterContextProvider, type MiddlewareFunction } from 'react-router';
import { createLoaderArgs, createTestContext } from '@/lib/test-utils';
import { createApiClients } from '@/lib/api-clients.server';
import { NormalizedApiError } from '@/lib/api/normalized-api-error';
import { getCookieConfig } from '@/lib/cookie-utils.server';
import { validateBasketSnapshot } from '@/lib/basket/cookie';
import createBasketMiddleware, {
    basketMetadataContext,
    basketResourceContext,
    defaultCreateSnapshot,
    destroyBasket,
    getBasket,
    getBasketSnapshot,
    type BasketSnapshot,
} from './basket.server';

const mockLogger = vi.hoisted(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => mockLogger),
}));

vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: vi.fn(),
}));

vi.mock('@/lib/cookie-utils.server', () => ({
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
    let mockContext: ReturnType<typeof createTestContext>;
    let mockNext: Parameters<MiddlewareFunction<Response>>[1];
    const createArgs = (request: Request, context: Readonly<RouterContextProvider>) =>
        createLoaderArgs(request, context, { unstable_pattern: '' });

    beforeEach(() => {
        vi.clearAllMocks();
        mockRequest = new Request('https://example.com');
        mockContext = createTestContext();
        mockNext = vi.fn().mockResolvedValue(new Response('ok')) as unknown as Parameters<
            MiddlewareFunction<Response>
        >[1];
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
            currency: 'GBP',
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
        const basket = { basketId: 'basket-2', currency: 'GBP', productItems: [] };
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
            totalItemCount: 1,
            uniqueProductCount: 1,
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
        // Happy path must be silent. A regression that drops the warn down to a different message channel
        // (or moves the discard log to warn level) would otherwise go unnoticed.
        expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    test('discards a malformed cookie snapshot rather than exposing it to loaders', async () => {
        // A tampered or otherwise malformed cookie can deserialize to a shape-wrong object — non-string
        // basketId, non-finite counts, etc. The middleware must run the parsed value through the shared
        // shape validator so a value like `{ basketId: 'b', totalItemCount: 'oops', uniqueProductCount: 0 }`
        // doesn't reach the badge UI as `"oops items"`. The expectation here is `null`, not the malformed
        // object.
        const cookieConfig = vi.mocked(getCookieConfig).mock.results[0]?.value;
        const basketCookie = createCookie('__sfdc_basket', cookieConfig);
        const malformed = {
            basketId: 'basket-malformed',
            totalItemCount: 'not-a-number',
            uniqueProductCount: null,
        } as unknown as BasketSnapshot;
        const cookieHeader = await basketCookie.serialize(malformed);
        mockRequest = new Request('https://example.com', {
            headers: { Cookie: cookieHeader },
        });

        const middleware = createBasketMiddleware({ mode: 'lazy' });
        await middleware(createArgs(mockRequest, mockContext), mockNext);

        const basketResource = mockContext.get(basketResourceContext);
        expect(basketResource?.snapshot).toBeNull();
        // Logged at debug: a malformed cookie is request-controlled input. Logging at warn would let an attacker
        // rate-limit the warn channel by replaying junk cookies.
        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
            'Basket: discarding malformed snapshot cookie',
            expect.objectContaining({ cookieName: '__sfdc_basket' })
        );
    });

    describe('writer ↔ validator contract', () => {
        // These tests pin the invariant that whatever `defaultCreateSnapshot` writes survives the
        // `validateBasketSnapshot` shape check unchanged. A future writer change (e.g. `bigint` counts,
        // optional `basketId`, etc.) that silently breaks the read path is the regression these guard against.
        test('defaultCreateSnapshot output is accepted by validateBasketSnapshot', () => {
            const snapshot = defaultCreateSnapshot({
                basketId: 'basket-rt',
                productItems: [
                    { productId: 'p1', quantity: 2 },
                    { productId: 'p2', quantity: 3 },
                ],
            } as Parameters<typeof defaultCreateSnapshot>[0]);
            expect(validateBasketSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
        });

        test('defaultCreateSnapshot output for an empty basket is accepted', () => {
            const snapshot = defaultCreateSnapshot({
                basketId: 'basket-empty',
                productItems: [],
            } as Parameters<typeof defaultCreateSnapshot>[0]);
            expect(validateBasketSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
        });

        test('defaultCreateSnapshot output for a basket missing basketId is rejected', () => {
            // `defaultCreateSnapshot` falls back to '' when the basket lacks an id; the validator must reject
            // that, mirroring the client cookie reader's rejection of empty-string ids.
            const snapshot = defaultCreateSnapshot({
                productItems: [{ productId: 'p1', quantity: 1 }],
            } as Parameters<typeof defaultCreateSnapshot>[0]);
            expect(validateBasketSnapshot(JSON.parse(JSON.stringify(snapshot)))).toBeNull();
        });
    });

    test('getBasketSnapshot returns null when no context is set', () => {
        const contextProvider = new RouterContextProvider();
        contextProvider.set(basketResourceContext, undefined);
        expect(getBasketSnapshot(contextProvider)).toBeNull();
    });

    test('getBasketSnapshot returns the current snapshot', () => {
        const snapshot: BasketSnapshot = {
            basketId: 'basket-snapshot',
            totalItemCount: 3,
            uniqueProductCount: 2,
        };
        const contextProvider = new RouterContextProvider();
        contextProvider.set(basketResourceContext, {
            snapshot,
            current: null,
            hydrated: false,
            error: null,
        });

        expect(getBasketSnapshot(contextProvider)).toEqual(snapshot);
    });

    test('merges custom snapshot fields while preserving defaults', async () => {
        const basket = {
            basketId: 'basket-merge',
            currency: 'GBP',
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
                totalItemCount: 99,
                uniqueProductCount: 99,
                hasPickupItems: true,
            }),
        });
        const response = (await middleware(createArgs(mockRequest, mockContext), mockNext)) as Response;

        const snapshot = mockContext.get(basketResourceContext)?.snapshot;
        expect(snapshot).toMatchObject({
            basketId: 'basket-merge',
            totalItemCount: 2,
            uniqueProductCount: 1,
            hasPickupItems: true,
        });

        const cookieConfig = vi.mocked(getCookieConfig).mock.results[0]?.value;
        const basketCookie = createCookie('__sfdc_basket', cookieConfig);
        const cookieHeader = response.headers.get('Set-Cookie') ?? '';
        const cookieSnapshot = (await basketCookie.parse(cookieHeader)) as BasketSnapshot;
        expect(cookieSnapshot).toMatchObject({
            basketId: 'basket-merge',
            totalItemCount: 2,
            uniqueProductCount: 1,
            hasPickupItems: true,
        });
    });

    test('recalculates basket when currency does not match', async () => {
        const basket = {
            basketId: 'basket-currency',
            currency: 'USD',
            productItems: [{ productId: 'sku-1', quantity: 1 }],
        };
        const recalculatedBasket = {
            ...basket,
            currency: 'GBP',
        };
        const updateBasketMock = vi.fn().mockResolvedValue({ data: recalculatedBasket });
        vi.mocked(createApiClients).mockReturnValue({
            basket: {
                getOrCreateBasket: vi.fn().mockResolvedValue(basket),
            },
            shopperBasketsV2: {
                updateBasket: updateBasketMock,
            },
        } as any);

        const middleware = createBasketMiddleware({ mode: 'eager' });
        await middleware(createArgs(mockRequest, mockContext), mockNext);

        expect(updateBasketMock).toHaveBeenCalledWith({
            params: { path: { basketId: 'basket-currency' } },
            body: { currency: 'GBP' },
        });
        const basketResource = await getBasket(mockContext);
        expect(basketResource.current?.currency).toBe('GBP');
    });

    test('load rethrows NormalizedApiError and stores wrapped error when hydration fails', async () => {
        const loadError = new Error('boom');
        vi.mocked(createApiClients).mockReturnValue({
            basket: {
                getOrCreateBasket: vi.fn().mockRejectedValue(loadError),
            },
        } as any);

        const middleware = createBasketMiddleware({ mode: 'lazy' });
        await middleware(createArgs(mockRequest, mockContext), mockNext);

        const rejection = await getBasket(mockContext).catch((e: unknown) => e);
        expect(rejection).toBeInstanceOf(NormalizedApiError);
        expect((rejection as NormalizedApiError).message).toBe('boom');
        expect((rejection as NormalizedApiError).cause).toBe(loadError);

        const basketResource = mockContext.get(basketResourceContext);
        expect(basketResource?.hydrated).toBe(true);
        expect(basketResource?.error).toBeInstanceOf(NormalizedApiError);
        expect((basketResource?.error as NormalizedApiError | undefined)?.cause).toBe(loadError);
    });

    test('marks basket for deletion and expires cookie', async () => {
        const middleware = createBasketMiddleware({ mode: 'lazy' });
        const next = vi.fn().mockImplementation(async () => {
            destroyBasket(mockContext);
            await Promise.resolve();
            return new Response('ok');
        }) as unknown as Parameters<MiddlewareFunction<Response>>[1];

        const response = (await middleware(createArgs(mockRequest, mockContext), next)) as Response;

        const metadata = mockContext.get(basketMetadataContext);
        expect(metadata?.basketMarkedForDeletion).toBe(true);
        expect(response.headers.get('Set-Cookie')).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });
});
