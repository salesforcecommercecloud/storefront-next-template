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

import { useState, useCallback } from 'react';
import type { ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { useRecommendersAdapter } from '@/providers/recommenders';
import { convertProductToProductSearchHit } from '@/lib/product-conversion';
import { encodeBase64Url } from '@/lib/url';
import { useAuth } from '@/providers/auth';
import { useCurrency } from '@/providers/currency';

/**
 * Union type for products from either Shopper Products API or Shopper Search API
 */
export type Product = ShopperProducts.schemas['Product'] | ShopperSearch.schemas['ProductSearchHit'];

/**
 * Enriched product recommendation
 * Combines ProductSearchHit with Einstein-specific metadata
 */
export type EnrichedRecommendation = ShopperSearch.schemas['ProductSearchHit'] & {
    /** Einstein recommendation ID */
    id: string;
    /** Einstein image URL */
    image_url?: string;
    /** Einstein product name */
    product_name?: string;
    /** Einstein product URL */
    product_url?: string;
};

/**
 * Recommender metadata
 */
export type RecommenderInfo = {
    /** Recommender name/ID */
    name: string;
    /** Human-readable description */
    description: string;
};

/**
 * Recommendation response from Einstein
 * After enrichment, recs will contain full ProductSearchHit objects with Einstein metadata
 */
export type Recommendation = {
    /** Unique ID for this recommendation set */
    recoUUID?: string;
    /** Name of the recommender that generated these recommendations */
    recommenderName?: string;
    /** Display message from Einstein (optional title override) */
    displayMessage?: string;
    /** Array of enriched product recommendations */
    recs?: EnrichedRecommendation[];
    /** Available recommenders (from getRecommenders call) */
    recommenders?: RecommenderInfo[];
};

/**
 * Generic Recommenders Adapter Interface
 */
export interface RecommendersAdapter {
    /**
     * Get a list of available recommenders
     */
    getRecommenders(): Promise<Recommendation>;

    /**
     * Get recommendations by recommender name
     */
    getRecommendations(
        recommenderName: string,
        products?: Product[],
        args?: Record<string, unknown>
    ): Promise<Recommendation>;

    /**
     * Get recommendations for a specific zone
     */
    getZoneRecommendations(
        zoneName: string,
        products?: Product[],
        args?: Record<string, unknown>
    ): Promise<Recommendation>;
}

/**
 * Enriches recommendation data with detailed product information from SCAPI.
 * This is a pure function that combines Einstein recommendations with SCAPI product data.
 */
function enrichRecommendationsWithProducts(
    reco: Recommendation,
    products: ShopperProducts.schemas['Product'][]
): Recommendation {
    if (!reco.recs?.length || !products.length) {
        return reco;
    }

    const enrichedRecs: EnrichedRecommendation[] = reco.recs
        .map((rec): EnrichedRecommendation | null => {
            const product = products.find((p) => p.id === rec.id);
            if (!product) {
                return null;
            }

            const productSearchHit = convertProductToProductSearchHit(product);

            if (!productSearchHit.productId) {
                return null;
            }

            const finalProductId = productSearchHit.productId || product.id || rec.id || '';

            return {
                ...productSearchHit,
                productId: finalProductId,
                id: product.id || finalProductId,
                image_url: rec.image_url,
                product_name: rec.product_name,
                product_url: rec.product_url,
            };
        })
        .filter((rec): rec is EnrichedRecommendation => rec !== null);

    return { ...reco, recs: enrichedRecs };
}

/**
 * Generic Recommenders Hook
 *
 * Simplified Async Flow:
 * 1. getRecommendations() is called
 * 2. Set loading state
 * 3. Fetch Einstein recommendations (IDs + metadata) from adapter
 * 4. Fetch product details from SCAPI using helper function
 * 5. Enrich recommendations with product data
 * 6. Set final recommendations and clear loading
 *
 * Everything happens in one async flow inside the callback, no complex state machine.
 */
export const useRecommenders = (isEnabled: boolean = true) => {
    const adapter = useRecommendersAdapter();
    const auth = useAuth();
    const currency = useCurrency();
    const [isLoading, setIsLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<Recommendation>({});
    const [error, setError] = useState<Error | null>(null);

    /**
     * Get user parameters for Einstein API calls
     * Returns cookieId (always) and userId (only for registered users)
     */
    const getUserParameters = useCallback(() => {
        const params: Record<string, unknown> = {};

        // Always include cookieId (USID)
        if (auth?.usid) {
            params.cookieId = auth.usid;
        }

        // Include userId (customerId) only for registered users
        if (auth?.userType === 'registered' && auth?.customerId) {
            params.userId = auth.customerId;
        }

        return params;
    }, [auth]);

    /**
     * Fetch product details from SCAPI using the resource API
     * Uses the same encoding format as useScapiFetcher for consistency
     */
    const fetchProducts = useCallback(
        async (ids: string[]): Promise<ShopperProducts.schemas['Product'][]> => {
            if (!ids.length) {
                return [];
            }

            try {
                const client = 'shopperProducts';
                const method = 'getProducts';
                const options = {
                    params: {
                        query: {
                            ids,
                            allImages: true,
                            ...(currency ? { currency } : {}),
                        },
                    },
                };
                const parameters = JSON.stringify(options);
                const resource = encodeBase64Url(`["${client}","${method}",${parameters}]`);
                const url = `/resource/api/client/${resource}`;

                const response = await fetch(url);

                if (!response.ok) {
                    return [];
                }

                const result = await response.json();
                const products = result.data?.data || [];
                return products;
            } catch {
                return [];
            }
        },
        [currency]
    );

    const getRecommenders = useCallback(async () => {
        if (!isEnabled || !adapter) return {};
        return adapter.getRecommenders();
    }, [adapter, isEnabled]);

    const getRecommendations = useCallback(
        async (recommenderName: string, products?: Product[], args?: Record<string, unknown>) => {
            if (!isEnabled || !adapter) return;

            setIsLoading(true);
            setError(null);

            try {
                // Merge user parameters (cookieId, userId) with provided args
                const userParams = getUserParameters();
                const mergedArgs = { ...args, ...userParams };

                // Step 1: Fetch Einstein recommendations (IDs only)
                const reco = await adapter.getRecommendations(recommenderName, products, mergedArgs);

                const recoWithName = {
                    ...reco,
                    recommenderName,
                };

                // Step 2: If we have product IDs, fetch and enrich
                if (recoWithName.recs && recoWithName.recs.length > 0) {
                    const ids = recoWithName.recs.map((rec) => rec.id);
                    const productDetails = await fetchProducts(ids);
                    const enriched = enrichRecommendationsWithProducts(recoWithName, productDetails);
                    setRecommendations(enriched);
                } else {
                    // No products to enrich
                    setRecommendations(recoWithName);
                }

                setIsLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch recommendations'));
                setIsLoading(false);
            }
        },
        [adapter, isEnabled, fetchProducts, getUserParameters]
    );

    const getZoneRecommendations = useCallback(
        async (zoneName: string, products?: Product[], args?: Record<string, unknown>) => {
            if (!isEnabled || !adapter) return;

            setIsLoading(true);
            setError(null);

            try {
                // Merge user parameters (cookieId, userId) with provided args
                const userParams = getUserParameters();
                const mergedArgs = { ...args, ...userParams };

                // Step 1: Fetch Einstein recommendations (IDs only)
                const reco = await adapter.getZoneRecommendations(zoneName, products, mergedArgs);

                // Step 2: If we have product IDs, fetch and enrich
                if (reco.recs && reco.recs.length > 0) {
                    const ids = reco.recs.map((rec) => rec.id);
                    const productDetails = await fetchProducts(ids);
                    const enriched = enrichRecommendationsWithProducts(reco, productDetails);
                    setRecommendations(enriched);
                } else {
                    // No products to enrich
                    setRecommendations(reco);
                }

                setIsLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch zone recommendations'));
                setIsLoading(false);
            }
        },
        [adapter, isEnabled, fetchProducts, getUserParameters]
    );

    return {
        isLoading,
        isEnabled,
        recommendations,
        error,
        getRecommenders,
        getRecommendations,
        getZoneRecommendations,
    };
};
