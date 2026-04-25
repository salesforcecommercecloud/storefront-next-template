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
import { type ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { getBasket, updateBasketResource } from '@/middlewares/basket.server';
import { createApiClients } from '@/lib/api-clients.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { findOrCreatePickupShipment } from '@/extensions/bopis/lib/api/shipment.server';
import { assertAllProductItemsPickup } from '@/extensions/bopis/lib/product-utils';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

async function addMultipleItemsToCart(
    context: ActionFunctionArgs['context'],
    productItems: Array<
        Pick<ShopperBasketsV2.schemas['ProductItem'], 'productId' | 'quantity' | 'inventoryId'> & {
            storeId?: string | null;
        }
    >
) {
    const logger = getLogger(context);
    logger.debug('CartSetAdd: starting addMultipleItemsToCart', { itemCount: productItems.length });
    const basketResource = await getBasket(context);
    const basket = basketResource.current;

    if (!basket) {
        logger.warn('CartSetAdd: no basket found');
        return {
            success: false,
            error: createActionError({ code: ErrorCode.NOT_FOUND, message: 'No basket found' }),
        };
    }

    try {
        const clients = createApiClients(context);
        let shipmentId = 'me';

        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        const firstItem = productItems[0];
        if (firstItem.storeId && firstItem.inventoryId) {
            assertAllProductItemsPickup(productItems);
            const pickupShipment = await findOrCreatePickupShipment(basket, context, firstItem.storeId);
            shipmentId = pickupShipment.shipmentId;
        }
        // @sfdc-extension-block-end SFDC_EXT_BOPIS

        // Add all items to basket in a single API call
        const { data: updatedBasket } = await clients.shopperBasketsV2.addItemToBasket({
            params: {
                path: { basketId: basket.basketId as string },
            },
            body: productItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                ...(item.inventoryId ? { inventoryId: item.inventoryId } : {}),
                shipmentId,
            })),
        });

        // Update the basket storage
        updateBasketResource(context, updatedBasket);

        logger.info('CartSetAdd: items added successfully');
        return {
            success: true,
            basket: updatedBasket,
        };
    } catch (error) {
        logger.error('CartSetAdd: failed', { error });
        return { success: false, error: createActionError({ error }) };
    }
}

/**
 * Server action to add multiple items to the cart (for product sets).
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const logger = getLogger(context);
    logger.debug('CartSetAdd: action starting');

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
        const productItemsJson = formData.get('productItems') as string;

        if (!productItemsJson) {
            logger.warn('CartSetAdd: missing productItems in form data');
            return Response.json(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.REQUIRED_FIELD,
                        message: 'productItems missing from form data',
                    }),
                },
                { status: 400 }
            );
        }

        const productItems = JSON.parse(productItemsJson);
        const result = await addMultipleItemsToCart(context, productItems);

        if (!result.success) {
            const status = result.error?.code === ErrorCode.NOT_FOUND ? 404 : 500;
            return Response.json(result, { status });
        }
        return Response.json(result);
    } catch (error) {
        logger.error('CartSetAdd: action failed', { error });
        return Response.json({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
