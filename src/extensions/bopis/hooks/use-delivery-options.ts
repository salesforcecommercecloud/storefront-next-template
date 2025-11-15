/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { DELIVERY_OPTIONS, type DeliveryOption } from '@/extensions/bopis/constants';
import { isStoreOutOfStock as storeOutOfStockFor, isSiteOutOfStock as siteOutOfStockFor } from '@/lib/inventory-utils';
import { usePickup } from '@/extensions/bopis/context/pickup-context';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';

interface UseDeliveryOptionsProps {
    /** The product to check inventory for */
    product?: ShopperProducts.schemas['Product'];
    /** The selected quantity to check inventory against */
    quantity: number;
    /** Whether the item is already in the basket - prevents auto-sync and auto-change behavior */
    isInBasket: boolean;
    /** The selected pickup store */
    pickupStore?: SelectedStoreInfo | null;
}

/**
 * Hook that manages delivery options logic including:
 * - Store inventory checking
 * - Pickup availability
 * - Delivery option state management
 *
 * @param props - The hook props
 * @returns Object containing delivery options state and handlers
 *
 * @example
 * ```tsx
 * const {
 *   selectedDeliveryOption,
 *   isStoreOutOfStock,
 *   isSiteOutOfStock,
 *   setSelectedDeliveryOption,
 *   handleDeliveryOptionChange
 * } = useDeliveryOptions({ product, quantity: 2 });
 * ```
 */
export function useDeliveryOptions({ product, quantity, isInBasket, pickupStore }: UseDeliveryOptionsProps) {
    // Local state for delivery options
    const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<DeliveryOption>(DELIVERY_OPTIONS.DELIVERY);

    const pickupContext = usePickup();
    const pickupRef = useRef(pickupContext);

    // Update ref when pickupContext changes
    useEffect(() => {
        pickupRef.current = pickupContext;
    }, [pickupContext]);

    // Memoize site/store OOS flags together for simpler deps/readability
    const { isStoreOutOfStock, isSiteOutOfStock } = useMemo(() => {
        return {
            isStoreOutOfStock: storeOutOfStockFor(product, pickupStore?.inventoryId, quantity),
            isSiteOutOfStock: siteOutOfStockFor(product, quantity),
        };
    }, [product, pickupStore?.inventoryId, quantity]);

    // Wrapper function that syncs delivery option changes to pickup context
    const handleDeliveryOptionChange = useCallback(
        (option: DeliveryOption) => {
            setSelectedDeliveryOption(option);
            const productId = product?.id;

            // Sync to pickup context if available
            if (pickupContext && productId && pickupStore?.inventoryId && pickupStore?.id) {
                if (option === DELIVERY_OPTIONS.PICKUP) {
                    pickupContext.addItem(productId, pickupStore.inventoryId, pickupStore.id);
                } else {
                    pickupContext.removeItem(productId);
                }
            }
        },
        [product?.id, pickupStore?.inventoryId, pickupStore?.id, pickupContext]
    );

    // Sync current delivery option to pickup context when dependencies change
    // This ensures pickup items are tracked even if the user doesn't change options
    useEffect(() => {
        // Skip sync for items already in the basket
        if (isInBasket) return;

        const productId = product?.id;
        const currentPickup = pickupRef.current;

        if (currentPickup && productId && pickupStore?.inventoryId && pickupStore?.id) {
            if (selectedDeliveryOption === DELIVERY_OPTIONS.PICKUP) {
                currentPickup.addItem(productId, pickupStore.inventoryId, pickupStore.id);
            } else {
                currentPickup.removeItem(productId);
            }
        }
    }, [selectedDeliveryOption, product?.id, pickupStore?.inventoryId, pickupStore?.id, isInBasket]);

    // Auto-change delivery option when current selection becomes unavailable
    // This also syncs to pickup context via handleDeliveryOptionChange
    useEffect(() => {
        // Skip auto-change for items already in the basket
        if (isInBasket) return;

        const isDeliveryAvailable = !isSiteOutOfStock;
        const isPickupAvailable = !isStoreOutOfStock && !!pickupStore?.inventoryId;

        // If both options are disabled, don't change anything
        if (!isDeliveryAvailable && !isPickupAvailable) {
            return;
        }

        // If current selection is unavailable, switch to the available option
        if (selectedDeliveryOption === DELIVERY_OPTIONS.PICKUP && !isPickupAvailable && isDeliveryAvailable) {
            handleDeliveryOptionChange(DELIVERY_OPTIONS.DELIVERY);
        } else if (selectedDeliveryOption === DELIVERY_OPTIONS.DELIVERY && !isDeliveryAvailable && isPickupAvailable) {
            handleDeliveryOptionChange(DELIVERY_OPTIONS.PICKUP);
        }
    }, [
        selectedDeliveryOption,
        isStoreOutOfStock,
        isSiteOutOfStock,
        pickupStore?.inventoryId,
        handleDeliveryOptionChange,
        isInBasket,
    ]);

    return {
        isStoreOutOfStock,
        isSiteOutOfStock,
        selectedDeliveryOption,
        setSelectedDeliveryOption,
        handleDeliveryOptionChange,
    };
}
