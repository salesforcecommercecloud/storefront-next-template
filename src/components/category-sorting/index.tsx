'use client';

import { type ReactElement, useCallback, useMemo, useId } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { ShopperSearchTypes } from 'commerce-sdk-isomorphic';

import { SelectNative } from '@/components/ui/select-native';
import { PRODUCT_SEARCH_QUERY_PARAMS } from '@/lib/query-params';

/**
 * CategorySorting Component
 *
 * Renders a dropdown select control that allows users to sort product search results
 * by different criteria (e.g., brand, price, name, etc.). The component updates
 * the URL parameters when a new sorting option is selected, triggering a page navigation
 * to refresh the results with the new sort order.
 *
 * @param props - Component props
 * @param props.result - Product search result object from Salesforce Commerce Cloud
 * @param props.result.sortingOptions - Array of available sorting options with id and label
 * @param props.result.selectedSortingOption - Currently selected sorting option ID
 *
 * @returns A select dropdown for sorting options, or null if no sorting options are available
 *
 * @example
 * ```tsx
 * <CategorySorting result={productSearchResult} />
 * ```
 *
 * Features:
 * - Uses native select component with consistent UI styling
 * - Generates unique IDs to support multiple instances on the same page
 * - Automatically updates URL parameters (sort, offset) when selection changes
 * - Accessible with proper label-select association
 */
export default function CategorySorting({
    result,
}: {
    result: ShopperSearchTypes.ProductSearchResult;
}): ReactElement | null {
    const navigate = useNavigate();
    const location = useLocation();
    const selectId = useId();

    const sortingOptions = useMemo(() => result?.sortingOptions || [], [result?.sortingOptions]);
    const navigatePage = useCallback(
        (sort: string) => {
            const params = new URLSearchParams(location.search);
            params.set(PRODUCT_SEARCH_QUERY_PARAMS.SORT, sort);
            params.set(PRODUCT_SEARCH_QUERY_PARAMS.OFFSET, '0');
            return navigate({
                ...location,
                search: `?${params.toString()}`,
            });
        },
        [location, navigate]
    );

    return (
        <div className="flex items-center space-x-2">
            <label htmlFor={selectId} className="text-sm text-muted-foreground">
                Sort by:
            </label>
            <SelectNative
                id={selectId}
                value={result.selectedSortingOption || ''}
                onChange={(e) => void navigatePage(e.target.value)}>
                {sortingOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.label}
                    </option>
                ))}
            </SelectNative>
        </div>
    );
}
