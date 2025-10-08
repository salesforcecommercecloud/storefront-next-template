/**
 * Server-side checkout utilities for SSR support
 *
 * This module provides server-compatible versions of checkout functions
 * that don't rely on browser APIs like localStorage or document.cookie.
 */

import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperBasketsTypes } from 'commerce-sdk-isomorphic';
import { getShippingMethodsForShipment } from '@/lib/api/shipping-methods';
import type { SessionData as AuthData } from '@/lib/api/types';
import type { CustomerProfile } from '@/components/checkout-one-click/utils/checkout-context-types';
import createClient from '@/lib/scapi';
import { getBasket } from '@/middlewares/basket.client';

/**
 * Server-side customer profile retrieval using validated auth session
 *
 * Fetches customer profile data using the validated auth session from middleware.
 */
export function getServerCustomerProfile(
    context: LoaderFunctionArgs['context'],
    authSession: AuthData
): Promise<CustomerProfile | null> {
    try {
        if (!authSession || !authSession.customer_id) {
            return Promise.resolve(null);
        }

        // Check if user is actually a registered customer (not just auto-registered guest)
        const userIsRegistered = authSession.userType === 'registered';
        if (!userIsRegistered) {
            return Promise.resolve(null);
        }

        // Use the provided auth session and proper context
        const shopperCustomersClient = createClient(context).ShopperCustomers;

        // Fetch customer data and return promise for streaming
        return shopperCustomersClient
            .getCustomer({
                parameters: { customerId: authSession.customer_id },
            })
            .then((customer) => ({
                customer,
                addresses: customer.addresses || [],
                paymentInstruments: customer.paymentInstruments || [],
                preferredShippingAddress: customer.preferredShippingAddress,
                preferredBillingAddress: customer.preferredBillingAddress,
            }));
    } catch {
        // Failed to fetch customer profile
        return Promise.resolve(null);
    }
}

/**
 * Fetches shipping methods for a basket using the existing basket middleware.
 */
export function getServerShippingMethods(
    context: LoaderFunctionArgs['context']
): Promise<ShopperBasketsTypes.ShippingMethodResult | null> {
    try {
        // Get basket using existing basket middleware
        const basket = getBasket(context);
        if (!basket?.basketId || !basket.shipments?.[0]?.shippingAddress) {
            return Promise.resolve(null);
        }

        // Fetch shipping methods and return promise for streaming
        return getShippingMethodsForShipment(context, basket.basketId);
    } catch {
        // Failed to fetch shipping methods
        return Promise.resolve(null);
    }
}

/**
 * Server-side checkout data structure
 *
 * This mirrors the CheckoutPageData type but with resolved data instead of promises,
 * since server-side rendering should resolve data before sending to client.
 */
export type ServerCheckoutData = {
    basket?: ShopperBasketsTypes.Basket | null;
    customerProfile?: Promise<CustomerProfile | null>;
    shippingMethods?: Promise<ShopperBasketsTypes.ShippingMethodResult | null>;
    isRegisteredCustomer?: boolean;
};

/**
 * Server-side checkout data fetcher
 *
 * Fetches all necessary checkout data using validated auth sessions.
 * This function uses the standard auth middleware and ensures token freshness.
 */
export function getServerCheckoutData({ context }: LoaderFunctionArgs, authSession: AuthData): ServerCheckoutData {
    try {
        if (!authSession) {
            return {
                basket: null,
                customerProfile: Promise.resolve(null),
                shippingMethods: Promise.resolve(null),
                isRegisteredCustomer: false,
            };
        }

        const isRegistered = authSession.userType === 'registered';

        const basket = getBasket(context);

        // Fetch all dependent data in parallel
        const customerProfilePromise = isRegistered
            ? getServerCustomerProfile(context, authSession)
            : Promise.resolve(null);

        const shippingMethodsPromise =
            basket?.basketId && basket.shipments?.[0]?.shippingAddress
                ? getServerShippingMethods(context)
                : Promise.resolve(null);

        // Execute all remaining fetches in parallel - return promises directly for streaming
        return {
            basket,
            customerProfile: customerProfilePromise,
            shippingMethods: shippingMethodsPromise,
            isRegisteredCustomer: isRegistered,
        };
    } catch {
        // Return empty data on error - client-side will handle fallback
        return {
            basket: null,
            customerProfile: Promise.resolve(null),
            shippingMethods: Promise.resolve(null),
            isRegisteredCustomer: false,
        };
    }
}
