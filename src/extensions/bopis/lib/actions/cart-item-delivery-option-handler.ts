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
import { createApiClients } from '@/lib/api-clients';
import { findOrCreateDeliveryShipment } from '@/extensions/multiship/lib/api/basket';
import { findOrCreatePickupShipment } from '@/extensions/bopis/lib/api/shipment';
import { createBasketSuccessResponse, createBasketErrorResponse } from '@/routes/types/action-responses';
import type { ClientActionFunctionArgs } from 'react-router';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';
import type { CartItemUpdateData } from '@/lib/basket-schemas';

/**
 * Handles delivery option changes for cart items.
 * Moves shipment or updates delivery option based on provided data.
 * Returns a response if the delivery option is handled, or null to fall back to default handler.
 */
export async function handleCartItemDeliveryOptionChange(
    data: CartItemUpdateData,
    context: ClientActionFunctionArgs['context']
) {
    const { itemId, productId, quantity, deliveryOption, storeId, inventoryId } = data;

    if (!deliveryOption) return null;

    try {
        const basketResource = await getBasket(context);
        const freshBasket = basketResource.current;
        if (!freshBasket?.basketId) {
            return createBasketErrorResponse('Basket ID is required.');
        }
        const clients = createApiClients(context);
        let targetShipment;
        if (deliveryOption === 'pickup') {
            if (!storeId || !inventoryId) {
                return createBasketErrorResponse('Store and inventory ID required for pickup.');
            }
            targetShipment = await findOrCreatePickupShipment(freshBasket, context, storeId);
        } else if (deliveryOption === 'delivery') {
            targetShipment = await findOrCreateDeliveryShipment(freshBasket, context);
        }
        if (!targetShipment) {
            return createBasketErrorResponse('Could not find or create target shipment.');
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
        return createBasketSuccessResponse(basket.data);
    } catch (error) {
        if (error instanceof ApiError) {
            return createBasketErrorResponse(error.body?.detail || error.statusText);
        }
        return createBasketErrorResponse(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
}
