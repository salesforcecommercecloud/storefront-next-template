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
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFetcher } from 'react-router';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import type { loader as basketProductsPromotionsLoader } from '@/routes/resource.basket-products-promotions';

/**
 * Product promotion data from SCAPI Products API
 */
export interface ProductPromotion {
    promotionId?: string;
    calloutMsg?: string;
}

/**
 * Product with promotion data
 */
export type ProductWithPromotions = ShopperProducts.schemas['Product'] & {
    productPromotions?: ProductPromotion[];
};

/**
 * Map of product ID to product data with promotions
 */
export type ProductsWithPromotionsMap = Record<string, ProductWithPromotions>;

// Shared React Router fetcher key for the basket-products-promotions resource. Both useBasketWithPromotions (mounted
// by the cart sheet) and useBasketWithPromotionsLoader (used for prefetch) attach to this key so they observe the same
// fetcher state — a prefetch in flight is reused by the cart sheet rather than dispatched a second time.
const BASKET_PROMOTIONS_FETCHER_KEY = 'basket-products-promotions';
const BASKET_PROMOTIONS_RESOURCE_URL = '/resource/basket-products-promotions';

/**
 * Imperative loader for the basket-products-promotions resource. Returns a reference-stable callback that dispatches
 * a load if the shared fetcher is idle and has no data, and is a no-op otherwise. Calling this hook allocates a React
 * Router fetcher slot on every page that mounts it, but no network call fires until the returned callback is invoked.
 *
 * Scope: This is a one-shot pre-warm intended for the first cart-sheet open of a session. Once data is present, the
 * loader is a no-op even if the basket later grows with new productIds — refetching for added items is the job of
 * {@link useBasketWithPromotions}, which is mounted by the cart sheet and applies a stricter `hasUnfetchedProducts`
 * gate. The narrow gap (item added, sheet not yet opened, hover-then-click) shows the new item briefly without
 * promotion data.
 */
export function useBasketWithPromotionsLoader(): () => void {
    const fetcher = useFetcher<typeof basketProductsPromotionsLoader>({ key: BASKET_PROMOTIONS_FETCHER_KEY });

    // useFetcher returns a fresh object every render. Mirror into a ref so the returned callback can have empty
    // useCallback deps and stay reference-stable across renders.
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    return useCallback(() => {
        const f = fetcherRef.current;
        if (f.state === 'idle' && !f.data) {
            void f.load(BASKET_PROMOTIONS_RESOURCE_URL);
        }
    }, []);
}

/**
 * Hook to fetch promotion data for all products in the basket
 *
 * Fetches product data with promotions expanded using the Products API.
 *
 * @param basket - The shopping basket
 * @returns Object with productsWithPromotions map and loading state
 *
 * @example
 * const { productsWithPromotions, isLoading } = useBasketWithPromotions(basket);
 * const productData = productsWithPromotions['product-123'];
 * const callout = productData?.productPromotions?.[0]?.calloutMsg;
 */
export function useBasketWithPromotions(basket: ShopperBasketsV2.schemas['Basket'] | null | undefined): {
    productsWithPromotions: ProductsWithPromotionsMap;
    isLoading: boolean;
} {
    // Shared fetcher key so prefetch (e.g. on cart-badge hover via useBasketWithPromotionsLoader) and the cart-sheet
    // panel observe the same fetcher state — avoids a duplicate request when click follows a hover prefetch. We can't
    // delegate to useBasketWithPromotionsLoader here because this hook reads fetcher state for the isLoading flag and
    // exposes the data map.
    const fetcher = useFetcher<typeof basketProductsPromotionsLoader>({ key: BASKET_PROMOTIONS_FETCHER_KEY });
    // useFetcher returns a fresh object every render. Destructure to stable values so the effect deps don't change
    // identity each render and cause a re-subscribe.
    const { state: fetcherState, data: fetcherData, load: loadPromotions } = fetcher;
    const basketProductIds = useMemo(
        () => basket?.productItems?.map((item) => item.productId).filter((id): id is string => Boolean(id)) ?? [],
        [basket?.productItems]
    );

    useEffect(() => {
        if (!basketProductIds.length) {
            return;
        }

        const existingProductIds = new Set(fetcherData ? Object.keys(fetcherData) : []);
        const hasUnfetchedProducts = basketProductIds.some((id) => !existingProductIds.has(id));

        // Trigger fetch when we have no data yet, or basket contains product IDs not yet fetched.
        if (fetcherState === 'idle' && (!fetcherData || hasUnfetchedProducts)) {
            void loadPromotions(BASKET_PROMOTIONS_RESOURCE_URL);
        }
    }, [basketProductIds, fetcherState, fetcherData, loadPromotions]);

    return {
        productsWithPromotions: fetcherData || {},
        isLoading: fetcherState === 'loading',
    };
}
