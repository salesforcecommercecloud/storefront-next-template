/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, test, expect } from 'vitest';
import { getStoreName, getPickupStoreFromMap, isPickupAddressSet } from './store-utils';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';
import type { ShopperBasketsV2, ShopperStores } from '@salesforce/storefront-next-runtime/scapi';

describe('store-utils', () => {
    describe('getStoreName', () => {
        test('should return store name when available', () => {
            const store: SelectedStoreInfo = {
                id: 'store-123',
                name: 'Downtown Store',
            };

            expect(getStoreName(store)).toBe('Downtown Store');
        });

        test('should fallback to store ID when name is not available', () => {
            const store: SelectedStoreInfo = {
                id: 'store-456',
            };

            expect(getStoreName(store)).toBe('store-456');
        });

        test('should fallback to store ID when name is empty string', () => {
            const store: SelectedStoreInfo = {
                id: 'store-789',
                name: '',
            };

            expect(getStoreName(store)).toBe('store-789');
        });
    });

    describe('getPickupStoreFromMap', () => {
        test('should return store from map when found', () => {
            const store: SelectedStoreInfo = {
                id: 'store-123',
                name: 'Downtown Store',
            };
            const pickupStores = new Map<string, SelectedStoreInfo>();
            pickupStores.set('store-123', store);

            const result = getPickupStoreFromMap('store-123', pickupStores);

            expect(result).toEqual(store);
        });

        test('should return minimal store object with ID when not found in map', () => {
            const pickupStores = new Map<string, SelectedStoreInfo>();

            const result = getPickupStoreFromMap('store-456', pickupStores);

            expect(result).toEqual({ id: 'store-456' });
        });

        test('should return undefined when pickupStoreId is undefined', () => {
            const pickupStores = new Map<string, SelectedStoreInfo>();

            const result = getPickupStoreFromMap(undefined, pickupStores);

            expect(result).toBeUndefined();
        });

        test('should return undefined when pickupStoreId is undefined and pickupStores is undefined', () => {
            const result = getPickupStoreFromMap(undefined, undefined);

            expect(result).toBeUndefined();
        });

        test('should return minimal store object when pickupStores is undefined but ID is provided', () => {
            const result = getPickupStoreFromMap('store-789', undefined);

            expect(result).toEqual({ id: 'store-789' });
        });

        test('should return undefined when pickupStoreId is empty string', () => {
            const pickupStores = new Map<string, SelectedStoreInfo>();

            const result = getPickupStoreFromMap('', pickupStores);

            expect(result).toBeUndefined();
        });
    });

    describe('isPickupAddressSet', () => {
        const mockStoreAddress: ShopperStores.schemas['Store'] = {
            id: 'store-123',
            address1: '123 Main St',
            city: 'San Francisco',
            stateCode: 'CA',
            postalCode: '94102',
            countryCode: 'US',
        };

        const mockShippingAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
            address1: '123 Main St',
            city: 'San Francisco',
            stateCode: 'CA',
            postalCode: '94102',
            countryCode: 'US',
        };

        test('should return true when addresses match exactly', () => {
            const result = isPickupAddressSet(mockShippingAddress, mockStoreAddress);

            expect(result).toBe(true);
        });

        test('should return false when shippingAddress is undefined', () => {
            const result = isPickupAddressSet(undefined, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should return false when shippingAddress is null', () => {
            const result = isPickupAddressSet(null, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should return false when storeAddress is undefined', () => {
            const result = isPickupAddressSet(mockShippingAddress, undefined);

            expect(result).toBe(false);
        });

        test('should return false when storeAddress is null', () => {
            const result = isPickupAddressSet(mockShippingAddress, null);

            expect(result).toBe(false);
        });

        test('should return false when both addresses are undefined', () => {
            const result = isPickupAddressSet(undefined, undefined);

            expect(result).toBe(false);
        });

        test('should return false when address1 does not match', () => {
            const differentAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                ...mockShippingAddress,
                address1: '456 Oak Ave',
            };

            const result = isPickupAddressSet(differentAddress, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should return false when city does not match', () => {
            const differentAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                ...mockShippingAddress,
                city: 'Los Angeles',
            };

            const result = isPickupAddressSet(differentAddress, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should return false when stateCode does not match', () => {
            const differentAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                ...mockShippingAddress,
                stateCode: 'NY',
            };

            const result = isPickupAddressSet(differentAddress, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should return false when postalCode does not match', () => {
            const differentAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                ...mockShippingAddress,
                postalCode: '90001',
            };

            const result = isPickupAddressSet(differentAddress, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should return false when countryCode does not match', () => {
            const differentAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                ...mockShippingAddress,
                countryCode: 'CA',
            };

            const result = isPickupAddressSet(differentAddress, mockStoreAddress);

            expect(result).toBe(false);
        });

        test('should normalize undefined values to empty strings and compare correctly', () => {
            const addressWithUndefined: ShopperBasketsV2.schemas['OrderAddress'] = {
                address1: undefined as any,
                city: undefined as any,
                stateCode: undefined as any,
                postalCode: undefined as any,
                countryCode: undefined as any,
            };

            const storeWithUndefined: ShopperStores.schemas['Store'] = {
                id: 'store-123',
                address1: undefined as any,
                city: undefined as any,
                stateCode: undefined as any,
                postalCode: undefined as any,
                countryCode: undefined as any,
            };

            const result = isPickupAddressSet(addressWithUndefined, storeWithUndefined);

            expect(result).toBe(true);
        });

        test('should normalize null values to empty strings and compare correctly', () => {
            const addressWithNull: ShopperBasketsV2.schemas['OrderAddress'] = {
                address1: null as any,
                city: null as any,
                stateCode: null as any,
                postalCode: null as any,
                countryCode: null as any,
            };

            const storeWithNull: ShopperStores.schemas['Store'] = {
                id: 'store-123',
                address1: null as any,
                city: null as any,
                stateCode: null as any,
                postalCode: null as any,
                countryCode: null as any,
            };

            const result = isPickupAddressSet(addressWithNull, storeWithNull);

            expect(result).toBe(true);
        });

        test('should handle mixed undefined and actual values', () => {
            const addressWithMixedValues: ShopperBasketsV2.schemas['OrderAddress'] = {
                address1: '123 Main St',
                city: undefined as any,
                stateCode: 'CA',
                postalCode: undefined as any,
                countryCode: 'US',
            };

            const storeWithDifferentMixedValues: ShopperStores.schemas['Store'] = {
                id: 'store-123',
                address1: '123 Main St',
                city: 'San Francisco',
                stateCode: 'CA',
                postalCode: '94102',
                countryCode: 'US',
            };

            const result = isPickupAddressSet(addressWithMixedValues, storeWithDifferentMixedValues);

            expect(result).toBe(false);
        });
    });
});
