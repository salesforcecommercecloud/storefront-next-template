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

async function addBundleToCart(
    context: ActionFunctionArgs['context'],
    bundleItem: Pick<ShopperBasketsTypes.ProductItem, 'productId' | 'quantity'>,
    childSelections: Array<{ productId: string; quantity: number }>
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
        // Add bundle to basket with bundled product items
        const client = createClient(context).ShopperBaskets;
        const updatedBasket = await client.addItemToBasket({
            parameters: { basketId },
            body: [
                {
                    productId: bundleItem.productId,
                    quantity: bundleItem.quantity,
                    bundledProductItems: childSelections,
                },
            ] as Parameters<CommerceSdkClient['ShopperBaskets']['addItemToBasket']>[0]['body'],
        });

        // Update the basket storage
        updateBasket(context, updatedBasket);

        // If there are child selections, we may need to update them
        // This is a follow-up call similar to the original implementation
        if (childSelections.length > 0) {
            // Get the basket item we just added
            const addedItem = updatedBasket.productItems?.find((item) => item.productId === bundleItem.productId);

            if (addedItem?.bundledProductItems) {
                // Update the bundled product items with correct variant selections
                await client.updateItemsInBasket({
                    parameters: { basketId },
                    body: addedItem.bundledProductItems.map((bundledItem, index) => ({
                        itemId: bundledItem.itemId,
                        productId: childSelections[index]?.productId || bundledItem.productId,
                        quantity: childSelections[index]?.quantity || bundledItem.quantity,
                    })) as Parameters<CommerceSdkClient['ShopperBaskets']['updateItemsInBasket']>[0]['body'],
                });

                // Get the final updated basket
                const finalBasket = await client.getBasket({
                    parameters: { basketId },
                });

                return {
                    success: true,
                    basket: finalBasket,
                };
            }
        }

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
 * Client action to add a product bundle to the cart.
 */
export async function clientAction({ request, context }: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        throw new Response(uiStrings.product.methodNotAllowed, { status: 405 });
    }

    try {
        const formData = await request.formData();
        const bundleItemJson = formData.get('bundleItem') as string;
        const childSelectionsJson = formData.get('childSelections') as string;

        if (!bundleItemJson || !childSelectionsJson) {
            throw new Error(uiStrings.product.bundleDataRequired);
        }

        const bundleItem = JSON.parse(bundleItemJson);
        const childSelections = JSON.parse(childSelectionsJson);

        const result = await addBundleToCart(context, bundleItem, childSelections);

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
