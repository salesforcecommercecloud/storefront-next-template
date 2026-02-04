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
import { extractResponseError } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { getTranslation } from '@/lib/i18next';
import { bonusProductAddSchema, parseBonusProductAddFromFormData } from '@/lib/basket-schemas';
import {
    type BasketActionResponse,
    createBasketErrorResponse,
    createBasketSuccessResponse,
} from './types/action-responses';
import { getBasket, updateBasketResource } from '@/middlewares/basket.server';

/**
 * Add bonus products to the cart (supports multiple slots)
 *
 * This function handles the core logic for adding bonus products to the basket.
 * It validates each bonusDiscountLineItemId and calls the Commerce API with the correct parameters.
 *
 * Key difference from regular addToCart: Includes bonusDiscountLineItemId parameter
 *
 * When multiple bonus discount line items exist for the same promotion (e.g., 2 qualifying items
 * in cart create 2 slots), this function distributes the requested quantity across available slots.
 *
 * @param context - Action context from React Router
 * @param bonusItems - Array of bonus product items to add
 * @returns Promise resolving to BasketActionResponse with success status, updated basket, or error message
 */
async function addBonusProductsToCart(
    context: ActionFunctionArgs['context'],
    bonusItems: Array<{
        productId: string;
        quantity: number;
        bonusDiscountLineItemId: string;
        promotionId: string;
    }>
): Promise<BasketActionResponse> {
    const { t } = getTranslation();
    const basketResource = await getBasket(context);
    const basket = basketResource.current;

    if (!basket) {
        return createBasketErrorResponse(t('errors:noBasketFound'));
    }

    // Validate all bonusDiscountLineItemIds exist in basket
    for (const item of bonusItems) {
        const bonusDiscountItem = basket?.bonusDiscountLineItems?.find(
            (bdItem) => bdItem.id === item.bonusDiscountLineItemId
        );

        if (!bonusDiscountItem) {
            return createBasketErrorResponse(
                `Invalid bonus discount line item ID: ${item.bonusDiscountLineItemId}. The promotion may have expired or changed.`
            );
        }

        // Validate promotionId matches (sanity check)
        if (bonusDiscountItem.promotionId !== item.promotionId) {
            return createBasketErrorResponse('Promotion ID mismatch. Please refresh the page and try again.');
        }
    }

    try {
        // Build request body for SCAPI - each item becomes an entry in the array
        const requestBody = bonusItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            bonusDiscountLineItemId: item.bonusDiscountLineItemId,
        }));

        const clients = createApiClients(context);

        const { data: updatedBasket } = await clients.shopperBasketsV2.addItemToBasket({
            params: {
                path: { basketId: basket?.basketId ?? '' },
            },
            body: requestBody,
        });

        // Update the basket storage
        updateBasketResource(context, updatedBasket);

        return createBasketSuccessResponse(updatedBasket);
    } catch (error) {
        const { responseMessage } = await extractResponseError(error);
        return createBasketErrorResponse(responseMessage || 'Failed to add bonus products to cart');
    }
}

/**
 * Server action to add bonus products to the cart
 *
 * This is the React Router action function that handles POST requests to /action/bonus-product-add
 *
 * @returns Promise resolving to BasketActionResponse
 * @returns success - Boolean indicating if the operation was successful
 * @returns basket - Updated basket object (on success)
 * @returns error - Error message string (on failure)
 *
 * Expected FormData fields:
 * - bonusItems: JSON string containing array of bonus items:
 *   [
 *     {
 *       productId: string (variant product ID after user selections),
 *       quantity: number,
 *       bonusDiscountLineItemId: string (from basket.bonusDiscountLineItems[].id),
 *       promotionId: string (for validation)
 *     },
 *     ...
 *   ]
 *
 * @example
 * ```tsx
 * const bonusItems = [
 *   { productId: 'ABC', quantity: 1, bonusDiscountLineItemId: 'slot1', promotionId: 'promo1' },
 *   { productId: 'ABC', quantity: 1, bonusDiscountLineItemId: 'slot2', promotionId: 'promo1' }
 * ];
 * formData.append('bonusItems', JSON.stringify(bonusItems));
 * fetcher.submit(formData, {
 *   method: 'POST',
 *   action: '/action/bonus-product-add'
 * });
 * ```
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<BasketActionResponse> {
    if (request.method !== 'POST') {
        throw new Response('Method not allowed', { status: 405 });
    }

    try {
        const formData = await request.formData();

        // Parse and validate using Zod schema
        const rawData = parseBonusProductAddFromFormData(formData);
        const validationResult = bonusProductAddSchema.safeParse(rawData);

        if (!validationResult.success) {
            return createBasketErrorResponse(validationResult.error.issues[0]?.message || 'Invalid form data');
        }

        // Extract validated bonus items
        const { bonusItems } = validationResult.data;

        // Call core logic and return result
        return await addBonusProductsToCart(context, bonusItems);
    } catch (error) {
        const { responseMessage } = await extractResponseError(error);
        return createBasketErrorResponse(responseMessage || 'Failed to add bonus products to cart');
    }
}
