/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// React Router
import type { ClientActionFunctionArgs } from 'react-router';

// Middlewares
import { getBasket, updateBasket } from '@/middlewares/basket.client';

// Utils
import { extractResponseError } from '@/lib/utils';
import createClient from '@/lib/scapi';
import { cartItemUpdateSchema, parseCartItemUpdateFromFormData } from '@/lib/basket-schemas';
import {
    type BasketActionResponse,
    createBasketSuccessResponse,
    createBasketErrorResponse,
} from './types/action-responses';

// Constants
import uiStrings from '@/temp-ui-string';

/**
 * Client action for updating a cart item (variant and/or quantity)
 *
 * This action handles updating an existing item in the user's shopping basket.
 * It can update:
 * - Product variant (e.g., changing color, size)
 * - Quantity
 * - Both variant and quantity
 *
 * This action performs the following operations:
 * - Validates the request method (PATCH only)
 * - Extracts and validates form data using Zod schema validation
 * - Ensures itemId, productId, and quantity are valid
 * - Calls the Commerce Cloud API to update the item
 * - Returns standardized success/error response
 *
 * The action integrates with:
 * - Zod schemas for robust form data validation and type safety
 * - Auth and basket middlewares for session and basket management
 * - Shopper Baskets API for cart operations
 * - Standardized response utilities for consistent error handling
 *
 * Used by cart edit modal and cart components for updating cart items
 *
 * @returns Promise resolving to BasketActionResponse
 * @returns success - Boolean indicating if the operation was successful
 * @returns basket - Updated basket object (on success)
 * @returns error - Error message string (on failure)
 *
 * @throws Response with 405 status if request method is not PATCH
 * @throws Error if form data validation fails (invalid itemId, productId, or quantity)
 * @throws Error if no basket is found in the session
 */
export async function clientAction({ request, context }: ClientActionFunctionArgs): Promise<BasketActionResponse> {
    if (request.method !== 'PATCH') {
        throw new Response(uiStrings.errors.methodNotAllowed, { status: 405 });
    }

    const { basketId } = getBasket(context);
    if (!basketId) {
        return createBasketErrorResponse(uiStrings.errors.noBasketFound);
    }

    try {
        const formData = await request.formData();

        // Parse and validate form data for cart item update
        const rawData = parseCartItemUpdateFromFormData(formData);
        const validationResult = cartItemUpdateSchema.safeParse(rawData);

        if (!validationResult.success) {
            return createBasketErrorResponse(validationResult.error.issues[0]?.message || 'Invalid form data');
        }

        // Extract the validated fields
        const { itemId, productId, quantity } = validationResult.data;

        const client = createClient(context).ShopperBasketsV2;

        // Build the update body - only include productId if it's provided (for variant changes)
        const updateBody: { quantity: number; productId?: string } = {
            quantity,
        };

        if (productId) {
            updateBody.productId = productId;
        }

        // Update the item with new productId and/or quantity
        const updatedBasket = await client.updateItemInBasket({
            parameters: {
                basketId,
                itemId,
            },
            body: updateBody,
        });

        // Update the basket cache to reflect the changes
        updateBasket(context, updatedBasket);

        return createBasketSuccessResponse(updatedBasket);
    } catch (error) {
        const { responseMessage } = await extractResponseError(error as Error);
        return createBasketErrorResponse(responseMessage || 'An unexpected error occurred');
    }
}
