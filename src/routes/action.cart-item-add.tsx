/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { type ActionFunctionArgs, data } from 'react-router';
import { ApiError, type ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { getBasket, updateBasket } from '@/middlewares/basket.client';
import { extractResponseError } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';
import uiStrings from '@/temp-ui-string';
// @sfdc-extension-line SFDC_EXT_BOPIS
import { updateShipmentForPickup } from '@/extensions/bopis/lib/api/shipment';

async function addToCart(
    context: ActionFunctionArgs['context'],
    productItem: Pick<ShopperBasketsV2.schemas['ProductItem'], 'productId' | 'quantity' | 'inventoryId'> & {
        storeId?: string | null;
    }
): Promise<{
    success: boolean;
    basket?: ShopperBasketsV2.schemas['Basket'];
    error?: string;
}> {
    const basket = getBasket(context);
    const basketId = basket?.basketId;

    if (!basketId) {
        // This state should never happen as it would indicate that the basket middleware is broken
        return {
            success: false,
            error: uiStrings.errors.noBasketFound,
        };
    }

    try {
        // Add item to basket
        const config = getConfig(context);
        const clients = createApiClients(context);
        const { data: updatedBasket } = await clients.shopperBasketsV2.addItemToBasket({
            params: {
                path: { organizationId: config.commerce.api.organizationId, basketId },
                query: {
                    siteId: config.commerce.api.siteId,
                },
            },
            body: [
                {
                    productId: productItem.productId,
                    quantity: productItem.quantity,
                    inventoryId: productItem.inventoryId,
                },
            ],
        });

        let finalBasket = updatedBasket;

        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        // Update shipment with store information when pickup item is added
        if (productItem.storeId && productItem.inventoryId) {
            finalBasket = await updateShipmentForPickup(context, basketId, 'me', productItem.storeId);
        }
        // @sfdc-extension-block-end SFDC_EXT_BOPIS

        // Update the basket storage
        updateBasket(context, finalBasket);

        return {
            success: true,
            basket: finalBasket,
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
 * Client action to add a single item to the cart.
 */
export async function clientAction({ request, context }: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        throw new Response(uiStrings.product.methodNotAllowed, { status: 405 });
    }

    try {
        const formData = await request.formData();
        const productItemJson = formData.get('productItem') as string;

        if (!productItemJson) {
            throw new Error(uiStrings.product.productItemRequired);
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
