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

            // Two middlewares in use, both request middleware
            expect(mockUse).toHaveBeenCalledTimes(2);
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
            authMiddleware = mockUse.mock.calls[0][0];
        });

        it('should have onRequest method', () => {
            expect(authMiddleware).toHaveProperty('onRequest');
            expect(typeof authMiddleware.onRequest).toBe('function');
        });

        describe('onRequest handler', () => {
            it('should add Authorization header with Bearer token', async () => {
                const mockRequest = new Request('https://api.example.com/test');
                const mockSession: SessionData = {
                    access_token: 'test-access-token-123',
                    customer_id: 'test-customer',
                    userType: 'registered',
                };

                mockContextProvider.set(authContext, {
                    ref: Promise.resolve(mockSession),
                });

                const result = await authMiddleware.onRequest({ request: mockRequest });

                expect(result.headers.get('Authorization')).toBe('Bearer test-access-token-123');
            });

            it('should retrieve auth session from context', async () => {
                const mockRequest = new Request('https://api.example.com/test');
                const mockSession: SessionData = {
                    access_token: 'another-token',
                    customer_id: 'customer-456',
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
                    access_token: 'test-token',
                    customer_id: 'test-customer',
                    userType: 'registered',
                };

                mockContextProvider.set(authContext, {
                    ref: Promise.resolve(mockSession),
                });

                const result = await authMiddleware.onRequest({ request: mockRequest });

                expect(result.headers.get('Content-Type')).toBe('application/json');
                expect(result.headers.get('X-Custom-Header')).toBe('custom-value');
                expect(result.headers.get('Authorization')).toBe('Bearer test-token');
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
                    access_token: 'test-token',
                    customer_id: 'test-customer',
                    userType: 'registered',
                };

                mockContextProvider.set(authContext, {
                    ref: Promise.resolve(mockSession),
                });

                const result = await authMiddleware.onRequest({ request: mockRequest });

                expect(result).toBeInstanceOf(Request);
                expect(result.url).toBe(mockRequest.url);
            });
        });
    });
});
