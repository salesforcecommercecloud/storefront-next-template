/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { clearPickupFromShipment, updateShipmentForPickup, setAddressAndMethodForPickup } from './shipment';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import type { RouterContextProvider } from 'react-router';
import { getConfig } from '@/config';
import { createApiClients } from '@/lib/api-clients';
import { getShippingMethodsForShipment } from '@/lib/api/shipping-methods';
import { PICKUP_SHIPPING_METHOD_ID } from '@/extensions/bopis/constants';
import { createMockBasketWithPickupItems, createMockStore } from '@/extensions/bopis/tests/__mocks__/basket';

// Mock createApiClients and getConfig
vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(),
}));

vi.mock('@/config', () => ({
    getConfig: vi.fn(),
}));

vi.mock('@/lib/api/shipping-methods', () => ({
    getShippingMethodsForShipment: vi.fn(),
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

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getConfig).mockReturnValue(mockConfig as any);
    });

    // Helper function to setup mock API clients with updateShipmentForBasket
    function setupMockApiClients(mockUpdateShipmentForBasket: ReturnType<typeof vi.fn>) {
        vi.mocked(createApiClients).mockReturnValue({
            shopperBasketsV2: {
                updateShipmentForBasket: mockUpdateShipmentForBasket,
            },
        } as any);
    }

    // Helper function to create common params structure
    function createShipmentParams(basketId: string, shipmentId: string = 'me') {
        return {
            path: {
                organizationId: 'test-org',
                basketId,
                shipmentId,
            },
            query: {
                siteId: 'test-site',
            },
        };
    }

    // Helper function to create common body structure for clearing pickup
    function createClearedPickupBody(shipmentId: string, shippingMethodId: string) {
        return {
            shipmentId,
            c_fromStoreId: null,
            shippingAddress: {},
            shippingMethod: { id: shippingMethodId },
        };
    }

    describe('updateShipmentForPickup', () => {
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
            setupMockApiClients(mockUpdateShipmentForBasket);

            const result = await updateShipmentForPickup(mockContext, 'test-basket', 'me', 'store-123');

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: createShipmentParams('test-basket', 'me'),
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
            setupMockApiClients(mockUpdateShipmentForBasket);

            await updateShipmentForPickup(mockContext, 'test-basket', undefined, 'store-456');

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: createShipmentParams('test-basket', 'me'),
                body: {
                    shipmentId: 'me',
                    c_fromStoreId: 'store-456',
                },
            });
        });

        test('should handle API errors', async () => {
            const mockError = new Error('API Error');
            const mockUpdateShipmentForBasket = vi.fn().mockRejectedValue(mockError);
            setupMockApiClients(mockUpdateShipmentForBasket);

            await expect(updateShipmentForPickup(mockContext, 'test-basket', 'me', 'store-123')).rejects.toThrow(
                'API Error'
            );
        });
    });

    describe('setAddressAndMethodForPickup', () => {
        const mockStore = createMockStore('store-123', 'inventory-123');

        test('should set store address and pickup shipping method', async () => {
            const mockBasket = createMockBasketWithPickupItems([], {
                basketId: 'test-basket',
            });

            const mockUpdateShipmentForBasket = vi.fn().mockResolvedValue({ data: mockBasket });
            setupMockApiClients(mockUpdateShipmentForBasket);

            const result = await setAddressAndMethodForPickup(mockContext, 'test-basket', mockStore, 'me');

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: createShipmentParams('test-basket', 'me'),
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
            setupMockApiClients(mockUpdateShipmentForBasket);

            await setAddressAndMethodForPickup(mockContext, 'test-basket', mockStore);

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: createShipmentParams('test-basket', 'me'),
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
            setupMockApiClients(mockUpdateShipmentForBasket);

            await setAddressAndMethodForPickup(mockContext, 'test-basket', incompleteStore, 'me');

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: createShipmentParams('test-basket', 'me'),
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
            setupMockApiClients(mockUpdateShipmentForBasket);

            await setAddressAndMethodForPickup(mockContext, 'test-basket', emptyStore, 'me');

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: createShipmentParams('test-basket', 'me'),
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
            setupMockApiClients(mockUpdateShipmentForBasket);

            await expect(setAddressAndMethodForPickup(mockContext, 'test-basket', mockStore, 'me')).rejects.toThrow(
                'API Error'
            );
        });
    });

    describe('clearPickupFromShipment', () => {
        test('should clear pickup fields and set default shipping method from defaultShippingMethodId', async () => {
            const mockBasket = createMockBasketWithPickupItems(
                [{ productId: 'product-1', inventoryId: 'inventory-1', storeId: 'store-123' }],
                {
                    basketId: 'test-basket',
                }
            );

            vi.mocked(getShippingMethodsForShipment).mockResolvedValue({
                defaultShippingMethodId: 'default-shipping-method',
                applicableShippingMethods: [
                    { id: 'standard-shipping', name: 'Standard' },
                    { id: 'express-shipping', name: 'Express' },
                ],
            } as any);

            const mockUpdateShipmentForBasket = vi.fn().mockResolvedValue({ data: mockBasket });
            setupMockApiClients(mockUpdateShipmentForBasket);

            const result = await clearPickupFromShipment(mockContext, 'test-basket', 'me');

            expect(getShippingMethodsForShipment).toHaveBeenCalledWith(mockContext, 'test-basket', 'me');
            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: createShipmentParams('test-basket', 'me'),
                body: createClearedPickupBody('me', 'default-shipping-method'),
            });
            expect(result).toEqual(mockBasket);
        });

        test('should use first applicable shipping method when defaultShippingMethodId is missing', async () => {
            const mockBasket = createMockBasketWithPickupItems(
                [{ productId: 'product-1', inventoryId: 'inventory-1', storeId: 'store-123' }],
                {
                    basketId: 'test-basket',
                }
            );

            vi.mocked(getShippingMethodsForShipment).mockResolvedValue({
                applicableShippingMethods: [
                    { id: 'first-method', name: 'First Method' },
                    { id: 'second-method', name: 'Second Method' },
                ],
            } as any);

            const mockUpdateShipmentForBasket = vi.fn().mockResolvedValue({ data: mockBasket });
            setupMockApiClients(mockUpdateShipmentForBasket);

            await clearPickupFromShipment(mockContext, 'test-basket', 'me');

            expect(mockUpdateShipmentForBasket).toHaveBeenCalledWith({
                params: createShipmentParams('test-basket', 'me'),
                body: createClearedPickupBody('me', 'first-method'),
            });
        });

        test('should handle API errors from getShippingMethodsForShipment', async () => {
            const mockError = new Error('Shipping methods API Error');

            vi.mocked(getShippingMethodsForShipment).mockRejectedValue(mockError);

            await expect(clearPickupFromShipment(mockContext, 'test-basket', 'me')).rejects.toThrow(
                'Shipping methods API Error'
            );
        });

        test('should handle API errors from updateShipmentForBasket', async () => {
            const mockError = new Error('Update shipment API Error');

            vi.mocked(getShippingMethodsForShipment).mockResolvedValue({
                defaultShippingMethodId: 'default-method',
            } as any);

            const mockUpdateShipmentForBasket = vi.fn().mockRejectedValue(mockError);
            setupMockApiClients(mockUpdateShipmentForBasket);

            await expect(clearPickupFromShipment(mockContext, 'test-basket', 'me')).rejects.toThrow(
                'Update shipment API Error'
            );
        });
    });
});
