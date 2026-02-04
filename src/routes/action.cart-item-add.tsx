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
import { type ActionFunctionArgs, data } from 'react-router';
import { ApiError, type ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { getBasket, updateBasketResource } from '@/middlewares/basket.server';
import { extractResponseError } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { getTranslation } from '@/lib/i18next';
// @sfdc-extension-line SFDC_EXT_BOPIS
import { findOrCreatePickupShipment } from '@/extensions/bopis/lib/api/shipment';

async function addToCart(
    context: ActionFunctionArgs['context'],
    productItem: Pick<ShopperBasketsV2.schemas['ProductItem'], 'productId' | 'quantity' | 'inventoryId'> & {
        storeId?: string;
    }
): Promise<{
    success: boolean;
    basket?: ShopperBasketsV2.schemas['Basket'];
    error?: string;
}> {
    const { t } = getTranslation();
    const basketResource = await getBasket(context);
    const basket = basketResource.current;

    if (!basket) {
        // This state should never happen as it would indicate that the basket middleware is broken
        return {
            success: false,
            error: t('errors:noBasketFound'),
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

        // Update the basket storage
        updateBasketResource(context, updatedBasket);

        return { success: true, basket: updatedBasket };
    } catch (error) {
        if (error instanceof ApiError) {
            return {
                success: false,
                error: error.body?.detail || error.statusText,
            };
        }
        const { responseMessage } = await extractResponseError(error);
        return {
            success: false,
            error: responseMessage,
        };
    }
}

/**
 * Server action to add a single item to the cart.
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const { t } = getTranslation();

    if (request.method !== 'POST') {
        throw new Response(t('product:methodNotAllowed'), { status: 405 });
    }

    try {
        const formData = await request.formData();
        const productItemJson = formData.get('productItem') as string;

        if (!productItemJson) {
            throw new Error(t('product:productItemRequired'));
        }

        const productItem = JSON.parse(productItemJson);
        const result = await addToCart(context, productItem);

        return Response.json(result);
    } catch (error) {
        const { responseMessage, status_code } = await extractResponseError(error);
        return data(
            {
                success: false,
                error: responseMessage,
            },
            { status: Number(status_code) }
        );
    }
}
