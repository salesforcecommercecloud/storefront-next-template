/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { RouterContextProvider } from 'react-router';
import type { ShopperBasketsTypes } from 'commerce-sdk-isomorphic';
import createClient from '@/lib/scapi';

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
): Promise<ShopperBasketsTypes.Basket> {
    const client = createClient(context).ShopperBasketsV2;

    // Update shipment with custom attributes
    const updatedBasket = await client.updateShipmentForBasket({
        parameters: {
            basketId,
            shipmentId,
        },
        body: {
            c_fromStoreId: storeId,
        },
    });

    return updatedBasket;
}
