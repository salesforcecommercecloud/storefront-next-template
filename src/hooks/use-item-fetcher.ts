/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

// React
import { useMemo } from 'react';

// React Router
import { useFetcher, useFetchers } from 'react-router';

interface UseItemFetcherOptions {
    /** The item ID to prefix the fetcher key with */
    itemId?: string;
    /** The component name to append to the fetcher key (e.g., 'cart-quantity-picker', 'remove-item-button') */
    componentName: string;
}

/**
 * Custom hook that creates a useFetcher with a prefixed itemId key
 *
 * This hook provides a consistent way to create fetchers for item-specific operations
 * while ensuring unique keys to prevent conflicts between multiple instances.
 *
 * @param options - Configuration object
 * @returns The fetcher instance (key accessible via fetcher.key, loading state via fetcher.state)
 *
 * @example
 * ```tsx
 * // In a cart quantity picker component
 * const fetcher = useItemFetcher({
 *   itemId: 'item-123',
 *   componentName: 'cart-quantity-picker'
 * });
 * const isLoading = fetcher.state === 'submitting';
 *
 * // In a remove item button component
 * const fetcher = useItemFetcher({
 *   itemId: 'item-123',
 *   componentName: 'remove-item-button'
 * });
 * ```
 */
export function useItemFetcher({ itemId, componentName }: UseItemFetcherOptions) {
    // Generate the fetcher key with itemId prefix (or just componentName if itemId is undefined)
    const fetcherKey = itemId ? `${itemId}-${componentName}` : '';

    // Create the fetcher with the generated key
    const fetcher = useFetcher({
        key: fetcherKey,
    });

    return fetcher;
}

/**
 * Hook that tracks loading state for all fetchers related to a specific item
 *
 * This hook uses useFetchers to monitor all active fetchers and determines
 * if any fetcher for the specified item is currently in a submitting state.
 * This is useful for showing loading indicators at the item level.
 *
 * @param itemId - The item ID to track fetchers for
 * @returns Boolean indicating if any fetcher for this item is loading
 *
 * @example
 * ```tsx
 * // In a ProductItem component
 * const isItemFetcherLoading = useItemFetcherLoading(product.itemId);
 *
 * return (
 *   <div>
 *     {isItemFetcherLoading && <Spinner />}
 *   </div>
 * );
 * ```
 */
export function useItemFetcherLoading(itemId?: string): boolean {
    const fetchers = useFetchers();

    return useMemo(() => {
        if (!itemId) return false;

        // Find all fetchers with keys starting with the itemId
        const itemFetchers = fetchers.filter((fetcher) => fetcher.key.startsWith(itemId));

        // Return true if any fetcher for this item is in 'submitting' state
        return itemFetchers.some((fetcher) => fetcher.state === 'submitting');
    }, [fetchers, itemId]);
}
