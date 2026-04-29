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
import { ApiError, type ShopperExperience } from '@salesforce/storefront-next-runtime/scapi';
import { siteContext, type SiteContext } from '@salesforce/storefront-next-runtime/site-context';
import { convertProductToProductSearchHit } from '@/lib/product-conversion';
import { fetchProductById } from '@/lib/api/products.server';
import { getLogger } from '@/lib/logger.server';

const dataLoader = async (args: { componentData: unknown; context: LoaderFunctionArgs['context'] }) => {
    const { componentData, context: routeContext } = args;
    const comp = componentData as ShopperExperience.schemas['Component'];
    const productId = (comp.data as { productId?: string })?.productId;
    if (!productId?.trim()) {
        return null;
    }

    const currency = (routeContext.get(siteContext) as SiteContext).currency;
    const logger = getLogger(routeContext);

    try {
        const product = await fetchProductById(routeContext, productId, {
            allImages: true,
            perPricebook: true,
            ...(currency ? { currency } : {}),
        });

        return product ? convertProductToProductSearchHit(product) : null;
    } catch (error) {
        // Page Designer context: gracefully degrade to "Select a product" for 404s
        // Let other errors (auth, network) propagate for visibility
        if (error instanceof ApiError && error.status === 404) {
            logger.info('Product not found in catalog (Page Designer)', { productId });
            return null;
        }
        throw error;
    }
};

export const loader = {
    server: dataLoader,
};
