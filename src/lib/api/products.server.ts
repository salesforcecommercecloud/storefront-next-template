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

type GetProductsQuery = ShopperProducts.operations['getProducts']['parameters']['query'];
type GetProductQuery = ShopperProducts.operations['getProduct']['parameters']['query'];

export type FetchProductsByIdsOptions = Partial<Omit<GetProductsQuery, 'ids' | 'siteId'>>;
export type FetchProductByIdOptions = Partial<Omit<GetProductQuery, 'siteId'>>;

/**
 * Fetch multiple products by IDs.
 *
 * IMPORTANT: This function does NOT catch errors. Callers must handle:
 * - 404 errors (products not found)
 * - 401/403 errors (authentication/authorization)
 * - Network errors
 *
 * This ensures proper HTTP semantics for SEO and error boundaries.
 *
 * @param context - Router context
 * @param ids - Array of product IDs (will be deduplicated and trimmed)
 * @param options - Additional query parameters
 * @throws {ApiError} When API request fails
 */
export async function fetchProductsByIds(
    context: LoaderFunctionArgs['context'],
    ids: string[],
    options: FetchProductsByIdsOptions = {}
): Promise<ShopperProducts.schemas['Product'][]> {
    const normalizedIds = Array.from(
        new Set(ids.filter((id) => typeof id === 'string' && id.trim().length > 0).map((id) => id.trim()))
    );

    if (!normalizedIds.length) {
        return [];
    }

    const clients = createApiClients(context);
    const { data } = await clients.shopperProducts.getProducts({
        params: {
            query: {
                ids: normalizedIds,
                ...options,
            },
        },
    });

    return data?.data ?? [];
}

/**
 * Fetch a single product by ID.
 *
 * IMPORTANT: This function does NOT catch errors. Callers must handle:
 * - 404 errors (product not found) - critical for SEO
 * - 401/403 errors (authentication/authorization)
 * - Network errors
 *
 * Different contexts require different error handling:
 * - Page Designer ProductTile: Catch 404 → return null → show placeholder
 * - Product Detail Page: Let 404 propagate → error boundary → 404 page with proper HTTP status
 *
 * @param context - Router context
 * @param id - Product ID (will be trimmed)
 * @param options - Additional query parameters
 * @returns Product data or null if ID is empty/whitespace
 * @throws {ApiError} When API request fails (including 404s)
 */
export async function fetchProductById(
    context: LoaderFunctionArgs['context'],
    id: string,
    options: FetchProductByIdOptions = {}
): Promise<ShopperProducts.schemas['Product'] | null> {
    if (!id || id.trim().length === 0) {
        return null;
    }

    const clients = createApiClients(context);
    const { data } = await clients.shopperProducts.getProduct({
        params: {
            path: { id: id.trim() },
            query: { ...options },
        },
    });

    return data ?? null;
}
