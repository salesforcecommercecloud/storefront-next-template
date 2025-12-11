/**
 * React Router checkout loaders for server-side and client-side data fetching
 *
 * This module provides React Router loader functions for the checkout route,
 * handling both server-side rendering and client-side data fetching with
 * automatic fallbacks and optimized performance.
 */

import type { LoaderFunctionArgs, ClientLoaderFunctionArgs } from 'react-router';
import type {
    ShopperBasketsV2,
    ShopperProducts,
    ShopperPromotions,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    ShopperStores,
} from '@salesforce/storefront-next-runtime/scapi';
import type { CustomerProfile } from '@/components/checkout/utils/checkout-context-types';
import type { SessionData } from '@/lib/api/types';
import { getAuth as getAuthClient } from '@/middlewares/auth.client';
import { getBasket } from '@/middlewares/basket.client';
import { getCustomerProfileForCheckout, isRegisteredCustomer } from '@/lib/api/customer';
import { getShippingMethodsForShipment } from '@/lib/api/shipping-methods';
import { createApiClients } from '@/lib/api-clients';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { getPickupShipment } from '@/extensions/bopis/lib/basket-utils';
import { setAddressAndMethodForPickup } from '@/extensions/bopis/lib/api/shipment';
import { fetchStoresForBasket } from '@/extensions/bopis/lib/api/stores';
import { isPickupAddressSet } from '@/extensions/bopis/lib/store-utils';
// @sfdc-extension-block-end SFDC_EXT_BOPIS
import { isAddressEmpty } from '@/components/checkout/utils/checkout-addresses';

/**
 * Checkout page data type
 */
export type CheckoutPageData = {
    shippingMethods?: Promise<ShopperBasketsV2.schemas['ShippingMethodResult'] | null>;
    customerProfile?: Promise<CustomerProfile | null>;
    productMap: Promise<Record<string, ShopperProducts.schemas['Product']>>;
    promotions?: Promise<Record<string, ShopperPromotions.schemas['Promotion']>>;
    isRegisteredCustomer?: boolean;
    shippingDefaultSet?: Promise<undefined>;
    // @sfdc-extension-line SFDC_EXT_BOPIS
    storesByStoreId?: Map<string, ShopperStores.schemas['Store']>;
};

/**
 * Server-side customer profile fetcher
 * Optimized to reduce dynamic imports
 * Exported for use in route loaders
 */
export function getServerCustomerProfileData(
    context: LoaderFunctionArgs['context'],
    authSession: SessionData | null
): Promise<CustomerProfile | null> {
    try {
        if (!authSession || !authSession.customer_id || authSession.userType !== 'registered') {
            return Promise.resolve(null);
        }

        // Single dynamic import for server utils
        return import('@/lib/checkout-server-utils')
            .then(({ getServerCustomerProfile }) => getServerCustomerProfile(context, authSession))
            .catch(() => null);
    } catch {
        return Promise.resolve(null);
    }
}

/**
 * Server-side shipping methods fetcher. Exported for use in route loaders.
 */
export function getServerShippingMethodsData(
    _context: LoaderFunctionArgs['context'],
    authSession: SessionData | null
): Promise<ShopperBasketsV2.schemas['ShippingMethodResult'] | null> {
    // Always return null, client loader will handle shipping methods
    if (!authSession) {
        return Promise.resolve(null);
    }
    return Promise.resolve(null);
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
    productItems: ShopperBasketsV2.schemas['ProductItem'][]
): Promise<Record<string, ShopperProducts.schemas['Product']>> {
    // Main product IDs from basket items
    const ids = productItems.map((item) => item.productId ?? '').filter(Boolean);
    if (!ids.length) {
        return {};
    }

    const clients = createApiClients(context);
    const { data: productsData } = await clients.shopperProducts.getProducts({
        params: {
            query: {
                ids,
                allImages: true,
                perPricebook: true,
            },
        },
    });

    if (!productsData.data) {
        return {};
    }

    const products = productsData.data.reduce(
        (acc, product) => {
            acc[product.id] = product;
            return acc;
        },
        {} as Record<string, ShopperProducts.schemas['Product']>
    );

    // Create productsByItemId mapping
    const productsByItemId: Record<string, ShopperProducts.schemas['Product']> = {};
    productItems.forEach((productItem) => {
        if (productItem?.productId && productItem.itemId && products[productItem.productId]) {
            productsByItemId[productItem.itemId] = products[productItem.productId];
        }
    });
    return productsByItemId;
}

/**
 * Fetches promotion details for promotion IDs found in basket items, shipping items, and order-level adjustments.
 * @returns Promise that resolves to a mapping of promotion IDs to promotion data
 */
async function fetchPromotionsForBasket(
    context: ClientLoaderFunctionArgs['context'],
    productItems: ShopperBasketsV2.schemas['ProductItem'][],
    basket?: ShopperBasketsV2.schemas['Basket'] | null
): Promise<Record<string, ShopperPromotions.schemas['Promotion']>> {
    const promotionIds = new Set<string>();

    // Extract promotion IDs from product items
    productItems.forEach((productItem) => {
        if (productItem.priceAdjustments?.length) {
            productItem.priceAdjustments.forEach((adjustment) => {
                if (adjustment.promotionId) {
                    promotionIds.add(adjustment.promotionId);
                }
            });
        }
    });

    // Extract promotion IDs from shipping items
    if (basket?.shippingItems?.length) {
        basket.shippingItems.forEach((shippingItem) => {
            if (shippingItem.priceAdjustments?.length) {
                shippingItem.priceAdjustments.forEach((adjustment) => {
                    if (adjustment.promotionId) {
                        promotionIds.add(adjustment.promotionId);
                    }
                });
            }
        });
    }

    // Extract promotion IDs from order-level price adjustments
    if (basket?.priceAdjustments && Array.isArray(basket.priceAdjustments)) {
        basket.priceAdjustments.forEach((adjustment) => {
            if (adjustment.promotionId) {
                promotionIds.add(adjustment.promotionId);
            }
        });
    }

    if (promotionIds.size === 0) {
        return {};
    }

    const clients = createApiClients(context);
    const promotionIdsArray = Array.from(promotionIds);

    // API limit: maximum 50 promotion IDs per request. We batch if needed
    const MAX_PROMOTION_IDS_PER_REQUEST = 50;
    const promotions: Record<string, ShopperPromotions.schemas['Promotion']> = {};

    for (let i = 0; i < promotionIdsArray.length; i += MAX_PROMOTION_IDS_PER_REQUEST) {
        const batchIds = promotionIdsArray.slice(i, i + MAX_PROMOTION_IDS_PER_REQUEST);

        try {
            const { data: promotionsData } = await clients.shopperPromotions.getPromotions({
                params: {
                    query: {
                        ids: batchIds,
                    },
                },
            });

            if (promotionsData?.data) {
                promotionsData.data.forEach((promotion) => {
                    if (promotion.id) {
                        promotions[promotion.id] = promotion;
                    }
                });
            }
        } catch {
            // Continue with next batch if this one fails
        }
    }

    return promotions;
}

/**
 * Handles basket prefill for returning customers and returns updated basket
 *
 * IMPORTANT: Returns the updated basket (not the profile) because:
 * - The clientLoader needs the updated basket to check for shipping address
 * - After prefill, basket.shipments[0].shippingAddress is populated
 * - This allows clientLoader to correctly determine if shipping methods should be fetched
 *
 * @param context - Client loader context
 * @param profile - Customer profile with saved addresses/payment methods
 * @returns Updated basket with prefilled data, or current basket if no prefill needed
 */
async function handleBasketPrefill(
    context: ClientLoaderFunctionArgs['context'],
    profile: CustomerProfile
): Promise<ShopperBasketsV2.schemas['Basket'] | null> {
    try {
        const { shouldPrefillBasket, initializeBasketForReturningCustomer } = await import(
            '@/components/checkout/utils/checkout-utils'
        );
        const currentBasket = getBasket(context);

        if (shouldPrefillBasket(currentBasket, profile)) {
            // Prefill basket with customer's saved data (email, shipping address, billing address)
            const updatedBasket = await initializeBasketForReturningCustomer(context, profile);
            return updatedBasket;
        }

        // No prefill needed - basket already has required data
        return currentBasket;
    } catch {
        // Basket prefill failed, return current basket and continue
        // Better to show checkout without prefill than to fail completely
        return getBasket(context);
    }
}

/**
 * Client loader function for React Router
 *
 * IMPORTANT: This loader is async for a critical reason:
 *
 * For returning customers, we MUST prefill the basket before checking for shipping methods. The sequence is:
 * 1. Fetch customer profile (await - needed to get saved addresses)
 * 2. Prefill basket with saved address (await - updates basket.shipments[0].shippingAddress)
 * 3. Check if basket has shipping address. This is necessary to fetch applicable shipping methods for this address
 * 4. Fetch shipping methods for the prefilled address
 *
 * Performance trade-off:
 * Although it blocks for some time in the returning/registered shoppers case (profile fetch + basket prefill), this is
 * necessary to compute shippingMethods. Shipping methods and products still stream after loader returns.
 * Alternative options (such as promise chaining) have additional complexity and they don't improve performance either
 *
 * @returns CheckoutPageData with promises for streaming (shippingMethods, customerProfile, productMap)
 */
export async function clientLoader(args: ClientLoaderFunctionArgs): Promise<CheckoutPageData> {
    try {
        const { context } = args;
        const basket = getBasket(context);
        const userIsRegistered = isRegisteredCustomer(context);
        const session = getAuthClient(context);

        const productMapPromise = fetchProductsInBasket(context, basket?.productItems ?? []);

        const promotionsPromise = fetchPromotionsForBasket(context, basket?.productItems ?? [], basket);

        let shippingDefaultSet = Promise.resolve(undefined);
        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        // Check if this is a BOPIS order and fetch store details if so
        let storesByStoreId: Map<string, ShopperStores.schemas['Store']> | undefined;
        const pickupShipment = getPickupShipment(basket);
        if (pickupShipment) {
            storesByStoreId = await fetchStoresForBasket(context, basket);
            const store = storesByStoreId?.get(pickupShipment.c_fromStoreId as string);
            if (store) {
                // Check if address is already set to avoid unnecessary calls
                const addressAlreadySet = isPickupAddressSet(pickupShipment.shippingAddress, store);

                if (!addressAlreadySet) {
                    shippingDefaultSet = setAddressAndMethodForPickup(
                        context,
                        basket?.basketId,
                        store,
                        pickupShipment.shipmentId
                    ).then(() => Promise.resolve(undefined));
                }
            }
        }
        // @sfdc-extension-block-end SFDC_EXT_BOPIS

        // IMPORTANT: For returning shopper must prefill basket before fetching shipping methods
        if (userIsRegistered && session.customer_id) {
            // Step 1: Fetch customer profile (await for saved addresses)
            const customerProfile = await getCustomerProfileForCheckout(context, session.customer_id).catch(() => null);

            if (customerProfile) {
                // Step 2: Prefill basket with saved address (await for basket update)
                // If we don't wait, basket.shipments[0].shippingAddress is still undefined
                const updatedBasket = await handleBasketPrefill(context, customerProfile);

                // Step 3: check for shipping address
                const shippingAddress = updatedBasket?.shipments?.[0]?.shippingAddress;
                const shippingMethodsPromise =
                    updatedBasket?.basketId && !isAddressEmpty(shippingAddress)
                        ? getShippingMethodsForShipment(context, updatedBasket.basketId)
                        : undefined;

                // Return with promises for streaming
                return {
                    ...(shippingMethodsPromise && { shippingMethods: shippingMethodsPromise }),
                    customerProfile: Promise.resolve(customerProfile),
                    productMap: productMapPromise,
                    promotions: promotionsPromise,
                    isRegisteredCustomer: true,
                    shippingDefaultSet,
                    // @sfdc-extension-line SFDC_EXT_BOPIS
                    ...(storesByStoreId && { storesByStoreId }),
                };
            }
        }

        // For guest users, basket might already have shipping address from previous steps
        const shippingAddress = basket?.shipments?.[0]?.shippingAddress;
        const shippingMethodsPromise =
            basket?.basketId && !isAddressEmpty(shippingAddress)
                ? getShippingMethodsForShipment(context, basket.basketId)
                : undefined;

        return {
            ...(shippingMethodsPromise && { shippingMethods: shippingMethodsPromise }),
            productMap: productMapPromise,
            promotions: promotionsPromise,
            isRegisteredCustomer: false,
            shippingDefaultSet,
            // @sfdc-extension-line SFDC_EXT_BOPIS
            ...(storesByStoreId && { storesByStoreId }),
        };
    } catch {
        // Fallback to empty data on any error
        return {
            productMap: Promise.resolve({}),
            promotions: Promise.resolve({}),
            isRegisteredCustomer: false,
        };
    }
}
