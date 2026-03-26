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
import { action } from './action.save-checkout-info-to-customer';
import type { ActionFunctionArgs } from 'react-router';

// Mock dependencies
vi.mock('@/middlewares/auth.server', () => ({
    getAuth: vi.fn(),
}));

vi.mock('@/middlewares/basket.server', () => ({
    getBasket: vi.fn(),
}));

vi.mock('@/lib/api/customer', () => ({
    savePaymentMethodToCustomer: vi.fn(),
    saveShippingAddressToCustomer: vi.fn(),
    saveBillingAddressToCustomer: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
    createLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() })),
    getLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() })),
}));

import { getAuth } from '@/middlewares/auth.server';
import { getBasket } from '@/middlewares/basket.server';
import {
    savePaymentMethodToCustomer,
    saveShippingAddressToCustomer,
    saveBillingAddressToCustomer,
} from '@/lib/api/customer';

const mockGetAuth = getAuth as ReturnType<typeof vi.fn>;
const mockGetBasket = getBasket as ReturnType<typeof vi.fn>;
const mockSavePaymentMethodToCustomer = savePaymentMethodToCustomer as ReturnType<typeof vi.fn>;
const mockSaveShippingAddressToCustomer = saveShippingAddressToCustomer as ReturnType<typeof vi.fn>;
const mockSaveBillingAddressToCustomer = saveBillingAddressToCustomer as ReturnType<typeof vi.fn>;

describe('action.save-checkout-info-to-customer', () => {
    const mockContext = {} as ActionFunctionArgs['context'];

    beforeEach(() => {
        vi.clearAllMocks();

        mockGetAuth.mockReturnValue({
            customerId: 'customer-123',
            userType: 'registered',
        });

        mockSavePaymentMethodToCustomer.mockResolvedValue(undefined);
        mockSaveShippingAddressToCustomer.mockResolvedValue(undefined);
        mockSaveBillingAddressToCustomer.mockResolvedValue(undefined);
    });

    test('saves all checkout information successfully', async () => {
        const mockBasket = {
            basketId: 'basket-123',
            paymentInstruments: [
                {
                    paymentMethodId: 'CREDIT_CARD',
                    paymentCard: {
                        cardType: 'Visa',
                        numberLastDigits: '1111',
                        expirationMonth: 12,
                        expirationYear: 2025,
                    },
                },
            ],
            shipments: [
                {
                    shippingAddress: {
                        firstName: 'John',
                        lastName: 'Doe',
                        address1: '123 Main St',
                        city: 'San Francisco',
                        stateCode: 'CA',
                        postalCode: '94105',
                        countryCode: 'US',
                        phone: '555-1234',
                    },
                },
            ],
            billingAddress: {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'San Francisco',
                stateCode: 'CA',
                postalCode: '94105',
                countryCode: 'US',
            },
            customerInfo: {
                email: 'john.doe@example.com',
                firstName: 'John',
                lastName: 'Doe',
            },
        };

        mockGetBasket.mockResolvedValue({ current: mockBasket });

        const formData = new FormData();
        formData.append('savePayment', 'true');

        const request = new Request('http://localhost/action/save-checkout-info-to-customer', {
            method: 'POST',
            body: formData,
        });

        const response = await action({ request, context: mockContext });
        const result = await response.json();

        expect(result).toEqual({ success: true });
        expect(mockSavePaymentMethodToCustomer).toHaveBeenCalledWith(
            mockContext,
            'customer-123',
            mockBasket.paymentInstruments[0]
        );
        expect(mockSaveShippingAddressToCustomer).toHaveBeenCalledWith(
            mockContext,
            'customer-123',
            mockBasket.shipments[0].shippingAddress
        );
        expect(mockSaveBillingAddressToCustomer).toHaveBeenCalledWith(
            mockContext,
            'customer-123',
            mockBasket.billingAddress
        );
    });

    test('skips payment save when savePayment is false', async () => {
        const mockBasket = {
            basketId: 'basket-123',
            paymentInstruments: [{ paymentMethodId: 'CREDIT_CARD' }],
            shipments: [{ shippingAddress: { firstName: 'John', lastName: 'Doe' } }],
        };

        mockGetBasket.mockResolvedValue({ current: mockBasket });

        const formData = new FormData();
        formData.append('savePayment', 'false');

        const request = new Request('http://localhost/action/save-checkout-info-to-customer', {
            method: 'POST',
            body: formData,
        });

        await action({ request, context: mockContext });

        expect(mockSavePaymentMethodToCustomer).not.toHaveBeenCalled();
        expect(mockSaveShippingAddressToCustomer).toHaveBeenCalled();
    });

    test('returns error when user is not registered', async () => {
        mockGetAuth.mockReturnValue({
            customerId: null,
            userType: 'guest',
        });

        const request = new Request('http://localhost/action/save-checkout-info-to-customer', {
            method: 'POST',
            body: new FormData(),
        });

        const response = await action({ request, context: mockContext });
        const result = await response.json();

        expect(result).toEqual({
            success: false,
            error: 'User is not a registered customer',
        });
        expect(mockGetBasket).not.toHaveBeenCalled();
    });

    test('returns error when basket is not found', async () => {
        mockGetBasket.mockResolvedValue({ current: null });

        const request = new Request('http://localhost/action/save-checkout-info-to-customer', {
            method: 'POST',
            body: new FormData(),
        });

        const response = await action({ request, context: mockContext });
        const result = await response.json();

        expect(result).toEqual({
            success: false,
            error: 'No basket found',
        });
    });

    test('continues saving other info if payment save fails', async () => {
        const mockBasket = {
            basketId: 'basket-123',
            paymentInstruments: [{ paymentMethodId: 'CREDIT_CARD' }],
            shipments: [{ shippingAddress: { firstName: 'John', lastName: 'Doe' } }],
            billingAddress: { firstName: 'John', lastName: 'Doe' },
            customerInfo: { email: 'john@example.com' },
        };

        mockGetBasket.mockResolvedValue({ current: mockBasket });
        mockSavePaymentMethodToCustomer.mockRejectedValue(new Error('Payment save failed'));

        const formData = new FormData();
        formData.append('savePayment', 'true');

        const request = new Request('http://localhost/action/save-checkout-info-to-customer', {
            method: 'POST',
            body: formData,
        });

        const response = await action({ request, context: mockContext });
        const result = await response.json();

        expect(result).toEqual({ success: true });
        expect(mockSaveShippingAddressToCustomer).toHaveBeenCalled();
        expect(mockSaveBillingAddressToCustomer).toHaveBeenCalled();
    });

    test('handles missing optional fields gracefully', async () => {
        const mockBasket = {
            basketId: 'basket-123',
            shipments: [{ shippingAddress: { firstName: 'John', lastName: 'Doe' } }],
            // No payment instruments, no billing address, no customer info
        };

        mockGetBasket.mockResolvedValue({ current: mockBasket });

        const request = new Request('http://localhost/action/save-checkout-info-to-customer', {
            method: 'POST',
            body: new FormData(),
        });

        const response = await action({ request, context: mockContext });
        const result = await response.json();

        expect(result).toEqual({ success: true });
        expect(mockSavePaymentMethodToCustomer).not.toHaveBeenCalled();
        expect(mockSaveBillingAddressToCustomer).not.toHaveBeenCalled();
        expect(mockSaveShippingAddressToCustomer).toHaveBeenCalled();
    });
});
