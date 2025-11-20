/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { updateShipmentForPickup, setAddressAndMethodForPickup } from './shipment';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import type { RouterContextProvider } from 'react-router';
import { getConfig } from '@/config';
import { createApiClients } from '@/lib/api-clients';
import { PICKUP_SHIPPING_METHOD_ID } from '@/extensions/bopis/constants';
import { createMockBasketWithPickupItems, createMockStore } from '@/extensions/bopis/tests/__mocks__/basket';

// Mock createApiClients and getConfig
vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(),
}));

vi.mock('@/config', () => ({
    getConfig: vi.fn(),
}));

describe('Shipment API utilities', () => {
    const mockContext = {
        get: vi.fn(),
        set: vi.fn(),
    } as unknown as RouterContextProvider;

    const mockConfig = {
        commerce: {
            api: {
                organizationId: 'test-org',
                siteId: 'test-site',
            },
        },
    };

    describe('updateShipmentForPickup', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            vi.mocked(getConfig).mockReturnValue(mockConfig as any);
        });

        test('should update shipment with c_fromStoreId', async () => {
            const mockBasket: Partial<ShopperBasketsV2.schemas['Basket']> = {
                basketId: 'test-basket',
                shipments: [
                    {
                        shipmentId: 'me',
                        c_fromStoreId: 'store-123',
                    },
                ],
            };

            const mockUpdateShipmentForBasket = vi.fn().mockResolvedValue({ data: mockBasket });

            vi.mocked(createApiClients).mockReturnValue({
                shopperBasketsV2: {
                    updateShipmentForBasket: mockUpdateShipmentForBasket,
                },
            } as any);

            const result = await updateShipmentForPickup(mockContext, 'test-basket', 'me', 'store-123');

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: {
                    path: {
                        organizationId: 'test-org',
                        basketId: 'test-basket',
                        shipmentId: 'me',
                    },
                    query: {
                        siteId: 'test-site',
                    },
                },
                body: {
                    shipmentId: 'me',
                    c_fromStoreId: 'store-123',
                },
            });
            expect(result).toEqual(mockBasket);
        });

        test('should use default shipmentId "me"', async () => {
            const mockBasket: Partial<ShopperBasketsV2.schemas['Basket']> = {
                basketId: 'test-basket',
            };

            const mockUpdateShipmentForBasket = vi.fn().mockResolvedValue({ data: mockBasket });

            vi.mocked(createApiClients).mockReturnValue({
                shopperBasketsV2: {
                    updateShipmentForBasket: mockUpdateShipmentForBasket,
                },
            } as any);

            await updateShipmentForPickup(mockContext, 'test-basket', undefined, 'store-456');

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: {
                    path: {
                        organizationId: 'test-org',
                        basketId: 'test-basket',
                        shipmentId: 'me',
                    },
                    query: {
                        siteId: 'test-site',
                    },
                },
                body: {
                    shipmentId: 'me',
                    c_fromStoreId: 'store-456',
                },
            });
        });

        test('should handle API errors', async () => {
            const mockError = new Error('API Error');
            const mockUpdateShipmentForBasket = vi.fn().mockRejectedValue(mockError);

            vi.mocked(createApiClients).mockReturnValue({
                shopperBasketsV2: {
                    updateShipmentForBasket: mockUpdateShipmentForBasket,
                },
            } as any);

            await expect(updateShipmentForPickup(mockContext, 'test-basket', 'me', 'store-123')).rejects.toThrow(
                'API Error'
            );
        });
    });

    describe('setAddressAndMethodForPickup', () => {
        const mockStore = createMockStore('store-123', 'inventory-123');

        beforeEach(() => {
            vi.clearAllMocks();
            vi.mocked(getConfig).mockReturnValue(mockConfig as any);
        });

        test('should set store address and pickup shipping method', async () => {
            const mockBasket = createMockBasketWithPickupItems([], {
                basketId: 'test-basket',
            });

            const mockUpdateShipmentForBasket = vi.fn().mockResolvedValue({ data: mockBasket });

            vi.mocked(createApiClients).mockReturnValue({
                shopperBasketsV2: {
                    updateShipmentForBasket: mockUpdateShipmentForBasket,
                },
            } as any);

            const result = await setAddressAndMethodForPickup(mockContext, 'test-basket', mockStore, 'me');

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: {
                    path: {
                        organizationId: 'test-org',
                        basketId: 'test-basket',
                        shipmentId: 'me',
                    },
                    query: {
                        siteId: 'test-site',
                    },
                },
                body: {
                    shipmentId: 'me',
                    shippingAddress: {
                        firstName: 'Test Store',
                        lastName: 'Pickup',
                        address1: '123 Main St',
                        address2: 'Suite 100',
                        city: 'San Francisco',
                        stateCode: 'CA',
                        postalCode: '94102',
                        countryCode: 'US',
                    },
                    shippingMethod: {
                        id: PICKUP_SHIPPING_METHOD_ID,
                    },
                },
            });
            expect(result).toEqual(mockBasket);
        });

        test('should use default shipmentId "me"', async () => {
            const mockBasket = createMockBasketWithPickupItems([], {
                basketId: 'test-basket',
            });

            const mockUpdateShipmentForBasket = vi.fn().mockResolvedValue({ data: mockBasket });

            vi.mocked(createApiClients).mockReturnValue({
                shopperBasketsV2: {
                    updateShipmentForBasket: mockUpdateShipmentForBasket,
                },
            } as any);

            await setAddressAndMethodForPickup(mockContext, 'test-basket', mockStore);

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: {
                    path: {
                        organizationId: 'test-org',
                        basketId: 'test-basket',
                        shipmentId: 'me',
                    },
                    query: {
                        siteId: 'test-site',
                    },
                },
                body: {
                    shipmentId: 'me',
                    shippingAddress: expect.any(Object),
                    shippingMethod: {
                        id: PICKUP_SHIPPING_METHOD_ID,
                    },
                },
            });
        });

        test('should handle store with missing optional fields', async () => {
            const incompleteStore = {
                id: 'store-456',
                name: 'Incomplete Store',
                address1: '456 Oak Ave',
                city: 'Los Angeles',
                stateCode: 'CA',
                postalCode: '90001',
                countryCode: 'US',
                // Missing address2
            } as any;

            const mockBasket = createMockBasketWithPickupItems([], {
                basketId: 'test-basket',
            });

            const mockUpdateShipmentForBasket = vi.fn().mockResolvedValue({ data: mockBasket });

            vi.mocked(createApiClients).mockReturnValue({
                shopperBasketsV2: {
                    updateShipmentForBasket: mockUpdateShipmentForBasket,
                },
            } as any);

            await setAddressAndMethodForPickup(mockContext, 'test-basket', incompleteStore, 'me');

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: {
                    path: {
                        organizationId: 'test-org',
                        basketId: 'test-basket',
                        shipmentId: 'me',
                    },
                    query: {
                        siteId: 'test-site',
                    },
                },
                body: {
                    shipmentId: 'me',
                    shippingAddress: {
                        firstName: 'Incomplete Store',
                        lastName: 'Pickup',
                        address1: '456 Oak Ave',
                        address2: '', // Should default to empty string
                        city: 'Los Angeles',
                        stateCode: 'CA',
                        postalCode: '90001',
                        countryCode: 'US',
                    },
                    shippingMethod: {
                        id: PICKUP_SHIPPING_METHOD_ID,
                    },
                },
            });
        });

        test('should handle store with all undefined address fields', async () => {
            const emptyStore = {
                id: 'store-empty',
            } as any;

            const mockBasket = createMockBasketWithPickupItems([], {
                basketId: 'test-basket',
            });

            const mockUpdateShipmentForBasket = vi.fn().mockResolvedValue({ data: mockBasket });

            vi.mocked(createApiClients).mockReturnValue({
                shopperBasketsV2: {
                    updateShipmentForBasket: mockUpdateShipmentForBasket,
                },
            } as any);

            await setAddressAndMethodForPickup(mockContext, 'test-basket', emptyStore, 'me');

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: {
                    path: {
                        organizationId: 'test-org',
                        basketId: 'test-basket',
                        shipmentId: 'me',
                    },
                    query: {
                        siteId: 'test-site',
                    },
                },
                body: {
                    shipmentId: 'me',
                    shippingAddress: {
                        firstName: '', // All fields should default to empty string
                        lastName: 'Pickup',
                        address1: '',
                        address2: '',
                        city: '',
                        stateCode: '',
                        postalCode: '',
                        countryCode: '',
                    },
                    shippingMethod: {
                        id: PICKUP_SHIPPING_METHOD_ID,
                    },
                },
            });
        });

        test('should handle API errors', async () => {
            const mockError = new Error('API Error');
            const mockUpdateShipmentForBasket = vi.fn().mockRejectedValue(mockError);

            vi.mocked(createApiClients).mockReturnValue({
                shopperBasketsV2: {
                    updateShipmentForBasket: mockUpdateShipmentForBasket,
                },
            } as any);

            await expect(setAddressAndMethodForPickup(mockContext, 'test-basket', mockStore, 'me')).rejects.toThrow(
                'API Error'
            );
        });
    });
});
