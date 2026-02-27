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
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import type { RouterContextProvider } from 'react-router';
import shopperContextMiddleware from './shopper-context.server';
import { createTestContext } from '@/lib/test-utils';
import { createShopperContext } from '@/lib/api/shopper-context';
import { getAuth } from './auth.server';
import { createCookie, getCookieConfig } from '@/lib/cookie-utils';

vi.mock('@/lib/api/shopper-context', () => ({
    createShopperContext: vi.fn(),
}));

vi.mock('./auth.server', () => ({
    getAuth: vi.fn(),
}));

vi.mock('@/lib/cookie-utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/cookie-utils')>();
    return {
        ...actual,
        getCookieConfig: vi.fn(() => ({
            path: '/',
            sameSite: 'lax',
            secure: true,
            httpOnly: false,
        })),
    };
});

vi.mock('@/config', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual || {}),
        getConfig: vi.fn().mockReturnValue({
            commerce: {
                api: {
                    siteId: 'test-site',
                },
            },
            features: {
                shopperContext: {
                    enabled: true,
                },
            },
        }),
    };
});

/**
 * Satisfies React Router's DataFunctionArgs (request, context, params, unstable_pattern).
 * React Router added required unstable_pattern in a 7.x release;
 */
const createMiddlewareArgs = (request: Request, context: RouterContextProvider) =>
    ({ request, context, params: {}, unstable_pattern: '/' }) as Parameters<typeof shopperContextMiddleware>[0];

type MiddlewareNext = Parameters<typeof shopperContextMiddleware>[1];

describe('shopper-context.server', () => {
    let mockRequest: Request;
    let mockContext: RouterContextProvider;
    let mockNext: MiddlewareNext;

    beforeEach(() => {
        vi.clearAllMocks();

        mockRequest = new Request('https://example.com/test');
        mockContext = createTestContext({
            authSession: { usid: 'test-usid' },
        }) as RouterContextProvider;
        mockNext = vi.fn().mockResolvedValue(new Response('test')) as MiddlewareNext;

        vi.mocked(getAuth).mockReturnValue({ usid: 'test-usid' } as any);
        vi.mocked(createShopperContext).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('middleware execution flow', () => {
        test('should call next() when feature flag is disabled', async () => {
            // Temporarily override getConfig to disable feature
            const configModule = await import('@/config');
            vi.mocked(configModule.getConfig).mockReturnValueOnce({
                commerce: {
                    api: {
                        siteId: 'test-site',
                    },
                },
                features: {
                    shopperContext: {
                        enabled: false,
                    },
                },
            } as any);

            try {
                const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

                expect(mockNext).toHaveBeenCalledOnce();
                expect(createShopperContext).not.toHaveBeenCalled();
                expect(result).toBeInstanceOf(Response);
                expect((result as Response).headers.get('Set-Cookie')).toBeNull();
            } finally {
                // Restore original mock
                vi.mocked(configModule.getConfig).mockReturnValue({
                    commerce: {
                        api: {
                            siteId: 'test-site',
                        },
                    },
                    features: {
                        shopperContext: {
                            enabled: true,
                        },
                    },
                } as any);
            }
        });

        test('should call next() when Page Designer mode is active', async () => {
            mockRequest = new Request('https://example.com?mode=EDIT');

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).not.toHaveBeenCalled();
            // Verify no cookies were set
            expect(result).toBeInstanceOf(Response);
            expect((result as Response).headers.get('Set-Cookie')).toBeNull();
        });

        test('should call next() when no USID is available', async () => {
            vi.mocked(getAuth).mockReturnValue({} as any);

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).not.toHaveBeenCalled();
            // Verify no cookies were set
            expect(result).toBeInstanceOf(Response);
            expect((result as Response).headers.get('Set-Cookie')).toBeNull();
        });

        test('should handle session with undefined usid', async () => {
            vi.mocked(getAuth).mockReturnValue({ usid: undefined } as any);

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).not.toHaveBeenCalled();
            expect(result).toBeInstanceOf(Response);
            expect((result as Response).headers.get('Set-Cookie')).toBeNull();
        });

        test('should handle session with empty string usid', async () => {
            // Test when usid is empty string - should be caught by middleware check
            vi.mocked(getAuth).mockReturnValue({ usid: '' } as any);

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).not.toHaveBeenCalled();
            expect(result).toBeInstanceOf(Response);
            expect((result as Response).headers.get('Set-Cookie')).toBeNull();
        });

        test('should process shopper context when conditions are met', async () => {
            const url = new URL('https://example.com?src=email');
            mockRequest = new Request(url.toString());

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', { sourceCode: 'email' });
            // Verify cookies were set
            expect(result).toBeInstanceOf(Response);
            const setCookieHeaders = (result as Response).headers.getSetCookie();
            expect(setCookieHeaders.length).toBe(1);

            // Verify sourceCode cookie was set with correct data
            const cookieConfig = getCookieConfig({ httpOnly: false });
            const sourceCodeCookieHandler = createCookie('dwsourcecode', cookieConfig, mockContext);
            const sourceCodeCookieValue = await sourceCodeCookieHandler.parse(setCookieHeaders[0]);
            expect(JSON.parse(sourceCodeCookieValue as string)).toEqual({ sourceCode: 'email' });
        });
    });

    describe('cookie handling', () => {
        test('should read existing cookies from request', async () => {
            const cookieValue = { sourceCode: 'existing' };
            const cookieConfig = getCookieConfig({ httpOnly: false });
            const cookieHandler = createCookie('storefront-next-context', cookieConfig, mockContext);
            // cookie-utils stores string values; shopper context uses JSON
            const serializedCookie = await cookieHandler.serialize(JSON.stringify(cookieValue));
            const cookieNameValue = serializedCookie.split(';')[0];

            mockRequest = new Request('https://example.com/test', {
                headers: { Cookie: cookieNameValue },
            });

            const parsed = await cookieHandler.parse(cookieNameValue);
            expect(JSON.parse(parsed as string)).toEqual(cookieValue);
        });

        test('should handle cookie parsing returning null (fallback to empty object)', async () => {
            // Create a request with a cookie header that exists but parsing returns null
            const url = new URL('https://example.com/test?src=email');
            mockRequest = new Request(url.toString(), {
                headers: { Cookie: 'other-cookie=value' },
            });

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            // Should still process and set new cookies even when existing cookies parse to null
            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', { sourceCode: 'email' });
            expect(result).toBeInstanceOf(Response);
            const setCookieHeaders = (result as Response).headers.getSetCookie();
            expect(setCookieHeaders.length).toBe(1);

            // Verify sourceCode cookie was set with correct data
            const cookieConfig = getCookieConfig({ httpOnly: false });
            const sourceCodeCookieHandler = createCookie('dwsourcecode', cookieConfig, mockContext);
            const sourceCodeCookieValue = await sourceCodeCookieHandler.parse(setCookieHeaders[0]);
            expect(JSON.parse(sourceCodeCookieValue as string)).toEqual({ sourceCode: 'email' });
        });

        test('should set sourceCode cookie when hasNewSourceCodeContext is true', async () => {
            // Test with sourceCode which is already configured
            const url = new URL('https://example.com?src=email');
            mockRequest = new Request(url.toString());

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', { sourceCode: 'email' });
            expect(result).toBeInstanceOf(Response);
            const setCookieHeaders = (result as Response).headers.getSetCookie();
            expect(setCookieHeaders.length).toBe(1);

            // Verify sourceCode cookie was set with correct data
            const cookieConfig = getCookieConfig({ httpOnly: false });
            const sourceCodeCookieHandler = createCookie('dwsourcecode', cookieConfig, mockContext);
            const sourceCodeCookieValue = await sourceCodeCookieHandler.parse(setCookieHeaders[0]);
            expect(JSON.parse(sourceCodeCookieValue as string)).toEqual({ sourceCode: 'email' });
        });

        test('should set context cookie when hasNewContext is true', async () => {
            // Mock extractQualifiersFromUrl to return qualifiers (not sourceCode) to trigger hasNewContext path
            const shopperContextUtils = await import('@/lib/shopper-context-utils');
            const extractQualifiersFromUrlSpy = vi
                .spyOn(shopperContextUtils, 'extractQualifiersFromUrl')
                .mockReturnValue({
                    qualifiers: { deviceType: 'mobile' },
                    sourceCodeQualifiers: {},
                });

            try {
                const url = new URL('https://example.com?deviceType=mobile');
                mockRequest = new Request(url.toString());

                const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

                expect(mockNext).toHaveBeenCalledOnce();
                expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', {
                    customQualifiers: {
                        deviceType: 'mobile',
                    },
                });
                expect(result).toBeInstanceOf(Response);
                const setCookieHeaders = (result as Response).headers.getSetCookie();
                expect(setCookieHeaders.length).toBe(1);

                // Verify context cookie was set with correct data (not sourceCode cookie)
                const cookieConfig = getCookieConfig({ httpOnly: false });
                const contextCookieHandler = createCookie('storefront-next-context', cookieConfig, mockContext);
                const contextCookieValue = await contextCookieHandler.parse(setCookieHeaders[0]);
                expect(JSON.parse(contextCookieValue as string)).toEqual({ deviceType: 'mobile' });
            } finally {
                extractQualifiersFromUrlSpy.mockRestore();
            }
        });

        test('should set both sourceCode and context cookies when both are present', async () => {
            // Mock extractQualifiersFromUrl to return both sourceCode and qualifiers
            const shopperContextUtils = await import('@/lib/shopper-context-utils');
            const extractQualifiersFromUrlSpy = vi
                .spyOn(shopperContextUtils, 'extractQualifiersFromUrl')
                .mockReturnValue({
                    qualifiers: { deviceType: 'mobile' },
                    sourceCodeQualifiers: { sourceCode: 'email' },
                });

            try {
                const url = new URL('https://example.com?src=email&deviceType=mobile');
                mockRequest = new Request(url.toString());

                const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

                expect(mockNext).toHaveBeenCalledOnce();
                expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', {
                    sourceCode: 'email',
                    customQualifiers: {
                        deviceType: 'mobile',
                    },
                });
                expect(result).toBeInstanceOf(Response);
                const setCookieHeaders = (result as Response).headers.getSetCookie();
                expect(setCookieHeaders.length).toBe(2);

                // Verify both cookies were set with correct data
                const cookieConfig = getCookieConfig({ httpOnly: false });
                const sourceCodeCookieHandler = createCookie('dwsourcecode', cookieConfig, mockContext);
                const contextCookieHandler = createCookie('storefront-next-context', cookieConfig, mockContext);

                // Find which cookie is which by parsing both
                let sourceCodeCookieValue: Record<string, string> | null = null;
                let contextCookieValue: Record<string, string> | null = null;

                for (const cookieHeader of setCookieHeaders) {
                    const parsedSourceCode = await sourceCodeCookieHandler.parse(cookieHeader);
                    const parsedContext = await contextCookieHandler.parse(cookieHeader);
                    if (parsedSourceCode) {
                        const obj = JSON.parse(parsedSourceCode as string) as Record<string, string>;
                        if ('sourceCode' in obj) sourceCodeCookieValue = obj;
                    }
                    if (parsedContext) {
                        const obj = JSON.parse(parsedContext as string) as Record<string, string>;
                        if ('deviceType' in obj) contextCookieValue = obj;
                    }
                }

                expect(sourceCodeCookieValue).toEqual({ sourceCode: 'email' });
                expect(contextCookieValue).toEqual({ deviceType: 'mobile' });
            } finally {
                extractQualifiersFromUrlSpy.mockRestore();
            }
        });

        test('should restore sourceCode from dwsourcecode cookie when storefront-next-context is empty/expired', async () => {
            // Scenario: context cookie is empty/expired, but sourceCode cookie has value
            const sourceCodeValue = { sourceCode: 'persisted-source' };
            const cookieConfig = getCookieConfig({ httpOnly: false });
            const sourceCodeCookieHandler = createCookie('dwsourcecode', cookieConfig, mockContext);
            const sourceCodeCookieSerialized = await sourceCodeCookieHandler.serialize(JSON.stringify(sourceCodeValue));
            const sourceCodeCookieValue = sourceCodeCookieSerialized.split(';')[0];

            // Request has sourceCode cookie but no context cookie (expired/empty); no URL params
            mockRequest = new Request('https://example.com', {
                headers: { Cookie: sourceCodeCookieValue },
            });

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            // Should compute effective context but not call API since no new qualifiers
            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).not.toHaveBeenCalled();

            // Note: sourceCode cookie already has the value, so it won't be updated (no change)
            // No new qualifiers in URL, so no cookies should be set
            expect(result).toBeInstanceOf(Response);
            const setCookieHeaders = (result as Response).headers.getSetCookie();
            expect(setCookieHeaders.length).toBe(0); // No cookies set since no new qualifiers
        });

        test('should not update cookies when context has not changed', async () => {
            const currentContext = { sourceCode: 'email' };
            const cookieConfig = getCookieConfig({ httpOnly: false });
            const contextCookieHandler = createCookie('storefront-next-context', cookieConfig, mockContext);
            const sourceCodeCookieHandler = createCookie('dwsourcecode', cookieConfig, mockContext);
            const contextCookieSerialized = await contextCookieHandler.serialize(JSON.stringify(currentContext));
            const sourceCodeCookieSerialized = await sourceCodeCookieHandler.serialize(
                JSON.stringify({ sourceCode: 'email' })
            );
            const contextCookieValue = contextCookieSerialized.split(';')[0];
            const sourceCodeCookieValue = sourceCodeCookieSerialized.split(';')[0];

            mockRequest = new Request('https://example.com', {
                headers: { Cookie: `${contextCookieValue}; ${sourceCodeCookieValue}` },
            });

            // No URL params, so extractQualifiersFromUrl returns empty
            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            // The middleware checks if context changed before calling API
            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).not.toHaveBeenCalled();
            // Verify no cookies were set
            expect(result).toBeInstanceOf(Response);
            expect((result as Response).headers.get('Set-Cookie')).toBeNull();
        });
    });

    describe('error handling', () => {
        test('should not fail request when createShopperContext throws', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.mocked(createShopperContext).mockRejectedValue(new Error('API Error'));

            const url = new URL('https://example.com?src=email');
            mockRequest = new Request(url.toString());

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(result).toBeInstanceOf(Response);
            expect(mockNext).toHaveBeenCalledOnce();
            // Error is caught and logged with structured object
            expect(consoleErrorSpy).toHaveBeenCalledWith('Shopper context server middleware error:', {
                error: 'API Error',
                usid: 'test-usid',
                url: url.toString(),
            });

            consoleErrorSpy.mockRestore();
        });

        test('should continue processing even if computation fails', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // Simulate an error by making getCookieConfig throw
            vi.mocked(getCookieConfig).mockImplementationOnce(() => {
                throw new Error('Computation error');
            });

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(result).toBeInstanceOf(Response);
            expect(mockNext).toHaveBeenCalledOnce();
            // Error is caught and logged with structured object
            expect(consoleErrorSpy).toHaveBeenCalledWith('Shopper context server middleware error:', {
                error: 'Computation error',
                usid: 'test-usid',
                url: mockRequest.url,
            });

            consoleErrorSpy.mockRestore();
        });

        test('should return response from next() when cookie setting fails after handler execution', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const url = new URL('https://example.com?src=email');
            mockRequest = new Request(url.toString());

            // Mock Response.headers.append to throw (simulating cookie setting error)
            const mockResponse = new Response('test');
            const appendSpy = vi.spyOn(mockResponse.headers, 'append').mockImplementation(() => {
                throw new Error('Cookie append error');
            });
            vi.mocked(mockNext).mockResolvedValue(mockResponse);

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(result).toBeInstanceOf(Response);
            expect(mockNext).toHaveBeenCalledOnce(); // Should only be called once, not twice
            // Error is caught and logged with structured object
            expect(consoleErrorSpy).toHaveBeenCalledWith('Shopper context server middleware error:', {
                error: 'Cookie append error',
                usid: 'test-usid',
                url: url.toString(),
            });
            expect(result).toBe(mockResponse); // Should return the same response from next()

            consoleErrorSpy.mockRestore();
            appendSpy.mockRestore();
        });
    });

    describe('URL parameter extraction', () => {
        test('should extract qualifiers from URL', async () => {
            const url = new URL('https://example.com?src=email');
            mockRequest = new Request(url.toString());
            await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', { sourceCode: 'email' });
        });

        test('should handle URLs without shopper context qualifiers (e.g. root .data fetch)', async () => {
            // Real-life root loader URL: no src/deviceType etc., so no shopper context update
            const rootDataUrl = 'http://localhost:5173/_root.data?_routes=root%2Croutes%2F_app._index';
            mockRequest = new Request(rootDataUrl);
            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(createShopperContext).not.toHaveBeenCalled();
            // Verify no cookies were set
            expect(result).toBeInstanceOf(Response);
            expect((result as Response).headers.getSetCookie().length).toBe(0);
        });
    });

    describe('loader and action URLs', () => {
        test('should process shopper context when request URL is a loader URL (e.g. .data fetch)', async () => {
            // Real-life loader URL: React Router data request with .data path and _routes query
            const loaderUrl =
                'http://localhost:5173/product/25697782M.data?color=JJI15XX&size=006&pid=701644606374M&src=email&_routes=root%2Croutes%2F_app.product.%24productId';
            mockRequest = new Request(loaderUrl);

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', { sourceCode: 'email' });
            expect(result).toBeInstanceOf(Response);
            const setCookieHeaders = (result as Response).headers.getSetCookie();
            expect(setCookieHeaders.length).toBe(1);
            const cookieConfig = getCookieConfig({ httpOnly: false });
            const sourceCodeCookieHandler = createCookie('dwsourcecode', cookieConfig, mockContext);
            const sourceCodeCookieValue = await sourceCodeCookieHandler.parse(setCookieHeaders[0]);
            expect(JSON.parse(sourceCodeCookieValue as string)).toEqual({ sourceCode: 'email' });
        });

        test('should process shopper context when request URL is an action URL (e.g. POST to action route)', async () => {
            // Real-life action URL: POST to action route with product/quantity params and src for shopper context
            const actionUrl = 'http://localhost:5173/action/cart-item-add?pid=701644606374M&quantity=1&src=email';
            mockRequest = new Request(actionUrl, { method: 'POST' });

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', { sourceCode: 'email' });
            expect(result).toBeInstanceOf(Response);
            const setCookieHeaders = (result as Response).headers.getSetCookie();
            expect(setCookieHeaders.length).toBe(1);
            const cookieConfig = getCookieConfig({ httpOnly: false });
            const sourceCodeCookieHandler = createCookie('dwsourcecode', cookieConfig, mockContext);
            const sourceCodeCookieValue = await sourceCodeCookieHandler.parse(setCookieHeaders[0]);
            expect(JSON.parse(sourceCodeCookieValue as string)).toEqual({ sourceCode: 'email' });
        });
    });

    describe('loader and action URLs', () => {
        test('should process shopper context when request URL is a loader URL (e.g. .data fetch)', async () => {
            // Real-life loader URL: React Router data request with .data path and _routes query
            const loaderUrl =
                'http://localhost:5173/product/25697782M.data?color=JJI15XX&size=006&pid=701644606374M&src=email&_routes=root%2Croutes%2F_app.product.%24productId';
            mockRequest = new Request(loaderUrl);

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', { sourceCode: 'email' });
            expect(result).toBeInstanceOf(Response);
            const setCookieHeaders = (result as Response).headers.getSetCookie();
            expect(setCookieHeaders.length).toBe(1);
            const cookieConfig = getCookieConfig({ httpOnly: false });
            const sourceCodeCookieHandler = createCookie('dwsourcecode', cookieConfig, mockContext);
            const sourceCodeCookieValue = await sourceCodeCookieHandler.parse(setCookieHeaders[0]);
            expect(JSON.parse(sourceCodeCookieValue as string)).toEqual({ sourceCode: 'email' });
        });

        test('should process shopper context when request URL is an action URL (e.g. POST to action route)', async () => {
            // Real-life action URL: POST to action route with product/quantity params and src for shopper context
            const actionUrl = 'http://localhost:5173/action/cart-item-add?pid=701644606374M&quantity=1&src=email';
            mockRequest = new Request(actionUrl, { method: 'POST' });

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', { sourceCode: 'email' });
            expect(result).toBeInstanceOf(Response);
            const setCookieHeaders = (result as Response).headers.getSetCookie();
            expect(setCookieHeaders.length).toBe(1);
            const cookieConfig = getCookieConfig({ httpOnly: false });
            const sourceCodeCookieHandler = createCookie('dwsourcecode', cookieConfig, mockContext);
            const sourceCodeCookieValue = await sourceCodeCookieHandler.parse(setCookieHeaders[0]);
            expect(JSON.parse(sourceCodeCookieValue as string)).toEqual({ sourceCode: 'email' });
        });
    });

    describe('sourceCode handling', () => {
        test('should update sourceCode when present in URL', async () => {
            const url = new URL('https://example.com?src=email');
            mockRequest = new Request(url.toString());

            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);
            expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', { sourceCode: 'email' });
            // Verify cookies were set
            expect(result).toBeInstanceOf(Response);
            const setCookieHeaders = (result as Response).headers.getSetCookie();
            expect(setCookieHeaders.length).toBe(1);

            // Verify sourceCode cookie was set with correct data
            const cookieConfig = getCookieConfig({ httpOnly: false });
            const sourceCodeCookieHandler = createCookie('dwsourcecode', cookieConfig, mockContext);
            const sourceCodeCookieValue = await sourceCodeCookieHandler.parse(setCookieHeaders[0]);
            expect(JSON.parse(sourceCodeCookieValue as string)).toEqual({ sourceCode: 'email' });
        });

        test('should restore sourceCode from persistent cookie when not in URL', async () => {
            const testCookieConfig = getCookieConfig({ httpOnly: false });
            const testSourceCodeCookieHandler = createCookie('dwsourcecode', testCookieConfig, mockContext);
            const sourceCodeCookieSerialized = await testSourceCodeCookieHandler.serialize(
                JSON.stringify({ sourceCode: 'persisted' })
            );
            const sourceCodeCookieValue = sourceCodeCookieSerialized.split(';')[0];

            mockRequest = new Request('https://example.com', {
                headers: { Cookie: sourceCodeCookieValue },
            });

            // No URL params
            const result = await shopperContextMiddleware(createMiddlewareArgs(mockRequest, mockContext), mockNext);
            // No new qualifiers, so API should not be called
            expect(createShopperContext).not.toHaveBeenCalled();
            // Verify no cookies were set since no new qualifiers
            expect(result).toBeInstanceOf(Response);
            const setCookieHeaders = (result as Response).headers.getSetCookie();
            expect(setCookieHeaders.length).toBe(0);
        });
    });
});
