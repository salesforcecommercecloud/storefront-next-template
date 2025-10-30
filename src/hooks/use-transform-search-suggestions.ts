import { useMemo } from 'react';
import type { ShopperSearchTypes } from 'commerce-sdk-isomorphic';
import { searchUrlBuilder } from '@/lib/url';

// Simple transformation interface for UI purposes only
interface TransformedSuggestions {
    categorySuggestions: Array<{
        name: string;
        link: string;
        type: string;
        image?: string;
        parentCategoryName?: string;
    }>;
    productSuggestions: Array<{
        name: string;
        link: string;
        image?: string;
        price?: number;
        currency?: string;
    }>;
    phraseSuggestions: Array<{
        name: string;
        link: string;
        exactMatch?: boolean;
    }>;
    searchPhrase?: string;
}

/**
 * Hook to transform commerce-sdk-isomorphic SuggestionResult into component-ready format
 * Uses only official SDK types as input, minimal transformation for UI needs
 */
export function useTransformSearchSuggestions(
    data: ShopperSearchTypes.SuggestionResult | null
): TransformedSuggestions | null {
    return useMemo(() => {
        if (!data) return null;

        const categorySuggestions =
            data.categorySuggestions?.categories?.map((cat) => ({
                name: cat.name || '',
                link: `/category/${cat.id}`,
                type: 'category',
                image: cat.image?.disBaseLink,
                parentCategoryName: cat.parentCategoryName,
            })) || [];

        const productSuggestions =
            data.productSuggestions?.products?.map((product) => ({
                name: product.productName || '',
                link: `/product/${product.productId}`,
                image: product.image?.disBaseLink,
                price: product.price,
                currency: product.currency,
            })) || [];

        const phraseSuggestions =
            data.productSuggestions?.suggestedPhrases?.map((phrase) => ({
                name: phrase.phrase || '',
                link: searchUrlBuilder(phrase.phrase || ''),
                exactMatch: phrase.exactMatch,
            })) || [];

        return {
            categorySuggestions,
            productSuggestions,
            phraseSuggestions,
            searchPhrase: data.searchPhrase,
        };
    }, [data]);
}
