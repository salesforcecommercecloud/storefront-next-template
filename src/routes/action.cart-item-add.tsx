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
import { BasketAction, createBasketAction } from '@/lib/cart/basket-action.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
// @sfdc-extension-line SFDC_EXT_BOPIS
import { findOrCreatePickupShipment } from '@/extensions/bopis/lib/api/shipment.server';

/**
 * Server action to add a single item to the cart.
 */
export const action = createBasketAction(
    {
        method: 'POST',
        action: BasketAction.CartItemAdd,
        parse: (fd) => {
            const raw = fd.get('productItem') as string | null;
            return raw
                ? (JSON.parse(raw) as { productId: string; quantity: number; inventoryId?: string; storeId?: string })
                : null;
        },
    },
    async ({ data, basketId, basket, context, clients, logger }) => {
        if (!data) {
            logger.warn('CartItemAdd: missing productItem in form data');
            return Response.json(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.REQUIRED_FIELD,
                        message: 'productItem missing from form data',
                    }),
                },
                { status: 400 }
            );
        }

        logger.debug('CartItemAdd: starting addToCart', {
            productId: data.productId,
            quantity: data.quantity,
        });

        let shipmentId = 'me';

        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        if (data.storeId && data.inventoryId) {
            const pickupShipment = await findOrCreatePickupShipment(basket, context, data.storeId);
            shipmentId = pickupShipment.shipmentId;
        }
        // @sfdc-extension-block-end SFDC_EXT_BOPIS

        const payload = {
            productId: data.productId,
            quantity: data.quantity,
            ...(data.inventoryId ? { inventoryId: data.inventoryId } : {}),
            shipmentId,
        };
        const { data: updatedBasket } = await clients.shopperBasketsV2.addItemToBasket({
            params: { path: { basketId } },
            body: [payload],
        });
        return updatedBasket;
    }
);
