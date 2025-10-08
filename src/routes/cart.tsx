// React
import { type ReactElement, use } from 'react';

// React Router
import type { ClientLoaderFunction, ClientLoaderFunctionArgs } from 'react-router';

// Commerce SDK
import type { ShopperBasketsTypes, ShopperProductsTypes, ShopperPromotionsTypes } from 'commerce-sdk-isomorphic';

// Middlewares
import { getBasket } from '@/middlewares/basket.client';

// API
import createClient from '@/lib/scapi';

// Components
import CartContent from '@/components/cart/cart-content';
import CartSkeleton from '@/components/cart/cart-skeleton';
import createPage from '@/components/create-page';

/**
 * Data structure returned by cart loader functions.
 */
type CartPageData = {
    basket: ShopperBasketsTypes.Basket;
    productMap: Promise<Record<string, ShopperProductsTypes.Product>>;
    promotionMap?: Promise<Record<string, ShopperPromotionsTypes.Promotion>>;
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
    productItems: ShopperBasketsTypes.ProductItem[]
): Promise<Record<string, ShopperPromotionsTypes.Promotion>> {
    // Main product IDs from basket items
    const productIds = productItems?.map((item) => item.productId).filter(Boolean);
    if (!productIds) {
        return {};
    }
    // Extract all unique promotion IDs from basket items
    const promotionIdsSet = new Set<string>();
    productItems.forEach((item) => {
        if (item.priceAdjustments?.length) {
            item.priceAdjustments.forEach((adjustment) => {
                if (adjustment.promotionId) {
                    promotionIdsSet.add(adjustment.promotionId);
                }
            });
        }
    });

    // If no promotion IDs found, return undefined
    if (promotionIdsSet.size === 0) {
        return {};
    }

    // Fetch promotions for all unique promotion IDs
    const client = createClient(context);
    const promotionsResponse = await client.ShopperPromotions.getPromotions({
        parameters: {
            ids: Array.from(promotionIdsSet),
        },
    });

    if (!promotionsResponse.data) {
        return {};
    }

    // Create a mapping from promotion ID to promotion data
    const promotionsById: Record<string, ShopperPromotionsTypes.Promotion> = {};
    promotionsResponse.data.forEach((promotion) => {
        if (promotion.id) {
            promotionsById[promotion.id] = promotion;
        }
    });

    return promotionsById;
}

/**
 * Fetches detailed product information for all items in a shopping basket.
 *
 * This function retrieves product details including images, pricing, and attributes
 * for each product in the basket. It creates a mapping from basket item IDs to
 * their corresponding product data for efficient lookup in the UI.
 * @returns Promise that resolves to a mapping of item IDs to product data.
 */
async function fetchProductsInBasket(
    context: ClientLoaderFunctionArgs['context'],
    productItems: ShopperBasketsTypes.ProductItem[]
): Promise<Record<string, ShopperProductsTypes.Product>> {
    // Main product IDs from basket items
    const ids = productItems.map((item) => item.productId ?? '').filter(Boolean);
    if (!ids.length) {
        return {};
    }

    const client = createClient(context);
    const productsResponse = await client.ShopperProducts.getProducts({
        parameters: {
            ids,
            allImages: true,
            perPricebook: true,
        },
    });

    if (!productsResponse.data) {
        return {};
    }

    const products = productsResponse.data.reduce(
        (acc, product) => {
            acc[product.id] = product;
            return acc;
        },
        {} as Record<string, ShopperProductsTypes.Product>
    );

    // Create productsByItemId mapping
    const productsByItemId: Record<string, ShopperProductsTypes.Product> = {};
    productItems.forEach((productItem) => {
        if (productItem?.productId && productItem.itemId && products[productItem.productId]) {
            productsByItemId[productItem.itemId] = products[productItem.productId];
        }
    });
    return productsByItemId;
}

/**
 * Hydrate fallback component displayed during client-side hydration
 *
 * This component is shown when the cart route gets called/rendered directly on the server
 * during the hydration process, providing a loading state while the client-side data loads.
 * @returns JSX element representing the cart skeleton loading state
 */
export function HydrateFallback() {
    return <CartSkeleton />;
}

/**
 * Client-side loader function for cart route
 *
 * This loader function handles cart data loading on the client side:
 * - Retrieves basket data from the basket middleware
 * - Fetches product details for all items in the basket
 * - Handles errors gracefully with fallback to empty state
 * - Returns promises for async data loading
 * @returns Promise resolving to cart page data with basket and product details
 * TODO: Implement server loader to have the cart page take part in the SSR phase
 */
// eslint-disable-next-line react-refresh/only-export-components,custom/no-universal-loaders
export const clientLoader: ClientLoaderFunction = ({ context }: ClientLoaderFunctionArgs): CartPageData => {
    // Fetch product details - handle errors gracefully
    const basket = getBasket(context);
    return {
        basket,
        productMap: fetchProductsInBasket(context, basket?.productItems ?? []),
        promotionMap: fetchPromotionsForBasket(context, basket?.productItems ?? []),
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
    loaderData: { basket, productMap: productMapPromise, promotionMap: promotionMapPromise },
}: {
    loaderData: CartPageData;
}): ReactElement {
    const productMap = use(productMapPromise);
    const promotionMap = use(promotionMapPromise ?? Promise.resolve({}));

    return <CartContent basket={basket} productMap={productMap} promotionMap={promotionMap} />;
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
    fallback: <CartSkeleton />,
});
