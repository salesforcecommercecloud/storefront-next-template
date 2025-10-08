/**
 * React Router checkout loaders for server-side and client-side data fetching
 *
 * This module provides React Router loader functions for the checkout route,
 * handling both server-side rendering and client-side data fetching with
 * automatic fallbacks and optimized performance.
 */

import type { LoaderFunctionArgs, ClientLoaderFunctionArgs } from 'react-router';
import type { ShopperBasketsTypes } from 'commerce-sdk-isomorphic';
import type { CustomerProfile } from '@/components/checkout-one-click/utils/checkout-context-types';
import type { SessionData } from '@/lib/api/types';
import { getAuth as getAuthClient } from '@/middlewares/auth.client';
import { getBasket } from '@/middlewares/basket.client';
import { getCustomerProfileForCheckout, isRegisteredCustomer } from '@/lib/api/customer';
import { getShippingMethodsForShipment } from '@/lib/api/shipping-methods';

/**
 * Checkout page data type
 */
export type CheckoutPageData = {
    shippingMethods?: Promise<ShopperBasketsTypes.ShippingMethodResult | null>;
    customerProfile?: Promise<CustomerProfile | null>;
    isRegisteredCustomer?: boolean;
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
): Promise<ShopperBasketsTypes.ShippingMethodResult | null> {
    // Always return null, client loader will handle shipping methods
    if (!authSession) {
        return Promise.resolve(null);
    }
    return Promise.resolve(null);
}

/**
 * Handles basket prefill for returning customers
 */
async function handleBasketPrefill(
    context: ClientLoaderFunctionArgs['context'],
    profile: CustomerProfile
): Promise<CustomerProfile> {
    try {
        const { shouldPrefillBasket, initializeBasketForReturningCustomer } = await import(
            '@/components/checkout-one-click/utils/checkout-utils'
        );
        const currentBasket = getBasket(context);

        if (shouldPrefillBasket(currentBasket, profile)) {
            await initializeBasketForReturningCustomer(context, profile);
        }
    } catch {
        // Basket prefill failed, continue without it
    }
    return profile;
}

/**
 * Client loader function for React Router
 */
export function clientLoader(args: ClientLoaderFunctionArgs): CheckoutPageData {
    try {
        const { context } = args;
        const basket = getBasket(context);
        const userIsRegistered = isRegisteredCustomer(context);
        const session = getAuthClient(context);

        // Create shipping methods promise if we have required basket data
        let shippingMethodsPromise: Promise<ShopperBasketsTypes.ShippingMethodResult> | undefined;
        if (basket?.basketId && basket.shipments?.[0]?.shippingAddress) {
            shippingMethodsPromise = getShippingMethodsForShipment(context, basket.basketId);
        }

        // Create customer profile promise with basket prefill for registered users
        let customerProfilePromise: Promise<CustomerProfile | null> | undefined;
        if (userIsRegistered && session.customer_id) {
            customerProfilePromise = getCustomerProfileForCheckout(context, session.customer_id)
                .then((profile) => (profile ? handleBasketPrefill(context, profile) : null))
                .catch(() => null);
        }

        return {
            shippingMethods: shippingMethodsPromise,
            customerProfile: customerProfilePromise,
            isRegisteredCustomer: userIsRegistered,
        };
    } catch {
        // Fallback to empty data on any error
        return {
            isRegisteredCustomer: false,
        };
    }
}
