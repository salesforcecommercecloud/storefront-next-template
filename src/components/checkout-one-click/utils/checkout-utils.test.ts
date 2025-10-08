import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShopperBasketsTypes } from 'commerce-sdk-isomorphic';
import { CHECKOUT_STEPS } from '@/stores/checkout-store';
import {
    computeFinalStepForReturningCustomer,
    computeStepFromBasket,
    getCompletedSteps,
    initializeBasketForReturningCustomer,
    shouldAutoAdvanceForReturningCustomer,
    shouldPrefillBasket,
} from './checkout-utils';
import type { CustomerProfile } from './checkout-context-types';
import { createTestContext } from '@/lib/test-utils';

const mockShopperBasketsClient = {
    updateCustomerForBasket: vi.fn(),
    updateShippingAddressForShipment: vi.fn(),
    updateBillingAddressForBasket: vi.fn(),
    updateShippingMethodForShipment: vi.fn(),
};

vi.mock('commerce-sdk-isomorphic', async () => {
    const actual = await vi.importActual('commerce-sdk-isomorphic');
    return {
        ...actual,
        ShopperBaskets: vi.fn(() => mockShopperBasketsClient),
    };
});

// Mock dependencies
vi.mock('@/middlewares/basket.client', () => ({
    getBasket: vi.fn(),
    updateBasket: vi.fn(),
}));

vi.mock('@/lib/api/shipping-methods', () => ({
    getShippingMethodsForShipment: vi.fn(),
}));

describe('Checkout Utils', () => {
    describe('computeStepFromBasket', () => {
        it('should return CONTACT_INFO when basket is undefined', () => {
            const result = computeStepFromBasket(undefined, false);
            expect(result).toBe(CHECKOUT_STEPS.CONTACT_INFO);
        });

        it('should return CONTACT_INFO when no customer email', () => {
            const basket = {
                basketId: 'test-basket',
                customerInfo: {},
            } as ShopperBasketsTypes.Basket;

            const result = computeStepFromBasket(basket, false);
            expect(result).toBe(CHECKOUT_STEPS.CONTACT_INFO);
        });

        it('should return SHIPPING_ADDRESS when email exists but no shipping address', () => {
            const basket = {
                basketId: 'test-basket',
                customerInfo: { email: 'test@example.com' },
                shipments: [{}],
            } as ShopperBasketsTypes.Basket;

            const result = computeStepFromBasket(basket, false);
            expect(result).toBe(CHECKOUT_STEPS.SHIPPING_ADDRESS);
        });

        it('should return SHIPPING_OPTIONS when shipping address exists but no shipping method', () => {
            const basket = {
                basketId: 'test-basket',
                customerInfo: { email: 'test@example.com' },
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'Anytown',
                            stateCode: 'CA',
                            postalCode: '12345',
                            countryCode: 'US',
                        },
                    },
                ],
            } as ShopperBasketsTypes.Basket;

            const result = computeStepFromBasket(basket, false);
            expect(result).toBe(CHECKOUT_STEPS.SHIPPING_OPTIONS);
        });

        it('should return PAYMENT when shipping method exists but no payment', () => {
            const basket = {
                basketId: 'test-basket',
                customerInfo: { email: 'test@example.com' },
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'Anytown',
                            stateCode: 'CA',
                            postalCode: '12345',
                            countryCode: 'US',
                        },
                        shippingMethod: {
                            id: 'standard',
                            name: 'Standard Shipping',
                        },
                    },
                ],
                paymentInstruments: [],
            } as ShopperBasketsTypes.Basket;

            const result = computeStepFromBasket(basket, true); // User has selected shipping options
            expect(result).toBe(CHECKOUT_STEPS.PAYMENT);
        });

        it('should return REVIEW_ORDER when all required fields are present', () => {
            const basket = {
                basketId: 'test-basket',
                customerInfo: { email: 'test@example.com' },
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'Anytown',
                            stateCode: 'CA',
                            postalCode: '12345',
                            countryCode: 'US',
                        },
                        shippingMethod: {
                            id: 'standard',
                            name: 'Standard Shipping',
                        },
                    },
                ],
                paymentInstruments: [
                    {
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            expirationMonth: 12,
                            expirationYear: 2025,
                            maskedNumber: '************1234',
                        },
                    },
                ],
            } as ShopperBasketsTypes.Basket;

            const result = computeStepFromBasket(basket, true);
            expect(result).toBe(CHECKOUT_STEPS.REVIEW_ORDER);
        });

        it('should stay at SHIPPING_OPTIONS when user has not selected shipping yet', () => {
            const basket = {
                basketId: 'test-basket',
                customerInfo: { email: 'test@example.com' },
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'Anytown',
                            stateCode: 'CA',
                            postalCode: '12345',
                            countryCode: 'US',
                        },
                        shippingMethod: {
                            id: 'standard',
                            name: 'Standard Shipping',
                        },
                    },
                ],
            } as ShopperBasketsTypes.Basket;

            const result = computeStepFromBasket(basket, false); // User hasn't completed shipping options
            expect(result).toBe(CHECKOUT_STEPS.SHIPPING_OPTIONS);
        });
    });

    describe('getCompletedSteps', () => {
        it('should return empty array when basket is undefined', () => {
            const result = getCompletedSteps(undefined, CHECKOUT_STEPS.CONTACT_INFO);
            expect(result).toEqual([]);
        });

        it('should return completed steps based on basket state', () => {
            const basket = {
                basketId: 'test-basket',
                customerInfo: { email: 'test@example.com' },
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'Anytown',
                            stateCode: 'CA',
                            postalCode: '12345',
                            countryCode: 'US',
                        },
                    },
                ],
            } as ShopperBasketsTypes.Basket;

            const result = getCompletedSteps(basket, CHECKOUT_STEPS.SHIPPING_OPTIONS);
            expect(result).toContain(CHECKOUT_STEPS.CONTACT_INFO);
            expect(result).toContain(CHECKOUT_STEPS.SHIPPING_ADDRESS);
            expect(result).not.toContain(CHECKOUT_STEPS.SHIPPING_OPTIONS);
        });

        it('should handle empty customer info without sessionStorage', () => {
            const basket = {
                basketId: 'test-basket',
                customerInfo: {},
            } as ShopperBasketsTypes.Basket;

            // Mock sessionStorage to be undefined (server-side)
            Object.defineProperty(window, 'sessionStorage', {
                value: undefined,
                writable: true,
            });

            const result = getCompletedSteps(basket, CHECKOUT_STEPS.SHIPPING_ADDRESS);
            expect(result).not.toContain(CHECKOUT_STEPS.CONTACT_INFO);
        });
    });

    describe('shouldAutoAdvanceForReturningCustomer', () => {
        it('should return false for non-returning customers', () => {
            const result = shouldAutoAdvanceForReturningCustomer(false);
            expect(result).toBe(false);
        });

        it('should return false when customer profile is missing', () => {
            const result = shouldAutoAdvanceForReturningCustomer(true, undefined);
            expect(result).toBe(false);
        });

        it('should return false when customer has no saved data', () => {
            const customerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [],
                paymentInstruments: [],
            } as CustomerProfile;

            const result = shouldAutoAdvanceForReturningCustomer(true, customerProfile);
            expect(result).toBe(false);
        });

        it('should return true when customer has both saved addresses and payment methods', () => {
            const customerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [
                    {
                        addressId: 'addr_1',
                        firstName: 'John',
                        lastName: 'Doe',
                        address1: '123 Main St',
                        city: 'Anytown',
                        stateCode: 'CA',
                        postalCode: '12345',
                        countryCode: 'US',
                    },
                ],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card_123',
                        paymentMethodId: 'CREDIT_CARD',
                    },
                ],
            } as CustomerProfile;

            const result = shouldAutoAdvanceForReturningCustomer(true, customerProfile);
            expect(result).toBe(true);
        });

        it('should return false when customer has only payment methods without addresses', () => {
            const customerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card_123',
                        paymentMethodId: 'CREDIT_CARD',
                    },
                ],
            } as CustomerProfile;

            const result = shouldAutoAdvanceForReturningCustomer(true, customerProfile);
            expect(result).toBe(false); // Needs BOTH addresses AND payment methods
        });
    });

    describe('shouldPrefillBasket', () => {
        it('should return false when customer profile is missing', () => {
            const basket = { basketId: 'test' } as ShopperBasketsTypes.Basket;
            const result = shouldPrefillBasket(basket, undefined as unknown as CustomerProfile);
            expect(result).toBe(false);
        });

        it('should return false when customer has no addresses', () => {
            const basket = { basketId: 'test' } as ShopperBasketsTypes.Basket;
            const customerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [],
                paymentInstruments: [],
            } as CustomerProfile;

            const result = shouldPrefillBasket(basket, customerProfile);
            expect(result).toBe(false);
        });

        it('should return true when basket is missing email and customer has profile', () => {
            const basket = {
                basketId: 'test',
                customerInfo: {},
            } as ShopperBasketsTypes.Basket;

            const customerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [{ addressId: 'addr_1', countryCode: 'US', lastName: 'Doe' }],
                paymentInstruments: [],
            } as CustomerProfile;

            const result = shouldPrefillBasket(basket, customerProfile);
            expect(result).toBe(true);
        });

        it('should return true when basket is missing shipping address and customer has addresses', () => {
            const basket = {
                basketId: 'test',
                customerInfo: { email: 'test@example.com' },
                shipments: [{}],
            } as ShopperBasketsTypes.Basket;

            const customerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [{ addressId: 'addr_1', countryCode: 'US', lastName: 'Doe' }],
                paymentInstruments: [],
            } as CustomerProfile;

            const result = shouldPrefillBasket(basket, customerProfile);
            expect(result).toBe(true);
        });

        it('should return false when basket already has all required data', () => {
            const basket = {
                basketId: 'test',
                customerInfo: { email: 'test@example.com' },
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                        },
                    },
                ],
            } as ShopperBasketsTypes.Basket;

            const customerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [{ addressId: 'addr_1', countryCode: 'US', lastName: 'Doe' }],
                paymentInstruments: [],
            } as CustomerProfile;

            const result = shouldPrefillBasket(basket, customerProfile);
            expect(result).toBe(false);
        });
    });

    describe('initializeBasketForReturningCustomer', () => {
        let mockContext: ReturnType<typeof createTestContext>;
        let mockBasket: ShopperBasketsTypes.Basket;
        let mockCustomerProfile: CustomerProfile;

        beforeEach(async () => {
            vi.clearAllMocks();

            mockContext = createTestContext();

            mockBasket = {
                basketId: 'test-basket',
                customerInfo: {},
                shipments: [{}],
            } as ShopperBasketsTypes.Basket;

            mockCustomerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [
                    {
                        addressId: 'addr_1',
                        firstName: 'John',
                        lastName: 'Doe',
                        address1: '123 Main St',
                        city: 'Anytown',
                        stateCode: 'CA',
                        postalCode: '12345',
                        countryCode: 'US',
                        phone: '555-1234',
                        preferred: true,
                    },
                ],
                paymentInstruments: [],
            } as CustomerProfile;

            mockShopperBasketsClient.updateCustomerForBasket.mockResolvedValue({
                ...mockBasket,
                customerInfo: { email: 'test@example.com' },
            });
            mockShopperBasketsClient.updateShippingAddressForShipment.mockResolvedValue({
                ...mockBasket,
                shipments: [{ shippingAddress: { address1: '123 Main St' } }],
            });
            mockShopperBasketsClient.updateBillingAddressForBasket.mockResolvedValue(mockBasket);
            mockShopperBasketsClient.updateShippingMethodForShipment.mockResolvedValue(mockBasket);

            const { getBasket, updateBasket } = await import('@/middlewares/basket.client');
            // const createClient = (await import('@/lib/scapi')).default;
            const { getShippingMethodsForShipment } = await import('@/lib/api/shipping-methods');

            vi.mocked(getBasket).mockReturnValue(mockBasket);
            vi.mocked(updateBasket).mockImplementation(() => {});
            // vi.mocked(createClient).mockReturnValue(mockClient);
            vi.mocked(getShippingMethodsForShipment).mockResolvedValue({
                applicableShippingMethods: [{ id: 'standard', name: 'Standard' }],
            });
        });

        it('should return null when basket is missing', async () => {
            const { getBasket } = await import('@/middlewares/basket.client');
            vi.mocked(getBasket).mockReturnValue({});

            const result = await initializeBasketForReturningCustomer(mockContext, mockCustomerProfile);
            expect(result).toBeNull();
        });

        it('should return null when customer profile is missing', async () => {
            const result = await initializeBasketForReturningCustomer(
                mockContext,
                undefined as unknown as CustomerProfile
            );
            expect(result).toBeNull();
        });

        it('should update customer email when missing', async () => {
            const result = await initializeBasketForReturningCustomer(mockContext, mockCustomerProfile);

            expect(mockShopperBasketsClient.updateCustomerForBasket).toHaveBeenCalledWith({
                parameters: { basketId: 'test-basket' },
                body: { email: 'test@example.com' },
            });
            expect(result).toBeTruthy();
        });

        it('should update shipping address when missing', async () => {
            // Email already exists, so it should skip that update
            mockBasket.customerInfo = { email: 'test@example.com' };

            const result = await initializeBasketForReturningCustomer(mockContext, mockCustomerProfile);

            expect(mockShopperBasketsClient.updateShippingAddressForShipment).toHaveBeenCalledWith({
                parameters: {
                    basketId: 'test-basket',
                    shipmentId: 'me',
                },
                body: expect.objectContaining({
                    firstName: 'John',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'Anytown',
                    stateCode: 'CA',
                    postalCode: '12345',
                    countryCode: 'US',
                    phone: '555-1234',
                }),
            });
            expect(result).toBeTruthy();
        });

        it('should handle errors gracefully and return null', async () => {
            mockShopperBasketsClient.updateCustomerForBasket.mockRejectedValue(new Error('API Error'));

            const result = await initializeBasketForReturningCustomer(mockContext, mockCustomerProfile);
            expect(result).toBeNull();
        });

        it('should not update if no updates are needed', async () => {
            // Basket already has email and shipping address
            mockBasket.customerInfo = { email: 'test@example.com' };
            mockBasket.shipments = [
                {
                    shippingAddress: {
                        firstName: 'John',
                        lastName: 'Doe',
                        address1: '123 Main St',
                    },
                },
            ];

            const result = await initializeBasketForReturningCustomer(mockContext, mockCustomerProfile);

            expect(mockShopperBasketsClient.updateCustomerForBasket).not.toHaveBeenCalled();
            expect(mockShopperBasketsClient.updateShippingAddressForShipment).not.toHaveBeenCalled();
            expect(result).toBeNull(); // No updates made
        });
    });

    describe('computeFinalStepForReturningCustomer', () => {
        it('should return null when customer profile is missing', () => {
            const basket = { basketId: 'test' } as ShopperBasketsTypes.Basket;
            const result = computeFinalStepForReturningCustomer(basket, undefined as unknown as CustomerProfile);
            expect(result).toBeNull();
        });

        it('should return CONTACT_INFO when no email is available', () => {
            const basket = {
                basketId: 'test',
                customerInfo: {},
            } as ShopperBasketsTypes.Basket;

            const customerProfile = {
                customer: {},
                addresses: [],
                paymentInstruments: [],
            } as CustomerProfile;

            const result = computeFinalStepForReturningCustomer(basket, customerProfile);
            expect(result).toBe(CHECKOUT_STEPS.CONTACT_INFO);
        });

        it('should return SHIPPING_ADDRESS when email exists but no shipping address', () => {
            const basket = {
                basketId: 'test',
                customerInfo: { email: 'test@example.com' },
                shipments: [{}],
            } as ShopperBasketsTypes.Basket;

            const customerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [],
                paymentInstruments: [],
            } as CustomerProfile;

            const result = computeFinalStepForReturningCustomer(basket, customerProfile);
            expect(result).toBe(CHECKOUT_STEPS.SHIPPING_ADDRESS);
        });

        it('should return REVIEW_ORDER when customer has complete profile data', () => {
            const basket = {
                basketId: 'test',
                customerInfo: { email: 'test@example.com' },
            } as ShopperBasketsTypes.Basket;

            const customerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [{ addressId: 'addr_1', countryCode: 'US', lastName: 'Doe' }],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card_123',
                        paymentMethodId: 'CREDIT_CARD',
                    },
                ],
            } as CustomerProfile;

            const result = computeFinalStepForReturningCustomer(basket, customerProfile);
            expect(result).toBe(CHECKOUT_STEPS.REVIEW_ORDER);
        });

        it('should return PAYMENT when customer has addresses but no saved payment methods', () => {
            const basket = {
                basketId: 'test',
                customerInfo: { email: 'test@example.com' },
            } as ShopperBasketsTypes.Basket;

            const customerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [{ addressId: 'addr_1', countryCode: 'US', lastName: 'Doe' }],
                paymentInstruments: [],
            } as CustomerProfile;

            const result = computeFinalStepForReturningCustomer(basket, customerProfile);
            expect(result).toBe(CHECKOUT_STEPS.PAYMENT);
        });
    });
});
