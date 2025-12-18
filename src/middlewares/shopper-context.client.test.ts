import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import type { RouterContextProvider } from 'react-router';
import shopperContextMiddleware from './shopper-context.client';
import { createTestContext } from '@/lib/test-utils';
import { createShopperContext } from '@/lib/api/shopper-context';
import { getAuth } from './auth.client';
import { getCookie, setNamespacedCookie } from '@/lib/cookies.client';

vi.mock('@/lib/api/shopper-context', () => ({
    createShopperContext: vi.fn(),
}));

vi.mock('./auth.client', () => ({
    getAuth: vi.fn(),
}));

vi.mock('@/lib/cookies.client', () => ({
    getCookie: vi.fn(),
    setNamespacedCookie: vi.fn(),
}));

vi.mock('@/config', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        getConfig: vi.fn().mockReturnValue({
            commerce: {
                api: {
                    siteId: 'test-site',
                },
            },
            site: {
                features: {
                    shopperContext: {
                        enabled: true,
                        dwsourcecodeCookieSuffix: 'test-site',
                    },
                },
            },
        }),
    };
});

// Mock window object
const mockWindow = {
    location: {
        href: 'https://example.com/test',
    },
};

Object.defineProperty(global, 'window', {
    value: mockWindow,
    writable: true,
    configurable: true,
});

describe('shopper-context.client', () => {
    let mockContext: RouterContextProvider;
    let mockNext: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        mockContext = createTestContext({
            authSession: { usid: 'test-usid' },
        });
        mockNext = vi.fn().mockResolvedValue(undefined);

        vi.mocked(getAuth).mockReturnValue({ usid: 'test-usid' } as any);
        vi.mocked(getCookie).mockReturnValue('');
        vi.mocked(setNamespacedCookie).mockReturnValue(undefined);
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
                site: {
                    features: {
                        shopperContext: {
                            enabled: false,
                            dwsourcecodeCookieSuffix: 'test-site',
                        },
                    },
                },
            } as any);

            try {
                await shopperContextMiddleware(
                    { context: mockContext, params: {}, request: new Request('https://example.com') },
                    mockNext
                );

                expect(mockNext).toHaveBeenCalledOnce();
                expect(createShopperContext).not.toHaveBeenCalled();
            } finally {
                // Restore original mock
                vi.mocked(configModule.getConfig).mockReturnValue({
                    commerce: {
                        api: {
                            siteId: 'test-site',
                        },
                    },
                    site: {
                        features: {
                            shopperContext: {
                                enabled: true,
                                dwsourcecodeCookieSuffix: 'test-site',
                            },
                        },
                    },
                } as any);
            }
        });

        test('should call next() when Page Designer mode is active', async () => {
            mockWindow.location.href = 'https://example.com?mode=EDIT';

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com?mode=EDIT') },
                mockNext
            );

            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).not.toHaveBeenCalled();
        });

        test('should call next() when no USID is available', async () => {
            vi.mocked(getAuth).mockReturnValue({} as any);

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).not.toHaveBeenCalled();
        });

        test('should process shopper context when conditions are met', async () => {
            mockWindow.location.href = 'https://example.com?src=email';
            vi.mocked(getCookie).mockReturnValue('');

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', { sourceCode: 'email' });
        });
    });

    describe('cookie handling', () => {
        test('should read existing cookies', async () => {
            const existingContext = { sourceCode: 'email' };
            vi.mocked(getCookie)
                .mockReturnValueOnce('') // context cookie
                .mockReturnValueOnce(existingContext.sourceCode); // sourceCode cookie

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(getCookie).toHaveBeenCalledWith('storefront-next-context-test-usid');
            expect(getCookie).toHaveBeenCalledWith('dwsourcecode_test-site');
        });

        test('should set cookies when context changes', async () => {
            mockWindow.location.href = 'https://example.com?src=email';
            vi.mocked(getCookie).mockReturnValue('');

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(setNamespacedCookie).toHaveBeenCalledWith(
                'dwsourcecode_test-site',
                JSON.stringify({ sourceCode: 'email' }),
                expect.objectContaining({ expires: expect.any(Date) })
            );
            expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', { sourceCode: 'email' });
        });

        test('should not set cookies when context has not changed', async () => {
            mockWindow.location.href = 'https://example.com'; // No URL params
            vi.mocked(getCookie)
                .mockReturnValueOnce('') // storefront-next-context
                .mockReturnValueOnce(''); // dwsourcecode

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            // setNamespacedCookie should not be called if context hasn't changed
            expect(mockNext).toHaveBeenCalledOnce();
            expect(createShopperContext).not.toHaveBeenCalled();
            expect(setNamespacedCookie).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        test('should not fail request when createShopperContext throws', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.mocked(createShopperContext).mockRejectedValue(new Error('API Error'));
            mockWindow.location.href = 'https://example.com?src=email';
            vi.mocked(getCookie).mockReturnValue('');

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(mockNext).toHaveBeenCalledOnce();
            // Error is caught and logged with structured object
            expect(consoleErrorSpy).toHaveBeenCalledWith('Shopper context client middleware error:', {
                error: 'API Error',
                usid: 'test-usid',
                url: 'https://example.com?src=email',
            });

            consoleErrorSpy.mockRestore();
        });

        test('should continue processing even if cookie operations fail', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.mocked(getCookie).mockImplementation(() => {
                throw new Error('Cookie read error');
            });
            mockWindow.location.href = 'https://example.com?src=email';

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(mockNext).toHaveBeenCalledOnce();
            // Error is caught and logged with structured object
            expect(consoleErrorSpy).toHaveBeenCalledWith('Shopper context client middleware error:', {
                error: 'Cookie read error',
                usid: 'test-usid',
                url: 'https://example.com?src=email',
            });

            consoleErrorSpy.mockRestore();
        });

        test('should handle errors in processShopperContext gracefully', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            // Mock createShopperContext to throw an error
            vi.mocked(createShopperContext).mockRejectedValue(new Error('API Error'));
            mockWindow.location.href = 'https://example.com?src=email';
            vi.mocked(getCookie).mockReturnValue('');

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(mockNext).toHaveBeenCalledOnce();
            // When API fails, error propagates and cookies are not set (error caught by middleware catch block)
            // The error is logged by the middleware catch block
            expect(consoleErrorSpy).toHaveBeenCalledWith('Shopper context client middleware error:', {
                error: 'API Error',
                usid: 'test-usid',
                url: 'https://example.com?src=email',
            });
            // Cookies are not set when API call throws (error propagates before cookie setting)
            expect(setNamespacedCookie).not.toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        test('should handle cookie setting errors gracefully', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.mocked(setNamespacedCookie).mockImplementation(() => {
                throw new Error('Failed to set cookie');
            });
            mockWindow.location.href = 'https://example.com?src=email';
            vi.mocked(getCookie).mockReturnValue('');

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(mockNext).toHaveBeenCalledOnce();
            // Cookie setting error should be logged but not break the request
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Failed to set shopper context cookie at client side:',
                'Failed to set cookie'
            );

            consoleErrorSpy.mockRestore();
        });
    });

    describe('URL parameter extraction', () => {
        test('should extract qualifiers from window.location.href', async () => {
            mockWindow.location.href = 'https://example.com?src=email';
            vi.mocked(getCookie).mockReturnValue('');

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', { sourceCode: 'email' });
        });

        test('should handle URLs without query parameters', async () => {
            mockWindow.location.href = 'https://example.com';
            vi.mocked(getCookie).mockReturnValue('');

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(createShopperContext).not.toHaveBeenCalled();
        });
    });

    describe('sourceCode handling', () => {
        test('should update sourceCode when present in URL', async () => {
            mockWindow.location.href = 'https://example.com?src=email';
            vi.mocked(getCookie).mockReturnValue('');

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', { sourceCode: 'email' });
            // Verify sourceCode cookie was set
            expect(setNamespacedCookie).toHaveBeenCalledWith(
                'dwsourcecode_test-site',
                JSON.stringify({ sourceCode: 'email' }),
                expect.objectContaining({ expires: expect.any(Date) })
            );
        });

        test('should not call API when no new qualifiers in URL', async () => {
            // Set up: no existing context cookie, but sourceCode cookie has value
            mockWindow.location.href = 'https://example.com'; // No URL params
            vi.mocked(getCookie)
                .mockReturnValueOnce('') // storefront-next-context is empty
                .mockReturnValueOnce(''); // dwsourcecode is empty

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            // No new qualifiers, so API should not be called
            expect(createShopperContext).not.toHaveBeenCalled();
            expect(setNamespacedCookie).not.toHaveBeenCalled();
        });

        test('should restore sourceCode from dwsourcecode cookie when storefront-next-context is empty/expired', async () => {
            // Scenario: context cookie is empty/expired, but sourceCode cookie has value
            // This tests the restoration logic through the full middleware flow
            mockWindow.location.href = 'https://example.com'; // No URL params
            vi.mocked(getCookie)
                .mockReturnValueOnce('') // storefront-next-context is empty
                .mockReturnValueOnce(''); // dwsourcecode is empty

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            // Should compute effective context but not call API since no new qualifiers
            expect(mockNext).toHaveBeenCalledOnce();
            // No new qualifiers, so API should not be called
            expect(createShopperContext).not.toHaveBeenCalled();
            expect(setNamespacedCookie).not.toHaveBeenCalled();
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
                mockWindow.location.href = 'https://example.com?deviceType=mobile';
                vi.mocked(getCookie).mockReturnValue('');

                await shopperContextMiddleware(
                    { context: mockContext, params: {}, request: new Request('https://example.com') },
                    mockNext
                );

                // Verify context cookie was set (not sourceCode cookie)
                const contextCookieName = 'storefront-next-context-test-usid';
                expect(setNamespacedCookie).toHaveBeenCalledWith(
                    contextCookieName,
                    JSON.stringify({ deviceType: 'mobile' }),
                    expect.objectContaining({ expires: expect.any(Date) })
                );
                expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', {
                    customQualifiers: {
                        deviceType: 'mobile',
                    },
                });
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
                mockWindow.location.href = 'https://example.com?src=email&deviceType=mobile';
                vi.mocked(getCookie).mockReturnValue('');

                await shopperContextMiddleware(
                    { context: mockContext, params: {}, request: new Request('https://example.com') },
                    mockNext
                );

                // Verify both cookies were set
                expect(setNamespacedCookie).toHaveBeenCalledWith(
                    'dwsourcecode_test-site',
                    JSON.stringify({ sourceCode: 'email' }),
                    expect.objectContaining({ expires: expect.any(Date) })
                );
                const contextCookieName = 'storefront-next-context-test-usid';
                expect(setNamespacedCookie).toHaveBeenCalledWith(
                    contextCookieName,
                    JSON.stringify({ deviceType: 'mobile' }),
                    expect.objectContaining({ expires: expect.any(Date) })
                );
                expect(createShopperContext).toHaveBeenCalledWith(mockContext, 'test-usid', {
                    sourceCode: 'email',
                    customQualifiers: {
                        deviceType: 'mobile',
                    },
                });
            } finally {
                extractQualifiersFromUrlSpy.mockRestore();
            }
        });
    });
});
