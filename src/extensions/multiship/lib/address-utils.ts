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
 * Creates a normalized string key from an address for comparison purposes
 * @param address - The address to create a key for
 * @returns A hyphen-separated string of normalized address fields
 */
export function getAddressKey(
    address: ShopperBasketsV2.schemas['OrderAddress'] | ShopperCustomers.schemas['CustomerAddress']
): string {
    return `${normalize(address.firstName)}-${normalize(address.lastName)}-${normalize(address.address1)}-${normalize(address.city)}-${normalize(address.stateCode)}-${normalize(address.postalCode)}-${normalize(address.countryCode)}`;
}

/**
 * Compares two shipping addresses for equality
 * Similar to isPickupAddressSet in bopis/lib/store-utils.ts
 */
export function isAddressEqual(
    address1?: ShopperBasketsV2.schemas['OrderAddress'] | null,
    address2?: ShopperBasketsV2.schemas['OrderAddress'] | null
): boolean {
    if (!address1 || !address2) return false;

    return getAddressKey(address1) === getAddressKey(address2);
}

/**
 * Formats an address for display
 * @param address - The address to format
 * @param fallbackText - Text to display if address is null/undefined (defaults to empty string)
 * @returns Formatted address string
 */
export function formatAddress(
    address?: ShopperBasketsV2.schemas['OrderAddress'] | null,
    fallbackText: string = ''
): string {
    if (!address) return fallbackText;

    const parts = [
        address.firstName && address.lastName ? `${address.firstName} ${address.lastName}` : null,
        address.address1,
        address.city && address.stateCode ? `${address.city}, ${address.stateCode}` : address.city || address.stateCode,
        address.postalCode,
    ].filter(Boolean);

    return parts.join(', ');
}

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
 * Converts a CustomerAddress to an OrderAddress format
 * Uses the same structure as the shipping address submission body
 *
 * @param customerAddress - The customer address to convert
 * @returns OrderAddress without id (id should be added separately from addressId)
 */
export function customerAddressToOrderAddress(
    customerAddress: ShopperCustomers.schemas['CustomerAddress']
): ShopperBasketsV2.schemas['OrderAddress'] {
    return {
        address1: customerAddress.address1,
        address2: customerAddress.address2,
        city: customerAddress.city,
        countryCode: customerAddress.countryCode,
        firstName: customerAddress.firstName,
        lastName: customerAddress.lastName,
        phone: customerAddress.phone,
        postalCode: customerAddress.postalCode,
        stateCode: customerAddress.stateCode,
    };
}
