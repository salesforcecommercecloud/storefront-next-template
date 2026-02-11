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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouterContextProvider } from 'react-router';
import { createApiClients } from './api-clients';
import { createTestContext } from '@/lib/test-utils';
import { authContext } from '@/middlewares/auth.utils';
import type { SessionData } from '@/lib/api/types';

// Mock dependencies
vi.mock('@/lib/utils', async (importOriginal) => {
    const actual = await importOriginal<typeof vi.importActual>();
    return {
        ...actual,
        getAppOrigin: vi.fn(() => 'https://example.com'),
    };
});

vi.mock('@/config', async (importOriginal) => {
    const actual = await importOriginal<typeof vi.importActual>();
    return {
        ...actual,
        getConfig: vi.fn(() => ({
            commerce: {
                api: {
                    shortCode: 'kv7kzm78',
                    proxy: '/mobify/proxy/api',
                    clientId: 'test-client-id',
                    organizationId: 'test-org-id',
                    siteId: 'test-site-id',
                    callback: '/callback',
                },
                sites: [
                    {
                        defaultCurrency: 'USD',
                        supportedLocales: [
                            { id: 'en-US', preferredCurrency: 'USD' },
                            { id: 'es-MX', preferredCurrency: 'MXN' },
                        ],
                        supportedCurrencies: ['USD', 'MXN'],
                    },
                ],
            },
        })),
    };
});

// Mock the createCommerceApiClients function
const mockUse = vi.fn();
const mockClients = {
    use: mockUse,
    ShopperBaskets: {},
    ShopperProducts: {},
};

vi.mock('@salesforce/storefront-next-runtime/scapi', () => ({
    createCommerceApiClients: vi.fn(() => mockClients),
    SLAS_AUTH_ENDPOINTS: [
        '/oauth2/token',
        '/oauth2/authorize',
        '/oauth2/logout',
        '/oauth2/login',
        '/oauth2/passwordless',
        '/oauth2/password',
        '/oauth2/session-bridge',
        '/oauth2/trusted-agent',
        '/oauth2/trusted-system',
        '/oauth2/revoke',
        '/oauth2/introspect',
    ],
}));

describe('createApiClients', () => {
    let mockContextProvider: RouterContextProvider;
    let mockGetAppOrigin: ReturnType<typeof vi.fn>;
    let mockGetConfig: ReturnType<typeof vi.fn>;
    let mockCreateCommerceApiClients: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockContextProvider = createTestContext();

        // Get mocked functions
        const utilsModule = await import('@/lib/utils');
        mockGetAppOrigin = utilsModule.getAppOrigin as ReturnType<typeof vi.fn>;

        const configModule = await import('@/config');
        mockGetConfig = configModule.getConfig as ReturnType<typeof vi.fn>;

        const scapiModule = await import('@salesforce/storefront-next-runtime/scapi');
        mockCreateCommerceApiClients = scapiModule.createCommerceApiClients as ReturnType<typeof vi.fn>;

        // Reset mock implementations
        mockGetAppOrigin.mockReturnValue('https://example.com');
        mockGetConfig.mockReturnValue({
            commerce: {
                api: {
                    shortCode: 'kv7kzm78',
                    proxy: '/mobify/proxy/api',
                    clientId: 'test-client-id',
                    organizationId: 'test-org-id',
                    siteId: 'test-site-id',
                    callback: '/callback',
                },
                sites: [
                    {
                        defaultCurrency: 'USD',
                        supportedLocales: [
                            { id: 'en-US', preferredCurrency: 'USD' },
                            { id: 'es-MX', preferredCurrency: 'MXN' },
                        ],
                        supportedCurrencies: ['USD', 'MXN'],
                    },
                ],
            },
        });
        mockCreateCommerceApiClients.mockReturnValue(mockClients);
        mockUse.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    describe('client creation', () => {
        it('should create commerce API clients', () => {
            const clients = createApiClients(mockContextProvider);
            expect(clients).toBeDefined();
            expect(clients).toBe(mockClients);
            expect(mockCreateCommerceApiClients).toHaveBeenCalledTimes(1);
            expect(mockGetConfig).toHaveBeenCalledWith(mockContextProvider);
        });

        it('should handle multiple client creations with same context', () => {
            const clients1 = createApiClients(mockContextProvider);
            const clients2 = createApiClients(mockContextProvider);

            expect(mockCreateCommerceApiClients).toHaveBeenCalledTimes(2);
            expect(clients1).toBeDefined();
            expect(clients2).toBeDefined();
        });

        it('should add authentication middleware', () => {
            createApiClients(mockContextProvider);

            // Four middlewares in use: correlation, auth, identifying headers, and maintenance
            // 3 with the middleware disabled
            expect(mockUse).toHaveBeenCalledTimes(3);
            expect(mockUse).toHaveBeenCalledWith(
                expect.objectContaining({
                    onRequest: expect.any(Function),
                })
            );
        });
    });

    describe('baseUrl configuration', () => {
        describe('development mode (__DEV__ = true)', () => {
            beforeEach(() => {
                vi.stubGlobal('__DEV__', true);
            });

            it('should use MRT proxy URL in development', () => {
                createApiClients(mockContextProvider);
                expect(mockCreateCommerceApiClients).toHaveBeenCalledWith(
                    expect.objectContaining({
                        baseUrl: 'https://example.com/mobify/proxy/api',
                    })
                );
            });

            it('should handle different proxy paths', () => {
                mockGetConfig.mockReturnValue({
                    commerce: {
                        api: {
                            shortCode: 'kv7kzm78',
                            proxy: '/custom/api/path',
                        },
                        sites: [
                            {
                                defaultCurrency: 'USD',
                                supportedLocales: [{ id: 'en-US', preferredCurrency: 'USD' }],
                                supportedCurrencies: ['USD'],
                            },
                        ],
                    },
                });

                createApiClients(mockContextProvider);
                expect(mockCreateCommerceApiClients).toHaveBeenCalledWith(
                    expect.objectContaining({
                        baseUrl: 'https://example.com/custom/api/path',
                    })
                );
                expect(mockGetAppOrigin).toHaveBeenCalled();
            });

            it('should handle empty proxy path', () => {
                mockGetConfig.mockReturnValue({
                    commerce: {
                        api: {
                            shortCode: 'kv7kzm78',
                            proxy: '',
                        },
                        sites: [
                            {
                                defaultCurrency: 'USD',
                                supportedLocales: [{ id: 'en-US', preferredCurrency: 'USD' }],
                                supportedCurrencies: ['USD'],
                            },
                        ],
                    },
                });

                createApiClients(mockContextProvider);

                expect(mockCreateCommerceApiClients).toHaveBeenCalledWith(
                    expect.objectContaining({
                        baseUrl: 'https://example.com',
                    })
                );
                expect(mockGetAppOrigin).toHaveBeenCalled();
            });
        });

        describe('production mode (__DEV__ = false)', () => {
            beforeEach(() => {
                vi.stubGlobal('__DEV__', false);
            });

            describe('server-side (typeof window === "undefined")', () => {
                beforeEach(() => {
                    vi.stubGlobal('window', undefined);
                });

                it('should use B2C Commerce API URL on server', () => {
                    createApiClients(mockContextProvider);
                    expect(mockCreateCommerceApiClients).toHaveBeenCalledWith(
                        expect.objectContaining({
                            baseUrl: 'https://kv7kzm78.api.commercecloud.salesforce.com',
                        })
                    );
                });

                it('should use shortCode from config', () => {
                    mockGetConfig.mockReturnValue({
                        commerce: {
                            api: {
                                shortCode: 'custom123',
                                proxy: '/mobify/proxy/api',
                            },
                            sites: [
                                {
                                    defaultCurrency: 'USD',
                                    supportedLocales: [{ id: 'en-US', preferredCurrency: 'USD' }],
                                    supportedCurrencies: ['USD'],
                                },
                            ],
                        },
                    });

                    createApiClients(mockContextProvider);
                    expect(mockCreateCommerceApiClients).toHaveBeenCalledWith(
                        expect.objectContaining({
                            baseUrl: 'https://custom123.api.commercecloud.salesforce.com',
                        })
                    );
                });
            });

            describe('client-side (typeof window !== "undefined")', () => {
                beforeEach(() => {
                    vi.stubGlobal('window', {
                        location: { origin: 'https://client-example.com' },
                    });
                });

                it('should use proxy URL on client', () => {
                    createApiClients(mockContextProvider);

                    expect(mockCreateCommerceApiClients).toHaveBeenCalledWith(
                        expect.objectContaining({
                            baseUrl: 'https://example.com/mobify/proxy/api',
                        })
                    );
                });
            });
        });
    });

    describe('authentication middleware', () => {
        let authMiddleware: { onRequest: (args: { request: Request }) => Promise<Request> };

        beforeEach(() => {
            createApiClients(mockContextProvider);
            // authMiddleware is at index 1 (correlationMiddleware is at index 0)
            authMiddleware = mockUse.mock.calls[1][0];
        });

        it('should have onRequest method', () => {
            expect(authMiddleware).toHaveProperty('onRequest');
            expect(typeof authMiddleware.onRequest).toBe('function');
        });

        describe('onRequest handler', () => {
            it('should add Authorization header with Bearer token', async () => {
                const mockRequest = new Request('https://api.example.com/test');
                const mockSession: SessionData = {
                    accessToken: 'test-access-token-123',
                    customerId: 'test-customer',
                    userType: 'registered',
                };

                mockContextProvider.set(authContext, {
                    ref: Promise.resolve(mockSession),
                });

                const result = await authMiddleware.onRequest({ request: mockRequest });

                expect(result.headers.get('Authorization')).toBe('Bearer test-access-token-123');
            });

            it('should add dwsid header when present in session', async () => {
                const mockRequest = new Request('https://api.example.com/test');
                const mockSession: SessionData = {
                    accessToken: 'test-access-token-123',
                    customerId: 'test-customer',
                    userType: 'registered',
                    dwsid: 'test-dwsid-value',
                };

                mockContextProvider.set(authContext, {
                    ref: Promise.resolve(mockSession),
                });

                const result = await authMiddleware.onRequest({ request: mockRequest });

                expect(result.headers.get('sfdc_dwsid')).toBe('test-dwsid-value');
            });

            it('should retrieve auth session from context', async () => {
                const mockRequest = new Request('https://api.example.com/test');
                const mockSession: SessionData = {
                    accessToken: 'another-token',
                    customerId: 'customer-456',
                    userType: 'guest',
                };

                mockContextProvider.set(authContext, {
                    ref: Promise.resolve(mockSession),
                });

                const result = await authMiddleware.onRequest({ request: mockRequest });

                expect(result.headers.get('Authorization')).toBe('Bearer another-token');
            });

            it('should throw error when no session found', async () => {
                const mockRequest = new Request('https://api.example.com/test');

                mockContextProvider.set(authContext, {
                    ref: Promise.resolve(undefined),
                });

                await expect(authMiddleware.onRequest({ request: mockRequest })).rejects.toThrow('No session found');
            });

            it('should throw error when session is null', async () => {
                const mockRequest = new Request('https://api.example.com/test');

                mockContextProvider.set(authContext, {
                    ref: Promise.resolve(null as unknown as SessionData),
                });

                await expect(authMiddleware.onRequest({ request: mockRequest })).rejects.toThrow('No session found');
            });

            it('should preserve existing request headers', async () => {
                const mockRequest = new Request('https://api.example.com/test', {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Custom-Header': 'custom-value',
                    },
                });
                const mockSession: SessionData = {
                    accessToken: 'test-token',
                    customerId: 'test-customer',
                    userType: 'registered',
                    dwsid: 'session-id-123',
                };

                mockContextProvider.set(authContext, {
                    ref: Promise.resolve(mockSession),
                });

                const result = await authMiddleware.onRequest({ request: mockRequest });

                expect(result.headers.get('Content-Type')).toBe('application/json');
                expect(result.headers.get('X-Custom-Header')).toBe('custom-value');
                expect(result.headers.get('Authorization')).toBe('Bearer test-token');
                expect(result.headers.get('sfdc_dwsid')).toBe('session-id-123');
            });

            it('should handle auth promise rejection', async () => {
                const mockRequest = new Request('https://api.example.com/test');
                const authError = new Error('Auth service unavailable');

                mockContextProvider.set(authContext, {
                    ref: Promise.reject(authError),
                });

                await expect(authMiddleware.onRequest({ request: mockRequest })).rejects.toThrow(
                    'Auth service unavailable'
                );
            });

            it('should return the modified request', async () => {
                const mockRequest = new Request('https://api.example.com/test');
                const mockSession: SessionData = {
                    accessToken: 'test-token',
                    customerId: 'test-customer',
                    userType: 'registered',
                };

                mockContextProvider.set(authContext, {
                    ref: Promise.resolve(mockSession),
                });

                const result = await authMiddleware.onRequest({ request: mockRequest });

                expect(result).toBeInstanceOf(Request);
                expect(result.url).toBe(mockRequest.url);
            });

            it('should skip adding headers for SLAS auth endpoints', async () => {
                const mockRequest = new Request(
                    'https://api.example.com/shopper/auth/v1/organizations/test/oauth2/token'
                );
                const mockSession: SessionData = {
                    accessToken: 'test-token',
                    customerId: 'test-customer',
                    userType: 'registered',
                    dwsid: 'test-dwsid',
                };

                mockContextProvider.set(authContext, {
                    ref: Promise.resolve(mockSession),
                });

                const result = await authMiddleware.onRequest({ request: mockRequest });

                // Headers should not be added for SLAS auth endpoints
                expect(result.headers.get('Authorization')).toBeNull();
                expect(result.headers.get('sfdc_dwsid')).toBeNull();
            });
        });
    });
});
