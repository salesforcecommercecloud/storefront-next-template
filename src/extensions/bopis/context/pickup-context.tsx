/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
'use client';

import { createContext, useContext, useState, useCallback, type PropsWithChildren } from 'react';
import type { ShopperStores } from '@salesforce/storefront-next-runtime/scapi';

/**
 * Store and inventory information for pickup items
 */
export interface PickupItemInfo {
    inventoryId: string;
    storeId: string;
}

/**
 * Context for managing Buy Online, Pick-up In Store (BOPIS) items.
 * Maintains a map of productId -> pickup info (inventoryId, storeId) for items marked for store pickup.
 *
 * This is separate from the store-locator UI state to maintain proper separation
 * of concerns: store-locator manages UI state (modal, search, selection),
 * while pickup context manages business logic state (which products need pickup).
 *
 * @note This context is client-side only and scoped to the page/component tree.
 */
interface PickupContextType {
    /** Map of productId to pickup info (inventoryId, storeId) for items marked for store pickup */
    pickupBasketItems: Map<string, PickupItemInfo>;
    /** Map of storeId to store details for pickup stores in the basket */
    pickupStores: Map<string, ShopperStores.schemas['Store']>;
    /** Add a product to the pickup items map */
    addItem: (productId: string, inventoryId: string, storeId: string) => void;
    /** Remove a product from the pickup items map */
    removeItem: (productId: string) => void;
    /** Clear all pickup items */
    clearItems: () => void;
}

const PickupContext = createContext<PickupContextType | null>(null);

interface PickupProviderProps {
    /** Optional initial pickup items (e.g., from server state or cart) */
    initialItems?: Map<string, PickupItemInfo>;
    /** Store details for pickup stores in the basket */
    initialPickupStores?: Map<string, ShopperStores.schemas['Store']>;
}

/**
 * Provider for pickup state management.
 * Should be placed at the page or layout level where pickup functionality is needed.
 *
 * **Usage:**
 * - Wrap product view or cart components with this provider
 * - Use `usePickup` hook in child components to access pickup state
 * - Optionally pass `initialItems` to pre-populate the pickup map
 *
 * @example
 * ```tsx
 * <PickupProvider>
 *   <ProductView />
 * </PickupProvider>
 * ```
 *
 * @example
 * ```tsx
 * // With initial items from cart
 * const existingPickupItems = getPickupItemsFromCart(basket);
 * <PickupProvider initialItems={existingPickupItems}>
 *   <ProductView />
 * </PickupProvider>
 * ```
 */
const PickupProvider = ({ children, initialItems, initialPickupStores }: PropsWithChildren<PickupProviderProps>) => {
    const [pickupBasketItems, setPickupBasketItems] = useState<Map<string, PickupItemInfo>>(initialItems ?? new Map());
    const [pickupStores] = useState<Map<string, ShopperStores.schemas['Store']>>(initialPickupStores ?? new Map());

    const addItem = useCallback((productId: string, inventoryId: string, storeId: string) => {
        setPickupBasketItems((prev) => {
            const newMap = new Map(prev);
            newMap.set(productId, { inventoryId, storeId });
            return newMap;
        });
    }, []);

    const removeItem = useCallback((productId: string) => {
        setPickupBasketItems((prev) => {
            const newMap = new Map(prev);
            newMap.delete(productId);
            return newMap;
        });
    }, []);

    const clearItems = useCallback(() => {
        setPickupBasketItems(new Map());
    }, []);

    return (
        <PickupContext.Provider value={{ pickupBasketItems, pickupStores, addItem, removeItem, clearItems }}>
            {children}
        </PickupContext.Provider>
    );
};

/**
 * Hook for accessing pickup context.
 *
 * **Note:** In the current implementation, pickup data is only available when PickupProvider is mounted.
 * Components should handle the case where pickup context might be `undefined`.
 *
 * @returns Pickup state and actions, or undefined if no PickupProvider is mounted
 *
 * @example
 * ```tsx
 * function DeliveryOptions() {
 *     const pickup = usePickup();
 *     if (pickup) {
 *         const { pickupBasketItems, pickupStores, addItem } = pickup;
 *         // ... use the context
 *     }
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export const usePickup = (): PickupContextType | null => {
    return useContext(PickupContext);
};

export default PickupProvider;
