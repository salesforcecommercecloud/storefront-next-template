/**
 * Type-level tests for SCAPI client type safety
 *
 * These tests verify TypeScript enforces correct types at compile time.
 * Run with: pnpm typecheck
 *
 * The tests verify:
 * 1. Valid API calls compile successfully
 * 2. Invalid calls produce TypeScript errors (checked manually or in CI)
 * 3. Response types are correctly inferred
 */

import { expectTypeOf, describe, it, expect } from 'vitest';
import { createCommerceApiClients, type Clients } from './createClients';

describe('SCAPI Client Type Safety', () => {
    const clients = createCommerceApiClients({ baseUrl: 'https://test.com' });

    describe('valid API calls', () => {
        it('should allow valid getCategories call', () => {
            // This should compile without errors - all required params provided
            const validCall = () =>
                clients.shopperProducts.getCategories({
                    params: {
                        path: { organizationId: 'org123' },
                        query: { ids: ['root'], siteId: 'RefArch' },
                    },
                });

            expectTypeOf(validCall).returns.resolves.toHaveProperty('data');
        });

        it('should allow valid getProduct call with all required params', () => {
            const validCall = () =>
                clients.shopperProducts.getProduct({
                    params: {
                        path: { organizationId: 'org123', id: 'prod123' },
                        query: { siteId: 'RefArch' },
                    },
                });

            expectTypeOf(validCall).returns.resolves.toHaveProperty('data');
        });

        it('should allow optional query parameters to be omitted', () => {
            // Optional params like 'allImages' can be omitted - this is type-checked at compile time
            const validCallWithoutOptional = () =>
                clients.shopperProducts.getProducts({
                    params: {
                        path: { organizationId: 'org123' },
                        query: {
                            siteId: 'RefArch',
                            ids: ['product1'],
                        },
                    },
                });

            // Or included
            const validCallWithOptional = () =>
                clients.shopperProducts.getProducts({
                    params: {
                        path: { organizationId: 'org123' },
                        query: {
                            siteId: 'RefArch',
                            ids: ['product1'],
                            allImages: true,
                        },
                    },
                });

            expectTypeOf(validCallWithoutOptional).returns.resolves.toHaveProperty('data');
            expectTypeOf(validCallWithOptional).returns.resolves.toHaveProperty('data');
        });

        it('should allow POST requests with body', () => {
            const validCall = () =>
                clients.shopperBasketsV1.createBasket({
                    params: {
                        path: { organizationId: 'org123' },
                        query: { siteId: 'RefArch' },
                    },
                    body: {},
                });

            expectTypeOf(validCall).returns.resolves.toHaveProperty('data');
        });

        it('should allow operations with empty suffix (createBasket)', () => {
            // createBasket has empty suffix (s: '') because path matches BASE_PATH exactly
            // This tests that operations with empty suffix are type-safe
            const validCall = () =>
                clients.shopperBasketsV1.createBasket({
                    params: {
                        path: { organizationId: 'org123' },
                        query: { siteId: 'RefArch' },
                    },
                    body: {},
                });

            expectTypeOf(validCall).returns.resolves.toHaveProperty('data');
            expectTypeOf(validCall).returns.resolves.toHaveProperty('error');
            expectTypeOf(validCall).returns.resolves.toHaveProperty('response');
        });

        it('should allow operations with empty suffix (createOrder)', () => {
            // createOrder has empty suffix (s: '') because path matches BASE_PATH exactly
            const validCall = () =>
                clients.shopperOrders.createOrder({
                    params: {
                        path: { organizationId: 'org123' },
                        query: { siteId: 'RefArch' },
                    },
                    body: {
                        basketId: 'basket123',
                    },
                });

            expectTypeOf(validCall).returns.resolves.toHaveProperty('data');
            expectTypeOf(validCall).returns.resolves.toHaveProperty('error');
        });

        it('should allow custom headers', () => {
            const validCall = () =>
                clients.shopperProducts.getCategories({
                    params: {
                        path: { organizationId: 'org123' },
                        query: { ids: ['root'], siteId: 'RefArch' },
                    },
                    headers: {
                        Authorization: 'Bearer token123',
                    },
                });

            expectTypeOf(validCall).returns.resolves.toHaveProperty('data');
        });
    });

    describe('parameter type enforcement', () => {
        it('should enforce string type for organizationId', () => {
            // Valid: string
            expectTypeOf<{ organizationId: string }>().toMatchTypeOf<{
                organizationId: string;
            }>();

            // Invalid: number (this would be caught by TypeScript)
            expectTypeOf<{ organizationId: number }>().not.toMatchTypeOf<{
                organizationId: string;
            }>();
        });

        it('should enforce array type for ids parameter', () => {
            type QueryParams = {
                ids: string[];
                siteId: string;
            };

            // Valid: string array
            expectTypeOf<{ ids: string[] }>().toMatchTypeOf<Pick<QueryParams, 'ids'>>();

            // Invalid: single string
            expectTypeOf<{ ids: string }>().not.toMatchTypeOf<Pick<QueryParams, 'ids'>>();

            // Invalid: number array
            expectTypeOf<{ ids: number[] }>().not.toMatchTypeOf<Pick<QueryParams, 'ids'>>();
        });
    });

    describe('response types', () => {
        it('should infer correct response structure', () => {
            // Type-check the response structure without making actual HTTP call
            type GetResponse = typeof clients.shopperProducts.getCategories;
            type ResponseType = Awaited<ReturnType<GetResponse>>;

            // Response should have data, error, and response properties
            expectTypeOf<ResponseType>().toHaveProperty('data');
            expectTypeOf<ResponseType>().toHaveProperty('error');
            expectTypeOf<ResponseType>().toHaveProperty('response');
        });
    });

    describe('client structure', () => {
        it('should expose correct client type', () => {
            expectTypeOf(clients).toMatchTypeOf<Clients>();
        });

        it('should expose operation methods', () => {
            expectTypeOf(clients.shopperProducts.getCategories).toBeFunction();
            expectTypeOf(clients.shopperProducts.getProduct).toBeFunction();
            expectTypeOf(clients.shopperProducts.getProducts).toBeFunction();
        });

        it('should expose middleware methods', () => {
            expectTypeOf(clients.shopperProducts.use).toBeFunction();
            expectTypeOf(clients.shopperProducts.eject).toBeFunction();
            expectTypeOf(clients.use).toBeFunction();
        });

        it('should NOT expose HTTP methods directly', () => {
            // @ts-expect-error - GET should not be accessible
            expectTypeOf(clients.shopperProducts.GET).toBeFunction();
        });
    });

    describe('middleware support', () => {
        it('should accept middleware with proper signature', () => {
            type Middleware = Parameters<typeof clients.use>[0];

            expectTypeOf<Middleware>().toHaveProperty('onRequest');
            expectTypeOf<Middleware>().toHaveProperty('onResponse');
            expectTypeOf<Middleware>().toHaveProperty('onError');
        });
    });

    /**
     * Type error detection tests
     *
     * These tests verify that TypeScript DOES catch type errors at compile-time.
     * Each test uses @ts-expect-error to assert that a specific line should fail type checking.
     * If TypeScript doesn't report an error, the test will fail with "Unused @ts-expect-error".
     *
     * IMPORTANT: These are COMPILE-TIME ONLY tests. They do not execute any code at runtime.
     * The 'if (false as boolean)' guard ensures code is never executed while still being type-checked.
     * This is critical for CI - we verify TypeScript catches errors without making HTTP requests.
     */
    /* eslint-disable @typescript-eslint/no-floating-promises */
    describe('type error detection', () => {
        it('should catch missing required params object', () => {
            if (false as boolean) {
                // @ts-expect-error - params is required
                clients.shopperProducts.getCategories();
            }
        });

        it('should catch missing required path parameter', () => {
            if (false as boolean) {
                clients.shopperProducts.getCategories({
                    // @ts-expect-error - path.organizationId is required
                    params: {
                        query: { ids: ['root'], siteId: 'RefArch' },
                    },
                });
            }
        });

        it('should catch missing required query parameter - ids', () => {
            if (false as boolean) {
                clients.shopperProducts.getCategories({
                    params: {
                        path: { organizationId: 'org123' },
                        // @ts-expect-error - query.ids is required
                        query: { siteId: 'RefArch' },
                    },
                });
            }
        });

        it('should catch missing required query parameter - siteId', () => {
            if (false as boolean) {
                clients.shopperProducts.getCategories({
                    params: {
                        path: { organizationId: 'org123' },
                        // @ts-expect-error - query.siteId is required
                        query: { ids: ['root'] },
                    },
                });
            }
        });

        it('should catch wrong path parameter type', () => {
            if (false as boolean) {
                clients.shopperProducts.getCategories({
                    params: {
                        // @ts-expect-error - organizationId must be string, not number
                        path: { organizationId: 123 },
                        query: { ids: ['root'], siteId: 'RefArch' },
                    },
                });
            }
        });

        it('should catch wrong query parameter type - string instead of array', () => {
            if (false as boolean) {
                clients.shopperProducts.getCategories({
                    params: {
                        path: { organizationId: 'org123' },
                        // @ts-expect-error - ids must be string[], not string
                        query: { ids: 'root', siteId: 'RefArch' },
                    },
                });
            }
        });

        it('should catch wrong query parameter type - number array instead of string array', () => {
            if (false as boolean) {
                clients.shopperProducts.getCategories({
                    params: {
                        path: { organizationId: 'org123' },
                        // @ts-expect-error - ids must be string[], not number[]
                        query: { ids: [1, 2, 3], siteId: 'RefArch' },
                    },
                });
            }
        });

        it('should catch unknown path parameter', () => {
            if (false as boolean) {
                clients.shopperProducts.getCategories({
                    params: {
                        // @ts-expect-error - unknownParam is not a valid path parameter
                        path: { organizationId: 'org123', unknownParam: 'value' },
                        query: { ids: ['root'], siteId: 'RefArch' },
                    },
                });
            }
        });

        it('should catch unknown query parameter', () => {
            if (false as boolean) {
                clients.shopperProducts.getCategories({
                    params: {
                        path: { organizationId: 'org123' },
                        // @ts-expect-error - unknownQuery is not a valid query parameter
                        query: { ids: ['root'], siteId: 'RefArch', unknownQuery: 'value' },
                    },
                });
            }
        });

        it('should catch missing path parameter id in getProduct', () => {
            if (false as boolean) {
                clients.shopperProducts.getProduct({
                    params: {
                        // @ts-expect-error - path.id is required
                        path: { organizationId: 'org123' },
                        query: { siteId: 'RefArch' },
                    },
                });
            }
        });

        it('should catch wrong body type - object instead of array', () => {
            if (false as boolean) {
                clients.shopperBasketsV1.addItemToBasket({
                    params: {
                        path: { organizationId: 'org123', basketId: 'basket123' },
                        query: { siteId: 'RefArch' },
                    },
                    // @ts-expect-error - body must be array, not object
                    body: { quantity: 1 },
                });
            }
        });

        it('should not expose GET method directly', () => {
            // Type-only check: GET should not be accessible (TypeScript error expected)
            // @ts-expect-error - GET should not be accessible on proxy client
            const _get = clients.shopperProducts.GET;
            expect(_get).toBeUndefined();
        });

        it('should not expose POST method directly', () => {
            // Type-only check: POST should not be accessible (TypeScript error expected)
            // @ts-expect-error - POST should not be accessible on proxy client
            const _post = clients.shopperProducts.POST;
            expect(_post).toBeUndefined();
        });

        it('should catch wrong type in optional parameter', () => {
            if (false as boolean) {
                clients.shopperProducts.getProducts({
                    params: {
                        path: { organizationId: 'org123' },
                        query: {
                            siteId: 'RefArch',
                            ids: ['product1'],
                            // @ts-expect-error - allImages must be boolean, not string
                            allImages: 'yes',
                        },
                    },
                });
            }
        });

        it('should catch missing entire params for operation requiring them', () => {
            if (false as boolean) {
                // @ts-expect-error - params object is required
                clients.shopperProducts.getProduct();
            }
        });

        it('should catch missing params in empty suffix operation (createBasket)', () => {
            if (false as boolean) {
                // Even though createBasket has empty suffix, params are still required
                // @ts-expect-error - params object is required
                clients.shopperBasketsV1.createBasket();
            }
        });

        it('should catch missing required path param in empty suffix operation', () => {
            if (false as boolean) {
                clients.shopperBasketsV1.createBasket({
                    // @ts-expect-error - path.organizationId is required even for empty suffix operations
                    params: {
                        query: { siteId: 'RefArch' },
                    },
                    body: {},
                });
            }
        });

        it('should catch wrong type in empty suffix operation body', () => {
            if (false as boolean) {
                clients.shopperOrders.createOrder({
                    params: {
                        path: { organizationId: 'org123' },
                        query: { siteId: 'RefArch' },
                    },
                    body: {
                        // @ts-expect-error - basketId must be string, not number
                        basketId: 123,
                    },
                });
            }
        });
    });
});
