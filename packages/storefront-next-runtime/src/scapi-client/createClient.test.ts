import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from './createClient';
import type { Client } from 'openapi-fetch';
import type { OperationMap } from './proxy-types';

// Mock client type for testing
type MockPaths = {
    '/test/{id}': {
        get: {
            parameters: {
                path: { id: string };
                query?: { filter?: string };
            };
            responses: {
                200: { content: { 'application/json': { data: string } } };
            };
        };
        post: {
            parameters: {
                path: { id: string };
            };
            requestBody: {
                content: { 'application/json': { value: number } };
            };
            responses: {
                201: { content: { 'application/json': { created: boolean } } };
            };
        };
    };
    '/users': {
        get: {
            responses: {
                200: { content: { 'application/json': { users: string[] } } };
            };
        };
    };
    '/test': {
        get: {
            responses: {
                200: { content: { 'application/json': { success: boolean } } };
            };
        };
        post: {
            responses: {
                201: { content: { 'application/json': { success: boolean } } };
            };
        };
        put: {
            responses: {
                200: { content: { 'application/json': { success: boolean } } };
            };
        };
        patch: {
            responses: {
                200: { content: { 'application/json': { success: boolean } } };
            };
        };
        delete: {
            responses: {
                204: never;
            };
        };
    };
};

describe('createClient', () => {
    let mockClient: Client<MockPaths>;
    let mockOperations: OperationMap;

    beforeEach(() => {
        // Create a mock client with HTTP methods that return resolved promises
        mockClient = {
            GET: vi.fn().mockResolvedValue({ data: null, error: undefined, response: {} }),
            POST: vi.fn().mockResolvedValue({ data: null, error: undefined, response: {} }),
            PUT: vi.fn().mockResolvedValue({ data: null, error: undefined, response: {} }),
            PATCH: vi.fn().mockResolvedValue({ data: null, error: undefined, response: {} }),
            DELETE: vi.fn().mockResolvedValue({ data: null, error: undefined, response: {} }),
            HEAD: vi.fn().mockResolvedValue({ data: null, error: undefined, response: {} }),
            OPTIONS: vi.fn().mockResolvedValue({ data: null, error: undefined, response: {} }),
            TRACE: vi.fn().mockResolvedValue({ data: null, error: undefined, response: {} }),
            use: vi.fn(),
            eject: vi.fn(),
        } as any;

        // Define mock operations with abbreviated keys (m, b, s)
        const BASE_PATH = '/api/v1' as const;
        mockOperations = {
            getTest: { m: 'GET', b: BASE_PATH, s: '/test/{id}' },
            createTest: { m: 'POST', b: BASE_PATH, s: '/test/{id}' },
            listUsers: { m: 'GET', b: BASE_PATH, s: '/users' },
        };
    });

    describe('operation method calls', () => {
        it('should proxy GET operation to client.GET with correct path', async () => {
            const proxyClient = createClient(mockClient, mockOperations) as any;
            const options = {
                params: { path: { id: '123' }, query: { filter: 'active' } },
            };

            await proxyClient.getTest(options);

            expect(mockClient.GET).toHaveBeenCalledWith('/api/v1/test/{id}', options);
        });

        it('should proxy POST operation to client.POST with correct path', async () => {
            const proxyClient = createClient(mockClient, mockOperations) as any;
            const options = {
                params: { path: { id: '123' } },
                body: { value: 42 },
            };

            await proxyClient.createTest(options);

            expect(mockClient.POST).toHaveBeenCalledWith('/api/v1/test/{id}', options);
        });

        it('should handle operations without parameters', async () => {
            const proxyClient = createClient(mockClient, mockOperations) as any;

            await proxyClient.listUsers();

            expect(mockClient.GET).toHaveBeenCalledWith('/api/v1/users');
        });

        it('should pass through multiple arguments to the HTTP method', async () => {
            const proxyClient = createClient(mockClient, mockOperations) as any;
            const options = { params: { path: { id: '123' } } };

            await proxyClient.getTest(options);

            expect(mockClient.GET).toHaveBeenCalledWith('/api/v1/test/{id}', options);
        });
    });

    describe('middleware methods', () => {
        it('should pass through the use method', () => {
            const proxyClient = createClient(mockClient, mockOperations);
            const middleware = { onRequest: vi.fn() };

            proxyClient.use(middleware);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockClient.use).toHaveBeenCalledWith(middleware);
        });

        it('should pass through the eject method', () => {
            const proxyClient = createClient(mockClient, mockOperations);
            const middleware = { onRequest: vi.fn() };

            proxyClient.eject(middleware);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockClient.eject).toHaveBeenCalledWith(middleware);
        });

        it('should bind middleware methods to the original client', () => {
            const proxyClient = createClient(mockClient, mockOperations);

            // Access the method
            const useMethod = proxyClient.use;

            // Calling the method should still work
            const middleware = { onRequest: vi.fn() };
            useMethod(middleware);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(mockClient.use).toHaveBeenCalledWith(middleware);
        });
    });

    describe('property access', () => {
        it('should return undefined for non-operation and non-middleware properties', () => {
            const proxyClient = createClient(mockClient, mockOperations);

            expect((proxyClient as any).GET).toBeUndefined();
            expect((proxyClient as any).POST).toBeUndefined();
            expect((proxyClient as any).unknownMethod).toBeUndefined();
        });
    });

    describe('error handling', () => {
        it('should throw error when HTTP method does not exist on client', () => {
            // Create a mock operation with an unsupported HTTP method
            const BASE = '/api' as const;
            const badOperations = {
                customMethod: { m: 'CUSTOM', b: BASE, s: '/test' },
            };

            const proxyClient = createClient(mockClient, badOperations as unknown as OperationMap) as any;

            expect(() => {
                proxyClient.customMethod();
            }).toThrow('Client method CUSTOM not found');
        });
    });

    describe('method context binding', () => {
        it('should call HTTP methods with correct context', async () => {
            let capturedThis: unknown;
            const clientWithContext = {
                ...mockClient,
                GET: vi.fn(function (this: unknown) {
                    // eslint-disable-next-line @typescript-eslint/no-this-alias
                    capturedThis = this;
                }),
            } as unknown as Client<MockPaths>;

            const proxyClient = createClient(clientWithContext, mockOperations) as any;
            await proxyClient.getTest({ params: { path: { id: '123' } } });

            // The context should be the original client
            expect(capturedThis).toBe(clientWithContext);
        });
    });

    describe('with different operation types', () => {
        it('should handle operations with all HTTP methods', async () => {
            const BASE = '/api' as const;
            const allMethodsOperations: OperationMap = {
                getOp: { m: 'GET', b: BASE, s: '/test' },
                postOp: { m: 'POST', b: BASE, s: '/test' },
                putOp: { m: 'PUT', b: BASE, s: '/test' },
                patchOp: { m: 'PATCH', b: BASE, s: '/test' },
                deleteOp: { m: 'DELETE', b: BASE, s: '/test' },
            };

            const proxyClient = createClient(mockClient, allMethodsOperations);

            await (proxyClient as any).getOp();
            await (proxyClient as any).postOp();
            await (proxyClient as any).putOp();
            await (proxyClient as any).patchOp();
            await (proxyClient as any).deleteOp();

            expect(mockClient.GET).toHaveBeenCalledWith('/api/test');
            expect(mockClient.POST).toHaveBeenCalledWith('/api/test');
            expect(mockClient.PUT).toHaveBeenCalledWith('/api/test');
            expect(mockClient.PATCH).toHaveBeenCalledWith('/api/test');
            expect(mockClient.DELETE).toHaveBeenCalledWith('/api/test');
        });

        it('should handle case-insensitive HTTP method names', async () => {
            const BASE = '/api' as const;
            const lowerCaseOps: OperationMap = {
                getOp: { m: 'get', b: BASE, s: '/test' },
                postOp: { m: 'post', b: BASE, s: '/test' },
            };

            const proxyClient = createClient(mockClient, lowerCaseOps);

            await (proxyClient as any).getOp();
            await (proxyClient as any).postOp();

            expect(mockClient.GET).toHaveBeenCalledWith('/api/test');
            expect(mockClient.POST).toHaveBeenCalledWith('/api/test');
        });
    });
});
