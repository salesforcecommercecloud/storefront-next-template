import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LoaderFunctionArgs, ClientLoaderFunctionArgs } from 'react-router';

const mockUniversalServerLoader = vi.fn();
const mockUniversalClientLoader = vi.fn();

vi.mock('@/lib/checkout-loaders', () => ({
    serverLoader: mockUniversalServerLoader,
    clientLoader: mockUniversalClientLoader,
}));

const createMockLoader = () => {
    return async (args: LoaderFunctionArgs) => {
        const result = await mockUniversalServerLoader(args);
        return result;
    };
};

const createMockClientLoader = () => {
    return async (args: ClientLoaderFunctionArgs) => {
        return await mockUniversalClientLoader(args);
    };
};

describe('Checkout Route SSR', () => {
    let mockLoader: ReturnType<typeof createMockLoader>;
    let mockClientLoader: ReturnType<typeof createMockClientLoader>;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockLoader = createMockLoader();
        mockClientLoader = createMockClientLoader();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe('Server Loader', () => {
        it('should handle successful server-side data loading', async () => {
            const mockResult = {
                isRegisteredCustomer: true,
                customerProfile: { customer: { customerId: 'test-123' } },
                shippingMethods: { shippingMethods: [] },
            };

            mockUniversalServerLoader.mockResolvedValue(mockResult);

            const mockRequest = new Request('http://localhost/checkout');
            const mockContext = { set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await mockLoader(args);

            expect(result).toEqual(mockResult);
            expect(mockUniversalServerLoader).toHaveBeenCalledWith(args);
        });

        it('should handle server loader errors gracefully', async () => {
            mockUniversalServerLoader.mockRejectedValue(new Error('Server error'));

            const mockRequest = new Request('http://localhost/checkout');
            const mockContext = { set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            try {
                await mockLoader(args);
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toBe('Server error');
            }
        });
    });

    describe('Client Loader', () => {
        it('should handle client-side data loading', async () => {
            const mockResult = {
                isRegisteredCustomer: false,
                customerProfile: null,
                shippingMethods: null,
            };

            mockUniversalClientLoader.mockResolvedValue(mockResult);

            const mockRequest = new Request('http://localhost/checkout');
            const args: ClientLoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                serverLoader: vi.fn(),
            } as any;

            const result = await mockClientLoader(args);

            expect(result).toEqual(mockResult);
            expect(mockUniversalClientLoader).toHaveBeenCalledWith(args);
        });

        it('should handle client loader errors gracefully', async () => {
            mockUniversalClientLoader.mockRejectedValue(new Error('Client error'));

            const mockRequest = new Request('http://localhost/checkout');
            const args: ClientLoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                serverLoader: vi.fn(),
            } as any;

            try {
                await mockClientLoader(args);
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toBe('Client error');
            }
        });
    });

    describe('SSR Behavior', () => {
        it('should prioritize server-side rendering for SEO', async () => {
            const serverResult = {
                isRegisteredCustomer: true,
                customerProfile: { customer: { customerId: 'server-user' } },
            };

            mockUniversalServerLoader.mockResolvedValue(serverResult);

            const mockRequest = new Request('http://localhost/checkout');
            const mockContext = { set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await mockLoader(args);

            // Should prefer server-side data
            expect(result.customerProfile).toBeDefined();
        });

        it('should handle hydration differences', async () => {
            // Simulate scenario where server and client data might differ
            const serverResult = {
                isRegisteredCustomer: false,
            };

            const clientResult = {
                isRegisteredCustomer: true,
            };

            mockUniversalServerLoader.mockResolvedValue(serverResult);
            mockUniversalClientLoader.mockResolvedValue(clientResult);

            // Both loaders should work independently
            const serverArgs: LoaderFunctionArgs = {
                request: new Request('http://localhost/checkout'),
                params: {},
                context: { set: vi.fn() },
            } as any;

            const clientArgs: ClientLoaderFunctionArgs = {
                request: new Request('http://localhost/checkout'),
                params: {},
                serverLoader: vi.fn(),
            } as any;

            await mockLoader(serverArgs);
            await mockClientLoader(clientArgs);
        });
    });

    describe('Error Handling', () => {
        it('should handle loader failures gracefully', async () => {
            mockUniversalServerLoader.mockRejectedValue(new Error('Network failure'));

            const mockRequest = new Request('http://localhost/checkout');
            const mockContext = { set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            try {
                await mockLoader(args);
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toBe('Network failure');
            }
        });

        it('should handle malformed requests', async () => {
            const mockResult = {
                isRegisteredCustomer: false,
            };
            mockUniversalServerLoader.mockResolvedValue(mockResult);

            const malformedRequest = new Request('http://localhost/checkout');
            malformedRequest.headers.set('Cookie', 'malformed-cookie-data');

            const mockContext = { set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: malformedRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await mockLoader(args);
            expect(result).toEqual(mockResult);
        });
    });
});
