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
import { useEffect } from 'react';
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
    const fetcher = useFetcher<typeof basketProductsPromotionsLoader>();

    useEffect(() => {
        if (!basket?.productItems?.length) {
            return;
        }

        // Trigger fetch of product promotion data via resource route
        if (fetcher.state === 'idle' && !fetcher.data) {
            void fetcher.load('/resource/basket-products-promotions');
        }
    }, [basket, fetcher]);

    return {
        productsWithPromotions: fetcher.data || {},
        isLoading: fetcher.state === 'loading',
    };
}
