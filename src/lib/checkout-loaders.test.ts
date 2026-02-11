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

// Mock the middleware and API functions
vi.mock('@/middlewares/auth.server', () => ({
    getAuth: vi.fn(),
}));

vi.mock('@/middlewares/basket.server', () => ({
    getBasket: vi.fn(),
    updateBasketResource: vi.fn(),
}));

vi.mock('@/lib/api/customer', () => ({
    getCustomerProfileForCheckout: vi.fn(),
    isRegisteredCustomer: vi.fn(),
}));

vi.mock('@/lib/api/shipping-methods', () => ({
    getShippingMethodsForShipment: vi.fn(),
}));

vi.mock('@/lib/checkout-server-utils', () => ({
    fetchProductsInBasket: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(() => ({
        shopperPromotions: {
            getPromotions: vi.fn(),
        },
        shopperProducts: {
            getProducts: vi.fn(),
        },
    })),
}));

vi.mock('@/lib/currency', () => ({
    currencyContext: { key: 'currency' },
}));

import {
    loader,
    getServerCustomerProfileData,
    getServerShippingMethodsMapData,
    fetchShippingMethodsMapForBasket,
    initializeBasketForReturningCustomer,
} from './checkout-loaders';
import type { CustomerProfile } from '@/components/checkout/utils/checkout-context-types';

describe('Checkout Loaders', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('loader', () => {
        function createMockArgs() {
            return {
                request: new Request('http://localhost/checkout'),
                params: {},
                context: {
                    get: vi.fn(),
                    set: vi.fn(),
                },
            } as any;
        }

        it('should return checkout data for guest user', async () => {
            const { getBasket } = await import('@/middlewares/basket.server');
            const { isRegisteredCustomer } = await import('@/lib/api/customer');
            const { getAuth } = await import('@/middlewares/auth.server');

            vi.mocked(isRegisteredCustomer).mockReturnValue(false);
            vi.mocked(getAuth).mockReturnValue({ userType: 'guest' } as any);
            vi.mocked(getBasket).mockResolvedValue({
                current: {
                    basketId: 'guest-basket',
                    productItems: [],
                    shipments: [],
                },
            } as any);

            const result = await loader(createMockArgs());

            expect(result).toBeDefined();
            expect(result.isRegisteredCustomer).toBe(false);
            expect(result.productMap).toBeInstanceOf(Promise);
            expect(result.promotions).toBeInstanceOf(Promise);
            expect(result.shippingMethodsMap).toBeInstanceOf(Promise);
        });

        it('should return checkout data with customer profile for registered user', async () => {
            const { getBasket } = await import('@/middlewares/basket.server');
            const { isRegisteredCustomer, getCustomerProfileForCheckout } = await import('@/lib/api/customer');
            const { getAuth } = await import('@/middlewares/auth.server');

            vi.mocked(isRegisteredCustomer).mockReturnValue(true);
            vi.mocked(getAuth).mockReturnValue({
                userType: 'registered',
                customerId: 'customer-123',
            } as any);
            vi.mocked(getBasket).mockResolvedValue({
                current: {
                    basketId: 'registered-basket',
                    productItems: [],
                    shipments: [{}],
                },
            } as any);
            vi.mocked(getCustomerProfileForCheckout).mockResolvedValue({
                customer: { customerId: 'customer-123', login: 'test@example.com' },
                addresses: [],
                paymentInstruments: [],
            } as any);

            const result = await loader(createMockArgs());

            expect(result).toBeDefined();
            expect(result.isRegisteredCustomer).toBe(true);
            expect(result.customerProfile).toBeInstanceOf(Promise);
            expect(result.productMap).toBeInstanceOf(Promise);
            expect(result.shippingMethodsMap).toBeInstanceOf(Promise);
        });

        it('should return fallback data when an error occurs', async () => {
            const { isRegisteredCustomer } = await import('@/lib/api/customer');

            // Simulate an error during basket fetch
            vi.mocked(isRegisteredCustomer).mockImplementation(() => {
                throw new Error('Auth error');
            });

            const result = await loader(createMockArgs());

            // Should return fallback data instead of throwing
            expect(result).toBeDefined();
            expect(result.isRegisteredCustomer).toBe(false);
            expect(result.productMap).toBeInstanceOf(Promise);
            expect(result.promotions).toBeInstanceOf(Promise);
            expect(result.shippingMethodsMap).toBeInstanceOf(Promise);

            // Verify fallback promises resolve to empty objects
            expect(await result.productMap).toEqual({});
            expect(await result.promotions).toEqual({});
            expect(await result.shippingMethodsMap).toEqual({});
        });
    });

    describe('getServerCustomerProfileData', () => {
        it('should return null when authSession is null', async () => {
            const mockContext = {} as any;
            const result = await getServerCustomerProfileData(mockContext, null);
            expect(result).toBeNull();
        });

        it('should return null when authSession has no customer_id', async () => {
            const mockContext = {} as any;
            const authSession = {
                userType: 'registered',
                customerId: undefined,
            } as any;

            const result = await getServerCustomerProfileData(mockContext, authSession);
            expect(result).toBeNull();
        });

        it('should return null when userType is not registered', async () => {
            const mockContext = {} as any;
            const authSession = {
                customerId: 'test-123',
                userType: 'guest',
            } as any;

            const result = await getServerCustomerProfileData(mockContext, authSession);
            expect(result).toBeNull();
        });

        it('should handle errors gracefully', async () => {
            const mockContext = {
                get: () => {
                    throw new Error('Context error');
                },
            } as any;
            const authSession = {
                customerId: 'test-123',
                userType: 'registered',
            } as any;

            const result = await getServerCustomerProfileData(mockContext, authSession);
            expect(result).toBeNull();
        });
    });

    describe('getServerShippingMethodsMapData', () => {
        it('should return empty object when basket fetch fails', async () => {
            const { getBasket } = await import('@/middlewares/basket.server');

            vi.mocked(getBasket).mockRejectedValue(new Error('Basket error'));

            const mockContext = {} as any;
            const result = await getServerShippingMethodsMapData(mockContext, null);
            expect(result).toEqual({});
        });

        it('should return shipping methods when basket has shipments with addresses', async () => {
            const { getBasket } = await import('@/middlewares/basket.server');
            const { getShippingMethodsForShipment } = await import('@/lib/api/shipping-methods');

            vi.mocked(getBasket).mockResolvedValue({
                current: {
                    basketId: 'test-basket',
                    shipments: [
                        {
                            shipmentId: 'shipment-1',
                            shippingAddress: { address1: '123 Main St' },
                        },
                    ],
                },
            } as any);

            vi.mocked(getShippingMethodsForShipment).mockResolvedValue({
                applicableShippingMethods: [{ id: 'standard', name: 'Standard' }],
            } as any);

            const mockContext = {} as any;
            const authSession = { customerId: 'test-123', userType: 'registered' } as any;

            const result = await getServerShippingMethodsMapData(mockContext, authSession);

            expect(result).toHaveProperty('shipment-1');
        });
    });

    describe('fetchShippingMethodsMapForBasket', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should return empty object when basket is null', async () => {
            const mockContext = {} as any;
            const result = await fetchShippingMethodsMapForBasket(mockContext, null);
            expect(result).toEqual({});
        });

        it('should return empty object when basket has no basketId', async () => {
            const mockContext = {} as any;
            const basket = {
                shipments: [{ shippingAddress: { address1: '123 Main St' } }],
            } as any;

            const result = await fetchShippingMethodsMapForBasket(mockContext, basket);
            expect(result).toEqual({});
        });

        it('should return empty object when basket has no shipments', async () => {
            const mockContext = {} as any;
            const basket = {
                basketId: 'test-basket',
                shipments: undefined,
            } as any;

            const result = await fetchShippingMethodsMapForBasket(mockContext, basket);
            expect(result).toEqual({});
        });

        it('should return empty object when basket has empty shipments array', async () => {
            const mockContext = {} as any;
            const basket = {
                basketId: 'test-basket',
                shipments: [],
            } as any;

            const result = await fetchShippingMethodsMapForBasket(mockContext, basket);
            expect(result).toEqual({});
        });

        it('should fetch shipping methods for shipments with addresses', async () => {
            const { getShippingMethodsForShipment } = await import('@/lib/api/shipping-methods');

            vi.mocked(getShippingMethodsForShipment).mockResolvedValue({
                applicableShippingMethods: [{ id: 'standard', name: 'Standard' }],
            } as any);

            const mockContext = {} as any;
            const basket = {
                basketId: 'test-basket',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: { address1: '123 Main St' },
                    },
                ],
            } as any;

            const result = await fetchShippingMethodsMapForBasket(mockContext, basket);

            expect(result).toHaveProperty('shipment-1');
            expect(result['shipment-1'].applicableShippingMethods).toHaveLength(1);
        });

        it('should skip shipments without shipmentId', async () => {
            const { getShippingMethodsForShipment } = await import('@/lib/api/shipping-methods');

            const mockContext = {} as any;
            const basket = {
                basketId: 'test-basket',
                shipments: [
                    {
                        shipmentId: undefined,
                        shippingAddress: { address1: '123 Main St' },
                    },
                ],
            } as any;

            const result = await fetchShippingMethodsMapForBasket(mockContext, basket);

            expect(result).toEqual({});
            expect(getShippingMethodsForShipment).not.toHaveBeenCalled();
        });

        it('should skip shipments with empty shipping address', async () => {
            const { getShippingMethodsForShipment } = await import('@/lib/api/shipping-methods');

            const mockContext = {} as any;
            const basket = {
                basketId: 'test-basket',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: {},
                    },
                ],
            } as any;

            const result = await fetchShippingMethodsMapForBasket(mockContext, basket);

            expect(result).toEqual({});
            expect(getShippingMethodsForShipment).not.toHaveBeenCalled();
        });

        it('should handle fetch failures gracefully', async () => {
            const { getShippingMethodsForShipment } = await import('@/lib/api/shipping-methods');

            vi.mocked(getShippingMethodsForShipment).mockRejectedValue(new Error('API Error'));

            const mockContext = {} as any;
            const basket = {
                basketId: 'test-basket',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: { address1: '123 Main St' },
                    },
                ],
            } as any;

            const result = await fetchShippingMethodsMapForBasket(mockContext, basket);

            expect(result).toEqual({});
        });

        it('should handle multiple shipments with mixed success/failure', async () => {
            const { getShippingMethodsForShipment } = await import('@/lib/api/shipping-methods');

            vi.mocked(getShippingMethodsForShipment)
                .mockResolvedValueOnce({
                    applicableShippingMethods: [{ id: 'standard', name: 'Standard' }],
                } as any)
                .mockRejectedValueOnce(new Error('API Error'));

            const mockContext = {} as any;
            const basket = {
                basketId: 'test-basket',
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: { address1: '123 Main St' },
                    },
                    {
                        shipmentId: 'shipment-2',
                        shippingAddress: { address1: '456 Oak Ave' },
                    },
                ],
            } as any;

            const result = await fetchShippingMethodsMapForBasket(mockContext, basket);

            expect(result).toHaveProperty('shipment-1');
            expect(result).not.toHaveProperty('shipment-2');
        });
    });

    describe('initializeBasketForReturningCustomer', () => {
        const mockShopperBasketsClient = {
            updateCustomerForBasket: vi.fn(),
            updateShippingAddressForShipment: vi.fn(),
            updateBillingAddressForBasket: vi.fn(),
            updateShippingMethodForShipment: vi.fn(),
        };

        beforeEach(async () => {
            vi.clearAllMocks();
            const { createApiClients } = await import('@/lib/api-clients');
            vi.mocked(createApiClients).mockReturnValue({
                shopperBasketsV2: mockShopperBasketsClient,
            } as any);
        });

        it('should return null when basket or customer profile is missing', async () => {
            const { getBasket } = await import('@/middlewares/basket.server');
            const mockContext = {} as any;

            // Test missing basket
            vi.mocked(getBasket).mockResolvedValue({ current: undefined } as any);
            expect(await initializeBasketForReturningCustomer(mockContext, {} as CustomerProfile)).toBeNull();

            // Test missing customer profile
            vi.mocked(getBasket).mockResolvedValue({ current: { basketId: 'test-basket' } } as any);
            expect(
                await initializeBasketForReturningCustomer(mockContext, undefined as unknown as CustomerProfile)
            ).toBeNull();
        });

        it('should prefill email and shipping address when missing from basket', async () => {
            const { getBasket, updateBasketResource } = await import('@/middlewares/basket.server');
            const mockBasket = {
                basketId: 'test-basket',
                customerInfo: {},
                shipments: [{ shipmentId: 'me' }],
            };

            vi.mocked(getBasket).mockResolvedValue({ current: mockBasket } as any);
            vi.mocked(updateBasketResource).mockImplementation(() => {});

            mockShopperBasketsClient.updateCustomerForBasket.mockResolvedValue({
                data: { ...mockBasket, customerInfo: { email: 'test@example.com' } },
            });
            mockShopperBasketsClient.updateShippingAddressForShipment.mockResolvedValue({
                data: {
                    ...mockBasket,
                    shipments: [{ shipmentId: 'me', shippingAddress: { address1: '123 Main St' } }],
                },
            });
            mockShopperBasketsClient.updateBillingAddressForBasket.mockResolvedValue({ data: mockBasket });

            const mockCustomerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [
                    {
                        addressId: 'addr-1',
                        firstName: 'John',
                        lastName: 'Doe',
                        address1: '123 Main St',
                        city: 'Anytown',
                        stateCode: 'CA',
                        postalCode: '12345',
                        countryCode: 'US',
                    },
                ],
                paymentInstruments: [],
            } as CustomerProfile;

            const result = await initializeBasketForReturningCustomer({} as any, mockCustomerProfile);

            // Verify email was prefilled from customer profile
            expect(mockShopperBasketsClient.updateCustomerForBasket).toHaveBeenCalledWith({
                params: { path: { basketId: 'test-basket' } },
                body: { email: 'test@example.com' },
            });

            // Verify shipping address was prefilled from customer profile
            expect(mockShopperBasketsClient.updateShippingAddressForShipment).toHaveBeenCalledWith({
                params: { path: { basketId: 'test-basket', shipmentId: 'me' } },
                body: expect.objectContaining({
                    firstName: 'John',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'Anytown',
                    stateCode: 'CA',
                    postalCode: '12345',
                    countryCode: 'US',
                }),
            });

            expect(result).toBeTruthy();
        });

        it('should skip prefill when basket already has email and shipping address', async () => {
            const { getBasket } = await import('@/middlewares/basket.server');
            const mockBasket = {
                basketId: 'test-basket',
                customerInfo: { email: 'test@example.com' },
                shipments: [
                    {
                        shipmentId: 'me',
                        shippingAddress: { firstName: 'John', lastName: 'Doe', address1: '123 Main St' },
                    },
                ],
            };

            vi.mocked(getBasket).mockResolvedValue({ current: mockBasket } as any);

            const mockCustomerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [{ addressId: 'addr-1', countryCode: 'US', lastName: 'Doe' }],
                paymentInstruments: [],
            } as CustomerProfile;

            const result = await initializeBasketForReturningCustomer({} as any, mockCustomerProfile);

            expect(mockShopperBasketsClient.updateCustomerForBasket).not.toHaveBeenCalled();
            expect(mockShopperBasketsClient.updateShippingAddressForShipment).not.toHaveBeenCalled();
            expect(result).toEqual(mockBasket);
        });

        it('should handle API errors gracefully', async () => {
            const { getBasket } = await import('@/middlewares/basket.server');
            vi.mocked(getBasket).mockResolvedValue({
                current: { basketId: 'test-basket', customerInfo: {}, shipments: [{}] },
            } as any);
            mockShopperBasketsClient.updateCustomerForBasket.mockRejectedValue(new Error('API Error'));

            const mockCustomerProfile = {
                customer: { login: 'test@example.com' },
                addresses: [{ addressId: 'addr-1', countryCode: 'US', lastName: 'Doe' }],
                paymentInstruments: [],
            } as CustomerProfile;

            const result = await initializeBasketForReturningCustomer({} as any, mockCustomerProfile);
            expect(result).toBeNull();
        });
    });
});
