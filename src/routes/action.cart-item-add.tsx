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
import type { ActionFunctionArgs } from 'react-router';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { getBasket, updateBasketResource } from '@/middlewares/basket.server';
import { createApiClients } from '@/lib/api-clients.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';
// @sfdc-extension-line SFDC_EXT_BOPIS
import { findOrCreatePickupShipment } from '@/extensions/bopis/lib/api/shipment.server';

async function addToCart(
    context: ActionFunctionArgs['context'],
    productItem: Pick<ShopperBasketsV2.schemas['ProductItem'], 'productId' | 'quantity' | 'inventoryId'> & {
        storeId?: string;
    }
) {
    const logger = getLogger(context);
    logger.debug('CartItemAdd: starting addToCart', {
        productId: productItem.productId,
        quantity: productItem.quantity,
    });
    const basketResource = await getBasket(context);
    const basket = basketResource.current;

    if (!basket) {
        logger.warn('CartItemAdd: no basket found');
        return {
            success: false,
            error: createActionError({ code: ErrorCode.NOT_FOUND, message: 'No basket found' }),
        };
    }

    try {
        const clients = createApiClients(context);
        let shipmentId = 'me';

        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        if (productItem.storeId && productItem.inventoryId) {
            const pickupShipment = await findOrCreatePickupShipment(basket, context, productItem.storeId);
            shipmentId = pickupShipment.shipmentId;
        }
        // @sfdc-extension-block-end SFDC_EXT_BOPIS

        const payload = {
            productId: productItem.productId,
            quantity: productItem.quantity,
            ...(productItem.inventoryId ? { inventoryId: productItem.inventoryId } : {}),
            shipmentId,
        };
        const { data: updatedBasket } = await clients.shopperBasketsV2.addItemToBasket({
            params: { path: { basketId: basket.basketId as string } },
            body: [payload],
        });

        updateBasketResource(context, updatedBasket);

        logger.info('CartItemAdd: item added successfully');
        return { success: true, basket: updatedBasket };
    } catch (error) {
        logger.error('CartItemAdd: failed', { error });
        return { success: false, error: createActionError({ error }) };
    }
}

/**
 * Server action to add a single item to the cart.
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const logger = getLogger(context);
    logger.debug('CartItemAdd: action starting');

    if (request.method !== 'POST') {
        return Response.json(
            {
                success: false,
                error: createActionError({
                    code: ErrorCode.METHOD_NOT_ALLOWED,
                    message: `Expected POST, got ${request.method}`,
                }),
            },
            { status: 405 }
        );
    }

    try {
        const formData = await request.formData();
        const productItemJson = formData.get('productItem') as string;

        if (!productItemJson) {
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

        const productItem = JSON.parse(productItemJson);
        const result = await addToCart(context, productItem);

        if (!result.success) {
            const status = result.error?.code === ErrorCode.NOT_FOUND ? 404 : 500;
            return Response.json(result, { status });
        }
        return Response.json(result);
    } catch (error) {
        logger.error('CartItemAdd: action failed', { error });
        return Response.json({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
