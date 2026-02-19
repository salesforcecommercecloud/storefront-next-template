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

import { type ReactElement } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { cn } from '@/lib/utils';
import { useTranslation, type TFunction } from 'react-i18next';

export const InventoryStatus = {
    IN_STOCK: 'in-stock',
    PRE_ORDER: 'pre-order',
    BACK_ORDER: 'back-order',
    OUT_OF_STOCK: 'out-of-stock',
    UNKNOWN: 'unknown',
} as const;

export type InventoryStatusType = (typeof InventoryStatus)[keyof typeof InventoryStatus];

interface InventoryMessageProps {
    product: ShopperProducts.schemas['Product'];
    currentVariant?: ShopperProducts.schemas['Variant'] | null;
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
        product: ShopperProducts.schemas['Product'],
        currentVariant?: ShopperProducts.schemas['Variant'] | null
    ) => InventoryStatusType;
}

/**
 * Gets the inventory status based on product/variant data
 */
function getInventoryStatus(
    product: ShopperProducts.schemas['Product'],
    currentVariant?: ShopperProducts.schemas['Variant'] | null
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
function getInventoryMessage(status: InventoryStatusType, t: TFunction) {
    switch (status) {
        case InventoryStatus.IN_STOCK:
            return {
                message: t('inStock'),
                className: 'text-success bg-success/10 border-success/20',
            };
        case InventoryStatus.PRE_ORDER:
            return {
                message: t('preOrder'),
                className: 'text-info bg-info/10 border-info/20',
            };
        case InventoryStatus.BACK_ORDER:
            return {
                message: t('backOrder'),
                className: 'text-warning bg-warning/10 border-warning/20',
            };
        case InventoryStatus.OUT_OF_STOCK:
            return {
                message: t('outOfStockLabel'),
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
    const { t } = useTranslation('product');
    const status = customGetInventoryStatus
        ? customGetInventoryStatus(product, currentVariant)
        : getInventoryStatus(product, currentVariant);

    const statusInfo = getInventoryMessage(status, t);
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
