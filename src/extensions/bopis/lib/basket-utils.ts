/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import type { PickupItemInfo } from '../context/pickup-context';

/**
 * Extracts pickup items from basket by checking shipments for store pickup.
 *
 * For items to be marked as pickup:
 * 1. The basket must have a shipment with c_fromStoreId set (indicating store pickup)
 * 2. Product items in that shipment must have an inventoryId
 *
 * Note: When c_fromStoreId is set on a shipment, all items in that shipment are
 * pickup items from that store. The inventoryId on product items will be the
 * store's inventory ID (not the site's global inventory).
 *
 * @param basket - The shopping basket containing shipments and product items
 * @returns Map of productId to PickupItemInfo (inventoryId and storeId)
 *
 * @example
 * ```tsx
 * const basket = getBasket(context);
 * const pickupItems = getPickupItemsFromBasket(basket);
 *
 * return (
 *   <PickupProvider initialItems={pickupItems}>
 *     <CartContent />
 *   </PickupProvider>
 * );
 * ```
 */
export function getPickupItemsFromBasket(
    basket: ShopperBasketsV2.schemas['Basket'] | undefined
): Map<string, PickupItemInfo> {
    const pickupItems = new Map<string, PickupItemInfo>();

    // Return empty map if basket, shipments, or product items don't exist
    if (!basket?.shipments || !basket.productItems) {
        return pickupItems;
    }

    // Build a map of shipmentId -> storeId for pickup shipments
    const pickupShipments = new Map<string, string>();
    basket.shipments.forEach((shipment) => {
        if (shipment.shipmentId && shipment.c_fromStoreId) {
            pickupShipments.set(shipment.shipmentId, shipment.c_fromStoreId);
        }
    });

    // If no pickup shipments, return early
    if (pickupShipments.size === 0) {
        return pickupItems;
    }

    // Iterate through product items once and check if they belong to a pickup shipment
    basket.productItems.forEach((item) => {
        // Skip if item doesn't have required fields
        if (!item.productId || !item.inventoryId || !item.shipmentId) {
            return;
        }

        // Check if this item's shipment is a pickup shipment
        const storeId = pickupShipments.get(item.shipmentId);
        if (storeId) {
            pickupItems.set(item.productId, {
                inventoryId: item.inventoryId,
                storeId,
            });
        }
    });

    return pickupItems;
}

/**
 * Extracts unique inventory IDs from pickup shipments in the basket.
 *
 * This function is useful when fetching product data that needs store-level
 * inventory information. It collects all inventory IDs from items in shipments
 * that have c_fromStoreId set (store pickup shipments).
 *
 * @param basket - The shopping basket containing shipments and product items
 * @returns Sorted array of unique inventory IDs from pickup items, or empty array if none found
 *
 * @example
 * ```tsx
 * const basket = getBasket(context);
 * const inventoryIds = getInventoryIdsFromPickupShipments(basket);
 *
 * const productsResponse = await client.ShopperProducts.getProducts({
 *     parameters: {
 *         ids: productIds,
 *         allImages: true,
 *         ...(inventoryIds.length > 0 ? { inventoryIds } : {}),
 *     },
 * });
 * ```
 */
export function getInventoryIdsFromPickupShipments(
    basket: ShopperBasketsV2.schemas['Basket'] | null | undefined
): string[] {
    // Return empty array if basket, shipments, or product items don't exist
    if (!basket?.shipments || !basket.productItems) {
        return [];
    }

    // Build a set of shipment IDs that are for pickup (have c_fromStoreId)
    const pickupShipmentIds = new Set<string>();
    basket.shipments.forEach((shipment) => {
        if (shipment.shipmentId && shipment.c_fromStoreId) {
            pickupShipmentIds.add(shipment.shipmentId);
        }
    });

    // If no pickup shipments, return early
    if (pickupShipmentIds.size === 0) {
        return [];
    }

    // Collect unique inventory IDs from items in pickup shipments
    const inventoryIds = new Set<string>();
    basket.productItems.forEach((item) => {
        if (item.shipmentId && item.inventoryId && pickupShipmentIds.has(item.shipmentId)) {
            inventoryIds.add(item.inventoryId);
        }
    });

    // Convert to array and sort
    return Array.from(inventoryIds).sort();
}

/**
 * Extracts unique store IDs from pickup shipments in the basket.
 *
 * This function collects all c_fromStoreId values from shipments that have
 * store pickup configured, returning them as a sorted array of unique values.
 * Useful for batch operations that need to know which stores are involved
 * in the current basket.
 *
 * @param basket - The shopping basket containing shipments
 * @returns Sorted array of unique store IDs from pickup shipments, or empty array if none found
 *
 * @example
 * ```tsx
 * const basket = getBasket(context);
 * const storeIds = getStoreIdsFromBasket(basket);
 *
 * // Fetch store details for all stores in the basket
 * const { data: stores } = useScapiFetcher({
 *     method: 'getStores',
 *     parameters: {
 *         ids: storeIds,
 *     },
 * });
 * ```
 */
export function getStoreIdsFromBasket(basket: ShopperBasketsV2.schemas['Basket'] | null | undefined): string[] {
    // Collect unique store IDs from shipments
    const storeIds = new Set<string>();
    basket?.shipments?.forEach((shipment) => {
        if (shipment.c_fromStoreId) {
            storeIds.add(shipment.c_fromStoreId);
        }
    });

    // Convert to array and sort
    return Array.from(storeIds).sort();
}

/**
 * Gets the store ID (c_fromStoreId) for a specific basket item.
 *
 * This function looks up a product item by its itemId and returns the c_fromStoreId
 * from its associated shipment. If the item is in a store pickup shipment, this will
 * return the store ID. For regular delivery shipments, this returns undefined.
 *
 * @param basket - The shopping basket containing shipments and product items
 * @param itemId - The itemId of the product item to look up (optional)
 * @returns The store ID (c_fromStoreId) if the item is in a pickup shipment, undefined otherwise
 *
 * @example
 * ```tsx
 * const basket = getBasket(context);
 * const storeId = getStoreIdForBasketItem(basket, 'item-123');
 *
 * if (storeId) {
 *     // Item is for store pickup from this store
 *     console.log(`Item will be picked up from store: ${storeId}`);
 * } else {
 *     // Item is for regular delivery or not found
 *     console.log('Item is for delivery');
 * }
 * ```
 */
export function getStoreIdForBasketItem(
    basket: ShopperBasketsV2.schemas['Basket'] | null | undefined,
    itemId?: string
): string | undefined {
    if (!itemId) return undefined;

    // Find the product item with the given itemId
    const productItem = basket?.productItems?.find((item) => item.itemId === itemId);

    // Find the shipment for this item and return its store ID
    const shipment = basket?.shipments?.find((s) => s.shipmentId === productItem?.shipmentId);

    return shipment?.c_fromStoreId;
}
