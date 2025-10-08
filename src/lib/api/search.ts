import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperSearchTypes } from 'commerce-sdk-isomorphic';
import createClient from '@/lib/scapi';

export const fetchSearchProducts = (
    context: LoaderFunctionArgs['context'],
    parameters: {
        categoryId?: string;
        q?: string;
        filters?: Record<string, string[]>;
        sort?: string;
        limit?: number;
        offset?: number;
        expand?: ShopperSearchTypes.ProductSearchExpandEnum[];
        refine?: string[];
        select?: string;
        currency?: ShopperSearchTypes.CurrencyCode;
        allImages?: boolean;
        allVariationProperties?: boolean;
        perPricebook?: boolean;
    }
): Promise<ShopperSearchTypes.ProductSearchResult> => {
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

    return createClient(context).ShopperSearch.productSearch({
        parameters: {
            q,
            sort,
            limit,
            offset,
            expand,
            refine: [...refineSet] as never, // <-- This is an ugly type hack to get around the fact that the SDK doesn't officially accept a string array for the refine parameter
            currency,
            allImages,
            allVariationProperties,
            perPricebook,
        },
    });
};
