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

async function addToCart(
    context: ActionFunctionArgs['context'],
    productItem: Pick<ShopperBasketsTypes.ProductItem, 'productId' | 'quantity'>
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
        const client = createClient(context).ShopperBaskets;
        const updatedBasket = await client.addItemToBasket({
            parameters: { basketId },
            body: [
                {
                    productId: productItem.productId,
                    quantity: productItem.quantity,
                },
            ] as Parameters<CommerceSdkClient['ShopperBaskets']['addItemToBasket']>[0]['body'],
        });

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
