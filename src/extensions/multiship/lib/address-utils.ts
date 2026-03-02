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
