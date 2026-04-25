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
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients.server';

export const fetchCategory = (
    context: LoaderFunctionArgs['context'],
    id: string,
    levels: ShopperProducts.operations['getCategory']['parameters']['query']['levels'] = 0
): Promise<ShopperProducts.schemas['Category']> => {
    const clients = createApiClients(context);

    return clients.shopperProducts
        .getCategory({
            params: {
                path: {
                    id,
                },
                query: {
                    levels,
                },
            },
        })
        .then(({ data }) => data);
};

export const fetchCategories = async (
    context: LoaderFunctionArgs['context'],
    parentId: string = 'root',
    levels: ShopperProducts.operations['getCategories']['parameters']['query']['levels'] = 1
): Promise<ShopperProducts.schemas['Category'][]> => {
    const parentCategory = await fetchCategory(context, parentId, levels);
    return parentCategory.categories || [];
};
