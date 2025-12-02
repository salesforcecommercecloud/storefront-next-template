/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
'use client';

import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetcher } from 'react-router';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';
import { useToast } from '@/components/toast';

interface ChangePickupStoreResponse {
    success: boolean;
    basket?: unknown;
    error?: string;
}

/**
 * Hook for changing the pickup store for all pickup items in the basket.
 *
 * This hook provides:
 * - `changeStore`: Function to change the pickup store
 *
 * The hook automatically handles responses and shows toast notifications.
 *
 * @returns Object containing change store function
 *
 * @example
 * ```tsx
 * const { changeStore } = useChangePickupStore();
 *
 * // Change store when user selects a new store
 * await changeStore(newStore);
 * ```
 */
export function useChangePickupStore() {
    const { t } = useTranslation('extBopis');
    const fetcher = useFetcher<ChangePickupStoreResponse>();
    const { addToast } = useToast();

    // Process response and show toast when data is available in 'loading' state
    // React Router automatically revalidates after successful action submissions,
    // so we don't need to manually trigger revalidation
    useEffect(() => {
        if (fetcher.state === 'loading' && fetcher.data) {
            const result = fetcher.data;

            if (result.success) {
                addToast(t('cart.pickupStoreInfo.storeChanged'), 'success');
            } else if (result.success === false || result.error) {
                const errorMessage = result.error || t('cart.pickupStoreInfo.changeStoreError');
                addToast(errorMessage, 'error');
            }
        }
    }, [fetcher.data, fetcher.state, addToast, t]);

    // Change the pickup store
    const changeStore = useCallback(
        async (store: SelectedStoreInfo) => {
            if (!store.id || !store.inventoryId) {
                addToast(t('cart.pickupStoreInfo.missingStoreIdOrInventoryIdError'), 'error');
                return;
            }

            const formData = new FormData();
            formData.append('storeId', store.id);
            formData.append('inventoryId', store.inventoryId);
            if (store.name) {
                formData.append('storeName', store.name);
            }

            await fetcher.submit(formData, {
                method: 'PATCH',
                action: '/action/cart-pickup-store-update',
            });
        },
        [fetcher, addToast, t]
    );

    return {
        changeStore,
    };
}
