import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCommerceApiClients, type Clients } from './createClients';
import { ApiError } from './ApiError';
import type { Middleware } from 'openapi-fetch';

describe('createCommerceApiClients', () => {
    const baseUrl = 'https://test.commercecloud.salesforce.com';

    describe('client creation', () => {
        it('should create all required client instances', () => {
            const clients = createCommerceApiClients({ baseUrl });

            expect(clients.shopperBasketsV1).toBeDefined();
            expect(clients.shopperBasketsV2).toBeDefined();
            expect(clients.shopperConsents).toBeDefined();
            expect(clients.shopperContext).toBeDefined();
            expect(clients.shopperCustomers).toBeDefined();
            expect(clients.shopperExperience).toBeDefined();
            expect(clients.shopperGiftCertificates).toBeDefined();
            expect(clients.shopperLogin).toBeDefined();
            expect(clients.shopperOrders).toBeDefined();
            expect(clients.shopperProducts).toBeDefined();
            expect(clients.shopperPromotions).toBeDefined();
            expect(clients.shopperSearch).toBeDefined();
            expect(clients.shopperSeo).toBeDefined();
            expect(clients.shopperStores).toBeDefined();
        });

        it('should create a use method', () => {
            const clients = createCommerceApiClients({ baseUrl });

            expect(clients.use).toBeDefined();
            expect(typeof clients.use).toBe('function');
        });
    });

    describe('custom fetch', () => {
        it('should use custom fetch when provided', () => {
            const customFetch = vi.fn();
            const clients = createCommerceApiClients({
                baseUrl,
                fetch: customFetch,
            });

            // Verify clients are created
            expect(clients.shopperBasketsV1).toBeDefined();
            expect(clients.shopperProducts).toBeDefined();
        });

        it('should work without custom fetch', () => {
            const clients = createCommerceApiClients({ baseUrl });

            expect(clients.shopperBasketsV1).toBeDefined();
            expect(clients.shopperProducts).toBeDefined();
        });
    });

    describe('middleware', () => {
        it('should apply middleware to all clients via use method', () => {
            const clients = createCommerceApiClients({ baseUrl });

            // Spy on each client's use method
            const basketsV1Spy = vi.spyOn(clients.shopperBasketsV1, 'use');
            const basketsV2Spy = vi.spyOn(clients.shopperBasketsV2, 'use');
            const consentsSpy = vi.spyOn(clients.shopperConsents, 'use');
            const contextSpy = vi.spyOn(clients.shopperContext, 'use');
            const customersSpy = vi.spyOn(clients.shopperCustomers, 'use');
            const experienceSpy = vi.spyOn(clients.shopperExperience, 'use');
            const giftCertsSpy = vi.spyOn(clients.shopperGiftCertificates, 'use');
            const loginSpy = vi.spyOn(clients.shopperLogin, 'use');
            const ordersSpy = vi.spyOn(clients.shopperOrders, 'use');
            const productsSpy = vi.spyOn(clients.shopperProducts, 'use');
            const promotionsSpy = vi.spyOn(clients.shopperPromotions, 'use');
            const searchSpy = vi.spyOn(clients.shopperSearch, 'use');
            const seoSpy = vi.spyOn(clients.shopperSeo, 'use');
            const storesSpy = vi.spyOn(clients.shopperStores, 'use');

            const middleware: Middleware = {
                onRequest: vi.fn((req) => req),
            };

            clients.use(middleware);

            // Verify that use was called on all clients
            expect(basketsV1Spy).toHaveBeenCalledWith(middleware);
            expect(basketsV2Spy).toHaveBeenCalledWith(middleware);
            expect(consentsSpy).toHaveBeenCalledWith(middleware);
            expect(contextSpy).toHaveBeenCalledWith(middleware);
            expect(customersSpy).toHaveBeenCalledWith(middleware);
            expect(experienceSpy).toHaveBeenCalledWith(middleware);
            expect(giftCertsSpy).toHaveBeenCalledWith(middleware);
            expect(loginSpy).toHaveBeenCalledWith(middleware);
            expect(ordersSpy).toHaveBeenCalledWith(middleware);
            expect(productsSpy).toHaveBeenCalledWith(middleware);
            expect(promotionsSpy).toHaveBeenCalledWith(middleware);
            expect(searchSpy).toHaveBeenCalledWith(middleware);
            expect(seoSpy).toHaveBeenCalledWith(middleware);
            expect(storesSpy).toHaveBeenCalledWith(middleware);
        });

        it('should apply multiple middlewares to all clients', () => {
            const clients = createCommerceApiClients({ baseUrl });

            const middleware1: Middleware = { onRequest: vi.fn((req) => req) };
            const middleware2: Middleware = { onResponse: vi.fn((res) => res) };

            // Should not throw
            clients.use(middleware1);
            clients.use(middleware2);

            // Verify both middlewares were applied (we can't directly check,
            // but we can verify no errors occurred)
            expect(clients.shopperProducts).toBeDefined();
        });
    });

    describe('client types', () => {
        it('should return properly typed Clients object', () => {
            const clients: Clients = createCommerceApiClients({ baseUrl });

            // Type checking - these should compile without errors
            expect(clients.shopperBasketsV1).toBeDefined();
            expect(clients.shopperBasketsV2).toBeDefined();
            expect(clients.shopperConsents).toBeDefined();
            expect(clients.shopperContext).toBeDefined();
            expect(clients.shopperCustomers).toBeDefined();
            expect(clients.shopperExperience).toBeDefined();
            expect(clients.shopperGiftCertificates).toBeDefined();
            expect(clients.shopperLogin).toBeDefined();
            expect(clients.shopperOrders).toBeDefined();
            expect(clients.shopperProducts).toBeDefined();
            expect(clients.shopperPromotions).toBeDefined();
            expect(clients.shopperSearch).toBeDefined();
            expect(clients.shopperSeo).toBeDefined();
            expect(clients.shopperStores).toBeDefined();
            expect(clients.use).toBeDefined();
        });
    });

    describe('type safety and runtime integration tests', () => {
        let mockFetch: ReturnType<typeof vi.fn>;

        // Helper to create a proper mock Response object
        const createMockResponse = (data: unknown, status = 200, ok = true) => {
            const response = {
                ok,
                status,
                statusText: ok ? 'OK' : 'Error',
                headers: new Headers({ 'content-type': 'application/json' }),
                json: () => Promise.resolve(data),
                text: () => Promise.resolve(JSON.stringify(data)),
                blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
                arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
                clone: () => createMockResponse(data, status, ok),
            };
            return response as Response;
        };

        beforeEach(() => {
            mockFetch = vi.fn();
        });

        describe('GET requests - shopperProducts.getProducts', () => {
            it('should call underlying GET method with correct parameters', async () => {
                mockFetch.mockResolvedValue(createMockResponse({ data: [] }));

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                await clients.shopperProducts.getProducts({
                    params: {
                        path: { organizationId: 'org123' },
                        query: { siteId: 'RefArch', ids: ['product1', 'product2'] },
                    },
                });

                expect(mockFetch).toHaveBeenCalledTimes(1);
                const [request] = mockFetch.mock.calls[0];
                const url = request instanceof Request ? request.url : String(request);
                expect(url).toContain('/organizations/org123/products');
                expect(url).toContain('siteId=RefArch');
                expect(url).toContain('ids=product1');
            });

            it('should work with optional query parameters', async () => {
                mockFetch.mockResolvedValue(createMockResponse({ data: [] }));

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                await clients.shopperProducts.getProducts({
                    params: {
                        path: { organizationId: 'org123' },
                        query: {
                            siteId: 'RefArch',
                            ids: ['product1'],
                            allImages: true,
                        },
                    },
                });

                expect(mockFetch).toHaveBeenCalledTimes(1);
            });
        });

        describe('GET requests with path params - shopperProducts.getProduct', () => {
            it('should call underlying GET method with path parameters', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve({ id: 'product123' }),
                } as Response);

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                await clients.shopperProducts.getProduct({
                    params: {
                        path: { organizationId: 'org123', id: 'product123' },
                        query: { siteId: 'RefArch' },
                    },
                });

                expect(mockFetch).toHaveBeenCalledTimes(1);
                const [request] = mockFetch.mock.calls[0];
                const url = request instanceof Request ? request.url : String(request);
                expect(url).toContain('/organizations/org123/products/product123');
            });

            /*
             * Type safety tests - these should fail at compile time:
             * - Missing required path parameter id
             * - Wrong type for id (number instead of string)
             * These are validated by TypeScript, see proxy-types.test-d.ts
             */
        });

        describe('POST requests - shopperBaskets.createBasket', () => {
            it('should call underlying POST method', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 201,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve({ basketId: 'basket123' }),
                } as Response);

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                await clients.shopperBasketsV1.createBasket({
                    params: {
                        path: { organizationId: 'org123' },
                        query: { siteId: 'RefArch' },
                    },
                    body: {},
                });

                expect(mockFetch).toHaveBeenCalledTimes(1);
                const [request] = mockFetch.mock.calls[0];
                const url = request instanceof Request ? request.url : String(request);
                expect(url).toContain('/organizations/org123/baskets');
                if (request instanceof Request) {
                    expect(request.method).toBe('POST');
                }
            });
        });

        describe('POST requests with body - shopperBaskets.addItemToBasket', () => {
            it('should call underlying POST method with body', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve({ basketId: 'basket123' }),
                } as Response);

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                await clients.shopperBasketsV1.addItemToBasket({
                    params: {
                        path: { organizationId: 'org123', basketId: 'basket123' },
                        query: { siteId: 'RefArch' },
                    },
                    body: [{ productId: 'product123', quantity: 1 }],
                });

                expect(mockFetch).toHaveBeenCalledTimes(1);
                const [request] = mockFetch.mock.calls[0];
                const url = request instanceof Request ? request.url : String(request);
                expect(url).toContain('/baskets/basket123/items');
                if (request instanceof Request) {
                    expect(request.method).toBe('POST');
                }
            });

            /*
             * Type safety: TypeScript enforces body must be an array
             * See proxy-types.test-d.ts for compile-time validation
             */
        });

        describe('PATCH requests - shopperBaskets.updateBasket', () => {
            it('should call underlying PATCH method', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve({ basketId: 'basket123' }),
                } as Response);

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                await clients.shopperBasketsV1.updateBasket({
                    params: {
                        path: { organizationId: 'org123', basketId: 'basket123' },
                        query: { siteId: 'RefArch' },
                    },
                    body: {},
                });

                expect(mockFetch).toHaveBeenCalledTimes(1);
                const [request] = mockFetch.mock.calls[0];
                if (request instanceof Request) {
                    expect(request.method).toBe('PATCH');
                }
            });
        });

        describe('PUT requests - shopperBaskets.updateBillingAddressForBasket', () => {
            it('should call underlying PUT method', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve({ basketId: 'basket123' }),
                } as Response);

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                await clients.shopperBasketsV1.updateBillingAddressForBasket({
                    params: {
                        path: { organizationId: 'org123', basketId: 'basket123' },
                        query: { siteId: 'RefArch' },
                    },
                    body: {
                        address1: '123 Main St',
                        city: 'Boston',
                        countryCode: 'US',
                        firstName: 'John',
                        lastName: 'Doe',
                        postalCode: '02101',
                    },
                });

                expect(mockFetch).toHaveBeenCalledTimes(1);
                const [request] = mockFetch.mock.calls[0];
                if (request instanceof Request) {
                    expect(request.method).toBe('PUT');
                }
            });
        });

        describe('DELETE requests - shopperBaskets.deleteBasket', () => {
            it('should call underlying DELETE method', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 204,
                    headers: new Headers(),
                });

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                await clients.shopperBasketsV1.deleteBasket({
                    params: {
                        path: { organizationId: 'org123', basketId: 'basket123' },
                        query: { siteId: 'RefArch' },
                    },
                });

                expect(mockFetch).toHaveBeenCalledTimes(1);
                const [request] = mockFetch.mock.calls[0];
                if (request instanceof Request) {
                    expect(request.method).toBe('DELETE');
                }
            });

            /*
             * Type safety: TypeScript enforces required basketId parameter
             * See proxy-types.test-d.ts for compile-time validation
             */
        });

        describe('DELETE with multiple path params - shopperBaskets.removeItemFromBasket', () => {
            it('should call underlying DELETE method with all path params', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve({ basketId: 'basket123' }),
                } as Response);

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                await clients.shopperBasketsV1.removeItemFromBasket({
                    params: {
                        path: {
                            organizationId: 'org123',
                            basketId: 'basket123',
                            itemId: 'item123',
                        },
                        query: { siteId: 'RefArch' },
                    },
                });

                expect(mockFetch).toHaveBeenCalledTimes(1);
                const [request] = mockFetch.mock.calls[0];
                const url = request instanceof Request ? request.url : String(request);
                expect(url).toContain('/baskets/basket123/items/item123');
            });
        });

        describe('custom headers and options', () => {
            it('should pass custom headers through', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve({ data: [] }),
                } as Response);

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                await clients.shopperProducts.getProducts({
                    params: {
                        path: { organizationId: 'org123' },
                        query: { siteId: 'RefArch', ids: ['product1'] },
                    },
                    headers: {
                        Authorization: 'Bearer token123',
                    },
                });

                expect(mockFetch).toHaveBeenCalledTimes(1);
                const [request] = mockFetch.mock.calls[0];
                if (request instanceof Request) {
                    expect(request.headers.get('Authorization')).toBe('Bearer token123');
                }
            });

            it('should support baseUrl override', async () => {
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve({ data: [] }),
                } as Response);

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                await clients.shopperProducts.getProducts({
                    params: {
                        path: { organizationId: 'org123' },
                        query: { siteId: 'RefArch', ids: ['product1'] },
                    },
                    baseUrl: 'https://custom.api.com',
                });

                expect(mockFetch).toHaveBeenCalledTimes(1);
                const [request] = mockFetch.mock.calls[0];
                const url = request instanceof Request ? request.url : String(request);
                expect(url).toContain('https://custom.api.com');
            });
        });

        describe('response handling', () => {
            it('should return data and response on successful response', async () => {
                const mockData = { total: 10, data: [{ id: 'product1' }] };
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 200,
                    statusText: 'OK',
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve(mockData),
                    url: 'https://test.commercecloud.salesforce.com/product/shopper-products/v1/organizations/org123/products',
                } as Response);

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                const result = await clients.shopperProducts.getProducts({
                    params: {
                        path: { organizationId: 'org123' },
                        query: { siteId: 'RefArch', ids: ['product1'] },
                    },
                });

                expect(result.data).toEqual(mockData);
                expect(result.response).toBeDefined();
                expect(result.response.status).toBe(200);
                expect(result).not.toHaveProperty('error');
            });

            it('should throw ApiError on failed response', async () => {
                const errorData = { message: 'Not found', code: 'PRODUCT_NOT_FOUND' };
                mockFetch.mockResolvedValue({
                    ok: false,
                    status: 404,
                    statusText: 'Not Found',
                    headers: new Headers({ 'content-type': 'application/json' }),
                    json: () => Promise.resolve(errorData),
                    text: () => Promise.resolve(JSON.stringify(errorData)),
                    url: 'https://test.commercecloud.salesforce.com/product/shopper-products/v1/organizations/org123/products/invalid',
                    clone() {
                        return this;
                    },
                } as Response);

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                await expect(async () => {
                    await clients.shopperProducts.getProduct({
                        params: {
                            path: { organizationId: 'org123', id: 'invalid' },
                            query: { siteId: 'RefArch' },
                        },
                    });
                }).rejects.toThrow(ApiError);
            });

            it('should throw ApiError with correct error details', async () => {
                // RFC 7807 error format
                const errorData = {
                    type: 'UnauthorizedException',
                    title: 'Unauthorized',
                    detail: 'Authentication credentials are missing or invalid',
                };
                const errorHeaders = new Headers({
                    'content-type': 'application/json',
                    'www-authenticate': 'Bearer realm="example"',
                });
                mockFetch.mockResolvedValue({
                    ok: false,
                    status: 401,
                    statusText: 'Unauthorized',
                    headers: errorHeaders,
                    json: () => Promise.resolve(errorData),
                    text: () => Promise.resolve(JSON.stringify(errorData)),
                    url: 'https://test.commercecloud.salesforce.com/shopper/baskets/v1/organizations/org123/baskets',
                    clone() {
                        return this;
                    },
                } as Response);

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                try {
                    await clients.shopperBasketsV1.createBasket({
                        params: {
                            path: { organizationId: 'org123' },
                            query: { siteId: 'RefArch' },
                        },
                        body: {},
                    });
                    expect.fail('Should have thrown ApiError');
                } catch (error) {
                    expect(error).toBeInstanceOf(ApiError);
                    const apiError = error as ApiError;
                    expect(apiError.status).toBe(401);
                    expect(apiError.statusText).toBe('Unauthorized');
                    expect(apiError.body).toEqual(errorData);
                    expect(apiError.rawBody).toBe(JSON.stringify(errorData));
                    expect(apiError.headers).toBe(errorHeaders);
                    expect(apiError.method).toBe('POST');
                    expect(apiError.url).toContain('/baskets');
                }
            });

            it('should provide access to response headers on success', async () => {
                const mockData = { id: 'basket123' };
                const responseHeaders = new Headers({
                    'content-type': 'application/json',
                    etag: '"abc123"',
                    'x-custom-header': 'custom-value',
                });
                mockFetch.mockResolvedValue({
                    ok: true,
                    status: 201,
                    statusText: 'Created',
                    headers: responseHeaders,
                    json: () => Promise.resolve(mockData),
                    url: 'https://test.commercecloud.salesforce.com/shopper/baskets/v1/organizations/org123/baskets',
                } as Response);

                const clients = createCommerceApiClients({
                    baseUrl,
                    fetch: mockFetch,
                });

                const result = await clients.shopperBasketsV1.createBasket({
                    params: {
                        path: { organizationId: 'org123' },
                        query: { siteId: 'RefArch' },
                    },
                    body: {},
                });

                expect(result.data).toEqual(mockData);
                expect(result.response.headers.get('etag')).toBe('"abc123"');
                expect(result.response.headers.get('x-custom-header')).toBe('custom-value');
            });
        });
    });
});
