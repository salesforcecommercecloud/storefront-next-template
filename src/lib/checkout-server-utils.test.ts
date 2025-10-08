import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerCustomerProfile, getServerCheckoutData } from './checkout-server-utils';

// Mock the dependencies
vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        createCookie: vi.fn(() => ({
            parse: vi.fn(),
        })),
        unstable_createContext: vi.fn(),
    };
});

vi.mock('@/lib/scapi', () => ({
    default: vi.fn(() => ({
        ShopperBaskets: {
            getBasket: vi.fn(),
        },
        ShopperCustomers: {
            getCustomer: vi.fn(),
        },
    })),
}));

vi.mock('@/lib/api/shipping-methods', () => ({
    getShippingMethodsForShipment: vi.fn(),
}));

vi.mock('@/middlewares/basket.client', () => ({
    getBasket: vi.fn(),
}));

describe('Checkout Server Utils', () => {
    let mockContext: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock context
        mockContext = {};
    });

    describe('getServerCustomerProfile', () => {
        it('should fetch customer profile for registered users', async () => {
            const createClient = (await import('@/lib/scapi')).default;

            const mockAuthSession = {
                access_token: 'test-token',
                customer_id: 'test-customer-id',
                userType: 'registered',
            };

            const mockCustomer = {
                customerId: 'test-customer-id',
                addresses: [],
                paymentInstruments: [],
            };

            const mockProfile = {
                customer: mockCustomer,
                addresses: [],
                paymentInstruments: [],
                preferredShippingAddress: undefined,
                preferredBillingAddress: undefined,
            };

            const mockCustomerClient = {
                getCustomer: vi.fn().mockResolvedValue(mockCustomer),
            };

            const mockClient = {
                ShopperCustomers: mockCustomerClient,
            };

            vi.mocked(createClient).mockReturnValue(mockClient as any);

            const result = await getServerCustomerProfile(mockContext, mockAuthSession);

            expect(result).toEqual(mockProfile);
            expect(mockCustomerClient.getCustomer).toHaveBeenCalledWith({
                parameters: { customerId: 'test-customer-id' },
            });
        });

        it('should return null for guest users', async () => {
            const mockAuthSession = {
                access_token: 'test-token',
                customer_id: 'test-customer-id',
                userType: 'guest',
            };

            const result = await getServerCustomerProfile(mockContext, mockAuthSession);

            expect(result).toBeNull();
        });

        it('should return null when no auth session is available', async () => {
            const result = await getServerCustomerProfile(mockContext, null);

            expect(result).toBeNull();
        });
    });

    describe('getServerCheckoutData', () => {
        it('should fetch all checkout data successfully', async () => {
            const createClient = (await import('@/lib/scapi')).default;
            const { getShippingMethodsForShipment: getShippingMethods } = await import('@/lib/api/shipping-methods');
            const { getBasket } = await import('@/middlewares/basket.client');

            const mockAuthSession = {
                access_token: 'test-token',
                customer_id: 'test-customer-id',
                userType: 'registered',
            };

            const mockBasket = {
                basketId: 'test-basket-id',
                shipments: [{ shippingAddress: { address1: '123 Main St' } }],
            };

            const mockCustomer = {
                customerId: 'test-customer-id',
                addresses: [],
                paymentInstruments: [],
            };

            const mockShippingMethods = {
                applicableShippingMethods: [{ id: 'standard', name: 'Standard' }],
            };

            const mockCustomerClient = {
                getCustomer: vi.fn().mockResolvedValue(mockCustomer),
            };

            const mockClient = {
                ShopperCustomers: mockCustomerClient,
            };

            vi.mocked(createClient).mockReturnValue(mockClient as any);
            vi.mocked(getBasket).mockReturnValue(mockBasket as any);
            vi.mocked(getShippingMethods).mockResolvedValue(mockShippingMethods as any);

            const result = getServerCheckoutData(
                {
                    context: mockContext,
                } as any,
                mockAuthSession
            );

            expect(result).toEqual({
                basket: mockBasket,
                customerProfile: expect.any(Promise),
                shippingMethods: expect.any(Promise),
                isRegisteredCustomer: true,
            });
        });

        it('should handle errors gracefully and return empty data', () => {
            const mockAuthSession = null;

            const result = getServerCheckoutData(
                {
                    context: mockContext,
                } as any,
                mockAuthSession
            );

            expect(result).toEqual({
                basket: null,
                customerProfile: Promise.resolve(null),
                shippingMethods: Promise.resolve(null),
                isRegisteredCustomer: false,
            });
        });
    });
});
