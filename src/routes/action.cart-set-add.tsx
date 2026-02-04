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
import { data, type ActionFunctionArgs } from 'react-router';
import { ApiError, type ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { ensureBasketId, updateBasketResource } from '@/middlewares/basket.server';
import { extractResponseError } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { getTranslation } from '@/lib/i18next';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { findOrCreatePickupShipment } from '@/extensions/bopis/lib/api/shipment';
import { assertAllProductItemsPickup } from '@/extensions/bopis/lib/product-utils';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

async function addMultipleItemsToCart(
    context: ActionFunctionArgs['context'],
    productItems: Array<
        Pick<ShopperBasketsV2.schemas['ProductItem'], 'productId' | 'quantity' | 'inventoryId'> & {
            storeId?: string | null;
        }
    >
): Promise<{
    success: boolean;
    basket?: ShopperBasketsV2.schemas['Basket'];
    error?: string;
}> {
    const { t } = getTranslation();
    const basketId = await ensureBasketId(context);

    if (!basketId) {
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
                path: { basketId },
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

        return {
            success: true,
            basket: updatedBasket,
        };
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
 * Server action to add multiple items to the cart (for product sets).
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const { t } = getTranslation();

    if (request.method !== 'POST') {
        throw new Response(t('product:methodNotAllowed'), { status: 405 });
    }

    try {
        const formData = await request.formData();
        const productItemsJson = formData.get('productItems') as string;

        if (!productItemsJson) {
            throw new Error(t('product:productItemsRequired'));
        }

        const productItems = JSON.parse(productItemsJson);
        const result = await addMultipleItemsToCart(context, productItems);

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
