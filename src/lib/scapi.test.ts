import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type RouterContextProvider } from 'react-router';
import { ShopperExperience } from 'commerce-sdk-isomorphic/shopperExperience';
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

// Mock config.server.ts to return test config values
vi.mock('../../config.server.ts', () => ({
    default: {
        metadata: {
            projectName: 'Test Project',
            projectSlug: 'test-project',
            version: '1.0.0',
        },
        app: {
            commerce: {
                api: {
                    clientId: 'c9c45bfd-0ed3-4aa2-9971-40f88962b836',
                    organizationId: 'f_ecom_zzrf_001',
                    siteId: 'RefArchGlobal',
                    shortCode: 'kv7kzm78',
                    proxy: '/mobify/proxy/api',
                    callback: '/callback',
                    privateKeyEnabled: false,
                },
            },
            site: {
                locale: 'en-US',
                currency: 'USD',
                features: {
                    passwordlessLogin: false,
                    socialLogin: {
                        enabled: true,
                        providers: ['Apple', 'Google'],
                    },
                },
            },
        },
    },
}));

const mockShopperExperienceGetPage = vi.fn();
const mockShopperExperienceInstance = {
    invalidMethod: 'not a function',
    getPage: mockShopperExperienceGetPage,
};

vi.mock('commerce-sdk-isomorphic/shopperExperience', async () => {
    const actual = await vi.importActual('commerce-sdk-isomorphic/shopperExperience');
    return {
        ...actual,
        ShopperExperience: vi.fn(() => mockShopperExperienceInstance),
    };
});

describe('Commerce SDK fetch service', () => {
    let mockContextProvider: RouterContextProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        clientClassCacheContext?.defaultValue?.clear();
        mockShopperExperienceGetPage.mockClear();
        mockContextProvider = createTestContext();
    });

    afterEach(() => {
        clientClassCacheContext?.defaultValue?.clear();
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
                return expect(client.ShopperBaskets.getBasket()).rejects.toThrow(
                    new TypeError('Client not authenticated: "ShopperBaskets"')
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

            it('throws Error when internal SDK client instance validation fails', async () => {
                const client = createClient(mockContextProvider);
                await expect(client.ShopperProducts.getProducts()).rejects.toThrow(
                    'Missing required query parameter: ids'
                );
            });
        });

        describe('clientConfig', () => {
            it('creates a client with a default client configuration', async () => {
                const client = await createClient(mockContextProvider).ShopperBasketsV2.getInstance();
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

        describe('dynamic import resolution', () => {
            // Track counts locally
            const importCounts = vi.hoisted(() => ({ subpath: 0, full: 0 }));

            // Additional subpath to exercise a fresh subpath import independent of existing imports
            vi.mock('commerce-sdk-isomorphic/shopperStores', async () => {
                importCounts.subpath++;
                const actual = await vi.importActual('commerce-sdk-isomorphic/shopperStores');
                const instance = { getStores: vi.fn(), getStore: vi.fn() };
                return {
                    ...actual,
                    ShopperStores: vi.fn(() => instance),
                };
            });

            // Fallback full SDK path for unmapped client
            vi.mock('commerce-sdk-isomorphic', async () => {
                importCounts.full++;
                const actual = await vi.importActual('commerce-sdk-isomorphic');
                class NonMappedClientMock {}
                return {
                    ...actual,
                    NonMappedClient: NonMappedClientMock,
                } as any;
            });

            it('increments when importing a different SDK subpath (ShopperStores)', async () => {
                expect(importCounts.subpath).toBe(0);
                expect(importCounts.full).toBe(0);
                const client = createClient(mockContextProvider);
                await client.ShopperStores.getInstance();
                expect(importCounts.subpath).toBe(1);
                expect(importCounts.full).toBe(0);
            });

            it('falls back to the full SDK import when subpath importer is unavailable', async () => {
                const originalSubpathCount = importCounts.subpath;
                const client = createClient(mockContextProvider);
                // @ts-expect-error: NonMappedClient is intentionally not part of the typed key map
                const instance = await client.NonMappedClient.getInstance();
                expect(instance).toBeTruthy();
                expect(importCounts.subpath).toBe(originalSubpathCount);
                expect(importCounts.full).toBe(1);
            });

            it('executes mapped SDK subpath importers for additional clients', async () => {
                const client = createClient(mockContextProvider);

                // Exercise additional mapped clients to increase function coverage of importers
                await client.ShopperBaskets.getInstance();
                await client.ShopperBasketsV2.getInstance();
                await client.ShopperConsents.getInstance();
                await client.ShopperContexts.getInstance();
                await client.ShopperCustomers.getInstance();
                await client.ShopperGiftCertificates.getInstance();
                await client.ShopperOrders.getInstance();
                await client.ShopperProducts.getInstance();
                await client.ShopperPromotions.getInstance();
                await client.ShopperSearch.getInstance();
                await client.ShopperSEO.getInstance();

                // If we reached here without throwing, subpath importers worked
                expect(true).toBe(true);
            });
        });
    });
});
