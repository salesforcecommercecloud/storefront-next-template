import type { RouterContextProvider } from 'react-router';
import type { ShopperBasketsTypes } from 'commerce-sdk-isomorphic';
import createClient from '@/lib/scapi';

/**
 * Get available shipping methods for a shipment using the Commerce API
 * This follows the PWA Kit pattern for fetching real shipping methods
 */
export async function getShippingMethodsForShipment(
    context: Readonly<RouterContextProvider>,
    basketId: string,
    shipmentId: string = 'me'
): Promise<ShopperBasketsTypes.ShippingMethodResult> {
    return createClient(context).ShopperBaskets.getShippingMethodsForShipment({
        parameters: {
            basketId,
            shipmentId,
        },
    });
}
