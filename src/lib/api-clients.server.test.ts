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
import { createApiClients } from './api-clients.server';
import { authContext } from '@/middlewares/auth.utils';
import { siteContext } from '@salesforce/storefront-next-runtime/site-context';
import type { SessionData } from '@/lib/api/types';
import { scapiMiddlewareContext } from './scapi-middleware';

const scapiMocks = vi.hoisted(() => {
    const mockUse = vi.fn();
    const mockCustomUse = vi.fn();
    const mockCreateClient = vi.fn(() => ({
        use: mockCustomUse,
        getLoyaltyPoints: vi.fn(),
    }));
    const mockCreateOpenApiFetchClient = vi.fn(() => ({}));
    const mockClients = {
        use: mockUse,
        shopperBasketsV2: {},
        shopperProducts: {},
    };

    return {
        mockUse,
        mockCustomUse,
        mockCreateClient,
        mockCreateOpenApiFetchClient,
        mockClients,
    };
});

vi.mock('@/scapi/custom-clients', () => ({
    customClients: [
        {
            key: 'loyalty',
            basePath: '/custom/loyalty/v1',
            ops: { getLoyaltyPoints: { m: 'GET', b: '/customers/{customerId}', s: '/loyalty' } },
            locale: false,
            orgPrefix: true,
        },
    ],
}));

// Mock dependencies
vi.mock('@/lib/utils', async (importOriginal) => {
    const actual = await importOriginal<typeof vi.importActual>();
    return {
        ...actual,
        getAppOrigin: vi.fn(() => 'https://example.com'),
    };
});

vi.mock('@salesforce/storefront-next-runtime/config', async (importOriginal) => {
    const actual = await importOriginal<typeof vi.importActual>();
    return {
        ...actual,
        getConfig: vi.fn(() => ({
            commerce: {
                api: {
                    shortCode: 'kv7kzm78',
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

vi.mock('@salesforce/storefront-next-runtime/i18n', () => ({
    getTranslation: vi.fn(() => ({
        i18next: {
            language: 'en-US',
        },
    })),
}));

const createMockContextProvider = (): RouterContextProvider => {
    const store = new Map<unknown, unknown>();
    return {
        get(key: unknown) {
            return store.get(key);
        },
        set(key: unknown, value: unknown) {
            store.set(key, value);
            return value;
        },
    } as unknown as RouterContextProvider;
};

// Mock the createCommerceApiClients function
vi.mock('@salesforce/storefront-next-runtime/scapi', () => ({
    createCommerceApiClients: vi.fn(() => scapiMocks.mockClients),
    createClient: scapiMocks.mockCreateClient,
    createOpenApiFetchClient: scapiMocks.mockCreateOpenApiFetchClient,
    defaultQuerySerializer: vi.fn(),
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
    let mockGetConfig: ReturnType<typeof vi.fn>;
    let mockCreateCommerceApiClients: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockContextProvider = createMockContextProvider();
        mockContextProvider.set(siteContext, {
            site: {
                id: 'test-site-id',
                defaultCurrency: 'USD',
                defaultLocale: 'en-US',
                supportedCurrencies: ['USD', 'MXN'],
                supportedLocales: [
                    { id: 'en-US', preferredCurrency: 'USD' },
                    { id: 'es-MX', preferredCurrency: 'MXN' },
                ],
            },
            locale: { id: 'en-US', preferredCurrency: 'USD' },
        } as never);

        mockContextProvider.set(scapiMiddlewareContext, []);

        // Get mocked functions
        const configModule = await import('@salesforce/storefront-next-runtime/config');
        mockGetConfig = configModule.getConfig as ReturnType<typeof vi.fn>;

        const scapiModule = await import('@salesforce/storefront-next-runtime/scapi');
        mockCreateCommerceApiClients = scapiModule.createCommerceApiClients as ReturnType<typeof vi.fn>;

        // Reset mock implementations
        mockGetConfig.mockReturnValue({
            commerce: {
                api: {
                    shortCode: 'kv7kzm78',
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
        mockCreateCommerceApiClients.mockReturnValue(scapiMocks.mockClients);
        scapiMocks.mockUse.mockClear();
        scapiMocks.mockCustomUse.mockClear();
        scapiMocks.mockCreateClient.mockClear();
        scapiMocks.mockCreateOpenApiFetchClient.mockClear();
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
            // The returned object spreads the base SDK clients and adds custom clients + use
            expect(clients.shopperBasketsV2).toBe(scapiMocks.mockClients.shopperBasketsV2);
            expect(clients.shopperProducts).toBe(scapiMocks.mockClients.shopperProducts);
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

            // Three middlewares on client-side: correlation, auth, identifying headers
            expect(scapiMocks.mockUse).toHaveBeenCalledTimes(3);
            expect(scapiMocks.mockCustomUse).toHaveBeenCalledTimes(3);
            expect(scapiMocks.mockUse).toHaveBeenCalledWith(
                expect.objectContaining({
                    onRequest: expect.any(Function),
                })
            );
        });

        it('should use siteId from site context when available', () => {
            mockContextProvider.set(siteContext, {
                site: {
                    id: 'site-context-id',
                    defaultCurrency: 'USD',
                    defaultLocale: 'en-US',
                    supportedCurrencies: ['USD'],
                    supportedLocales: [{ id: 'en-US', preferredCurrency: 'USD' }],
                },
                locale: { id: 'en-US', preferredCurrency: 'USD' },
            } as never);

            createApiClients(mockContextProvider);

            expect(mockCreateCommerceApiClients).toHaveBeenCalledWith(
                expect.objectContaining({
                    siteId: 'site-context-id',
                })
            );
        });

        it('should throw when site context is not set', () => {
            // Explicitly clear site context to simulate no site context middleware
            mockContextProvider.set(siteContext, null);

            expect(() => createApiClients(mockContextProvider)).toThrow('Site context not initialized');
        });

        it('should create custom clients from the generated registry', () => {
            const clients = createApiClients(mockContextProvider);

            expect(clients).toHaveProperty('loyalty');
            expect(scapiMocks.mockCreateOpenApiFetchClient).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseUrl:
                        'https://kv7kzm78.api.commercecloud.salesforce.com/custom/loyalty/v1/organizations/test-org-id',
                })
            );
            expect(scapiMocks.mockCreateClient).toHaveBeenCalledWith(
                expect.any(Object),
                { getLoyaltyPoints: { m: 'GET', b: '/customers/{customerId}', s: '/loyalty' } },
                expect.objectContaining({
                    organizationId: 'test-org-id',
                    siteId: expect.any(String),
                }),
                expect.objectContaining({
                    onAuthTokenInvalid: expect.any(Function),
                })
            );
        });
    });

    describe('baseUrl configuration', () => {
        it('should use direct SCAPI URL from shortCode', () => {
            createApiClients(mockContextProvider);
            expect(mockCreateCommerceApiClients).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseUrl: 'https://kv7kzm78.api.commercecloud.salesforce.com',
                })
            );
        });

        it('should use SCAPI_PROXY_HOST when set (server-side)', () => {
            vi.stubGlobal('window', undefined);
            vi.stubEnv('SCAPI_PROXY_HOST', 'https://scw:25010');

            createApiClients(mockContextProvider);
            expect(mockCreateCommerceApiClients).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseUrl: 'https://scw:25010',
                    proxyHost: 'https://scw:25010',
                })
            );
        });

        it('should use shortCode from config', () => {
            mockGetConfig.mockReturnValue({
                commerce: {
                    api: {
                        shortCode: 'custom123',
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

    describe('authentication middleware', () => {
        let authMiddleware: { onRequest: (args: { request: Request }) => Promise<Request> };

        beforeEach(() => {
            createApiClients(mockContextProvider);
            // authMiddleware is at index 1 (correlation at 0)
            authMiddleware = scapiMocks.mockUse.mock.calls[1][0];
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

            it('should skip Authorization and sfdc_dwsid for non-refresh SLAS auth endpoints', async () => {
                const mockRequest = new Request(
                    'https://api.example.com/shopper/auth/v1/organizations/test/oauth2/token',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: 'grant_type=authorization_code_pkce&code=test-code',
                    }
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

                expect(result.headers.get('Authorization')).toBeNull();
                expect(result.headers.get('sfdc_dwsid')).toBeNull();
            });

            it('should inject sfdc_dwsid for SLAS refresh_token calls', async () => {
                const mockRequest = new Request(
                    'https://api.example.com/shopper/auth/v1/organizations/test/oauth2/token',
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: 'grant_type=refresh_token&refresh_token=test-refresh',
                    }
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

                expect(result.headers.get('Authorization')).toBeNull();
                expect(result.headers.get('sfdc_dwsid')).toBe('test-dwsid');
            });

            it('should not inject sfdc_dwsid for SLAS auth endpoints when session has no dwsid', async () => {
                const mockRequest = new Request(
                    'https://api.example.com/shopper/auth/v1/organizations/test/oauth2/token'
                );
                const mockSession: SessionData = {
                    accessToken: 'test-token',
                    customerId: 'test-customer',
                    userType: 'registered',
                };

                mockContextProvider.set(authContext, {
                    ref: Promise.resolve(mockSession),
                });

                const result = await authMiddleware.onRequest({ request: mockRequest });

                expect(result.headers.get('Authorization')).toBeNull();
                expect(result.headers.get('sfdc_dwsid')).toBeNull();
            });
        });
    });
});
