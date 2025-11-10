/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import { isProductSet } from './product-utils';

// @sfdc-extension-block-start SFDC_EXT_BOPIS
/**
 * Gets inventory data for a specific store by inventory ID.
 * Searches the product.inventories array for an inventory object matching the given inventory ID.
 *
 * @param product - The product containing inventory data in its inventories array
 * @param inventoryId - The inventory ID of the selected store to find
 * @returns Store-specific inventory data, or null if not found, product is undefined, inventoryId is undefined, or product.inventories is undefined/empty
 */
export function getStoreInventoryById(
    product: ShopperProductsTypes.Product | undefined,
    inventoryId: string | undefined
): ShopperProductsTypes.Inventory | null {
    if (!inventoryId || !product?.inventories) {
        return null;
    }
    return product.inventories.find((inv) => inv.id === inventoryId) || null;
}
// @sfdc-extension-block-end SFDC_EXT_BOPIS

// @sfdc-extension-block-start SFDC_EXT_BOPIS
/**
 * Returns whether the selected store is out of stock for the given product and quantity.
 *
 * A product is considered out of stock if:
 * - It is not orderable, OR
 * - The stock level is less than the requested quantity
 *
 * Behavior by product type:
 * - For sets: returns true if ANY child product is not orderable or lacks sufficient stockLevel
 * - For regular/bundle: uses the product's inventory at the specified store
 *
 * @param product - The product to check store inventory for
 * @param selectedStoreInventoryId - The inventory ID of the selected store (must be provided for store inventory check)
 * @param quantity - The quantity to check availability for (default: 1)
 * @returns true if product is out of stock at the store, false if in stock or if product/selectedStoreInventoryId is undefined
 */
export function isStoreOutOfStock(
    product: ShopperProductsTypes.Product | undefined,
    selectedStoreInventoryId: string | undefined,
    quantity: number = 1
): boolean {
    if (!product || !selectedStoreInventoryId) {
        return false;
    }

    if (isProductSet(product) && product.setProducts) {
        return product.setProducts.some((childProduct) => {
            const childInventory = getStoreInventoryById(childProduct, selectedStoreInventoryId);
            const stockLevel = childInventory?.stockLevel ?? 0;
            return !childInventory || !childInventory.orderable || stockLevel < quantity;
        });
    }

    const storeInventory = getStoreInventoryById(product, selectedStoreInventoryId);
    const stockLevel = storeInventory?.stockLevel ?? 0;
    return !storeInventory || !storeInventory.orderable || stockLevel < quantity;
}
// @sfdc-extension-block-end SFDC_EXT_BOPIS

/**
 * Returns whether the site-level inventory is out of stock for the given product and quantity.
 *
 * A product is considered out of stock if:
 * - It is not orderable, OR
 * - The available to sell (ats) is less than the requested quantity
 *
 * Behavior by product type:
 * - For sets: returns true if ANY child product has ats below quantity or is not orderable
 * - For regular/bundle: uses product.inventory ats/orderable
 *
 * Variant precedence:
 * - If variant is provided, variant.inventory takes precedence over product.inventory for site inventory
 * - Returns true if no inventory is found (neither variant.inventory nor product.inventory)
 *
 * @param product - The product to check site inventory for
 * @param quantity - The quantity to check availability for (default: 1)
 * @param variant - Optional variant to use for site inventory (takes precedence over product.inventory)
 * @returns true if product is out of stock at site level, false if in stock or if product is undefined
 */
export function isSiteOutOfStock(
    product: ShopperProductsTypes.Product | undefined,
    quantity: number = 1,
    variant?: ShopperProductsTypes.Variant | null
): boolean {
    if (!product) {
        return false;
    }

    if (isProductSet(product) && product.setProducts) {
        return product.setProducts.some((childProduct) => {
            const ats = childProduct.inventory?.ats ?? 0;
            const orderable = childProduct.inventory?.orderable ?? false;
            return ats < quantity || !orderable;
        });
    }

    // Site inventory: variant takes precedence over product
    const inventory = variant?.inventory || product.inventory;
    if (!inventory) return true;

    const ats = inventory.ats ?? 0;
    const orderable = inventory.orderable ?? false;
    return ats < quantity || !orderable;
}

/**
 * Gets the effective inventory object considering both store and site inventory.
 *
 * Selection logic:
 * - If isPickup is true and storeInventoryId is provided: returns store inventory from product.inventories array
 * - Otherwise: returns site inventory (variant.inventory takes precedence over product.inventory if variant is provided)
 *
 * @param product - The product containing inventory data
 * @param isPickup - Whether store pickup is selected (true) or delivery is selected (false)
 * @param storeInventoryId - The inventory ID of the selected store (required when isPickup is true)
 * @param variant - Optional variant to use for site inventory (takes precedence over product.inventory when isPickup is false)
 * @returns Inventory object if found, or null if not found or if product is undefined
 */
export function getEffectiveInventory(
    product: ShopperProductsTypes.Product | undefined,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    isPickup: boolean,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    storeInventoryId: string | undefined,
    variant?: ShopperProductsTypes.Variant | null
): ShopperProductsTypes.Inventory | null {
    if (!product) return null;

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    if (isPickup && storeInventoryId) {
        // Store inventory: use product.inventories array
        return getStoreInventoryById(product, storeInventoryId);
    }
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    // Site inventory: variant takes precedence over product
    return variant?.inventory || product.inventory || null;
}

/**
 * Gets the effective stock level considering both store and site inventory.
 *
 * Selection logic:
 * - If isPickup is true and storeInventoryId is provided: returns store inventory stockLevel from product.inventories array
 * - Otherwise: returns site inventory ats (available to sell)
 * - Variant precedence: when using site inventory, variant.inventory takes precedence over product.inventory
 *
 * Behavior by product type:
 * - For sets: returns the minimum stock level across all child products
 * - For regular/bundle: returns the stock level for the product itself
 *
 * @param product - The product to get stock level for
 * @param isPickup - Whether store pickup is selected (true) or delivery is selected (false)
 * @param storeInventoryId - The inventory ID of the selected store (required when isPickup is true)
 * @param variant - Optional variant to use for site inventory (takes precedence over product.inventory when isPickup is false)
 * @returns The stock level number (0 if product is undefined, inventory not found, or stock level is unavailable)
 */
export function getEffectiveStockLevel(
    product: ShopperProductsTypes.Product | undefined,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    isPickup: boolean,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    storeInventoryId: string | undefined,
    variant?: ShopperProductsTypes.Variant | null
): number {
    if (!product) return 0;

    // For product sets, check all children and return minimum
    if (isProductSet(product) && product.setProducts) {
        const childStockLevels = product.setProducts.map((childProduct) => {
            // @sfdc-extension-block-start SFDC_EXT_BOPIS
            if (isPickup && storeInventoryId) {
                const childInventory = getStoreInventoryById(childProduct, storeInventoryId);
                return childInventory?.stockLevel ?? 0;
            }
            // @sfdc-extension-block-end SFDC_EXT_BOPIS
            return childProduct.inventory?.ats ?? 0;
        });
        return Math.min(...childStockLevels);
    }

    // For regular/bundle products, use helper function
    const inventory = getEffectiveInventory(
        product,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        isPickup,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        storeInventoryId,
        variant
    );
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    if (isPickup && storeInventoryId) {
        return inventory?.stockLevel ?? 0;
    }
    // @sfdc-extension-block-end SFDC_EXT_BOPIS
    return inventory?.ats ?? 0;
}

/**
 * Checks if product is in stock considering both store and site inventory.
 *
 * A product is considered in stock if:
 * - It is orderable, AND
 * - The stock level is greater than or equal to the requested quantity
 *
 * Selection logic:
 * - If isPickup is true and storeInventoryId is provided: checks store inventory (from product.inventories array)
 * - Otherwise: checks site inventory
 * - Variant precedence: when using site inventory, variant.inventory takes precedence over product.inventory
 *
 * Behavior by product type:
 * - For sets: ALL children must be in stock (orderable AND stock >= quantity for each child)
 * - For regular/bundle: checks the product's own inventory
 *
 * Implementation note: This function reuses isStoreOutOfStock and isSiteOutOfStock for consistency,
 * where isInStock = !isOutOfStock.
 *
 * @param product - The product to check inventory for
 * @param isPickup - Whether store pickup is selected (true) or delivery is selected (false)
 * @param storeInventoryId - The inventory ID of the selected store (required when isPickup is true)
 * @param quantity - The quantity to check availability for (default: 1)
 * @param variant - Optional variant to use for site inventory (takes precedence over product.inventory when isPickup is false)
 * @returns true if product is orderable and has sufficient stock, false if out of stock or if product is undefined
 */
export function isInStock(
    product: ShopperProductsTypes.Product | undefined,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    isPickup: boolean,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    storeInventoryId: string | undefined,
    quantity: number = 1,
    variant?: ShopperProductsTypes.Variant | null
): boolean {
    if (!product) return false;

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    if (isPickup && storeInventoryId) {
        return !isStoreOutOfStock(product, storeInventoryId, quantity);
    }
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    return !isSiteOutOfStock(product, quantity, variant);
}
