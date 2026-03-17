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
import { isAddressEmpty } from './checkout-addresses';

describe('checkout-addresses', () => {
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
});
