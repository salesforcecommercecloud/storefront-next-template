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
import { getBasket, updateBasketResource } from '@/middlewares/basket.server';
import { createApiClients } from '@/lib/api-clients.server';
import { findOrCreateDeliveryShipment } from '@/extensions/multiship/lib/api/basket.server';
import { findOrCreatePickupShipment } from '@/extensions/bopis/lib/api/shipment.server';
import { createBasketSuccessResponse } from '@/routes/types/action-responses';
import type { RouterContextProvider } from 'react-router';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import type { CartItemUpdateData } from '@/lib/basket-schemas';

/**
 * Handles delivery option changes for cart items.
 * Moves shipment or updates delivery option based on provided data.
 * Returns a response if the delivery option is handled, or null to fall back to default handler.
 */
export async function handleCartItemDeliveryOptionChange(
    data: CartItemUpdateData,
    context: Readonly<RouterContextProvider>
): Promise<Response | null> {
    const { itemId, productId, quantity, deliveryOption, storeId, inventoryId } = data;

    if (!deliveryOption) return null;

    try {
        const basketResource = await getBasket(context);
        const freshBasket = basketResource.current;
        if (!freshBasket?.basketId) {
            return Response.json(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.NOT_FOUND, message: 'Basket ID is required.' }),
                },
                { status: 404 }
            );
        }
        const clients = createApiClients(context);
        let targetShipment;
        if (deliveryOption === 'pickup') {
            if (!storeId || !inventoryId) {
                return Response.json(
                    {
                        success: false,
                        error: createActionError({
                            code: ErrorCode.REQUIRED_FIELD,
                            message: 'Store and inventory ID required for pickup.',
                        }),
                    },
                    { status: 400 }
                );
            }
            targetShipment = await findOrCreatePickupShipment(freshBasket, context, storeId);
        } else if (deliveryOption === 'delivery') {
            targetShipment = await findOrCreateDeliveryShipment(freshBasket, context);
        }
        if (!targetShipment) {
            return Response.json(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.OPERATION_FAILED,
                        message: 'Could not find or create target shipment.',
                    }),
                },
                { status: 500 }
            );
        }
        await clients.shopperBasketsV2.updateItemInBasket({
            params: { path: { basketId: freshBasket.basketId, itemId } },
            body: {
                quantity,
                productId,
                inventoryId: deliveryOption === 'pickup' ? inventoryId : undefined,
                shipmentId: targetShipment.shipmentId,
            },
        });
        // Refetch basket after mutation
        const basket = await clients.shopperBasketsV2.getBasket({
            params: { path: { basketId: freshBasket.basketId } },
        });
        updateBasketResource(context, basket.data);
        return Response.json(createBasketSuccessResponse(basket.data));
    } catch (error) {
        return Response.json({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
