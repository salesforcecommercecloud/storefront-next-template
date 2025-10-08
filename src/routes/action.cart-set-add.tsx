/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { data, type ActionFunctionArgs } from 'react-router';
import type { ShopperBasketsTypes } from 'commerce-sdk-isomorphic';
import { getBasket, updateBasket } from '@/middlewares/basket.client';
import { extractResponseError } from '@/lib/utils';
import createClient, { type CommerceSdkClient } from '@/lib/scapi';
import uiStrings from '@/temp-ui-string';

async function addMultipleItemsToCart(
    context: ActionFunctionArgs['context'],
    productItems: Array<Pick<ShopperBasketsTypes.ProductItem, 'productId' | 'quantity'>>
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
        // Add all items to basket in a single API call
        const client = createClient(context).ShopperBaskets;
        const updatedBasket = await client.addItemToBasket({
            parameters: { basketId },
            body: productItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
            })) as Parameters<CommerceSdkClient['ShopperBaskets']['addItemToBasket']>[0]['body'],
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
 * Client action to add multiple items to the cart (for product sets).
 */
export async function clientAction({ request, context }: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        throw new Response(uiStrings.product.methodNotAllowed, { status: 405 });
    }

    try {
        const formData = await request.formData();
        const productItemsJson = formData.get('productItems') as string;

        if (!productItemsJson) {
            throw new Error(uiStrings.product.productItemsRequired);
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
