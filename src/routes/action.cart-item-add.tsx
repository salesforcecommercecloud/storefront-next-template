/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { type ActionFunctionArgs, data } from 'react-router';
import type { ShopperBasketsTypes } from 'commerce-sdk-isomorphic';
import { getBasket, updateBasket } from '@/middlewares/basket.client';
import { extractResponseError } from '@/lib/utils';
import createClient, { type CommerceSdkClient } from '@/lib/scapi';
import uiStrings from '@/temp-ui-string';
// @sfdc-extension-line SFDC_EXT_BOPIS
import { updateShipmentForPickup } from '@/extensions/bopis/lib/api/shipment';

async function addToCart(
    context: ActionFunctionArgs['context'],
    productItem: Pick<ShopperBasketsTypes.ProductItem, 'productId' | 'quantity' | 'inventoryId'> & {
        storeId?: string | null;
    }
): Promise<{
    success: boolean;
    basket?: ShopperBasketsTypes.Basket;
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
        const client = createClient(context).ShopperBasketsV2;
        let updatedBasket = await client.addItemToBasket({
            parameters: { basketId },
            body: [
                {
                    productId: productItem.productId,
                    quantity: productItem.quantity,
                    inventoryId: productItem.inventoryId,
                },
            ] as Parameters<CommerceSdkClient['ShopperBasketsV2']['addItemToBasket']>[0]['body'],
        });

        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        // Update shipment with store information when pickup item is added
        if (productItem.storeId && productItem.inventoryId) {
            updatedBasket = await updateShipmentForPickup(context, basketId, 'me', productItem.storeId);
        }
        // @sfdc-extension-block-end SFDC_EXT_BOPIS

        // Update the basket storage
        updateBasket(context, updatedBasket);

        return {
            success: true,
            basket: updatedBasket,
        };
    } catch (error) {
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
