import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';

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
        refine?: ShopperSearch.operations['productSearch']['parameters']['query']['refine'];
        select?: ShopperSearch.operations['productSearch']['parameters']['query']['select'];
        currency?: ShopperSearch.operations['productSearch']['parameters']['query']['currency'];
        allImages?: boolean;
        allVariationProperties?: boolean;
        perPricebook?: boolean;
    }
): Promise<ShopperSearch.schemas['ProductSearchResult']> => {
    const {
        categoryId,
        q = '',
        filters,
        sort = 'best-matches',
        limit = 24,
        offset = 0,
        expand = ['promotions', 'variations', 'prices', 'images', 'page_meta_tags', 'custom_properties'],
        refine = [],
        currency = 'USD',
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

    const config = getConfig(context);
    const clients = createApiClients(context);

    return clients.shopperSearch
        .productSearch({
            params: {
                path: {
                    organizationId: config.commerce.api.organizationId,
                },
                query: {
                    siteId: config.commerce.api.siteId,
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
    }
): Promise<ShopperSearch.schemas['SuggestionResult']> => {
    const { q, expand, limit, currency } = parameters;
    const config = getConfig(context);
    const clients = createApiClients(context);

    return clients.shopperSearch
        .getSearchSuggestions({
            params: {
                path: {
                    organizationId: config.commerce.api.organizationId,
                },
                query: {
                    siteId: config.commerce.api.siteId,
                    q,
                    ...(expand && { expand }),
                    ...(limit && { limit }),
                    ...(currency && { currency }),
                },
            },
        })
        .then(({ data }) => data);
};
