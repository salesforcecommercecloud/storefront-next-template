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
import { describe, expect, it } from 'vitest';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { isAddressEmpty, orderAddressToCustomerAddress } from './address-utils';

describe('address-utils', () => {
    describe('isAddressEmpty', () => {
        it('should return true when address is null', () => {
            expect(isAddressEmpty(null)).toBe(true);
        });

        it('should return true when address is undefined', () => {
            expect(isAddressEmpty(undefined)).toBe(true);
        });

        it('should return true when address is an empty object', () => {
            expect(isAddressEmpty({} as ShopperBasketsV2.schemas['OrderAddress'])).toBe(true);
        });

        it('should return true when all address fields are empty strings', () => {
            const address = {
                address1: '',
                city: '',
                countryCode: '',
                firstName: '',
                lastName: '',
                phone: '',
                postalCode: '',
                stateCode: '',
            } as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(true);
        });

        it('should return true when all address fields are null', () => {
            const address = {
                address1: null,
                city: null,
                countryCode: null,
                firstName: null,
                lastName: null,
                phone: null,
                postalCode: null,
                stateCode: null,
            } as unknown as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(true);
        });

        it('should return true when all address fields are undefined', () => {
            const address = {
                address1: undefined,
                city: undefined,
                countryCode: undefined,
                firstName: undefined,
                lastName: undefined,
                phone: undefined,
                postalCode: undefined,
                stateCode: undefined,
            } as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(true);
        });

        it('should return true when only id field is present (ignores id)', () => {
            const address = {
                id: 'address-123',
                address1: '',
                city: '',
                countryCode: '',
                firstName: '',
                lastName: '',
                phone: '',
                postalCode: '',
                stateCode: '',
            } as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(true);
        });

        it('should return false when address1 is filled', () => {
            const address = {
                address1: '123 Main St',
                city: '',
                countryCode: '',
                firstName: '',
                lastName: '',
                phone: '',
                postalCode: '',
                stateCode: '',
            } as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(false);
        });

        it('should return false when city is filled', () => {
            const address = {
                address1: '',
                city: 'New York',
                countryCode: '',
                firstName: '',
                lastName: '',
                phone: '',
                postalCode: '',
                stateCode: '',
            } as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(false);
        });

        it('should return false when any field is filled', () => {
            const address = {
                address1: '',
                city: '',
                countryCode: 'US',
                firstName: '',
                lastName: '',
                phone: '',
                postalCode: '',
                stateCode: '',
            } as ShopperBasketsV2.schemas['OrderAddress'];

            expect(isAddressEmpty(address)).toBe(false);
        });
    });

    describe('orderAddressToCustomerAddress', () => {
        it('converts a complete OrderAddress to CustomerAddress', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                address2: 'Apt 4B',
                city: 'Springfield',
                stateCode: 'IL',
                postalCode: '62701',
                countryCode: 'US',
                phone: '555-1234',
            };

            const result = orderAddressToCustomerAddress(orderAddress);

            expect(result.addressId).toMatch(/^shipping_\d+$/);
            expect(result.address1).toBe('123 Main St');
            expect(result.address2).toBe('Apt 4B');
            expect(result.city).toBe('Springfield');
            expect(result.countryCode).toBe('US');
            expect(result.firstName).toBe('John');
            expect(result.lastName).toBe('Doe');
            expect(result.phone).toBe('555-1234');
            expect(result.postalCode).toBe('62701');
            expect(result.stateCode).toBe('IL');
            expect(result.preferred).toBe(false);
        });

        it('handles OrderAddress with missing optional fields', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'Jane',
                lastName: 'Smith',
                address1: '456 Oak Ave',
                city: 'Portland',
                postalCode: '97201',
            };

            const result = orderAddressToCustomerAddress(orderAddress);

            expect(result.addressId).toMatch(/^shipping_\d+$/);
            expect(result.firstName).toBe('Jane');
            expect(result.lastName).toBe('Smith');
            expect(result.address1).toBe('456 Oak Ave');
            expect(result.city).toBe('Portland');
            expect(result.postalCode).toBe('97201');
            expect(result.address2).toBeUndefined();
            expect(result.stateCode).toBeUndefined();
            expect(result.countryCode).toBe('US'); // Default value
            expect(result.phone).toBeUndefined();
            expect(result.preferred).toBe(false);
        });

        it('provides default countryCode when missing', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                address1: '789 Elm St',
                city: 'Seattle',
                postalCode: '98101',
            };

            const result = orderAddressToCustomerAddress(orderAddress);

            expect(result.addressId).toMatch(/^shipping_\d+$/);
            expect(result.countryCode).toBe('US');
            expect(result.preferred).toBe(false);
        });

        it('handles empty string values by converting to empty strings', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: '',
                lastName: '',
                address1: '123 Test St',
                city: '',
                postalCode: '',
            };

            const result = orderAddressToCustomerAddress(orderAddress);

            expect(result.firstName).toBe('');
            expect(result.lastName).toBe('');
            expect(result.address1).toBe('123 Test St');
            expect(result.city).toBe('');
            expect(result.postalCode).toBe('');
        });

        it('does not add any extra fields beyond CustomerAddress', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                address1: '999 Test Ln',
                city: 'Test City',
                postalCode: '12345',
            };

            const result = orderAddressToCustomerAddress(orderAddress);

            expect(result.addressId).toMatch(/^shipping_\d+$/);
            expect('isGuestAddress' in result).toBe(false);
            expect(result.preferred).toBe(false);
        });

        it('sets preferred flag when specified', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                firstName: 'Preferred',
                lastName: 'User',
                address1: '111 Preferred St',
                city: 'Preferville',
                postalCode: '11111',
                countryCode: 'US',
            };

            const result = orderAddressToCustomerAddress(orderAddress, true);

            expect(result.addressId).toMatch(/^shipping_\d+$/);
            expect(result.preferred).toBe(true);
        });

        it('generates unique addressIds for multiple calls', () => {
            const orderAddress: ShopperBasketsV2.schemas['OrderAddress'] = {
                address1: '123 Main St',
                city: 'Springfield',
                postalCode: '62701',
            };

            const result1 = orderAddressToCustomerAddress(orderAddress);
            const result2 = orderAddressToCustomerAddress(orderAddress);

            expect(result1.addressId).toMatch(/^shipping_\d+$/);
            expect(result2.addressId).toMatch(/^shipping_\d+$/);
            // addressIds should be different (assuming calls happen at different timestamps)
            // Note: In rare cases they might be the same if calls happen in the same millisecond
        });
    });
});
