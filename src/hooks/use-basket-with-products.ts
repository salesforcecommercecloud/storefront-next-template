/**
 * Hook to fetch basket items with their full product details (images, variations, etc.)
 * Uses a resource route to fetch product data
 */

import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { findImageGroupBy } from '@/lib/image-groups-utils';

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

/**
 * Fetches full product details for items in the basket
 * Merges product data (images, variations) with basket product items
 */
export function useBasketWithProducts(
    basket: ShopperBasketsV2.schemas['Basket'] | undefined
): UseBasketWithProductsResult {
    const fetcher = useFetcher<Record<string, ShopperProducts.schemas['Product']>>();
    const [productItems, setProductItems] = useState<BasketItemWithProduct[]>([]);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!basket?.productItems?.length) {
            setProductItems([]);
            return;
        }

        // Trigger fetch of product details via resource route
        if (fetcher.state === 'idle' && !fetcher.data) {
            void fetcher.load('/resource/basket-products');
        }
    }, [basket, fetcher]);

    useEffect(() => {
        if (!basket?.productItems?.length) {
            setProductItems([]);
            return;
        }

        // If we don't have product data yet, use basic basket items
        if (!fetcher.data) {
            setProductItems(basket.productItems);
            return;
        }

        try {
            const productsById = fetcher.data;

            // Merge basket items with full product data
            const enrichedItems: BasketItemWithProduct[] = basket.productItems.map((item) => {
                const productId = item.productId;
                if (!productId || !productsById[productId]) {
                    return item;
                }

                const fullProduct = productsById[productId];

                // Find the correct image for this variation
                const imageGroup = findImageGroupBy(fullProduct.imageGroups, {
                    viewType: 'small',
                    selectedVariationAttributes: item.variationValues,
                });

                return {
                    ...item,
                    ...fullProduct,
                    // Preserve basket-specific data (only override if item has the value)
                    itemId: item.itemId,
                    quantity: item.quantity,
                    price: item.price,
                    priceAfterItemDiscount: item.priceAfterItemDiscount,
                    // Keep fullProduct.variationValues unless item has its own
                    variationValues: item.variationValues || fullProduct.variationValues,
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
    }, [basket, fetcher.data]);

    return {
        productItems,
        isLoading: fetcher.state === 'loading',
        error,
    };
}
