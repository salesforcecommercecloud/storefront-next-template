/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import { useStoreLocator } from '@/extensions/store-locator/providers/store-locator';
import { DELIVERY_OPTIONS, type DeliveryOption } from '@/extensions/bopis/constants';
import { isStoreOutOfStock as storeOutOfStockFor, isSiteOutOfStock as siteOutOfStockFor } from '@/lib/inventory-utils';
import { usePickup } from '@/extensions/bopis/context/pickup-context';

interface UseDeliveryOptionsProps {
    /** The product to check inventory for */
    product?: ShopperProductsTypes.Product;
    /** The selected quantity to check inventory against */
    quantity: number;
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
export function useDeliveryOptions({ product, quantity }: UseDeliveryOptionsProps) {
    // Local state for delivery options
    const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<DeliveryOption>(DELIVERY_OPTIONS.DELIVERY);

    const selectedStore = useStoreLocator((state) => state.selectedStoreInfo);
    const pickupContext = usePickup();
    const pickupRef = useRef(pickupContext);

    // Update ref when pickupContext changes
    useEffect(() => {
        pickupRef.current = pickupContext;
    }, [pickupContext]);

    // Memoize site/store OOS flags together for simpler deps/readability
    const { isStoreOutOfStock, isSiteOutOfStock } = useMemo(() => {
        return {
            isStoreOutOfStock: storeOutOfStockFor(product, selectedStore?.inventoryId, quantity),
            isSiteOutOfStock: siteOutOfStockFor(product, quantity),
        };
    }, [product, selectedStore?.inventoryId, quantity]);

    // Wrapper function that syncs delivery option changes to pickup context
    const handleDeliveryOptionChange = useCallback(
        (option: DeliveryOption) => {
            setSelectedDeliveryOption(option);
            const productId = product?.id;

            // Sync to pickup context if available
            if (pickupContext && productId && selectedStore?.inventoryId && selectedStore?.id) {
                if (option === DELIVERY_OPTIONS.PICKUP) {
                    pickupContext.addItem(productId, selectedStore.inventoryId, selectedStore.id);
                } else {
                    pickupContext.removeItem(productId);
                }
            }
        },
        [product?.id, selectedStore?.inventoryId, selectedStore?.id, pickupContext]
    );

    // Sync current delivery option to pickup context when dependencies change
    // This ensures pickup items are tracked even if the user doesn't change options
    useEffect(() => {
        const productId = product?.id;
        const currentPickup = pickupRef.current;

        if (currentPickup && productId && selectedStore?.inventoryId && selectedStore?.id) {
            if (selectedDeliveryOption === DELIVERY_OPTIONS.PICKUP) {
                currentPickup.addItem(productId, selectedStore.inventoryId, selectedStore.id);
            } else {
                currentPickup.removeItem(productId);
            }
        }
    }, [selectedDeliveryOption, product?.id, selectedStore?.inventoryId, selectedStore?.id]);

    // Auto-change delivery option when current selection becomes unavailable
    // This also syncs to pickup context via handleDeliveryOptionChange
    useEffect(() => {
        const isDeliveryAvailable = !isSiteOutOfStock;
        const isPickupAvailable = !isStoreOutOfStock && !!selectedStore?.inventoryId;

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
        selectedStore?.inventoryId,
        handleDeliveryOptionChange,
    ]);

    return {
        isStoreOutOfStock,
        isSiteOutOfStock,
        selectedDeliveryOption,
        setSelectedDeliveryOption,
        handleDeliveryOptionChange,
    };
}
