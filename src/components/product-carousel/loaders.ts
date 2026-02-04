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
import { fetchSearchProducts } from '@/lib/api/search';
import type { LoaderFunctionArgs } from 'react-router';
import { currencyContext } from '@/lib/currency';

const dataLoader = (args: { componentData: { [key: string]: unknown }; context: LoaderFunctionArgs['context'] }) => {
    const { componentData, context: routeContext } = args;
    const currency = routeContext.get(currencyContext) as string;

    // Extract configuration from component data
    // ToDo: The fallback should be removed and put in the component default data instead
    const categoryId = (componentData?.categoryId as string) || 'mens-clothing-shorts';
    const limit = (componentData?.limit as number) || 12;

    return fetchSearchProducts(routeContext, {
        categoryId,
        limit,
        currency,
    });
};

export const loader = {
    server: dataLoader,
};
