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
import { getTranslation } from '@/lib/i18next';
import { createFormDataRequest } from '@/test-utils/request-helpers';
import type { ActionFunctionArgs } from 'react-router';

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

vi.mock('@/extensions/multiship/lib/api/basket', () => ({
    resolveEmptyShipments: vi.fn(),
}));

vi.mock('@/lib/api-clients');
vi.mock('@/lib/api/basket');
vi.mock('@/lib/api/customer');
vi.mock('@/lib/customer-profile-utils');
vi.mock('@/lib/error-handler');

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
        const response = await action({ request, context: mockContext, params: {} } as ActionFunctionArgs);

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
        const response = await action({ request, context: mockContext, params: {} } as ActionFunctionArgs);

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
        const response = await action({ request, context: mockContext, params: {} } as ActionFunctionArgs);

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
        const response = await action({ request, context: mockContext, params: {} } as ActionFunctionArgs);

        expect(response.status).toBe(400);
        const body = await parsePlaceOrderResponse(response);
        expect(body.success).toBe(false);
        expect(body.error).toBe('errors:api.shippingAddressRequired');
    });
});
