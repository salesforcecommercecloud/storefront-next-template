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
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';

type QueryParameters = Omit<Partial<ShopperSearch.operations['productSearch']['parameters']['query']>, 'refine'> & {
    refine?: ShopperSearch.operations['productSearch']['parameters']['query']['refine'] | string[];
};

export const fetchSearchProducts = (
    context: LoaderFunctionArgs['context'],
    parameters: QueryParameters
): Promise<ShopperSearch.schemas['ProductSearchResult']> => {
    /**
     * Please be very careful when modifying this array. The different expansion values have different, sometimes
     * significant, effects on the caching behavior of the resulting responses. The optional availability expansion
     * has the greatest impact here. If used, it enforces a TTL of only 60 seconds for the entire response, which
     * is why its use should be carefully considered due to its comprehensive effects on performance, scalability,
     * and cost-to-serve. In our out-of-the-box setting, we therefore only search for orderable products (see
     * `orderable_only` below), which means that consuming components can implicitly assume that the products found
     * are orderable.
     * @see {@link https://developer.salesforce.com/docs/commerce/commerce-api/references/shopper-search?meta=productSearch}
     * @see {@link https://developer.salesforce.com/docs/commerce/commerce-api/guide/server-side-web-tier-caching.html#default-cache-expiration-and-personalization-settings}
     * @see {@link https://developer.salesforce.com/docs/commerce/commerce-api/guide/server-side-web-tier-caching.html#expand-parameter-impact-on-cache-hit-rates}
     */
    const params: QueryParameters = {
        q: '',
        sort: 'best-matches' as const,
        limit: 24,
        offset: 0,
        expand: [
            'promotions', // <-- TTL = 900s
            'variations', // <-- TTL = 900s
            'prices', // <-- TTL = 900s
            'images', // <-- TTL = 900s
            'page_meta_tags',
            'custom_properties',
        ],
        allImages: true,
        allVariationProperties: true,
        perPricebook: true,
        ...(parameters || {}),
    };

    /**
     * Build refinements for product search. As indicated above, in our out-of-the-box setting we only search for
     * currently orderable products.
     */
    const refineSet = new Set<string>(params.refine || []);
    const appConfig = getConfig(context);
    if (appConfig?.search.products.refine?.orderableOnly === true) {
        // Make sure we don't accidentally overwrite any existing orderable_only refinements to avoid conflicts
        const orderableOnly = [...refineSet].find((r: string) => r.startsWith('orderable_only='));
        if (!orderableOnly) {
            refineSet.add('orderable_only=true');
        }
    }

    const clients = createApiClients(context);
    return clients.shopperSearch
        .productSearch({
            params: {
                query: {
                    ...(params as ShopperSearch.operations['productSearch']['parameters']['query']),
                    // This is a known type limitation, the API intelligently serializes the refine parameter (array)
                    // automatically, but the OAS types refers to a simple string.
                    ...(refineSet.size > 0 && { refine: [...refineSet] as unknown as string }),
                },
            },
        })
        .then(({ data }) => data);
};
