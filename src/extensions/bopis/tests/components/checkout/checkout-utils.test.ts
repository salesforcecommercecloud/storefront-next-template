import { describe, test, expect, vi, beforeEach } from 'vitest';
import { CHECKOUT_STEPS } from '@/components/checkout/utils/checkout-context-types';
import { computeStepFromBasket, getCompletedSteps } from '@/components/checkout/utils/checkout-utils';
import { createMockBasketWithPickupItems } from '@/extensions/bopis/tests/__mocks__/basket';
import { isStorePickup } from '@/extensions/bopis/lib/basket-utils';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';

// Mock the isStorePickup function
vi.mock('@/extensions/bopis/lib/basket-utils', () => ({
    isStorePickup: vi.fn(),
}));

describe('Checkout Utils - BOPIS/Store Pickup Scenarios', () => {
    const mockedIsStorePickup = vi.mocked(isStorePickup);

    beforeEach(() => {
        vi.clearAllMocks();
        mockedIsStorePickup.mockReturnValue(false); // Default to non-pickup
    });

    describe('computeStepFromBasket - Store Pickup', () => {
        test('skips shipping address and method step for store pickup orders with email', () => {
            const basketWithPickup = createMockBasketWithPickupItems(
                [{ productId: 'product-1', inventoryId: 'store-inv-1', storeId: 'store-1' }],
                {
                    customerInfo: { email: 'test@example.com' },
                }
            );

            mockedIsStorePickup.mockReturnValue(true);

            // Even though there's no traditional shipping address filled by customer,
            // it should skip to payment because it's store pickup
            const result = computeStepFromBasket(basketWithPickup, false);
            expect(result).toBe(CHECKOUT_STEPS.PAYMENT);
        });

        test('goes to review order when store pickup has email and payment', () => {
            const basketWithPickup = createMockBasketWithPickupItems(
                [{ productId: 'product-1', inventoryId: 'store-inv-1', storeId: 'store-1' }],
                {
                    customerInfo: { email: 'customer@example.com' },
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
                }
            );

            mockedIsStorePickup.mockReturnValue(true);

            const result = computeStepFromBasket(basketWithPickup, false);
            expect(result).toBe(CHECKOUT_STEPS.REVIEW_ORDER);
        });

        test('still requires contact info for store pickup without email', () => {
            const basketWithPickup = createMockBasketWithPickupItems(
                [{ productId: 'product-1', inventoryId: 'store-inv-1', storeId: 'store-1' }],
                {
                    customerInfo: {} as ShopperCustomers.schemas['CustomerInfo'], // No email
                }
            );

            mockedIsStorePickup.mockReturnValue(true);

            const result = computeStepFromBasket(basketWithPickup, false);
            expect(result).toBe(CHECKOUT_STEPS.CONTACT_INFO);
        });
    });

    describe('getCompletedSteps - Store Pickup', () => {
        test('excludes shipping address and method from completed steps for store pickup', () => {
            const basketWithPickup = createMockBasketWithPickupItems(
                [{ productId: 'product-1', inventoryId: 'store-inv-1', storeId: 'store-1' }],
                {
                    customerInfo: { email: 'test@example.com' },
                }
            );

            // Even though the basket has a shipping address (store address),
            // it shouldn't be considered a completed step for store pickup
            mockedIsStorePickup.mockReturnValue(true);

            const result = getCompletedSteps(basketWithPickup, CHECKOUT_STEPS.PAYMENT);
            expect(result).toContain(CHECKOUT_STEPS.CONTACT_INFO);
            expect(result).not.toContain(CHECKOUT_STEPS.SHIPPING_ADDRESS);
            expect(result).not.toContain(CHECKOUT_STEPS.SHIPPING_OPTIONS);
        });
    });
});
