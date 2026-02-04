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
import { ApiError, type ShopperBasketsV2, type ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { ensureBasketId, updateBasketResource } from '@/middlewares/basket.server';
import { createApiClients } from '@/lib/api-clients';
// @sfdc-extension-line SFDC_EXT_BOPIS
import { findOrCreatePickupShipment } from '@/extensions/bopis/lib/api/shipment';
import { getTranslation } from '@/lib/i18next';

/**
 * Product selection values structure matching client-side ProductSelectionValues
 * This structure makes it clear what type of entity we're dealing with (product, variant, standard, etc.)
 */
type ProductSelectionValues = {
    product: ShopperProducts.schemas['Product'];
    variant?: ShopperProducts.schemas['Variant'];
    quantity: number;
};

async function addBundleToCart(
    context: ActionFunctionArgs['context'],
    bundleItem: Pick<ShopperBasketsV2.schemas['ProductItem'], 'productId' | 'quantity' | 'inventoryId'> & {
        storeId?: string | null;
    },
    childSelections: ProductSelectionValues[]
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
        if (bundleItem.storeId && bundleItem.inventoryId) {
            const pickupShipment = await findOrCreatePickupShipment(basket, context, bundleItem.storeId);
            shipmentId = pickupShipment.shipmentId;
        }
        // @sfdc-extension-block-end SFDC_EXT_BOPIS

        // Extract productId and quantity from ProductSelectionValues structure for API call
        // Prefer variant.productId if variant exists, otherwise use product.id
        const bundledProductItems = childSelections.map((selection) => ({
            productId: selection.variant?.productId || selection.product.id,
            quantity: selection.quantity,
        }));

        // Add bundle to basket with bundled product items
        const { data: initialBasket } = await clients.shopperBasketsV2.addItemToBasket({
            params: {
                path: { basketId },
            },
            body: [
                {
                    productId: bundleItem.productId,
                    quantity: bundleItem.quantity,
                    ...(bundleItem.inventoryId ? { inventoryId: bundleItem.inventoryId } : {}),
                    shipmentId,
                    bundledProductItems,
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
                    // Check both variant.productId and product.id to find the match
                    const matchingSelection = childSelections.find(
                        (selection) =>
                            selection.variant?.productId === bundledItem.productId ||
                            selection.product.id === bundledItem.productId
                    );

                    // Extract productId from the full structure (prefer variant.productId if variant exists)
                    const selectedProductId = matchingSelection?.variant?.productId || matchingSelection?.product.id;

                    return {
                        itemId: bundledItem.itemId,
                        productId: selectedProductId || bundledItem.productId,
                        quantity: matchingSelection?.quantity || bundledItem.quantity,
                        ...(bundleItem.inventoryId ? { inventoryId: bundleItem.inventoryId } : {}),
                        shipmentId,
                    };
                });

                await clients.shopperBasketsV2.updateItemsInBasket({
                    params: {
                        path: { basketId },
                    },
                    body: itemsToUpdate,
                });

                // Get the updated basket after child items update
                const { data: refreshedBasket } = await clients.shopperBasketsV2.getBasket({
                    params: {
                        path: { basketId },
                    },
                });
                updatedBasket = refreshedBasket;
            }
        }

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
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred',
        };
    }
}

/**
 * Server action to add a product bundle to the cart.
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const { t } = getTranslation();

    if (request.method !== 'POST') {
        throw new Response(t('product:methodNotAllowed'), { status: 405 });
    }

    try {
        const formData = await request.formData();
        const bundleItemJson = formData.get('bundleItem') as string;
        const childSelectionsJson = formData.get('childSelections') as string;

        if (!bundleItemJson || !childSelectionsJson) {
            throw new Error(t('product:bundleDataRequired'));
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
