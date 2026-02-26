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

import type { ShopperBasketsV2, ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';

/**
 * Normalizes address field values for comparison
 */
const normalize = (value: string | undefined | null) => (!value ? '' : value);

/**
 * Converts an OrderAddress to a CustomerAddress format
 * This is useful for creating guest addresses or converting between address types
 *
 * @param orderAddress - The order address to convert
 * @param preferred - Whether this should be marked as a preferred address (defaults to false)
 * @returns CustomerAddress with auto-generated addressId
 */
export function orderAddressToCustomerAddress(
    orderAddress: ShopperBasketsV2.schemas['OrderAddress'],
    preferred: boolean = false
): ShopperCustomers.schemas['CustomerAddress'] {
    return {
        addressId: `shipping_${Date.now()}`, // Generate unique address ID
        address1: orderAddress.address1 || '',
        address2: orderAddress.address2,
        city: orderAddress.city || '',
        countryCode: orderAddress.countryCode || 'US',
        firstName: orderAddress.firstName || '',
        lastName: orderAddress.lastName || '',
        phone: orderAddress.phone,
        postalCode: orderAddress.postalCode || '',
        stateCode: orderAddress.stateCode,
        preferred,
    };
}

/**
 * Checks if an address has no meaningful content (all fields are empty/falsy)
 * Ignores the id field and only checks actual address fields
 * @param address - Address object to check
 * @returns true if address is empty or has no meaningful content
 */
export function isAddressEmpty(address: ShopperBasketsV2.schemas['OrderAddress'] | undefined | null): boolean {
    if (!address) return true;
    return (
        normalize(address.address1) === '' &&
        normalize(address.city) === '' &&
        normalize(address.countryCode) === '' &&
        normalize(address.firstName) === '' &&
        normalize(address.lastName) === '' &&
        normalize(address.phone) === '' &&
        normalize(address.postalCode) === '' &&
        normalize(address.stateCode) === ''
    );
}
