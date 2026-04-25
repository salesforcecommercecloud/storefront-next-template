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
import { createApiClients } from '@/lib/api-clients.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';
import { bonusProductAddSchema, parseBonusProductAddFromFormData } from '@/lib/basket-schemas';
import { createBasketSuccessResponse } from './types/action-responses';
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
): Promise<Response> {
    const logger = getLogger(context);
    logger.debug('BonusProductAdd: starting addBonusProductsToCart', { itemCount: bonusItems.length });
    const basketResource = await getBasket(context);
    const basket = basketResource.current;

    if (!basket) {
        logger.warn('BonusProductAdd: no basket found');
        return Response.json(
            { success: false, error: createActionError({ code: ErrorCode.NOT_FOUND, message: 'No basket found' }) },
            { status: 404 }
        );
    }

    // Validate all bonusDiscountLineItemIds exist in basket
    for (const item of bonusItems) {
        const bonusDiscountItem = basket?.bonusDiscountLineItems?.find(
            (bdItem) => bdItem.id === item.bonusDiscountLineItemId
        );

        if (!bonusDiscountItem) {
            logger.warn('BonusProductAdd: invalid bonus discount line item ID', {
                bonusDiscountLineItemId: item.bonusDiscountLineItemId,
            });
            return Response.json(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.INVALID_INPUT,
                        message: `Invalid bonus discount line item ID: ${item.bonusDiscountLineItemId}. The promotion may have expired or changed.`,
                    }),
                },
                { status: 400 }
            );
        }

        // Validate promotionId matches (sanity check)
        if (bonusDiscountItem.promotionId !== item.promotionId) {
            logger.warn('BonusProductAdd: promotion ID mismatch', {
                expected: bonusDiscountItem.promotionId,
                received: item.promotionId,
            });
            return Response.json(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.INVALID_INPUT,
                        message: 'Promotion ID mismatch. Please refresh the page and try again.',
                    }),
                },
                { status: 400 }
            );
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

        logger.info('BonusProductAdd: bonus products added successfully');
        return Response.json(createBasketSuccessResponse(updatedBasket));
    } catch (error) {
        logger.error('BonusProductAdd: failed', { error });
        return Response.json({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}

/**
 * Server action to add bonus products to the cart
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const logger = getLogger(context);
    logger.debug('BonusProductAdd: action starting');

    if (request.method !== 'POST') {
        return Response.json(
            {
                success: false,
                error: createActionError({ code: ErrorCode.METHOD_NOT_ALLOWED, message: 'Method not allowed' }),
            },
            { status: 405 }
        );
    }

    try {
        const formData = await request.formData();

        // Parse and validate using Zod schema
        const rawData = parseBonusProductAddFromFormData(formData);
        const validationResult = bonusProductAddSchema.safeParse(rawData);

        if (!validationResult.success) {
            logger.warn('BonusProductAdd: validation failed', { issues: validationResult.error.issues });
            return Response.json(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.INVALID_INPUT,
                        message: validationResult.error.issues[0]?.message || 'Invalid form data',
                    }),
                },
                { status: 400 }
            );
        }

        // Extract validated bonus items
        const { bonusItems } = validationResult.data;

        // Call core logic and return result
        const result = await addBonusProductsToCart(context, bonusItems);
        logger.info('BonusProductAdd: action succeeded');
        return result;
    } catch (error) {
        logger.error('BonusProductAdd: action failed', { error });
        return Response.json({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
