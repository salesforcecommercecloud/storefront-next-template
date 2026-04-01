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
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { action } from './action.place-order';
import { getBasket } from '@/middlewares/basket.server';
import { getAuth } from '@/middlewares/auth.server';
import { getTranslation } from '@/lib/i18next';
import { createFormDataRequest } from '@/test-utils/request-helpers';
import type { ActionFunctionArgs } from 'react-router';
import {
    savePaymentMethodToCustomer,
    saveShippingAddressToCustomer,
    saveBillingAddressToCustomer,
    updateCustomerContactInfo,
    getCustomerProfileForCheckout,
} from '@/lib/api/customer';
import { getBasketCurrency, calculateBasket } from '@/lib/api/basket';
import { createApiClients } from '@/lib/api-clients';

vi.mock('@/middlewares/basket.server', () => ({
    getBasket: vi.fn(),
    updateBasketResource: vi.fn(),
    destroyBasket: vi.fn(),
}));

vi.mock('@/middlewares/auth.server', () => ({
    getAuth: vi.fn(),
}));

vi.mock('@/lib/i18next', () => ({
    getTranslation: vi.fn(),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() })),
}));

vi.mock('@/extensions/multiship/lib/api/basket', () => ({
    resolveEmptyShipments: vi.fn(),
}));

vi.mock('@/lib/api-clients');
vi.mock('@/lib/api/basket');
vi.mock('@/lib/api/customer');
vi.mock('@/lib/customer-profile-utils');
vi.mock('@/lib/error-handler');
vi.mock('@/lib/url.server', () => ({
    buildUrlFromContext: vi.fn((to: string) => to),
}));

async function parsePlaceOrderResponse(
    response: Response
): Promise<{ success?: boolean; error?: string; step?: string }> {
    return response.json() as Promise<{ success?: boolean; error?: string; step?: string }>;
}

describe('action.place-order action', () => {
    const mockContext = {} as ActionFunctionArgs['context'];

    beforeEach(() => {
        vi.clearAllMocks();
        // Return translation key as-is so tests can assert the exact key used (catches wrong-key regressions)
        vi.mocked(getTranslation).mockReturnValue({
            i18next: {} as any,
            t: ((key: string) => key) as any,
        });
    });

    test('returns noActiveBasket when basket is missing', async () => {
        vi.mocked(getBasket).mockResolvedValue({ current: undefined } as any);

        const request = createFormDataRequest('http://localhost/action/place-order', 'POST', {});
        const response = await action({
            request,
            context: mockContext,
            params: {},
            unstable_pattern: '/action/place-order',
        } as ActionFunctionArgs);

        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(400);
        const body = await parsePlaceOrderResponse(response);
        expect(body.success).toBe(false);
        expect(body.error).toBe('errors:checkout.noActiveBasket');
        expect(body.step).toBe('placeOrder');
    });

    test('returns emailRequired when basket has no customer email', async () => {
        vi.mocked(getBasket).mockResolvedValue({
            current: {
                basketId: 'b1',
                productItems: [],
                shipments: [],
            },
        } as any);

        const request = createFormDataRequest('http://localhost/action/place-order', 'POST', {});
        const response = await action({
            request,
            context: mockContext,
            params: {},
            unstable_pattern: '/action/place-order',
        } as ActionFunctionArgs);

        expect(response.status).toBe(400);
        const body = await parsePlaceOrderResponse(response);
        expect(body.success).toBe(false);
        expect(body.error).toBe('checkout:contactInfo.emailRequired');
    });

    test('returns shippingMethodRequired when a non-empty shipment has no shipping method', async () => {
        vi.mocked(getBasket).mockResolvedValue({
            current: {
                basketId: 'b1',
                customerInfo: { email: 'test@example.com' },
                productItems: [{ itemId: 'i1', productId: 'p1', quantity: 1, shipmentId: 'me' }],
                shipments: [
                    {
                        shipmentId: 'me',
                        shippingAddress: {
                            address1: '123 Main St',
                            city: 'Austin',
                            postalCode: '78701',
                            countryCode: 'US',
                        },
                        // no shippingMethod
                    },
                ],
            },
        } as any);

        const request = createFormDataRequest('http://localhost/action/place-order', 'POST', {});
        const response = await action({
            request,
            context: mockContext,
            params: {},
            unstable_pattern: '/action/place-order',
        } as ActionFunctionArgs);

        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(400);
        const body = await parsePlaceOrderResponse(response);
        expect(body.success).toBe(false);
        expect(body.step).toBe('placeOrder');
        expect(body.error).toBe('errors:checkout.shippingMethodRequired');
    });

    test('returns shippingAddressRequired when a non-empty shipment has no shipping address', async () => {
        vi.mocked(getBasket).mockResolvedValue({
            current: {
                basketId: 'b1',
                customerInfo: { email: 'test@example.com' },
                productItems: [{ itemId: 'i1', productId: 'p1', quantity: 1, shipmentId: 'me' }],
                shipments: [
                    {
                        shipmentId: 'me',
                        // no shippingAddress
                        shippingMethod: { id: 'ground', name: 'Ground' },
                    },
                ],
            },
        } as any);

        const request = createFormDataRequest('http://localhost/action/place-order', 'POST', {});
        const response = await action({
            request,
            context: mockContext,
            params: {},
            unstable_pattern: '/action/place-order',
        } as ActionFunctionArgs);

        expect(response.status).toBe(400);
        const body = await parsePlaceOrderResponse(response);
        expect(body.success).toBe(false);
        expect(body.error).toBe('errors:api.shippingAddressRequired');
    });

    test('calls savePaymentMethodToCustomer when savePaymentToProfile is true and customer is logged in', async () => {
        const basketWithPayment = {
            basketId: 'b1',
            customerInfo: { email: 'test@example.com' },
            productItems: [{ itemId: 'i1', productId: 'p1', quantity: 1, shipmentId: 's1' }],
            shipments: [
                {
                    shipmentId: 's1',
                    shippingAddress: {
                        address1: '123 Main St',
                        city: 'Austin',
                        postalCode: '78701',
                        countryCode: 'US',
                    },
                    shippingMethod: { id: 'ground', name: 'Ground' },
                },
            ],
            paymentInstruments: [{ paymentInstrumentId: 'pi1' }],
            billingAddress: { address1: '123 Main St', city: 'Austin', postalCode: '78701', countryCode: 'US' },
            orderTotal: 99.99,
        };

        vi.mocked(getBasket).mockResolvedValue({ current: basketWithPayment } as any);
        vi.mocked(getAuth).mockReturnValue({ customerId: 'cust-1' } as any);
        vi.mocked(getBasketCurrency).mockReturnValue('USD');
        vi.mocked(calculateBasket).mockResolvedValue({ ...basketWithPayment, basketId: 'b1' } as any);
        vi.mocked(createApiClients).mockReturnValue({
            shopperOrders: {
                createOrder: vi.fn().mockResolvedValue({
                    data: {
                        orderNo: 'O-1',
                        paymentInstruments: [
                            {
                                paymentInstrumentId: 'order-pi1',
                                paymentMethodId: 'CREDIT_CARD',
                                paymentCard: {
                                    cardType: 'Visa',
                                    expirationMonth: 12,
                                    expirationYear: 2030,
                                    holder: 'Test User',
                                    numberLastDigits: '4242',
                                },
                            },
                        ],
                    },
                }),
            },
        } as any);
        vi.mocked(savePaymentMethodToCustomer).mockResolvedValue(true);

        const request = createFormDataRequest('http://localhost/action/place-order', 'POST', {
            shouldCreateAccount: 'false',
            savePaymentToProfile: 'true',
        });
        const response = await action({
            request,
            context: mockContext,
            params: {},
            unstable_pattern: '/action/place-order',
        } as ActionFunctionArgs);

        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(302);
        expect(vi.mocked(savePaymentMethodToCustomer)).toHaveBeenCalledWith(
            mockContext,
            'cust-1',
            expect.objectContaining({
                paymentMethodId: 'CREDIT_CARD',
                paymentCard: expect.objectContaining({
                    cardType: 'Visa',
                    holder: 'Test User',
                }),
            })
        );
    });

    test('saves payment method and addresses for checkout-registration even without savePaymentToProfile', async () => {
        const shippingAddress = {
            firstName: 'Jane',
            lastName: 'Doe',
            address1: '456 Oak Ave',
            city: 'Dallas',
            postalCode: '75201',
            countryCode: 'US',
            stateCode: 'TX',
        };
        const billingAddress = {
            firstName: 'Jane',
            lastName: 'Doe',
            address1: '789 Elm St',
            city: 'Dallas',
            postalCode: '75202',
            countryCode: 'US',
            stateCode: 'TX',
            phone: '+1 555-123-4567',
        };
        const basketWithPayment = {
            basketId: 'b1',
            customerInfo: { email: 'new@example.com' },
            productItems: [{ itemId: 'i1', productId: 'p1', quantity: 1, shipmentId: 's1' }],
            shipments: [
                {
                    shipmentId: 's1',
                    shippingAddress,
                    shippingMethod: { id: 'ground', name: 'Ground' },
                },
            ],
            paymentInstruments: [{ paymentInstrumentId: 'pi1' }],
            billingAddress,
            orderTotal: 49.99,
        };

        vi.mocked(getBasket).mockResolvedValue({ current: basketWithPayment } as any);
        vi.mocked(getAuth).mockReturnValue({ userType: 'registered', customerId: 'new-cust-1' } as any);
        vi.mocked(getBasketCurrency).mockReturnValue('USD');
        vi.mocked(calculateBasket).mockResolvedValue({ ...basketWithPayment, basketId: 'b1' } as any);
        vi.mocked(createApiClients).mockReturnValue({
            shopperOrders: {
                createOrder: vi.fn().mockResolvedValue({
                    data: {
                        orderNo: 'O-2',
                        customerInfo: { email: 'new@example.com' },
                        shipments: [{ shippingAddress }],
                        billingAddress,
                        paymentInstruments: [
                            {
                                paymentInstrumentId: 'order-pi2',
                                paymentMethodId: 'CREDIT_CARD',
                                paymentCard: {
                                    cardType: 'Mastercard',
                                    expirationMonth: 6,
                                    expirationYear: 2029,
                                    holder: 'Jane Doe',
                                    numberLastDigits: '5678',
                                },
                            },
                        ],
                    },
                }),
            },
        } as any);
        vi.mocked(savePaymentMethodToCustomer).mockResolvedValue(true);
        vi.mocked(saveShippingAddressToCustomer).mockResolvedValue(true);
        vi.mocked(saveBillingAddressToCustomer).mockResolvedValue(true);
        vi.mocked(updateCustomerContactInfo).mockResolvedValue(true);

        const request = createFormDataRequest('http://localhost/action/place-order', 'POST', {
            shouldCreateAccount: 'true',
            savePaymentToProfile: 'false',
        });
        const response = await action({
            request,
            context: mockContext,
            params: {},
            unstable_pattern: '/action/place-order',
        } as ActionFunctionArgs);

        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(302);

        expect(vi.mocked(savePaymentMethodToCustomer)).toHaveBeenCalledWith(
            mockContext,
            'new-cust-1',
            expect.objectContaining({
                paymentMethodId: 'CREDIT_CARD',
                paymentCard: expect.objectContaining({
                    cardType: 'Mastercard',
                    holder: 'Jane Doe',
                }),
            })
        );
        expect(vi.mocked(saveShippingAddressToCustomer)).toHaveBeenCalledWith(
            mockContext,
            'new-cust-1',
            shippingAddress
        );
        expect(vi.mocked(saveBillingAddressToCustomer)).toHaveBeenCalledWith(mockContext, 'new-cust-1', billingAddress);
        expect(vi.mocked(updateCustomerContactInfo)).toHaveBeenCalledWith(mockContext, 'new-cust-1', {
            phone: '+1 555-123-4567',
        });
    });

    test('saves shipping address and phone for newly registered shopper with empty profile (shouldCreateAccount=false)', async () => {
        const shippingAddress = {
            firstName: 'Alex',
            lastName: 'Smith',
            address1: '100 Pine St',
            city: 'Houston',
            postalCode: '77001',
            countryCode: 'US',
            stateCode: 'TX',
        };
        const billingAddress = {
            firstName: 'Alex',
            lastName: 'Smith',
            address1: '100 Pine St',
            city: 'Houston',
            postalCode: '77001',
            countryCode: 'US',
            stateCode: 'TX',
            phone: '+1 5559998888',
        };
        const basketWithPayment = {
            basketId: 'b1',
            customerInfo: { email: 'otp-user@example.com' },
            productItems: [{ itemId: 'i1', productId: 'p1', quantity: 1, shipmentId: 's1' }],
            shipments: [
                {
                    shipmentId: 's1',
                    shippingAddress,
                    shippingMethod: { id: 'ground', name: 'Ground' },
                },
            ],
            paymentInstruments: [{ paymentInstrumentId: 'pi1' }],
            billingAddress,
            orderTotal: 59.99,
        };

        vi.mocked(getBasket).mockResolvedValue({ current: basketWithPayment } as any);
        vi.mocked(getAuth).mockReturnValue({ userType: 'registered', customerId: 'new-otp-cust' } as any);
        vi.mocked(getBasketCurrency).mockReturnValue('USD');
        vi.mocked(calculateBasket).mockResolvedValue({ ...basketWithPayment, basketId: 'b1' } as any);
        vi.mocked(createApiClients).mockReturnValue({
            shopperOrders: {
                createOrder: vi.fn().mockResolvedValue({
                    data: {
                        orderNo: 'O-3',
                        customerInfo: { email: 'otp-user@example.com' },
                        shipments: [{ shippingAddress }],
                        billingAddress,
                        paymentInstruments: [
                            {
                                paymentInstrumentId: 'order-pi3',
                                paymentMethodId: 'CREDIT_CARD',
                                paymentCard: { cardType: 'Visa', holder: 'Alex Smith', numberLastDigits: '1111' },
                            },
                        ],
                    },
                }),
            },
        } as any);
        // Empty profile: no addresses, no phoneHome
        vi.mocked(getCustomerProfileForCheckout).mockResolvedValue({
            customer: { customerId: 'new-otp-cust', login: 'otp-user@example.com' },
            addresses: [],
            paymentInstruments: [],
        } as any);
        vi.mocked(saveShippingAddressToCustomer).mockResolvedValue(true);
        vi.mocked(saveBillingAddressToCustomer).mockResolvedValue(true);
        vi.mocked(updateCustomerContactInfo).mockResolvedValue(true);

        const request = createFormDataRequest('http://localhost/action/place-order', 'POST', {
            shouldCreateAccount: 'false',
            savePaymentToProfile: 'false',
        });
        const response = await action({
            request,
            context: mockContext,
            params: {},
            unstable_pattern: '/action/place-order',
        } as ActionFunctionArgs);

        expect(response).toBeInstanceOf(Response);
        expect(response.status).toBe(302);

        // Payment should NOT be saved (shouldCreateAccount=false and savePaymentToProfile=false)
        expect(vi.mocked(savePaymentMethodToCustomer)).not.toHaveBeenCalled();

        // Shipping address, billing address, and phone SHOULD be saved (empty profile)
        expect(vi.mocked(saveShippingAddressToCustomer)).toHaveBeenCalledWith(
            mockContext,
            'new-otp-cust',
            shippingAddress
        );
        expect(vi.mocked(saveBillingAddressToCustomer)).toHaveBeenCalledWith(
            mockContext,
            'new-otp-cust',
            billingAddress
        );
        expect(vi.mocked(updateCustomerContactInfo)).toHaveBeenCalledWith(mockContext, 'new-otp-cust', {
            phone: '+1 5559998888',
        });
    });

    test('does not save addresses for existing registered shopper with populated profile', async () => {
        const basketWithPayment = {
            basketId: 'b1',
            customerInfo: { email: 'existing@example.com' },
            productItems: [{ itemId: 'i1', productId: 'p1', quantity: 1, shipmentId: 's1' }],
            shipments: [
                {
                    shipmentId: 's1',
                    shippingAddress: {
                        address1: '123 Main St',
                        city: 'Austin',
                        postalCode: '78701',
                        countryCode: 'US',
                    },
                    shippingMethod: { id: 'ground', name: 'Ground' },
                },
            ],
            paymentInstruments: [{ paymentInstrumentId: 'pi1' }],
            billingAddress: { address1: '123 Main St', city: 'Austin', postalCode: '78701', countryCode: 'US' },
            orderTotal: 99.99,
        };

        vi.mocked(getBasket).mockResolvedValue({ current: basketWithPayment } as any);
        vi.mocked(getAuth).mockReturnValue({ userType: 'registered', customerId: 'existing-cust' } as any);
        vi.mocked(getBasketCurrency).mockReturnValue('USD');
        vi.mocked(calculateBasket).mockResolvedValue({ ...basketWithPayment, basketId: 'b1' } as any);
        vi.mocked(createApiClients).mockReturnValue({
            shopperOrders: {
                createOrder: vi.fn().mockResolvedValue({
                    data: { orderNo: 'O-4', paymentInstruments: [{ paymentInstrumentId: 'order-pi4' }] },
                }),
            },
        } as any);
        // Populated profile: has addresses and phoneHome
        vi.mocked(getCustomerProfileForCheckout).mockResolvedValue({
            customer: { customerId: 'existing-cust', phoneHome: '+1 1111111111' },
            addresses: [{ addressId: 'addr-1', address1: '999 Elm St' }],
            paymentInstruments: [],
        } as any);

        const request = createFormDataRequest('http://localhost/action/place-order', 'POST', {
            shouldCreateAccount: 'false',
            savePaymentToProfile: 'false',
        });
        await action({
            request,
            context: mockContext,
            params: {},
            unstable_pattern: '/action/place-order',
        } as ActionFunctionArgs);

        // Should not save addresses or phone for an existing registered shopper
        expect(vi.mocked(saveShippingAddressToCustomer)).not.toHaveBeenCalled();
        expect(vi.mocked(saveBillingAddressToCustomer)).not.toHaveBeenCalled();
        expect(vi.mocked(updateCustomerContactInfo)).not.toHaveBeenCalled();
    });

    test('does not call savePaymentMethodToCustomer when savePaymentToProfile is false', async () => {
        const basketWithPayment = {
            basketId: 'b1',
            customerInfo: { email: 'test@example.com' },
            productItems: [{ itemId: 'i1', productId: 'p1', quantity: 1, shipmentId: 's1' }],
            shipments: [
                {
                    shipmentId: 's1',
                    shippingAddress: {
                        address1: '123 Main St',
                        city: 'Austin',
                        postalCode: '78701',
                        countryCode: 'US',
                    },
                    shippingMethod: { id: 'ground', name: 'Ground' },
                },
            ],
            paymentInstruments: [{ paymentInstrumentId: 'pi1' }],
            billingAddress: { address1: '123 Main St', city: 'Austin', postalCode: '78701', countryCode: 'US' },
            orderTotal: 99.99,
        };

        vi.mocked(getBasket).mockResolvedValue({ current: basketWithPayment } as any);
        vi.mocked(getAuth).mockReturnValue({ customerId: 'cust-1' } as any);
        vi.mocked(getBasketCurrency).mockReturnValue('USD');
        vi.mocked(calculateBasket).mockResolvedValue({ ...basketWithPayment, basketId: 'b1' } as any);
        vi.mocked(createApiClients).mockReturnValue({
            shopperOrders: {
                createOrder: vi.fn().mockResolvedValue({
                    data: { orderNo: 'O-1', paymentInstruments: [{ paymentInstrumentId: 'order-pi1' }] },
                }),
            },
        } as any);
        vi.mocked(savePaymentMethodToCustomer).mockResolvedValue(true);

        const request = createFormDataRequest('http://localhost/action/place-order', 'POST', {
            shouldCreateAccount: 'false',
            savePaymentToProfile: 'false',
        });
        await action({ request, context: mockContext, params: {} } as ActionFunctionArgs);

        expect(savePaymentMethodToCustomer).not.toHaveBeenCalled();
    });
});
