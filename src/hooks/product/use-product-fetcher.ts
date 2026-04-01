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

import { useEffect } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';

type Product = ShopperProducts.schemas['Product'];

export interface UseProductFetcherOptions {
    /**
     * The product ID to fetch
     */
    targetProductId: string | undefined;
    /**
     * The SCAPI fetcher instance configured for getProduct
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetcher: ScapiFetcher<Product, any>;
    /**
     * Optional: The ID of the currently loaded product (to skip redundant fetches)
     */
    currentProductId?: string;
    /**
     * Callback invoked when product data is successfully received and validated
     */
    onDataReceived: (product: Product) => void;
    /**
     * Optional: Validate that the loaded product matches this ID
     * If provided, only calls onDataReceived if the loaded product matches
     */
    validateProductId?: string;
    /**
     * Optional: Enable/disable the fetcher (default: true)
     */
    enabled?: boolean;
}

/**
 * Shared hook for fetching and synchronizing product data
 *
 * This hook combines two core patterns used across the application:
 * 1. Trigger fetcher.load() when a product ID changes
 * 2. Process fetcher data and sync to component state
 *
 * Used by:
 * - CartItemEditModal: Fetches variants reactively as user changes selections
 * - BonusProductModal: Fetches initial product on open, handles mid-session productId changes
 *
 * @param options - Configuration options for the fetcher
 */
export function useProductFetcher({
    targetProductId,
    fetcher,
    currentProductId,
    onDataReceived,
    validateProductId,
    enabled = true,
}: UseProductFetcherOptions) {
    // Effect 1: Trigger fetcher load when target product ID changes
    useEffect(() => {
        // Skip if disabled or no target product ID
        if (!enabled || !targetProductId) {
            return;
        }

        // Skip if it's already the currently displayed product
        if (targetProductId === currentProductId) {
            return;
        }

        // Only fetch if fetcher is idle (not already loading)
        if (fetcher.state === 'idle') {
            void fetcher.load();
        }
        // fetcher is a stable object from useScapiFetcher, safe to omit from deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, targetProductId, currentProductId, fetcher.state]);

    // Effect 2: Process fetcher data when it arrives
    useEffect(() => {
        // Only process when fetch is successful, has data, and is idle
        if (!fetcher.success || !fetcher.data || fetcher.state !== 'idle') {
            return;
        }

        const loadedProduct = fetcher.data;

        // If validation is requested, check if loaded product matches expected ID
        if (validateProductId) {
            const isCorrectProduct =
                loadedProduct.id === validateProductId ||
                loadedProduct.variants?.some((v) => v.productId === validateProductId);

            if (!isCorrectProduct) {
                // Loaded product doesn't match what we expected (stale data)
                return;
            }
        }

        // Notify consumer that data is ready
        onDataReceived(loadedProduct);
    }, [fetcher.success, fetcher.data, fetcher.state, onDataReceived, validateProductId]);
}
