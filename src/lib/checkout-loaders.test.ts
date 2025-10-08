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

import { clientLoader } from './checkout-loaders';

describe('Checkout Loaders', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('clientLoader', () => {
        it('should return correct data structure', async () => {
            // Mock the middleware functions to return valid data
            const { getBasket } = await import('@/middlewares/basket.client');
            const { getAuth: getAuthClient } = await import('@/middlewares/auth.client');
            const { isRegisteredCustomer } = await import('@/lib/api/customer');

            vi.mocked(getBasket).mockReturnValue({
                basketId: 'test-basket-123',
                shipments: [{ shippingAddress: { address1: '123 Main St' } }],
            } as any);

            vi.mocked(getAuthClient).mockReturnValue({
                customer_id: 'test-customer-123',
                userType: 'registered',
            } as any);

            vi.mocked(isRegisteredCustomer).mockReturnValue(true);

            // Mock the shipping methods function
            const { getShippingMethodsForShipment } = await import('@/lib/api/shipping-methods');
            vi.mocked(getShippingMethodsForShipment).mockResolvedValue({
                shippingMethods: [{ id: 'standard', name: 'Standard', price: 5.99 }],
            } as any);

            // Mock the customer profile function
            const { getCustomerProfileForCheckout } = await import('@/lib/api/customer');
            vi.mocked(getCustomerProfileForCheckout).mockResolvedValue({
                customer: { customerId: 'test-123' },
                addresses: [],
                paymentInstruments: [],
            } as any);

            const mockRequest = new Request('https://localhost/checkout');
            const args: ClientLoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: {}, // Added missing context
                serverLoader: vi.fn(),
            } as any;

            const result = clientLoader(args);

            // Should return the correct structure
            expect(result).toHaveProperty('isRegisteredCustomer');
            expect(result).toHaveProperty('customerProfile');
            expect(result).toHaveProperty('shippingMethods');
            expect(result.customerProfile).toBeInstanceOf(Promise);
            expect(result.shippingMethods).toBeInstanceOf(Promise);
        });
    });
});
