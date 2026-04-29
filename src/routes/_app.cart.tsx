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
import { type ReactElement, Suspense } from 'react';

// React Router
import { Await, useLoaderData, type LoaderFunction, type LoaderFunctionArgs } from 'react-router';

// Commerce SDK
import {
    type ShopperBasketsV2,
    type ShopperProducts,
    type ShopperPromotions,
    type ShopperStores,
} from '@salesforce/storefront-next-runtime/scapi';

// Middlewares
import { getAuth } from '@/middlewares/auth.server';
import { getBasket, getBasketSnapshot, type BasketSnapshot } from '@/middlewares/basket.server';

// API
import { createApiClients } from '@/lib/api-clients.server';
import { getWishlist } from '@/lib/api/wishlist.server';
import { siteContext, type SiteContext } from '@salesforce/storefront-next-runtime/site-context';

// Logging
import { getLogger } from '@/lib/logger.server';

// Components
import CartSkeleton from '@/components/cart/cart-skeleton';
import CartContent from '@/components/cart/cart-content';
import { SeoMeta } from '@/components/seo-meta';
import { buildCanonicalUrl } from '@/utils/canonical-url';
import { useTranslation } from 'react-i18next';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { getInventoryIdsFromPickupShipments } from '@/extensions/bopis/lib/basket-utils';
import { fetchStoresForBasket } from '@/extensions/bopis/lib/api/stores.server';
import PickupProvider from '@/extensions/bopis/context/pickup-context';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

/**
 * Data structure returned by cart loader functions.
 * When BOPIS is stripped, storesByStoreId is always {} (no store data).
 */
type CartPageData = {
    basketDataPromise: Promise<{
        basket: ShopperBasketsV2.schemas['Basket'];
        productsByItemId: Record<string, ShopperProducts.schemas['Product']>;
        bonusProductsById: Record<string, ShopperProducts.schemas['Product']>;
        promotions: Record<string, ShopperPromotions.schemas['Promotion']>;
        storesByStoreId: Record<string, ShopperStores.schemas['Store']>;
        /** Product IDs in the shopper wishlist (registered sessions only); hydrates cart wishlist controls after refresh */
        wishlistProductIds: string[];
    }>;
    basketSnapshot: BasketSnapshot | null;
    pageUrl: string;
};

/**
 * Loads wishlist product IDs for the signed-in customer so cart line wishlist UI matches server state after refresh.
 */
async function fetchWishlistProductIds(context: LoaderFunctionArgs['context']): Promise<string[]> {
    try {
        const session = getAuth(context);
        const isRegistered =
            session.userType === 'registered' &&
            Boolean(session.customerId) &&
            Boolean(session.accessToken) &&
            typeof session.accessTokenExpiry === 'number' &&
            session.accessTokenExpiry > Date.now();

        if (!isRegistered || !session.customerId) {
            return [];
        }

        const { items } = await getWishlist(context, session.customerId);
        const wishlistItems = Array.isArray(items) ? items : [];
        return wishlistItems
            .map((item: { productId?: string }) => item.productId)
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    } catch {
        return [];
    }
}

/**
 * Fetches promotion details for promotion IDs found in basket items.
 *
 * This function extracts promotion IDs from basket items' price adjustments
 * and fetches the corresponding promotion data from the Commerce API.
 * @returns Promise that resolves to a mapping of promotion IDs to promotion data
 */
async function fetchPromotionsForBasket(
    context: LoaderFunctionArgs['context'],
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
    context: LoaderFunctionArgs['context'],
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
    const currency = (context.get(siteContext) as SiteContext).currency;

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
 * Client-side loader function for cart route
 *
 * This loader function handles cart data loading on the client side:
 * - Retrieves basket data from the basket middleware
 * - Fetches product details for all items (main + bundled children) in a single optimized API call
 * - Fetches promotion details for items with promotions
 * - Handles errors gracefully with fallback to empty state
 * - Returns promises for async data loading
 * @returns Promise resolving to cart page data with basket and product details
 */
export const loader: LoaderFunction = ({ context, request }: LoaderFunctionArgs): CartPageData => {
    const logger = getLogger(context);
    logger.debug('Cart: loader starting');

    const requestUrl = new URL(request.url);
    const pageUrl = buildCanonicalUrl(requestUrl.origin, requestUrl.pathname, requestUrl.search);

    const basketPromise = getBasket(context, { ensureBasket: true }).then(
        (basketResult) => basketResult.current ?? ({} as ShopperBasketsV2.schemas['Basket'])
    );
    const basketSnapshot = getBasketSnapshot(context);
    const productsDataPromise = basketPromise.then((basket) => fetchProductsInBasket(context, basket));
    const productsByItemIdPromise = productsDataPromise.then((data) => data.productsByItemId);
    const bonusProductsByIdPromise = productsDataPromise.then((data) => data.bonusProductsById);
    const promotionsPromise = basketPromise.then((basket) =>
        fetchPromotionsForBasket(context, basket?.productItems ?? [])
    );
    const wishlistProductIdsPromise = fetchWishlistProductIds(context);

    // Default when BOPIS is stripped; reassigned inside BOPIS block when extension is present
    let storesByStoreIdPromise: Promise<
        Record<string, ShopperStores.schemas['Store']> | Map<string, ShopperStores.schemas['Store']>
    > = Promise.resolve({});
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    storesByStoreIdPromise = basketPromise.then((basket) => fetchStoresForBasket(context, basket));
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    const basketDataPromise = Promise.all([
        basketPromise,
        productsByItemIdPromise,
        bonusProductsByIdPromise,
        promotionsPromise,
        storesByStoreIdPromise,
        wishlistProductIdsPromise,
    ]).then((results) => {
        const [basket, productsByItemId, bonusProductsById, promotions, storesByStoreId, wishlistProductIds] = results;
        return {
            basket,
            productsByItemId,
            bonusProductsById,
            promotions,
            storesByStoreId:
                storesByStoreId instanceof Map ? Object.fromEntries(storesByStoreId) : (storesByStoreId ?? {}),
            wishlistProductIds,
        };
    });

    return {
        basketDataPromise,
        basketSnapshot,
        pageUrl,
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
export default function Cart(): ReactElement {
    const { t } = useTranslation('cart');
    const pageData = useLoaderData<CartPageData>();
    const content = (
        <Await resolve={pageData.basketDataPromise}>
            {(basketData) => {
                return (
                    <CartContent
                        basket={basketData.basket}
                        productsByItemId={basketData.productsByItemId}
                        bonusProductsById={basketData.bonusProductsById}
                        promotions={basketData.promotions}
                        wishlistProductIds={basketData.wishlistProductIds}
                    />
                );
            }}
        </Await>
    );

    let finalContent = content;
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    finalContent = (
        <Await resolve={pageData.basketDataPromise}>
            {({ basket, storesByStoreId }) => (
                <PickupProvider
                    basket={basket}
                    initialPickupStores={
                        storesByStoreId != null && Object.keys(storesByStoreId).length > 0
                            ? new Map(Object.entries(storesByStoreId))
                            : undefined
                    }>
                    {content}
                </PickupProvider>
            )}
        </Await>
    );
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    return (
        <>
            <SeoMeta
                title={t('meta.title', { defaultValue: 'Cart' })}
                description={t('meta.description', {
                    defaultValue: 'Review the items in your shopping cart and continue to checkout.',
                })}
                openGraph={{ type: 'website', url: pageData.pageUrl }}
            />
            <Suspense
                fallback={
                    <CartSkeleton
                        isRegistered={false}
                        productItemCount={pageData.basketSnapshot?.uniqueProductCount ?? 0}
                    />
                }>
                {finalContent}
            </Suspense>
        </>
    );
}
