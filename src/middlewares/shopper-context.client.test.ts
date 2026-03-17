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
import shopperContextMiddleware from './shopper-context.client';
import { createTestContext } from '@/lib/test-utils';
import { getAuth } from './auth.client';
import { updateShopperContext, extractQualifiersFromUrl, isPageDesignerMode } from '@/lib/shopper-context-utils';

vi.mock('./auth.client', () => ({
    getAuth: vi.fn(),
}));

vi.mock('@/lib/shopper-context-utils', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        updateShopperContext: vi.fn(),
        extractQualifiersFromUrl: vi.fn(),
        isPageDesignerMode: vi.fn(),
    };
});

vi.mock('@/config', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        getConfig: vi.fn().mockReturnValue({
            commerce: {
                api: {
                    siteId: 'test-site',
                },
            },
            features: {
                shopperContext: {
                    enabled: true,
                    dwsourcecodeCookieSuffix: 'test-site',
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
        vi.mocked(updateShopperContext).mockResolvedValue(undefined);
        vi.mocked(isPageDesignerMode).mockReturnValue(false);
        vi.mocked(extractQualifiersFromUrl).mockReturnValue({
            qualifiers: {},
            sourceCodeQualifiers: {},
        });
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
                        dwsourcecodeCookieSuffix: 'test-site',
                    },
                },
            } as any);

            try {
                await shopperContextMiddleware(
                    { context: mockContext, params: {}, request: new Request('https://example.com') },
                    mockNext
                );

                expect(mockNext).toHaveBeenCalledOnce();
                expect(updateShopperContext).not.toHaveBeenCalled();
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
                            dwsourcecodeCookieSuffix: 'test-site',
                        },
                    },
                } as any);
            }
        });

        test('should call next() when Page Designer mode is active', async () => {
            vi.mocked(isPageDesignerMode).mockReturnValue(true);
            mockWindow.location.href = 'https://example.com?mode=EDIT';

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com?mode=EDIT') },
                mockNext
            );

            expect(mockNext).toHaveBeenCalledOnce();
            expect(updateShopperContext).not.toHaveBeenCalled();
        });

        test('should call next() when no USID is available', async () => {
            vi.mocked(getAuth).mockReturnValue({} as any);

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(mockNext).toHaveBeenCalledOnce();
            expect(updateShopperContext).not.toHaveBeenCalled();
        });

        test('should call updateShopperContext when conditions are met', async () => {
            mockWindow.location.href = 'https://example.com?src=email';
            vi.mocked(extractQualifiersFromUrl).mockReturnValue({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: 'email' },
            });

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(mockNext).toHaveBeenCalledOnce();
            expect(updateShopperContext).toHaveBeenCalledWith({
                context: mockContext,
                usid: 'test-usid',
                newShopperContext: {},
                newSourceCodeContext: { sourceCode: 'email' },
            });
        });
    });

    describe('error handling', () => {
        test('should catch and log errors from updateShopperContext', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.mocked(updateShopperContext).mockRejectedValue(new Error('Update error'));
            mockWindow.location.href = 'https://example.com?src=email';
            vi.mocked(extractQualifiersFromUrl).mockReturnValue({
                qualifiers: {},
                sourceCodeQualifiers: { sourceCode: 'email' },
            });

            await shopperContextMiddleware(
                { context: mockContext, params: {}, request: new Request('https://example.com') },
                mockNext
            );

            expect(mockNext).toHaveBeenCalledOnce();
            // Error is caught and logged with structured object
            expect(consoleErrorSpy).toHaveBeenCalledWith('Shopper context client middleware error:', {
                error: 'Update error',
                usid: 'test-usid',
                url: 'https://example.com?src=email',
            });

            consoleErrorSpy.mockRestore();
        });
    });
});
