import { useCallback, useMemo } from 'react';
import type { ShopperSearchTypes } from 'commerce-sdk-isomorphic';
import { useScapiFetcher } from './use-scapi-fetcher';

export interface UseSearchSuggestionsOptions {
    q: string;
    expand?: ('images' | 'prices')[];
    limit?: number;
    currency?: ShopperSearchTypes.CurrencyCode;
    enabled?: boolean;
}

export interface SearchSuggestionsResult {
    data?: ShopperSearchTypes.SuggestionResult;
    isLoading: boolean;
    refetch: () => Promise<void>;
}

/**
 * Hook for fetching search suggestions using Commerce SDK
 * Uses useScapiFetcher for Commerce SDK operations
 */
export function useSearchSuggestions({
    q,
    expand,
    limit,
    currency,
    enabled = true,
}: UseSearchSuggestionsOptions): SearchSuggestionsResult {
    // Prepare parameters for Commerce SDK getSearchSuggestions method
    const parameters = useMemo(
        () => ({
            parameters: {
                q,
                ...(expand && { expand }),
                ...(limit && { limit }),
                ...(currency && { currency }),
            },
        }),
        [q, expand, limit, currency]
    );

    // Use useScapiFetcher hook for Commerce SDK operations
    const fetcher = useScapiFetcher('ShopperSearch', 'getSearchSuggestions', parameters);

    const refetch = useCallback(async (): Promise<void> => {
        if (!enabled || !q?.trim()) {
            throw new Error('Search suggestions disabled or query is empty');
        }
        await fetcher.load();
        // Data will be available in fetcher.data after load completes
    }, [fetcher, enabled, q]);

    return {
        data: fetcher.data,
        isLoading: fetcher.state === 'loading',
        refetch,
    };
}
