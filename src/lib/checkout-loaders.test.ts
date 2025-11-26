import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ClientLoaderFunctionArgs } from 'react-router';

// Mock the middleware functions
vi.mock('@/middlewares/auth.client', () => ({
    getAuth: vi.fn(),
}));

vi.mock('@/middlewares/basket.client', () => ({
    getBasket: vi.fn(),
}));

vi.mock('@/lib/api/customer', () => ({
    getCustomerProfileForCheckout: vi.fn(),
    isRegisteredCustomer: vi.fn(),
}));

vi.mock('@/lib/api/shipping-methods', () => ({
    getShippingMethodsForShipment: vi.fn(),
}));

vi.mock('@/components/checkout/utils/checkout-utils', () => {
    return {
        shouldPrefillBasket: vi.fn(() => false),
        initializeBasketForReturningCustomer: vi.fn((_context, profile) =>
            Promise.resolve({
                basketId: 'prefilled-basket-123',
                shipments: [{ shippingAddress: { address1: 'Prefilled Address' } }],
                customerInfo: { email: profile.customer.login },
            })
        ),
    };
});

vi.mock('@/lib/checkout-server-utils', () => ({
    fetchProductsInBasket: vi.fn(() => Promise.resolve({})),
}));

import { clientLoader } from './checkout-loaders';

describe('Checkout Loaders', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('clientLoader', () => {
        it('should return correct data structure for registered customer with profile', async () => {
            const { getBasket } = await import('@/middlewares/basket.client');
            const { getAuth: getAuthClient } = await import('@/middlewares/auth.client');
            const { isRegisteredCustomer, getCustomerProfileForCheckout } = await import('@/lib/api/customer');
            const { getShippingMethodsForShipment } = await import('@/lib/api/shipping-methods');

            vi.mocked(getBasket).mockReturnValue({
                basketId: 'test-basket-123',
                shipments: [{ shippingAddress: { address1: '123 Main St' } }],
            } as any);

            vi.mocked(getAuthClient).mockReturnValue({
                customer_id: 'test-customer-123',
                userType: 'registered',
            } as any);

            vi.mocked(isRegisteredCustomer).mockReturnValue(true);

            vi.mocked(getShippingMethodsForShipment).mockResolvedValue({
                applicableShippingMethods: [{ id: 'standard', name: 'Standard', price: 5.99 }],
            } as any);

            vi.mocked(getCustomerProfileForCheckout).mockResolvedValue({
                customer: { customerId: 'test-123', login: 'test@example.com' },
                addresses: [{ addressId: 'addr1', address1: '123 Main St' }],
                paymentInstruments: [],
            } as any);

            const mockRequest = new Request('https://localhost/checkout');
            const args: ClientLoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: {},
                serverLoader: vi.fn(),
            } as any;

            const result = await clientLoader(args);

            expect(result).toHaveProperty('isRegisteredCustomer');
            expect(result).toHaveProperty('customerProfile');
            expect(result).toHaveProperty('productMap');
            expect(result.isRegisteredCustomer).toBe(true);
            expect(result.customerProfile).toBeInstanceOf(Promise);
            expect(result.productMap).toBeInstanceOf(Promise);
        });

        it('should handle guest user checkout', async () => {
            const { getBasket } = await import('@/middlewares/basket.client');
            const { getAuth: getAuthClient } = await import('@/middlewares/auth.client');
            const { isRegisteredCustomer } = await import('@/lib/api/customer');

            vi.mocked(getBasket).mockReturnValue({
                basketId: 'guest-basket-456',
                shipments: [{ shippingAddress: { address1: '456 Oak St' } }],
            } as any);

            vi.mocked(getAuthClient).mockReturnValue({
                customer_id: undefined,
                userType: 'guest',
            } as any);

            vi.mocked(isRegisteredCustomer).mockReturnValue(false);

            const mockRequest = new Request('https://localhost/checkout');
            const args: ClientLoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: {},
                serverLoader: vi.fn(),
            } as any;

            const result = await clientLoader(args);

            expect(result.isRegisteredCustomer).toBe(false);
            expect(result.customerProfile).toBeUndefined();
            expect(result.productMap).toBeInstanceOf(Promise);
        });

        it('should handle registered user with profile fetch failure', async () => {
            const { getBasket } = await import('@/middlewares/basket.client');
            const { getAuth: getAuthClient } = await import('@/middlewares/auth.client');
            const { isRegisteredCustomer, getCustomerProfileForCheckout } = await import('@/lib/api/customer');

            vi.mocked(getBasket).mockReturnValue({
                basketId: 'test-basket-789',
                shipments: [{ shippingAddress: undefined }],
            } as any);

            vi.mocked(getAuthClient).mockReturnValue({
                customer_id: 'customer-789',
                userType: 'registered',
            } as any);

            vi.mocked(isRegisteredCustomer).mockReturnValue(true);

            // Simulate profile fetch failure
            vi.mocked(getCustomerProfileForCheckout).mockRejectedValue(new Error('API Error'));

            const mockRequest = new Request('https://localhost/checkout');
            const args: ClientLoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: {},
                serverLoader: vi.fn(),
            } as any;

            const result = await clientLoader(args);

            // Should fall back to guest-like behavior
            expect(result.isRegisteredCustomer).toBe(false);
            expect(result.customerProfile).toBeUndefined();
        });

        it('should handle basket without shipping address', async () => {
            const { getBasket } = await import('@/middlewares/basket.client');
            const { getAuth: getAuthClient } = await import('@/middlewares/auth.client');
            const { isRegisteredCustomer } = await import('@/lib/api/customer');

            vi.mocked(getBasket).mockReturnValue({
                basketId: 'empty-basket-999',
                shipments: [{ shippingAddress: undefined }],
            } as any);

            vi.mocked(getAuthClient).mockReturnValue({
                customer_id: undefined,
                userType: 'guest',
            } as any);

            vi.mocked(isRegisteredCustomer).mockReturnValue(false);

            const mockRequest = new Request('https://localhost/checkout');
            const args: ClientLoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: {},
                serverLoader: vi.fn(),
            } as any;

            const result = await clientLoader(args);

            // Should not have shipping methods promise
            expect(result.shippingMethods).toBeUndefined();
            expect(result.productMap).toBeInstanceOf(Promise);
        });

        it('should handle registered user without customer_id', async () => {
            const { getBasket } = await import('@/middlewares/basket.client');
            const { getAuth: getAuthClient } = await import('@/middlewares/auth.client');
            const { isRegisteredCustomer } = await import('@/lib/api/customer');

            vi.mocked(getBasket).mockReturnValue({
                basketId: 'test-basket',
                shipments: [],
            } as any);

            vi.mocked(getAuthClient).mockReturnValue({
                customer_id: undefined,
                userType: 'registered',
            } as any);

            vi.mocked(isRegisteredCustomer).mockReturnValue(true);

            const mockRequest = new Request('https://localhost/checkout');
            const args: ClientLoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: {},
                serverLoader: vi.fn(),
            } as any;

            const result = await clientLoader(args);

            // Should fall back to guest path
            expect(result.customerProfile).toBeUndefined();
        });

        it('should handle error gracefully', async () => {
            const { getBasket } = await import('@/middlewares/basket.client');

            // Simulate error in getBasket
            vi.mocked(getBasket).mockImplementation(() => {
                throw new Error('Basket error');
            });

            const mockRequest = new Request('https://localhost/checkout');
            const args: ClientLoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: {},
                serverLoader: vi.fn(),
            } as any;

            const result = await clientLoader(args);

            // Should return fallback data
            expect(result.productMap).toBeInstanceOf(Promise);
            expect(result.isRegisteredCustomer).toBe(false);
        });

        it('should handle basket with shipping address but no basketId', async () => {
            const { getBasket } = await import('@/middlewares/basket.client');
            const { getAuth: getAuthClient } = await import('@/middlewares/auth.client');
            const { isRegisteredCustomer } = await import('@/lib/api/customer');

            vi.mocked(getBasket).mockReturnValue({
                basketId: undefined,
                shipments: [{ shippingAddress: { address1: '123 Main St' } }],
            } as any);

            vi.mocked(getAuthClient).mockReturnValue({
                customer_id: undefined,
                userType: 'guest',
            } as any);

            vi.mocked(isRegisteredCustomer).mockReturnValue(false);

            const mockRequest = new Request('https://localhost/checkout');
            const args: ClientLoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: {},
                serverLoader: vi.fn(),
            } as any;

            const result = await clientLoader(args);

            // Should not fetch shipping methods without basketId
            expect(result.shippingMethods).toBeUndefined();
        });
    });
});
