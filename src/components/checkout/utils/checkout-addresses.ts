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
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';

/**
 * Checks if an address has no meaningful content (all fields are empty/falsy)
 * Ignores the id field and only checks actual address fields
 * @param address - Address object to check
 * @returns true if address is empty or has no meaningful content
 */
export function isAddressEmpty(address: ShopperBasketsV2.schemas['OrderAddress'] | undefined | null): boolean {
    if (!address) return true;
    const normalize = (value: string | undefined | null) => (!value ? '' : value);
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
