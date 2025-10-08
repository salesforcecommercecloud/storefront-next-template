/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { type ReactElement } from 'react';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import { cn } from '@/lib/utils';
import uiStrings from '@/temp-ui-string';

export const InventoryStatus = {
    IN_STOCK: 'in-stock',
    PRE_ORDER: 'pre-order',
    BACK_ORDER: 'back-order',
    OUT_OF_STOCK: 'out-of-stock',
    UNKNOWN: 'unknown',
} as const;

export type InventoryStatusType = (typeof InventoryStatus)[keyof typeof InventoryStatus];

interface InventoryMessageProps {
    product: ShopperProductsTypes.Product;
    currentVariant?: ShopperProductsTypes.Variant | null;
    className?: string;
    /**
     * Whether to show unknown inventory status messages. Defaults to false.
     * When false, unknown status messages are visually hidden.
     */
    showUnknownStatus?: boolean;
    /**
     * Custom function to determine inventory status. If not provided, uses the default logic.
     * This allows customers to implement their own inventory status determination logic.
     * Should return UNKNOWN instead of null when inventory data is unavailable.
     */
    getInventoryStatus?: (
        product: ShopperProductsTypes.Product,
        currentVariant?: ShopperProductsTypes.Variant | null
    ) => InventoryStatusType;
}

/**
 * Gets the inventory status based on product/variant data
 */
function getInventoryStatus(
    product: ShopperProductsTypes.Product,
    currentVariant?: ShopperProductsTypes.Variant | null
): InventoryStatusType {
    // Use variant inventory if available, otherwise use product inventory
    const inventory = currentVariant?.inventory || product.inventory;

    if (!inventory) return InventoryStatus.UNKNOWN;

    const isOrderable = inventory.orderable;
    const stockLevel = inventory.ats || 0;

    if (!isOrderable) {
        return InventoryStatus.OUT_OF_STOCK;
    }

    if (inventory.preorderable) {
        return InventoryStatus.PRE_ORDER;
    }

    if (inventory.backorderable) {
        return InventoryStatus.BACK_ORDER;
    }

    if (stockLevel > 0) {
        return InventoryStatus.IN_STOCK;
    }

    return InventoryStatus.OUT_OF_STOCK;
}

/**
 * Gets the appropriate message and styling for inventory status
 *
 * TODO: Fix these colors once the UX team has updated the colors.
 */
function getInventoryMessage(status: InventoryStatusType) {
    switch (status) {
        case InventoryStatus.IN_STOCK:
            return {
                message: uiStrings.product.inStock,
                className: 'text-success bg-success/10 border-success/20',
            };
        case InventoryStatus.PRE_ORDER:
            return {
                message: uiStrings.product.preOrder,
                className: 'text-info bg-info/10 border-info/20',
            };
        case InventoryStatus.BACK_ORDER:
            return {
                message: uiStrings.product.backOrder,
                className: 'text-warning bg-warning/10 border-warning/20',
            };
        case InventoryStatus.OUT_OF_STOCK:
            return {
                message: uiStrings.product.outOfStockLabel,
                className: 'text-destructive bg-destructive/10 border-destructive/20',
            };
        case InventoryStatus.UNKNOWN:
        default:
            return {
                message: 'Inventory unavailable',
                className: 'text-muted-foreground bg-muted border-border',
            };
    }
}

/**
 * Inventory Message Component
 *
 * Displays inventory status messages for products on the PDP:
 * - In stock: Green message
 * - Pre-order: Blue message
 * - Back order: Orange message
 * - Out of stock: Red message
 */
export default function InventoryMessage({
    product,
    currentVariant,
    className,
    showUnknownStatus = false,
    getInventoryStatus: customGetInventoryStatus,
}: InventoryMessageProps): ReactElement {
    const status = customGetInventoryStatus
        ? customGetInventoryStatus(product, currentVariant)
        : getInventoryStatus(product, currentVariant);

    const statusInfo = getInventoryMessage(status);
    const isUnknown = status === InventoryStatus.UNKNOWN;

    return (
        <div
            className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-md border text-sm font-medium',
                statusInfo.className,
                className,
                isUnknown && !showUnknownStatus && 'hidden' // Tailwind's display:none
            )}
            {...(isUnknown && !showUnknownStatus && { 'aria-hidden': true })}>
            {statusInfo.message}
        </div>
    );
}
