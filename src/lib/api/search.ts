import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { getConfig } from '@/config';
import { createApiClients } from '@/lib/api-clients';

export const fetchSearchProducts = (
    context: LoaderFunctionArgs['context'],
    parameters: {
        categoryId?: string;
        q?: string;
        filters?: Record<string, string[]>;
        sort?: string;
        limit?: number;
        offset?: number;
        expand?: ShopperSearch.operations['productSearch']['parameters']['query']['expand'];
        refine?: ShopperSearch.operations['productSearch']['parameters']['query']['refine'] | string[];
        select?: ShopperSearch.operations['productSearch']['parameters']['query']['select'];
        currency?: ShopperSearch.operations['productSearch']['parameters']['query']['currency'];
        allImages?: boolean;
        allVariationProperties?: boolean;
        perPricebook?: boolean;
    }
): Promise<ShopperSearch.schemas['ProductSearchResult']> => {
    const config = getConfig(context);
    const {
        categoryId,
        q = '',
        filters,
        sort = 'best-matches',
        limit = 24,
        offset = 0,
        expand = ['promotions', 'variations', 'prices', 'images', 'page_meta_tags', 'custom_properties'],
        refine = [],
        currency = config?.site?.currency || 'USD',
        allImages = true,
        allVariationProperties = true,
        perPricebook = true,
    } = parameters || {};

    // Build refinements for product search
    const refineSet = new Set<string>(refine);
    if (categoryId) {
        refineSet.add(`cgid=${categoryId}`);
    }
    if (filters) {
        Object.entries(filters).forEach(([key, values]) => {
            values.forEach((value) => {
                refineSet.add(`${key}=${value}`);
            });
        });
    }

    const clients = createApiClients(context);

    return clients.shopperSearch
        .productSearch({
            params: {
                query: {
                    q,
                    sort,
                    limit,
                    offset,
                    expand,

                    // This is a known type limitation, the API intelligently serializes the refine parameter (array) automatically, but the OAS types refers to string.
                    ...(refineSet.size > 0 && { refine: [...refineSet] as unknown as string }),
                    currency,
                    allImages,
                    allVariationProperties,
                    perPricebook,
                },
            },
        })
        .then(({ data }) => data);
};

export const fetchSearchSuggestions = (
    context: LoaderFunctionArgs['context'],
    parameters: {
        q: ShopperSearch.operations['getSearchSuggestions']['parameters']['query']['q'];
        expand?: ShopperSearch.operations['getSearchSuggestions']['parameters']['query']['expand'];
        limit?: ShopperSearch.operations['getSearchSuggestions']['parameters']['query']['limit'];
        currency?: ShopperSearch.operations['getSearchSuggestions']['parameters']['query']['currency'];
        includeEinsteinSuggestedPhrases?: boolean;
    }
): Promise<ShopperSearch.schemas['SuggestionResult']> => {
    const { q, expand, limit, currency, includeEinsteinSuggestedPhrases } = parameters;
    const clients = createApiClients(context);

    return clients.shopperSearch
        .getSearchSuggestions({
            params: {
                query: {
                    q,
                    ...(expand && { expand }),
                    ...(limit && { limit }),
                    ...(currency && { currency }),
                    ...(includeEinsteinSuggestedPhrases !== undefined && { includeEinsteinSuggestedPhrases }),
                },
            },
        })
        .then(({ data }) => data);
};
