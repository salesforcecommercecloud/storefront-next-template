/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { data, type ActionFunctionArgs } from 'react-router';
import { ApiError, type ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { getBasket, updateBasket } from '@/middlewares/basket.client';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';
import uiStrings from '@/temp-ui-string';
// @sfdc-extension-line SFDC_EXT_BOPIS
import { updateShipmentForPickup } from '@/extensions/bopis/lib/api/shipment';

async function addBundleToCart(
    context: ActionFunctionArgs['context'],
    bundleItem: Pick<ShopperBasketsV2.schemas['ProductItem'], 'productId' | 'quantity' | 'inventoryId'> & {
        storeId?: string | null;
    },
    childSelections: Array<{ productId: string; quantity: number }>
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
        // Add bundle to basket with bundled product items
        const config = getConfig(context);
        const clients = createApiClients(context);
        const { data: initialBasket } = await clients.shopperBasketsV2.addItemToBasket({
            params: {
                path: { organizationId: config.commerce.api.organizationId, basketId },
                query: {
                    siteId: config.commerce.api.siteId,
                },
            },
            body: [
                {
                    productId: bundleItem.productId,
                    quantity: bundleItem.quantity,
                    inventoryId: bundleItem.inventoryId,
                    bundledProductItems: childSelections,
                },
            ],
        });

        let updatedBasket = initialBasket;

        // If there are child selections, we may need to update them
        // This is a follow-up call similar to the original implementation
        if (childSelections.length > 0) {
            // Get the basket item we just added
            const addedItem = updatedBasket.productItems?.find((item) => item.productId === bundleItem.productId);

            if (addedItem?.bundledProductItems) {
                // Update the bundled product items with correct variant selections
                // Match by product ID instead of array index to handle correct ordering
                const itemsToUpdate = addedItem.bundledProductItems.map((bundledItem) => {
                    // Find the corresponding selection by matching product ID
                    const matchingSelection = childSelections.find(
                        (selection) => selection.productId === bundledItem.productId
                    );

                    return {
                        itemId: bundledItem.itemId,
                        productId: matchingSelection?.productId || bundledItem.productId,
                        quantity: matchingSelection?.quantity || bundledItem.quantity,
                    };
                });

                await clients.shopperBasketsV2.updateItemsInBasket({
                    params: {
                        path: { organizationId: config.commerce.api.organizationId, basketId },
                        query: {
                            siteId: config.commerce.api.siteId,
                        },
                    },
                    body: itemsToUpdate,
                });

                // Get the updated basket after child items update
                const { data: refreshedBasket } = await clients.shopperBasketsV2.getBasket({
                    params: {
                        path: { organizationId: config.commerce.api.organizationId, basketId },
                        query: {
                            siteId: config.commerce.api.siteId,
                        },
                    },
                });
                updatedBasket = refreshedBasket;
            }
        }

        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        // Update shipment with store information when pickup bundle is added
        if (bundleItem.storeId && bundleItem.inventoryId) {
            updatedBasket = await updateShipmentForPickup(context, basketId, 'me', bundleItem.storeId);
        }
        // @sfdc-extension-block-end SFDC_EXT_BOPIS

        // Update the basket storage
        updateBasket(context, updatedBasket);

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
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred',
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
        if (error instanceof ApiError) {
            return data(
                {
                    success: false,
                    error: error.body?.detail || error.statusText,
                },
                { status: error.status }
            );
        }
        return data(
            {
                success: false,
                error: error instanceof Error ? error.message : 'An unexpected error occurred',
            },
            { status: 500 }
        );
    }
}
