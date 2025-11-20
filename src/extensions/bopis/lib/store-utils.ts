/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';
import type { ShopperBasketsV2, ShopperStores } from '@salesforce/storefront-next-runtime/scapi';
/**
 * Gets a display-friendly store name, falling back to the store ID if name is not available.
 *
 * @param store - The store object with optional name
 * @returns The store name if available, otherwise the store ID
 *
 * @example
 * ```tsx
 * const storeName = getStoreName(selectedStore);
 * // Returns "Downtown Store" if name exists, or "store-123" if name is undefined
 * ```
 */
export function getStoreName(store: SelectedStoreInfo): string {
    return store.name || store.id;
}

/**
 * Gets a store from the pickup stores map, with fallback behavior for graceful degradation.
 *
 * @param pickupStoreId - The store ID to look up (optional)
 * @param pickupStores - Map of store IDs to store objects
 * @returns The store from the map if found, a minimal store object with just the ID if not found,
 *          or undefined if no pickupStoreId provided
 *
 * @example
 * ```tsx
 * const basketPickupStore = getPickupStoreFromMap(pickupStoreId, pickupContext?.pickupStores);
 * // Returns full store object if in map, { id: 'store-123' } if not in map but ID exists, or undefined
 * ```
 */
export function getPickupStoreFromMap(
    pickupStoreId: string | undefined,
    pickupStores?: Map<string, SelectedStoreInfo | ShopperStores.schemas['Store']>
): SelectedStoreInfo | ShopperStores.schemas['Store'] | undefined {
    return pickupStoreId ? (pickupStores?.get(pickupStoreId) ?? { id: pickupStoreId }) : undefined;
}

/**
 * Normalizes a string value to an empty string
 * @param {string | undefined | null} value - The value to normalize
 * @returns {string} The normalized value
 */
const normalize = (value: string | undefined | null) => (!value ? '' : value);

/**
 * Compares a shipping address to a store address for equality
 * Handles undefined/null values gracefully by normalizing them to empty strings
 *
 * @param shippingAddress - Shipping address to compare
 * @param storeAddress - Store address to compare
 * @returns true if shipping address matches store address, false otherwise
 */
export function isPickupAddressSet(
    shippingAddress?: ShopperBasketsV2.schemas['OrderAddress'] | null,
    storeAddress?: ShopperStores.schemas['Store'] | null
): boolean {
    if (!shippingAddress || !storeAddress) return false;

    return (
        normalize(shippingAddress.address1) === normalize(storeAddress.address1) &&
        normalize(shippingAddress.city) === normalize(storeAddress.city) &&
        normalize(shippingAddress.stateCode) === normalize(storeAddress.stateCode) &&
        normalize(shippingAddress.postalCode) === normalize(storeAddress.postalCode) &&
        normalize(shippingAddress.countryCode) === normalize(storeAddress.countryCode)
    );
}
