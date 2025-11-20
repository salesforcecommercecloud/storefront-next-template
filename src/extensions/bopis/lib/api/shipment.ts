/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { RouterContextProvider } from 'react-router';
import { PICKUP_SHIPPING_METHOD_ID } from '@/extensions/bopis/constants';
import bopisUiStrings from '@/extensions/bopis/temp-ui-string-bopis';
import type { ShopperBasketsV2, ShopperStores } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';

/**
 * Update shipment custom attributes for pickup
 * Sets c_fromStoreId and c_isStorePickup on the shipment
 *
 * @param context - Router context
 * @param basketId - Basket ID
 * @param shipmentId - Shipment ID (defaults to 'me')
 * @param storeId - Store ID for pickup
 * @returns Updated basket
 */
export async function updateShipmentForPickup(
    context: Readonly<RouterContextProvider>,
    basketId: string,
    shipmentId: string = 'me',
    storeId: string
): Promise<ShopperBasketsV2.schemas['Basket']> {
    const config = getConfig(context);
    const clients = createApiClients(context);

    // Update shipment with custom attributes
    const { data: updatedBasket } = await clients.shopperBasketsV2.updateShipmentForBasket({
        params: {
            path: {
                organizationId: config.commerce.api.organizationId,
                basketId,
                shipmentId,
            },
            query: {
                siteId: config.commerce.api.siteId,
            },
        },
        body: {
            shipmentId,
            c_fromStoreId: storeId,
        },
    });

    return updatedBasket;
}

/**
 * Sets store address and shipping method for BOPIS orders
 *
 * @param context - Router context
 * @param basket - Current basket
 * @param store - Store details for pickup
 * @param shipmentId - Shipment ID (defaults to 'me')
 * @returns Updated basket with store address and shipping method
 */
export async function setAddressAndMethodForPickup(
    context: Readonly<RouterContextProvider>,
    basketId: string,
    store: ShopperStores.schemas['Store'],
    shipmentId: string = 'me'
): Promise<ShopperBasketsV2.schemas['Basket']> {
    const config = getConfig(context);
    const clients = createApiClients(context);

    const storeAddress = {
        firstName: store?.name || '',
        lastName: bopisUiStrings.storePickup.pickupLastName,
        address1: store?.address1 || '',
        address2: store?.address2 || '',
        city: store?.city || '',
        stateCode: store?.stateCode || '',
        postalCode: store?.postalCode || '',
        countryCode: store?.countryCode || '',
    };

    // Update both shipping address and method in one call
    const { data: updatedBasket } = await clients.shopperBasketsV2.updateShipmentForBasket({
        params: {
            path: {
                organizationId: config.commerce.api.organizationId,
                basketId,
                shipmentId,
            },
            query: {
                siteId: config.commerce.api.siteId,
            },
        },
        body: {
            shipmentId,
            shippingAddress: storeAddress,
            shippingMethod: {
                id: PICKUP_SHIPPING_METHOD_ID,
            },
        },
    });

    return updatedBasket;
}
