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
    productsByItemId: Promise<Record<string, ShopperProductsTypes.Product>>;
    promotions?: Promise<Record<string, ShopperPromotionsTypes.Promotion>>;
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
    const client = createClient(context);
    const promotionsResponse = await client.ShopperPromotions.getPromotions({
        parameters: {
            ids: Array.from(promotionIds),
        },
    });

    if (!promotionsResponse.data) {
        return {};
    }

    // Transform API response into a lookup map: promotionId → promotion details
    const promotions: Record<string, ShopperPromotionsTypes.Promotion> = {};
    promotionsResponse.data.forEach((promotion) => {
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
 * @returns Promise that resolves to a mapping of item IDs to product data.
 */
async function fetchProductsInBasket(
    context: ClientLoaderFunctionArgs['context'],
    productItems: ShopperBasketsTypes.ProductItem[]
): Promise<Record<string, ShopperProductsTypes.Product>> {
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

    if (!ids.length) {
        return {};
    }

    const client = createClient(context);
    const productsResponse = await client.ShopperProducts.getProducts({
        parameters: {
            ids,
            allImages: true,
            perPricebook: true,
            // NOTE: if we do use `expand` parameter here, we can't pass in `bundled_products` for this API endpoint
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

    const productsByItemId: Record<string, ShopperProductsTypes.Product> = {};

    productItems.forEach((productItem) => {
        if (!productItem.itemId || !productItem.productId || !products[productItem.productId]) {
            return;
        }

        const product = products[productItem.productId];

        // Check if this is a bundle product
        if (productItem.bundledProductItems && productItem.bundledProductItems.length > 0) {
            // Reconstruct the product with bundledProducts structure
            // Why? Because the products API endpoint does not allow us to pass in expand=['bundled_products']
            const bundledProducts: ShopperProductsTypes.BundledProduct[] = productItem.bundledProductItems
                .map((bundledItem) => {
                    const childProduct = bundledItem.productId ? products[bundledItem.productId] : null;
                    if (!childProduct) return null;
                    return {
                        product: childProduct,
                        quantity: bundledItem.quantity ?? 1,
                    };
                })
                .filter((item): item is ShopperProductsTypes.BundledProduct => item !== null);

            productsByItemId[productItem.itemId] = {
                ...product,
                bundledProducts,
            };
        } else {
            productsByItemId[productItem.itemId] = product;
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
 * - Fetches product details for all items (main + bundled children) in a single optimized API call
 * - Fetches promotion details for items with promotions
 * - Handles errors gracefully with fallback to empty state
 * - Returns promises for async data loading
 * @returns Promise resolving to cart page data with basket and product details
 * TODO: Implement server loader to have the cart page take part in the SSR phase
 */
// eslint-disable-next-line react-refresh/only-export-components,custom/no-universal-loaders
export const clientLoader: ClientLoaderFunction = ({ context }: ClientLoaderFunctionArgs): CartPageData => {
    const basket = getBasket(context);
    const productItems = basket?.productItems ?? [];

    return {
        basket,
        productsByItemId: fetchProductsInBasket(context, productItems),
        promotions: fetchPromotionsForBasket(context, productItems),
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
    loaderData: { basket, productsByItemId: productsByItemIdPromise, promotions: promotionsPromise },
}: {
    loaderData: CartPageData;
}): ReactElement {
    const productsByItemId = use(productsByItemIdPromise);
    const promotions = use(promotionsPromise ?? Promise.resolve({}));

    return <CartContent basket={basket} productsByItemId={productsByItemId} promotions={promotions} />;
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
