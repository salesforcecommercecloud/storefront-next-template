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
import { type ReactElement, use } from 'react';

// React Router
import type { ClientLoaderFunctionArgs, LoaderFunction, LoaderFunctionArgs } from 'react-router';

// Commerce SDK
import {
    type ShopperBasketsV2,
    type ShopperProducts,
    type ShopperPromotions,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    type ShopperStores,
} from '@salesforce/storefront-next-runtime/scapi';

// Middlewares
import { getBasket } from '@/middlewares/basket.server';

// API
import { createApiClients } from '@/lib/api-clients';
import { currencyContext } from '@/lib/currency';

// Components
import CartContent from '@/components/cart/cart-content';
import createPage from '@/components/create-page';
import CartEmptySkeleton from '@/components/cart/cart-empty-skeleton';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import PickupProvider from '@/extensions/bopis/context/pickup-context';
import { getInventoryIdsFromPickupShipments } from '@/extensions/bopis/lib/basket-utils';
import { fetchStoresForBasket } from '@/extensions/bopis/lib/api/stores';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

/**
 * Data structure returned by cart loader functions.
 */
type CartPageData = {
    basket: ShopperBasketsV2.schemas['Basket'];
    productsByItemId: Promise<Record<string, ShopperProducts.schemas['Product']>>;
    bonusProductsById: Promise<Record<string, ShopperProducts.schemas['Product']>>;
    promotions?: Promise<Record<string, ShopperPromotions.schemas['Promotion']>>;
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    storesByStoreId: Promise<Map<string, ShopperStores.schemas['Store']>>;
    // @sfdc-extension-block-end SFDC_EXT_BOPIS
};

/**
 * Fetches promotion details for promotion IDs found in basket items.
 *
 * This function extracts promotion IDs from basket items' price adjustments
 * and fetches the corresponding promotion data from the Commerce API.
 * @returns Promise that resolves to a mapping of promotion IDs to promotion data
 */
async function fetchPromotionsForBasket(
    context: ClientLoaderFunctionArgs['context'],
    productItems: ShopperBasketsV2.schemas['ProductItem'][]
): Promise<Record<string, ShopperPromotions.schemas['Promotion']>> {
    const productIds = productItems?.map((item) => item.productId).filter(Boolean);
    if (!productIds) {
        return {};
    }

    // Extract all unique promotion IDs from basket items' price adjustments
    const promotionIds = new Set<string>();
    productItems.forEach((productItem) => {
        if (productItem.priceAdjustments?.length) {
            productItem.priceAdjustments.forEach((adjustment) => {
                if (adjustment.promotionId) {
                    promotionIds.add(adjustment.promotionId);
                }
            });
        }
    });

    // Early return if no promotions found
    if (promotionIds.size === 0) {
        return {};
    }

    // Fetch promotion details for all unique promotion IDs
    const clients = createApiClients(context);
    const { data: promotionsData } = await clients.shopperPromotions.getPromotions({
        params: {
            query: {
                ids: Array.from(promotionIds),
            },
        },
    });

    if (!promotionsData?.data) {
        return {};
    }

    // Transform API response into a lookup map: promotionId → promotion details
    const promotions: Record<string, ShopperPromotions.schemas['Promotion']> = {};
    promotionsData.data.forEach((promotion) => {
        if (promotion.id) {
            promotions[promotion.id] = promotion;
        }
    });

    return promotions;
}

/**
 * Fetches detailed product information for all items in a shopping basket.
 *
 * This function retrieves product details including images, pricing, and attributes
 * for each product in the basket. It creates a mapping from basket item IDs to
 * their corresponding product data for efficient lookup in the UI.
 * For bundle products, it also fetches child product data and reconstructs the
 * bundledProducts structure with product and quantity properties.
 *
 * For BOPIS (Buy Online, Pick-up In Store) functionality, this function also
 * includes store inventory IDs when fetching products to ensure accurate
 * store-level inventory data is available for pickup items.
 * @returns Promise that resolves to a mapping of item IDs to product data.
 */
async function fetchProductsInBasket(
    context: ClientLoaderFunctionArgs['context'],
    basket: ShopperBasketsV2.schemas['Basket'] | null
): Promise<{
    productsByItemId: Record<string, ShopperProducts.schemas['Product']>;
    bonusProductsById: Record<string, ShopperProducts.schemas['Product']>;
}> {
    const productItems = basket?.productItems ?? [];

    // Collect all product IDs (both parent products and bundled child products)
    const ids: string[] = [];

    productItems.forEach((item) => {
        if (item.productId) {
            ids.push(item.productId);
        }

        // If this is a bundle product, collect child product IDs
        if (item.bundledProductItems && item.bundledProductItems.length > 0) {
            const childProductIds = item.bundledProductItems
                .map((child) => child.productId)
                .filter(Boolean) as string[];

            ids.push(...childProductIds);
        }
    });

    // Collect bonus product IDs from bonusDiscountLineItems
    const bonusProductIds: string[] = [];
    basket?.bonusDiscountLineItems?.forEach((bonusItem) => {
        bonusItem.bonusProducts?.forEach((bp) => {
            if (bp.productId) {
                bonusProductIds.push(bp.productId);
            }
        });
    });

    // Add bonus product IDs to the main ids array for bulk fetch
    ids.push(...bonusProductIds);

    if (!ids.length) {
        return { productsByItemId: {}, bonusProductsById: {} };
    }

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    // Collect unique inventory IDs from pickup shipments to fetch store-level inventory
    const inventoryIds = getInventoryIdsFromPickupShipments(basket);
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    const clients = createApiClients(context);
    const currency = context.get(currencyContext) as string;

    const { data: productsData } = await clients.shopperProducts.getProducts({
        params: {
            query: {
                ids,
                allImages: true,
                perPricebook: true,
                currency,
                // NOTE: if we do use `expand` parameter here, we can't pass in `bundled_products` for this API endpoint
                // @sfdc-extension-block-start SFDC_EXT_BOPIS
                // Include store inventory IDs for pickup items
                ...(inventoryIds.length > 0 ? { inventoryIds } : {}),
                // @sfdc-extension-block-end SFDC_EXT_BOPIS
            },
        },
    });

    if (!productsData?.data) {
        return { productsByItemId: {}, bonusProductsById: {} };
    }

    const products = productsData.data.reduce(
        (acc, product) => {
            acc[product.id] = product;
            return acc;
        },
        {} as Record<string, ShopperProducts.schemas['Product']>
    );

    const productsByItemId: Record<string, ShopperProducts.schemas['Product']> = {};

    productItems.forEach((productItem) => {
        if (!productItem.itemId || !productItem.productId || !products[productItem.productId]) {
            return;
        }

        const product = products[productItem.productId];

        // Check if this is a bundle product
        if (productItem.bundledProductItems && productItem.bundledProductItems.length > 0) {
            // Reconstruct the product with bundledProducts structure
            // Why? Because the products API endpoint does not allow us to pass in expand=['bundled_products']
            const bundledProducts: ShopperProducts.schemas['BundledProduct'][] = productItem.bundledProductItems
                .map((bundledItem) => {
                    const childProduct = bundledItem.productId ? products[bundledItem.productId] : null;
                    if (!childProduct) return null;
                    return {
                        product: childProduct,
                        quantity: bundledItem.quantity ?? 1,
                    };
                })
                .filter((item): item is ShopperProducts.schemas['BundledProduct'] => item !== null);

            productsByItemId[productItem.itemId] = {
                ...product,
                bundledProducts,
            };
        } else {
            productsByItemId[productItem.itemId] = product;
        }
    });

    // Create separate mapping for bonus products
    const bonusProductsById: Record<string, ShopperProducts.schemas['Product']> = {};
    basket?.bonusDiscountLineItems?.forEach((bonusItem) => {
        bonusItem.bonusProducts?.forEach((bp) => {
            if (bp.productId && products[bp.productId]) {
                bonusProductsById[bp.productId] = products[bp.productId];
            }
        });
    });

    return { productsByItemId, bonusProductsById };
}

/**
 * Hydrate fallback component displayed during client-side hydration
 *
 * This component is shown when the cart route gets called/rendered directly on the server
 * during the hydration process, providing a loading state while the client-side data loads.
 * @returns JSX element representing the cart skeleton loading state
 */
export function HydrateFallback() {
    return <CartEmptySkeleton isRegistered={false} />;
}

/**
 * Client-side loader function for cart route
 *
 * This loader function handles cart data loading on the client side:
 * - Retrieves basket data from the basket middleware
 * - Fetches product details for all items (main + bundled children) in a single optimized API call
 * - Fetches promotion details for items with promotions
 * - Handles errors gracefully with fallback to empty state
 * - Returns promises for async data loading
 * @returns Promise resolving to cart page data with basket and product details
 * TODO: Implement server loader to have the cart page take part in the SSR phase
 */
// eslint-disable-next-line react-refresh/only-export-components, custom/no-async-page-loader
export const loader: LoaderFunction = async ({ context }: LoaderFunctionArgs): Promise<CartPageData> => {
    const basket = (await getBasket(context)).current;
    const productItems = basket?.productItems ?? [];
    const productsData = fetchProductsInBasket(context, basket);

    return {
        basket: basket ?? ({} as ShopperBasketsV2.schemas['Basket']),
        productsByItemId: productsData.then((d) => d.productsByItemId),
        bonusProductsById: productsData.then((d) => d.bonusProductsById),
        promotions: fetchPromotionsForBasket(context, productItems),
        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        storesByStoreId: fetchStoresForBasket(context, basket),
        // @sfdc-extension-block-end SFDC_EXT_BOPIS
    };
};

/**
 * Cart route component that displays the shopping cart page
 *
 * This component serves as the main cart page route that:
 * - Receives cart data from the loader functions
 * - Uses CartContent component for consistent cart rendering
 * - Handles async product data loading
 *
 * The component integrates with:
 * - React Router for route handling and data loading
 * - CartContent for complete cart functionality
 * @returns JSX element representing the cart page
 */
function Cart({
    loaderData: {
        basket,
        productsByItemId: productsByItemIdPromise,
        bonusProductsById: bonusProductsByIdPromise,
        promotions: promotionsPromise,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        storesByStoreId: storesByStoreIdPromise,
    },
}: {
    loaderData: CartPageData;
}): ReactElement {
    const productsByItemId = use(productsByItemIdPromise);
    const bonusProductsById = use(bonusProductsByIdPromise);
    const promotions = use(promotionsPromise ?? Promise.resolve({}));
    // @sfdc-extension-line SFDC_EXT_BOPIS
    const storesByStoreId = use(storesByStoreIdPromise);

    const content = (
        <CartContent
            basket={basket}
            productsByItemId={productsByItemId}
            bonusProductsById={bonusProductsById}
            promotions={promotions}
        />
    );

    let finalContent = content;
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    finalContent = (
        <PickupProvider basket={basket} initialPickupStores={storesByStoreId}>
            {content}
        </PickupProvider>
    );
    // @sfdc-extension-block-end SFDC_EXT_BOPIS
    return finalContent;
}

/**
 * Cart page component with loading fallback
 *
 * This creates a page component that wraps the Cart component with a loading fallback.
 * The createPage utility provides consistent loading states and error handling.
 * @returns Page component with cart functionality and loading states
 */
// eslint-disable-next-line react-refresh/only-export-components
export default createPage<CartPageData>({
    component: Cart,
    fallback: <CartEmptySkeleton isRegistered={false} />,
});
