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
import { siteContext } from '@salesforce/storefront-next-runtime/site-context';
import { authContext } from '@/middlewares/auth.utils';
import type { SessionData } from '@/lib/api/types';
import type { Logger } from '@/lib/logger';
import { loggerContext } from '@/lib/logger.server';
import { scapiMiddlewareContext } from './scapi-middleware';
import { createApiClients, createDedupedFetch } from './api-clients.server';

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

// ===========================================================================
// Fetch-level dedupe — tests for `createDedupedFetch`, the opinionated reference
// dedupe implementation that wraps the base `fetch` before it's handed to the
// SCAPI clients.
// ===========================================================================

type MockLogger = {
    info: ReturnType<typeof vi.fn>;
};

function makeContext(): RouterContextProvider & { logger: MockLogger } {
    // The registry is keyed by the context object itself (WeakMap), so any
    // unique object instance per "request" is sufficient for test isolation.
    // We wire a mock logger into `loggerContext` so cache-hit logging is
    // observable from tests (and so `getLogger(context)` doesn't fall back
    // to a console logger that would emit noise during the run).
    const store = new Map<unknown, unknown>();
    const logger: MockLogger = {
        info: vi.fn(),
    };
    store.set(loggerContext, logger as unknown as Logger);
    const ctx = {
        get(key: unknown) {
            return store.get(key);
        },
        set(key: unknown, value: unknown) {
            store.set(key, value);
            return value;
        },
    } as unknown as RouterContextProvider & { logger: MockLogger };
    ctx.logger = logger;
    return ctx;
}

describe('createDedupedFetch', () => {
    function makeBaseFetch() {
        let counter = 0;
        return vi.fn(() => {
            const id = ++counter;
            return Promise.resolve(
                new Response(JSON.stringify({ id }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                })
            );
        });
    }

    it('shares one underlying fetch for two parallel identical GETs', async () => {
        const ctx = makeContext();
        const baseFetch = makeBaseFetch();
        const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

        const [r1, r2] = await Promise.all([fetch('https://api.example.com/x'), fetch('https://api.example.com/x')]);

        expect(baseFetch).toHaveBeenCalledTimes(1);
        // The second caller hit the cache and emits an info log.
        expect(ctx.logger.info).toHaveBeenCalledTimes(1);
        expect(ctx.logger.info).toHaveBeenCalledWith('fetch cache hit GET /x');
        // Both callers must be able to consume the body independently (responses are cloned).
        await expect(r1.json()).resolves.toEqual({ id: 1 });
        await expect(r2.json()).resolves.toEqual({ id: 1 });
    });

    it('treats reordered query parameters as identical', async () => {
        const ctx = makeContext();
        const baseFetch = makeBaseFetch();
        const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

        await Promise.all([fetch('https://api.example.com/x?a=1&b=2'), fetch('https://api.example.com/x?b=2&a=1')]);

        expect(baseFetch).toHaveBeenCalledTimes(1);
        expect(ctx.logger.info).toHaveBeenCalledTimes(1);
        // Query keys are sorted and values are masked, so reordered params produce a stable log line.
        expect(ctx.logger.info).toHaveBeenCalledWith('fetch cache hit GET /x?a=*&b=*');
    });

    it('does not dedupe POST requests', async () => {
        const ctx = makeContext();
        const baseFetch = makeBaseFetch();
        const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

        await Promise.all([
            fetch('https://api.example.com/x', { method: 'POST', body: 'a' }),
            fetch('https://api.example.com/x', { method: 'POST', body: 'a' }),
        ]);

        expect(baseFetch).toHaveBeenCalledTimes(2);
        // Mutations are never cache hits — no info log should fire.
        expect(ctx.logger.info).not.toHaveBeenCalled();
    });

    it('isolates registries between two contexts (no cross-request leakage)', async () => {
        const ctxA = makeContext();
        const ctxB = makeContext();
        const baseFetch = makeBaseFetch();
        const fetchA = createDedupedFetch(ctxA, baseFetch as unknown as typeof globalThis.fetch);
        const fetchB = createDedupedFetch(ctxB, baseFetch as unknown as typeof globalThis.fetch);

        await fetchA('https://api.example.com/x');
        await fetchB('https://api.example.com/x');

        expect(baseFetch).toHaveBeenCalledTimes(2);
    });

    it('shares a rejected promise across concurrent callers and evicts on rejection', async () => {
        const ctx = makeContext();
        const baseFetch = vi.fn();
        baseFetch.mockRejectedValueOnce(new Error('network'));
        // Second call (after eviction) succeeds.
        baseFetch.mockResolvedValueOnce(new Response('ok'));
        const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

        const p1 = fetch('https://api.example.com/x');
        const p2 = fetch('https://api.example.com/x');
        await expect(p1).rejects.toThrow('network');
        await expect(p2).rejects.toThrow('network');
        expect(baseFetch).toHaveBeenCalledTimes(1);

        // Subsequent identical call retries because the rejected entry was evicted.
        await expect(fetch('https://api.example.com/x')).resolves.toBeInstanceOf(Response);
        expect(baseFetch).toHaveBeenCalledTimes(2);
    });

    it('clears the registry on mutation settle (read → mutate → re-read)', async () => {
        const ctx = makeContext();
        const baseFetch = makeBaseFetch();
        const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

        await fetch('https://api.example.com/x');
        await fetch('https://api.example.com/x');
        expect(baseFetch).toHaveBeenCalledTimes(1);
        // Second GET was a cache hit.
        expect(ctx.logger.info).toHaveBeenCalledTimes(1);
        expect(ctx.logger.info).toHaveBeenLastCalledWith('fetch cache hit GET /x');

        await fetch('https://api.example.com/x', { method: 'POST', body: 'a' });

        await fetch('https://api.example.com/x');
        // 1 GET (deduped) + 1 POST + 1 GET after invalidation = 3.
        expect(baseFetch).toHaveBeenCalledTimes(3);
        // Post-invalidation read missed the cache, so the info log count did not change.
        expect(ctx.logger.info).toHaveBeenCalledTimes(1);
    });

    it('clears the registry across URL boundaries on mutation settle', async () => {
        const ctx = makeContext();
        const baseFetch = makeBaseFetch();
        const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

        await fetch('https://api.example.com/a');
        await fetch('https://api.example.com/b');
        expect(baseFetch).toHaveBeenCalledTimes(2);

        await fetch('https://api.example.com/x', { method: 'POST', body: 'a' });

        await fetch('https://api.example.com/a');
        await fetch('https://api.example.com/b');
        // 2 GETs + 1 POST + 2 fresh GETs after invalidation = 5.
        expect(baseFetch).toHaveBeenCalledTimes(5);
    });

    it('invalidates on mutation rejection (failure must not leave stale cache)', async () => {
        const ctx = makeContext();
        const baseFetch = vi.fn();
        baseFetch.mockResolvedValueOnce(new Response('ok')); // first GET
        baseFetch.mockRejectedValueOnce(new Error('boom')); // POST fails
        baseFetch.mockResolvedValueOnce(new Response('ok')); // second GET (after invalidation)
        const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

        await fetch('https://api.example.com/x');
        await expect(fetch('https://api.example.com/x', { method: 'POST', body: 'a' })).rejects.toThrow('boom');

        await fetch('https://api.example.com/x');
        expect(baseFetch).toHaveBeenCalledTimes(3);
    });

    it('lets concurrent in-flight reads complete against the pre-mutation snapshot', async () => {
        const ctx = makeContext();

        let resolveGet: ((value: Response) => void) | undefined;
        const baseFetch = vi.fn();
        baseFetch.mockImplementationOnce(
            () =>
                new Promise<Response>((resolve) => {
                    resolveGet = resolve;
                })
        );
        baseFetch.mockResolvedValueOnce(new Response('mutated')); // POST
        baseFetch.mockResolvedValueOnce(new Response('fresh')); // GET after invalidation
        const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

        const inFlight = fetch('https://api.example.com/x');

        // Mutation settles while the read is still pending.
        await fetch('https://api.example.com/x', { method: 'POST', body: 'a' });

        // Pending read resolves to its original (pre-mutation) response.
        resolveGet?.(new Response('snapshot'));
        await expect((await inFlight).text()).resolves.toBe('snapshot');

        // 1 pending GET + 1 POST = 2 underlying calls so far.
        expect(baseFetch).toHaveBeenCalledTimes(2);

        // Subsequent read goes to the network.
        await fetch('https://api.example.com/x');
        expect(baseFetch).toHaveBeenCalledTimes(3);
    });

    it('passes a Request object through to the base fetch (reconstructed to neutralize signal)', async () => {
        const ctx = makeContext();
        const baseFetch = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
            Promise.resolve(new Response('ok'))
        );
        const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

        const req = new Request('https://api.example.com/x', {
            method: 'GET',
            headers: { 'X-Test': 'value' },
        });
        await fetch(req);

        // Underlying fetch must receive a Request (so SDK Request semantics — method, headers, body —
        // survive), but it MUST NOT be the caller's Request: we reconstruct so the inner Request's signal
        // is independent of any signal the caller may have attached to its own Request.
        expect(baseFetch).toHaveBeenCalledTimes(1);
        const passedInput = baseFetch.mock.calls[0][0] as Request;
        expect(passedInput).toBeInstanceOf(Request);
        expect(passedInput).not.toBe(req);
        expect(passedInput.url).toBe(req.url);
        expect(passedInput.method).toBe('GET');
        expect(passedInput.headers.get('X-Test')).toBe('value');
    });

    it('dedupes HEAD requests and shares the response across callers', async () => {
        const ctx = makeContext();
        const baseFetch = makeBaseFetch();
        const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

        const [r1, r2] = await Promise.all([
            fetch('https://api.example.com/x', { method: 'HEAD' }),
            fetch('https://api.example.com/x', { method: 'HEAD' }),
        ]);

        expect(baseFetch).toHaveBeenCalledTimes(1);
        // The HEAD cache hit is logged with the matching method.
        expect(ctx.logger.info).toHaveBeenCalledTimes(1);
        expect(ctx.logger.info).toHaveBeenCalledWith('fetch cache hit HEAD /x');
        // Each cache hit returns its own clone — both callers can read independently.
        expect(r1).toBeInstanceOf(Response);
        expect(r2).toBeInstanceOf(Response);
    });

    it('logs the URL pathname and query keys with masked values on cache hit', async () => {
        const ctx = makeContext();
        const baseFetch = makeBaseFetch();
        const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

        await Promise.all([
            fetch('https://api.example.com/baskets/abc?siteId=site&token=secret&customerId=12345'),
            fetch('https://api.example.com/baskets/abc?siteId=site&token=secret&customerId=12345'),
        ]);

        expect(ctx.logger.info).toHaveBeenCalledTimes(1);
        const message = ctx.logger.info.mock.calls[0][0] as string;
        // Pathname + sorted query keys with values masked. Keys are observable for diagnostics, values
        // (which can carry tokens, basket IDs, customer IDs, or other PII) are not.
        expect(message).toBe('fetch cache hit GET /baskets/abc?customerId=*&siteId=*&token=*');
        expect(message).not.toContain('api.example.com');
        expect(message).not.toContain('secret');
        expect(message).not.toContain('=site');
        expect(message).not.toContain('12345');
    });

    it.each(['PUT', 'PATCH', 'DELETE'])(
        'invalidates the registry on %s settle (not just POST)',
        async (mutationMethod) => {
            const ctx = makeContext();
            const baseFetch = makeBaseFetch();
            const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

            await fetch('https://api.example.com/x');
            await fetch('https://api.example.com/x');
            expect(baseFetch).toHaveBeenCalledTimes(1);

            await fetch('https://api.example.com/x', { method: mutationMethod, body: 'a' });

            await fetch('https://api.example.com/x');
            // 1 GET (deduped) + 1 mutation + 1 GET after invalidation = 3.
            expect(baseFetch).toHaveBeenCalledTimes(3);
        }
    );

    it('serializes concurrent mutations and invalidates the registry once each settles', async () => {
        const ctx = makeContext();
        const baseFetch = vi.fn();
        baseFetch.mockResolvedValueOnce(new Response('initial'));
        baseFetch.mockResolvedValueOnce(new Response('m1'));
        baseFetch.mockResolvedValueOnce(new Response('m2'));
        baseFetch.mockResolvedValueOnce(new Response('fresh'));
        const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

        // Prime the cache with one read.
        await fetch('https://api.example.com/x');
        expect(baseFetch).toHaveBeenCalledTimes(1);

        // Two concurrent mutations — each must hit the network (mutations are never deduped).
        await Promise.all([
            fetch('https://api.example.com/x', { method: 'POST', body: '1' }),
            fetch('https://api.example.com/x', { method: 'POST', body: '2' }),
        ]);
        expect(baseFetch).toHaveBeenCalledTimes(3);

        // After both mutations settle the registry is empty, so a fresh read goes to the network.
        await fetch('https://api.example.com/x');
        expect(baseFetch).toHaveBeenCalledTimes(4);
    });

    describe('abort handling', () => {
        // Construct a base fetch that resolves only when we tell it to, so we can interleave aborts.
        function makeControllableFetch() {
            let resolveCurrent: ((response: Response) => void) | undefined;
            const baseFetch = vi.fn(
                (_input: RequestInfo | URL, _init?: RequestInit) =>
                    new Promise<Response>((resolve) => {
                        resolveCurrent = resolve;
                    })
            );
            return {
                baseFetch,
                resolve: (response = new Response('ok')) => {
                    resolveCurrent?.(response);
                    resolveCurrent = undefined;
                },
            };
        }

        it("does not forward the caller's signal to the underlying fetch", async () => {
            const ctx = makeContext();
            const { baseFetch, resolve } = makeControllableFetch();
            const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

            const controller = new AbortController();
            const fetchPromise = fetch('https://api.example.com/x', { signal: controller.signal });

            // Whatever init was passed to the underlying fetch must NOT carry the caller's signal — otherwise
            // the next assertion (caller's abort doesn't cancel the underlying fetch) would be a coincidence.
            expect(baseFetch).toHaveBeenCalledTimes(1);
            const passedInit = baseFetch.mock.calls[0]?.[1];
            expect(passedInit?.signal).toBeUndefined();

            controller.abort(new Error('caller aborted'));
            await expect(fetchPromise).rejects.toThrow('caller aborted');

            // Underlying fetch is still running — it has not been aborted.
            resolve();
            // Allow the unraced underlying fetch to settle without errors leaking out.
            await new Promise<void>((r) => setTimeout(r, 0));
        });

        it('aborts only the calling await, not the shared fetch (other callers complete normally)', async () => {
            const ctx = makeContext();
            const { baseFetch, resolve } = makeControllableFetch();
            const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

            const controllerA = new AbortController();
            const a = fetch('https://api.example.com/x', { signal: controllerA.signal });
            const b = fetch('https://api.example.com/x'); // no signal

            controllerA.abort(new Error('A only'));
            await expect(a).rejects.toThrow('A only');

            // The underlying fetch was not aborted by A's abort, so B can still resolve.
            resolve(new Response('shared body'));
            await expect((await b).text()).resolves.toBe('shared body');

            expect(baseFetch).toHaveBeenCalledTimes(1);
        });

        it('rejects immediately when the caller signal is already aborted', async () => {
            const ctx = makeContext();
            const baseFetch = makeBaseFetch();
            const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

            const controller = new AbortController();
            controller.abort(new Error('already gone'));

            // The signal was already aborted before fetch was called. Caller's await must reject.
            await expect(fetch('https://api.example.com/x', { signal: controller.signal })).rejects.toThrow(
                'already gone'
            );
        });

        it('does not forward a signal carried on a Request input to the underlying fetch', async () => {
            const ctx = makeContext();
            const { baseFetch, resolve } = makeControllableFetch();
            const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

            const controller = new AbortController();
            const req = new Request('https://api.example.com/x', { signal: controller.signal });
            const fetchPromise = fetch(req);

            expect(baseFetch).toHaveBeenCalledTimes(1);
            const passedInput = baseFetch.mock.calls[0][0] as Request;
            // The underlying fetch must receive a Request whose signal is NOT the caller's signal.
            expect(passedInput).toBeInstanceOf(Request);
            expect(passedInput).not.toBe(req);
            expect(passedInput.signal).not.toBe(controller.signal);
            expect(passedInput.signal.aborted).toBe(false);

            controller.abort(new Error('caller aborted via Request'));
            await expect(fetchPromise).rejects.toThrow('caller aborted via Request');

            // Underlying fetch's signal must NOT have followed the caller's abort.
            expect(passedInput.signal.aborted).toBe(false);

            resolve();
            await new Promise<void>((r) => setTimeout(r, 0));
        });

        it('aborts only the calling await when the signal is on a Request input (other callers complete)', async () => {
            const ctx = makeContext();
            const { baseFetch, resolve } = makeControllableFetch();
            const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

            const controllerA = new AbortController();
            const reqA = new Request('https://api.example.com/x', { signal: controllerA.signal });
            const a = fetch(reqA);
            const b = fetch('https://api.example.com/x'); // no signal

            controllerA.abort(new Error('A only (Request signal)'));
            await expect(a).rejects.toThrow('A only (Request signal)');

            // Underlying fetch was not aborted — the second caller still observes a normal resolution.
            resolve(new Response('shared body'));
            await expect((await b).text()).resolves.toBe('shared body');

            expect(baseFetch).toHaveBeenCalledTimes(1);
        });

        it('keeps the cache populated for later (non-aborted) callers when the first caller aborts', async () => {
            const ctx = makeContext();
            const { baseFetch, resolve } = makeControllableFetch();
            const fetch = createDedupedFetch(ctx, baseFetch as unknown as typeof globalThis.fetch);

            const controllerA = new AbortController();
            const a = fetch('https://api.example.com/x', { signal: controllerA.signal });
            controllerA.abort(new Error('A bailed'));
            await expect(a).rejects.toThrow('A bailed');

            // A second caller arrives after A aborted — should still share the in-flight fetch (no new fetch).
            const b = fetch('https://api.example.com/x');
            expect(baseFetch).toHaveBeenCalledTimes(1);

            resolve(new Response('shared'));
            await expect((await b).text()).resolves.toBe('shared');
        });
    });
});
