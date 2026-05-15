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

/**
 * Hook to fetch basket items with their full product details (images, variations, etc.)
 * Uses a resource route to fetch product data
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import type { loader as basketProductsLoader } from '@/routes/resource.basket-products';
import { findImageGroupBy } from '@/lib/product/image-groups-utils';

/**
 * A basket product item enriched with full product details (images, variations, etc.)
 * Combines basket item data with product catalog data for display purposes
 */
export type BasketItemWithProduct = ShopperBasketsV2.schemas['ProductItem'] &
    Partial<ShopperProducts.schemas['Product']> & {
        isProductUnavailable?: boolean;
    };

interface UseBasketWithProductsResult {
    productItems: BasketItemWithProduct[];
    isLoading: boolean;
    error: Error | null;
}

// Shared React Router fetcher key for the basket-products resource. Both useBasketWithProducts (mounted by the cart
// sheet) and useBasketWithProductsLoader (used for prefetch) attach to this key so they observe the same fetcher state
// — a prefetch in flight is reused by the cart sheet rather than dispatched a second time.
const BASKET_PRODUCTS_FETCHER_KEY = 'basket-products';
const BASKET_PRODUCTS_RESOURCE_URL = '/resource/basket-products';

/**
 * Imperative loader for the basket-products resource. Returns a reference-stable callback that dispatches a load if
 * the shared fetcher is idle and has no data, and is a no-op otherwise. Calling this hook allocates a React Router
 * fetcher slot on every page that mounts it, but no network call fires until the returned callback is invoked.
 *
 * Scope: This is a one-shot pre-warm intended for the first cart-sheet open of a session. Once data is present, the
 * loader is a no-op even if the basket later grows with new productIds — refetching for added items is the job of
 * {@link useBasketWithProducts}, which is mounted by the cart sheet and applies a stricter `hasUnfetchedProducts`
 * gate. The narrow gap (item added, sheet not yet opened, hover-then-click) shows the new item briefly unenriched.
 */
export function useBasketWithProductsLoader(): () => void {
    const fetcher = useFetcher<typeof basketProductsLoader>({ key: BASKET_PRODUCTS_FETCHER_KEY });

    // useFetcher returns a fresh object every render. Mirror into a ref so the returned callback can have empty
    // useCallback deps and stay reference-stable across renders.
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    return useCallback(() => {
        const f = fetcherRef.current;
        if (f.state === 'idle' && !f.data) {
            void f.load(BASKET_PRODUCTS_RESOURCE_URL);
        }
    }, []);
}

const deriveVariationValuesFromAttributes = (
    variationAttributes: ShopperProducts.schemas['VariationAttribute'][] | undefined
): Record<string, string> | undefined => {
    if (!variationAttributes?.length) return undefined;

    const selected = variationAttributes.reduce<Record<string, string>>((acc, attribute) => {
        const value = attribute.values?.length === 1 ? attribute.values[0]?.value : undefined;
        if (attribute.id && value) {
            acc[attribute.id] = value;
        }
        return acc;
    }, {});

    return Object.keys(selected).length > 0 ? selected : undefined;
};

const normalizeVariationValues = (value: unknown): Record<string, string> | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const entries = Object.entries(value).filter(
        (entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'
    );
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

const getFallbackImageGroup = (
    imageGroups: ShopperProducts.schemas['ImageGroup'][] | undefined
): ShopperProducts.schemas['ImageGroup'] | undefined => {
    if (!imageGroups?.length) return undefined;

    const smallGroups = imageGroups.filter((group) => group.viewType === 'small');
    if (smallGroups.length === 0) return undefined;

    return smallGroups.find((group) => !group.variationAttributes?.length) ?? smallGroups[0];
};

/**
 * Fetches full product details for items in the basket
 * Merges product data (images, variations) with basket product items
 */
export function useBasketWithProducts(
    basket: ShopperBasketsV2.schemas['Basket'] | undefined
): UseBasketWithProductsResult {
    // Shared fetcher key so prefetch (e.g. on cart-badge hover via useBasketWithProductsLoader) and the cart-sheet
    // panel observe the same fetcher state — avoids a duplicate request when click follows a hover prefetch. We can't
    // delegate to useBasketWithProductsLoader here because this hook reads fetcher state/data for the merge logic and
    // applies a stricter gate (force refetch when basket items grow with unfetched product IDs).
    const fetcher = useFetcher<typeof basketProductsLoader>({ key: BASKET_PRODUCTS_FETCHER_KEY });
    const { state: fetcherState, data: fetcherData, load: loadProducts } = fetcher;
    const [productItems, setProductItems] = useState<BasketItemWithProduct[]>([]);
    const [error, setError] = useState<Error | null>(null);
    const basketProductIds = useMemo(
        () => basket?.productItems?.map((item) => item.productId).filter((id): id is string => Boolean(id)) ?? [],
        [basket?.productItems]
    );

    useEffect(() => {
        if (!basketProductIds.length) {
            setProductItems([]);
            return;
        }

        const existingProductIds = new Set(fetcherData ? Object.keys(fetcherData) : []);
        const hasUnfetchedProducts = basketProductIds.some((id) => !existingProductIds.has(id));

        // Trigger fetch when we have no data yet, or basket contains product IDs not yet fetched.
        if (fetcherState === 'idle' && (!fetcherData || hasUnfetchedProducts)) {
            void loadProducts(BASKET_PRODUCTS_RESOURCE_URL);
        }
    }, [basketProductIds, fetcherState, fetcherData, loadProducts]);

    useEffect(() => {
        if (!basket?.productItems?.length) {
            setProductItems([]);
            return;
        }

        // If we don't have product data yet, use basic basket items
        if (!fetcherData) {
            setProductItems(basket.productItems);
            return;
        }

        try {
            const productsById = fetcherData;
            const hasAllCurrentProductData = basketProductIds.every((productId) => Boolean(productsById[productId]));

            // Avoid mixing stale fetcher data with the current basket while a refresh is in flight.
            if (!hasAllCurrentProductData) {
                setProductItems(basket.productItems);
                return;
            }

            // Merge basket items with full product data
            const enrichedItems: BasketItemWithProduct[] = basket.productItems.map((item) => {
                const productId = item.productId;
                if (!productId || !productsById[productId]) {
                    return item;
                }

                const fullProduct = productsById[productId];
                const explicitImageVariationValues =
                    normalizeVariationValues(item.variationValues) ||
                    normalizeVariationValues(fullProduct.variationValues);
                const derivedDisplayVariationValues = deriveVariationValuesFromAttributes(
                    fullProduct.variationAttributes
                );
                const resolvedVariationValues = explicitImageVariationValues || derivedDisplayVariationValues;

                // SKU-first image strategy:
                // 1) Prefer SKU-resolved product image groups directly (fallback group)
                // 2) Only apply variation filtering when explicit variation values are present
                const imageGroup =
                    (explicitImageVariationValues
                        ? findImageGroupBy(fullProduct.imageGroups, {
                              viewType: 'small',
                              selectedVariationAttributes: explicitImageVariationValues,
                          })
                        : undefined) ?? getFallbackImageGroup(fullProduct.imageGroups);

                return {
                    ...item,
                    ...fullProduct,
                    // Preserve basket-specific data (only override if item has the value)
                    itemId: item.itemId,
                    quantity: item.quantity,
                    price: item.price,
                    priceAfterItemDiscount: item.priceAfterItemDiscount,
                    // Keep line-item values, then product values, then derive from single-value variation attrs.
                    variationValues: resolvedVariationValues,
                    // Keep fullProduct.variationAttributes for proper display names
                    variationAttributes: fullProduct.variationAttributes,
                    // Use the correct image for the variation
                    imageGroups: imageGroup ? [imageGroup] : fullProduct.imageGroups,
                };
            });

            setProductItems(enrichedItems);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
            // Fallback to basket items without enrichment
            setProductItems(basket.productItems);
        }
    }, [basket, basketProductIds, fetcherData]);

    return {
        productItems,
        isLoading: fetcherState === 'loading',
        error,
    };
}
