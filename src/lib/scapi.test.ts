import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type RouterContextProvider } from 'react-router';
import { ShopperExperience } from 'commerce-sdk-isomorphic';
import { createTestContext } from '@/lib/test-utils';
import createClient, { clientClassCacheContext } from '@/lib/scapi';

// Mock getAppOrigin
vi.mock('@/lib/utils', async () => {
    const actual = await vi.importActual('@/lib/utils');
    return {
        ...actual,
        getAppOrigin: vi.fn(() => 'https://example.com'),
    };
});

const mockShopperExperienceGetPage = vi.fn();
const mockShopperExperienceInstance = {
    invalidMethod: 'not a function',
    getPage: mockShopperExperienceGetPage,
};

vi.mock('commerce-sdk-isomorphic', async () => {
    const actual = await vi.importActual('commerce-sdk-isomorphic');
    return {
        ...actual,
        ShopperExperience: vi.fn(() => mockShopperExperienceInstance),
    };
});

describe('Commerce SDK fetch service', () => {
    let mockContextProvider: RouterContextProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        clientClassCacheContext.defaultValue?.clear();
        mockShopperExperienceGetPage.mockClear();
        mockContextProvider = createTestContext();
    });

    afterEach(() => {
        clientClassCacheContext.defaultValue?.clear();
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });

    describe('fetch service', () => {
        describe('parameter validation', () => {
            it('throws TypeError when client name is undefined', () => {
                const client = createClient(mockContextProvider);
                expect(() => {
                    // @ts-expect-error: An `undefined` client doesn't exist
                    return client[undefined]();
                }).toThrow(TypeError);
            });

            it('throws TypeError when client name is invalid', () => {
                const client = createClient(mockContextProvider);
                expect(() => {
                    // @ts-expect-error: A client called "InvalidClient" doesn't exist
                    return client.InvalidClient();
                }).toThrow(TypeError);
            });

            it('throws TypeError when method name is undefined', () => {
                const client = createClient(mockContextProvider);
                return expect(() => {
                    // @ts-expect-error: An `undefined` method doesn't exist
                    return client.ShopperProducts[undefined]();
                }).rejects.toThrow(new TypeError('Method not found: "ShopperProducts.undefined"'));
            });

            it('throws TypeError when method name is invalid', () => {
                const client = createClient(mockContextProvider);
                return expect(() => {
                    // @ts-expect-error: A method called "invalidMethod" doesn't exist
                    return client.ShopperProducts.invalidMethod();
                }).rejects.toThrow(new TypeError('Method not found: "ShopperProducts.invalidMethod"'));
            });

            it('throws TypeError when SDK client is not authenticated', () => {
                const unauthenticatedContext = createTestContext({ authSession: null });

                const client = createClient(unauthenticatedContext);
                return expect(client.ShopperProducts.getProduct()).rejects.toThrow(
                    new TypeError('Client not authenticated: "ShopperProducts"')
                );
            });

            it('throws TypeError when authContext promise rejects', () => {
                const failedAuthContext = createTestContext({
                    rejectAuth: true,
                    authError: new Error('Auth failed'),
                });

                const client = createClient(failedAuthContext);
                return expect(client.ShopperExperience.getPage()).rejects.toThrow('Auth failed');
            });

            it('throws Error when internal SDK client instance validation fails', () => {
                const client = createClient(mockContextProvider);
                return expect(client.ShopperProducts.getProducts()).rejects.toThrow(
                    'Missing required query parameter: ids'
                );
            });
        });

        describe('clientConfig', () => {
            it('creates a client with a default client configuration', async () => {
                const client = await createClient(mockContextProvider).ShopperBaskets.getInstance();
                expect(client.clientConfig.parameters).toStrictEqual({
                    clientId: 'c9c45bfd-0ed3-4aa2-9971-40f88962b836',
                    currency: 'USD',
                    locale: 'en-US',
                    organizationId: 'f_ecom_zzrf_001',
                    shortCode: 'kv7kzm78',
                    siteId: 'RefArchGlobal',
                });
            });

            it('creates a login client with a default login client configuration', async () => {
                const client = await createClient(mockContextProvider).ShopperLogin.getInstance();
                expect(client.clientConfig.parameters).toStrictEqual({
                    clientId: 'c9c45bfd-0ed3-4aa2-9971-40f88962b836',
                    currency: 'USD',
                    locale: 'en-US',
                    organizationId: 'f_ecom_zzrf_001',
                    shortCode: 'kv7kzm78',
                    siteId: 'RefArchGlobal',
                    redirectURI: 'https://example.com/callback', // <-- This is special for the `ShopperLogin` client
                });
            });

            it('uses default values when environment variables are missing', async () => {
                vi.stubEnv('VITE_COMMERCE_API_SHORT_CODE', 'custom'); // <-- This must not be empty
                vi.stubEnv('VITE_COMMERCE_API_CLIENT_ID', '');
                vi.stubEnv('VITE_COMMERCE_API_ORG_ID', '');
                vi.stubEnv('VITE_COMMERCE_API_SITE_ID', '');
                vi.stubEnv('VITE_SITE_LOCALE', '');
                vi.stubEnv('VITE_SITE_CURRENCY', '');
                vi.stubEnv('VITE_COMMERCE_API_PROXY', '');
                vi.stubEnv('VITE_COMMERCE_API_CALLBACK', '');

                const client = await createClient(mockContextProvider).ShopperLogin.getInstance();
                expect(client.clientConfig.parameters).toStrictEqual({
                    clientId: '',
                    currency: 'USD',
                    locale: 'en-US',
                    organizationId: '',
                    shortCode: 'custom',
                    siteId: '',
                    redirectURI: 'https://example.com',
                });
            });

            it('handles custom environment values', async () => {
                vi.stubEnv('VITE_COMMERCE_API_SHORT_CODE', 'custom-short-code');
                vi.stubEnv('VITE_COMMERCE_API_CLIENT_ID', 'custom-client-id');
                vi.stubEnv('VITE_COMMERCE_API_ORG_ID', 'custom-org-id');
                vi.stubEnv('VITE_COMMERCE_API_SITE_ID', 'custom-site-id');
                vi.stubEnv('VITE_SITE_LOCALE', 'fr-FR');
                vi.stubEnv('VITE_SITE_CURRENCY', 'EUR');
                vi.stubEnv('VITE_COMMERCE_API_PROXY', '/custom/proxy');
                vi.stubEnv('VITE_COMMERCE_API_CALLBACK', '/custom/callback');

                const client = await createClient(mockContextProvider).ShopperLogin.getInstance();
                expect(client.clientConfig.parameters).toStrictEqual({
                    clientId: 'custom-client-id',
                    currency: 'EUR',
                    locale: 'fr-FR',
                    organizationId: 'custom-org-id',
                    redirectURI: 'https://example.com/custom/callback',
                    shortCode: 'custom-short-code',
                    siteId: 'custom-site-id',
                });
            });
        });

        describe('successful requests', () => {
            it('creates an SDK client and calls a method on it', async () => {
                const parameters = { parameters: { pageId: 'home' } };
                const mockResult = { pageId: 'home' };
                mockShopperExperienceGetPage.mockResolvedValue(mockResult);

                const client = createClient(mockContextProvider);
                const result = await client.ShopperExperience.getPage(parameters);

                expect(ShopperExperience).toHaveBeenCalledWith({
                    parameters: {
                        clientId: 'c9c45bfd-0ed3-4aa2-9971-40f88962b836',
                        organizationId: 'f_ecom_zzrf_001',
                        shortCode: 'kv7kzm78',
                        siteId: 'RefArchGlobal',
                        currency: 'USD',
                        locale: 'en-US',
                    },
                    headers: {
                        authorization: 'Bearer test-access-token',
                    },
                    throwOnBadResponse: true,
                    proxy: 'https://example.com/mobify/proxy/api',
                });

                expect(mockShopperExperienceGetPage).toHaveBeenCalledWith(parameters);
                expect(result).toBe(mockResult);
            });

            it('handles session without access_token', async () => {
                const guestContext = createTestContext({
                    authSession: {
                        userType: 'guest',
                        customer_id: 'test-customer-id',
                        access_token: undefined, // explicitly undefined for guest users
                    },
                });
                mockShopperExperienceGetPage.mockResolvedValue({ success: true });

                const client = createClient(guestContext);
                await client.ShopperExperience.getPage({ parameters: { pageId: 'home' } });

                expect(ShopperExperience).toHaveBeenCalledWith({
                    parameters: expect.any(Object),
                    headers: {
                        authorization: 'Bearer undefined',
                    },
                    throwOnBadResponse: true,
                    proxy: expect.any(String),
                });
            });
        });

        describe('error handling', () => {
            it('propagates errors from SDK method calls', () => {
                const sdkError = new Error('SDK method failed');
                mockShopperExperienceGetPage.mockRejectedValue(sdkError);

                const client = createClient(mockContextProvider);
                return expect(client.ShopperExperience.getPage()).rejects.toThrow(sdkError);
            });
        });

        describe('instance caching', () => {
            it('caches SDK client instances per context/request', async () => {
                mockShopperExperienceGetPage.mockResolvedValue({ success: true });

                const client = createClient(mockContextProvider);

                // First call should create instance
                await client.ShopperExperience.getPage();
                expect(ShopperExperience).toHaveBeenCalledTimes(1);

                // Second call should reuse cached instance
                await client.ShopperExperience.getPage();
                expect(ShopperExperience).toHaveBeenCalledTimes(1); // Still only called once
            });

            it('creates separate SDK client instances for different contexts/requests', async () => {
                mockShopperExperienceGetPage.mockResolvedValue({ success: true });

                const client1 = createClient(mockContextProvider);
                const context2 = createTestContext({
                    authSession: {
                        access_token: 'test-access-token-2',
                        customer_id: 'test-customer-id-2',
                        userType: 'registered',
                    },
                });
                const client2 = createClient(context2);

                // Each context should create its own instance
                await client1.ShopperExperience.getPage();
                await client2.ShopperExperience.getPage();

                expect(ShopperExperience).toHaveBeenCalledTimes(2);
            });
        });

        describe('request caching and deduplication', () => {
            it('deduplicates identical requests', async () => {
                const mockResult = { pageId: '123456' };
                mockShopperExperienceGetPage.mockResolvedValue(mockResult);

                const client = createClient(mockContextProvider);
                const parameters = { parameters: { pageId: '123456' } };

                // Make two identical requests simultaneously
                const promise1 = client.ShopperExperience.getPage(parameters);
                const promise2 = client.ShopperExperience.getPage(parameters);

                const [result1, result2] = await Promise.all([promise1, promise2]);

                // Both should return the same result
                expect(result1).toBe(mockResult);
                expect(result2).toBe(mockResult);

                // But the underlying method should only be called once
                expect(mockShopperExperienceGetPage).toHaveBeenCalledTimes(1);
                expect(ShopperExperience).toHaveBeenCalledTimes(1);
            });

            it('does not deduplicate requests with different parameters', async () => {
                const mockResult1 = { productId: '123' };
                const mockResult2 = { productId: '456' };
                mockShopperExperienceGetPage.mockResolvedValueOnce(mockResult1).mockResolvedValueOnce(mockResult2);

                const client = createClient(mockContextProvider);
                const parameters1 = { parameters: { ids: ['123'] } };
                const parameters2 = { parameters: { ids: ['456'] } };

                // Make requests with different parameters
                const [result1, result2] = await Promise.all([
                    client.ShopperExperience.getPage(parameters1),
                    client.ShopperExperience.getPage(parameters2),
                ]);

                expect(result1).toBe(mockResult1);
                expect(result2).toBe(mockResult2);
                expect(mockShopperExperienceGetPage).toHaveBeenCalledTimes(2);
                expect(ShopperExperience).toHaveBeenCalledTimes(1);
            });

            it('cleans up request cache after promise resolution', async () => {
                const mockResult = { pageId: '123456' };
                mockShopperExperienceGetPage.mockResolvedValue(mockResult);

                const client = createClient(mockContextProvider);
                const parameters = { parameters: { pageId: '123456' } };

                // First request
                await client.ShopperExperience.getPage(parameters);

                // Second identical request after first is resolved
                await client.ShopperExperience.getPage(parameters);

                // Should be called twice since cache is cleaned up
                expect(mockShopperExperienceGetPage).toHaveBeenCalledTimes(2);
                expect(ShopperExperience).toHaveBeenCalledTimes(1);
            });

            it('isolates request cache between different contexts', async () => {
                const mockResult = { pageId: 'home' };
                mockShopperExperienceGetPage.mockResolvedValue(mockResult);

                const client1 = createClient(mockContextProvider);
                const context2 = createTestContext({
                    authSession: {
                        access_token: 'test-access-token-2',
                        customer_id: 'test-customer-id-2',
                        userType: 'registered',
                    },
                });

                const client2 = createClient(context2);

                // Same request from different contexts should not be deduplicated
                const parameters = { parameters: { pageId: 'home' } };
                await Promise.all([
                    client1.ShopperExperience.getPage(parameters),
                    client2.ShopperExperience.getPage(parameters),
                ]);

                expect(mockShopperExperienceGetPage).toHaveBeenCalledTimes(2);
            });
        });
    });
});
