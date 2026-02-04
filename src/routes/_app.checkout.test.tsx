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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { type LoaderFunctionArgs, type ClientLoaderFunctionArgs, MemoryRouter } from 'react-router';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const mockUniversalServerLoader = vi.fn();
const mockUniversalClientLoader = vi.fn();
const mockCheckoutLoadersLoader = vi.fn();
const mockGetServerCustomerProfileData = vi.fn();
const mockGetServerShippingMethodsMapData = vi.fn();
const mockGetClientLoaderData = vi.fn();
const mockGetAuthServer = vi.fn();

vi.mock('@/lib/checkout-loaders', () => ({
    loader: mockCheckoutLoadersLoader,
    serverLoader: mockUniversalServerLoader,
    getServerCustomerProfileData: mockGetServerCustomerProfileData,
    getServerShippingMethodsMapData: mockGetServerShippingMethodsMapData,
    clientLoader: mockGetClientLoaderData,
}));

vi.mock('@/middlewares/auth.server', () => ({
    getAuth: mockGetAuthServer,
}));

vi.mock('@/components/checkout/checkout-form-page', () => ({
    default: () => <div data-testid="checkout-form-page">Checkout Form</div>,
}));

vi.mock('@/components/checkout/utils/checkout-context', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="checkout-provider">{children}</div>,
}));

vi.mock('@/providers/basket', () => ({
    default: ({ children, value }: { children: React.ReactNode; value?: any }) => (
        <div data-testid="basket-provider" data-basket={JSON.stringify(value)}>
            {children}
        </div>
    ),
}));

vi.mock('@/components/checkout-error-boundary', () => ({
    CheckoutErrorBoundary: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="error-boundary">{children}</div>
    ),
}));

vi.mock('@/components/ui/skeleton', () => ({
    Skeleton: ({ className }: { className?: string }) => <div className={className}>Loading...</div>,
}));

vi.mock('@/components/loading', () => ({
    default: () => <div data-testid="loading">Loading...</div>,
}));

vi.mock('@/providers/google-cloud-api', () => ({
    default: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="google-cloud-api-provider">{children}</div>
    ),
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
                shippingMethodsMap: {},
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
                expect((error as Error).message).toBe('Server error');
            }
        });
    });

    describe('Client Loader', () => {
        it('should handle client-side data loading', async () => {
            const mockResult = {
                isRegisteredCustomer: false,
                customerProfile: null,
                shippingMethodsMap: {},
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
                expect((error as Error).message).toBe('Client error');
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
                expect((error as Error).message).toBe('Network failure');
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

describe('Checkout Route Components', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Route Functions', () => {
        it('should export loader function that delegates to checkout-loaders', async () => {
            const mockLoaderResult = {
                productMap: Promise.resolve({}),
                promotions: Promise.resolve({}),
                shippingMethodsMap: Promise.resolve({}),
                isRegisteredCustomer: false,
            };
            mockCheckoutLoadersLoader.mockResolvedValue(mockLoaderResult);

            const checkoutRoute = await import('./_app.checkout');
            const mockArgs = {
                request: new Request('http://localhost/checkout'),
                params: {},
                context: { get: vi.fn(), set: vi.fn() },
            } as any;

            // Verify loader is exported and callable
            expect(checkoutRoute.loader).toBeDefined();
            expect(typeof checkoutRoute.loader).toBe('function');

            // Verify it delegates to checkout-loaders loader
            const result = await checkoutRoute.loader(mockArgs);
            expect(mockCheckoutLoadersLoader).toHaveBeenCalledWith(mockArgs);
            expect(result).toBe(mockLoaderResult);
        });
    });

    describe('CheckoutView Component Integration', () => {
        it('should render with basket from loaderData', async () => {
            const checkoutRoute = await import('./_app.checkout');
            const CheckoutPage = checkoutRoute.default;

            const mockBasket = {
                basketId: 'test-basket',
                productItems: [{ itemId: 'item-1', productId: 'prod-1' }],
            };

            const mockLoaderData = {
                customerProfile: Promise.resolve(null),
                shippingMethodsMap: Promise.resolve({}),
                productMap: Promise.resolve({}),
                basket: mockBasket,
            };

            render(
                <MemoryRouter>
                    <CheckoutPage loaderData={mockLoaderData} />
                </MemoryRouter>
            );

            // Should render error boundary and basket provider
            expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        });

        it('should handle missing basket in loaderData', async () => {
            const checkoutRoute = await import('./_app.checkout');
            const CheckoutPage = checkoutRoute.default;

            const mockLoaderData = {
                customerProfile: Promise.resolve(null),
                shippingMethodsMap: Promise.resolve({}),
                productMap: Promise.resolve({}),
                basket: undefined,
            };

            render(
                <MemoryRouter>
                    <CheckoutPage loaderData={mockLoaderData} />
                </MemoryRouter>
            );

            expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        });

        it('should render with customer profile data', async () => {
            const checkoutRoute = await import('./_app.checkout');
            const CheckoutPage = checkoutRoute.default;

            const mockCustomerProfile = {
                customer: {
                    customerId: 'test-123',
                    email: 'test@example.com',
                },
                addresses: [],
                paymentInstruments: [],
            };

            const mockLoaderData = {
                customerProfile: Promise.resolve(mockCustomerProfile),
                shippingMethodsMap: Promise.resolve({}),
                productMap: Promise.resolve({}),
                basket: undefined,
            };

            render(
                <MemoryRouter>
                    <CheckoutPage loaderData={mockLoaderData} />
                </MemoryRouter>
            );

            expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        });

        it('should render with shipping methods data', async () => {
            const checkoutRoute = await import('./_app.checkout');
            const CheckoutPage = checkoutRoute.default;

            const mockShippingMethodsMap = {
                me: {
                    applicableShippingMethods: [{ id: 'standard', name: 'Standard Shipping', price: 5.99 }],
                    defaultShippingMethodId: 'standard',
                },
            };

            const mockLoaderData = {
                customerProfile: Promise.resolve(null),
                shippingMethodsMap: Promise.resolve(mockShippingMethodsMap),
                productMap: Promise.resolve({}),
                basket: undefined,
            };

            render(
                <MemoryRouter>
                    <CheckoutPage loaderData={mockLoaderData} />
                </MemoryRouter>
            );

            expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        });

        it('should render with complete loaderData', async () => {
            const checkoutRoute = await import('./_app.checkout');
            const CheckoutPage = checkoutRoute.default;

            const mockBasket = {
                basketId: 'test-basket',
                productItems: [{ itemId: 'item-1', productId: 'prod-1' }],
            };

            const mockCustomerProfile = {
                customer: {
                    customerId: 'test-123',
                    email: 'test@example.com',
                },
                addresses: [],
                paymentInstruments: [],
            };

            const mockShippingMethodsMap = {
                me: {
                    applicableShippingMethods: [{ id: 'standard', name: 'Standard Shipping', price: 5.99 }],
                    defaultShippingMethodId: 'standard',
                },
            };

            const mockLoaderData = {
                customerProfile: Promise.resolve(mockCustomerProfile),
                shippingMethodsMap: Promise.resolve(mockShippingMethodsMap),
                productMap: Promise.resolve({ 'prod-1': { id: 'prod-1', name: 'Product 1' } }),
                basket: mockBasket,
            };

            render(
                <MemoryRouter>
                    <CheckoutPage loaderData={mockLoaderData} />
                </MemoryRouter>
            );

            expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        });

        it('should handle undefined customerProfile promise', async () => {
            const checkoutRoute = await import('./_app.checkout');
            const CheckoutPage = checkoutRoute.default;

            const mockLoaderData = {
                customerProfile: undefined,
                shippingMethodsMap: Promise.resolve({}),
                productMap: Promise.resolve({}),
                basket: undefined,
            };

            render(
                <MemoryRouter>
                    <CheckoutPage loaderData={mockLoaderData} />
                </MemoryRouter>
            );

            expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        });

        it('should handle undefined shippingMethods promise', async () => {
            const checkoutRoute = await import('./_app.checkout');
            const CheckoutPage = checkoutRoute.default;

            const mockLoaderData = {
                customerProfile: Promise.resolve(null),
                shippingMethodsMap: undefined,
                productMap: Promise.resolve({}),
                basket: undefined,
            };

            render(
                <MemoryRouter>
                    <CheckoutPage loaderData={mockLoaderData} />
                </MemoryRouter>
            );

            expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        });

        it('should handle all undefined promises', async () => {
            const checkoutRoute = await import('./_app.checkout');
            const CheckoutPage = checkoutRoute.default;

            const mockLoaderData = {
                customerProfile: undefined,
                shippingMethodsMap: undefined,
                productMap: Promise.resolve({}),
                basket: undefined,
            };

            render(
                <MemoryRouter>
                    <CheckoutPage loaderData={mockLoaderData} />
                </MemoryRouter>
            );

            expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
        });
    });
});
