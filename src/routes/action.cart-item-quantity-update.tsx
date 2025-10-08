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
import { cartItemQuantityUpdateSchema, parseCartItemQuantityUpdateFromFormData } from '@/lib/checkout-schemas';
import {
    type BasketActionResponse,
    createBasketSuccessResponse,
    createBasketErrorResponse,
} from './types/action-responses';

// Constants
import uiStrings from '@/temp-ui-string';

/**
 * Client action for updating the quantity of a cart item
 *
 * This action handles updating the quantity of a specific item in the user's shopping basket.
 * It performs the following operations:
 * - Validates the request method (POST only)
 * - Extracts and validates form data using Zod schema validation
 * - Ensures quantity is a valid number >= 1 and itemId is present
 * - Calls the Commerce Cloud API to update the item quantity
 * - Returns standardized success/error response
 *
 * Note: This action only updates quantities (minimum 1) and does not handle item removal.
 *
 * The action integrates with:
 * - Zod schemas for robust form data validation and type safety
 * - Auth and basket middlewares for session and basket management
 * - Shopper Baskets API for cart operations
 * - Standardized response utilities for consistent error handling
 *
 * Used by cart components for quantity update functionality
 *
 * @returns Promise resolving to BasketActionResponse
 * @returns success - Boolean indicating if the operation was successful
 * @returns basket - Updated basket object (on success)
 * @returns error - Error message string (on failure)
 *
 * @throws Response with 405 status if request method is not POST
 * @throws Error if form data validation fails (invalid itemId or quantity)
 * @throws Error if no basket is found in the session
 *
 * @example
 * ```tsx
 * // Form submission will trigger this action
 * <form method="POST" action="/action/cart-item-quantity-update">
 *   <input name="itemId" value="item-123" />
 *   <input name="quantity" value="2" />
 *   <button type="submit">Update Quantity</button>
 * </form>
 * ```
 */
export async function clientAction({ request, context }: ClientActionFunctionArgs): Promise<BasketActionResponse> {
    if (request.method !== 'POST') {
        throw new Response(uiStrings.errors.methodNotAllowed, { status: 405 });
    }

    const { basketId } = getBasket(context);
    if (!basketId) {
        return createBasketErrorResponse(uiStrings.errors.noBasketFound);
    }

    try {
        const formData = await request.formData();

        // Parse and validate form data for cart item quantity update
        const rawData = parseCartItemQuantityUpdateFromFormData(formData);
        const validationResult = cartItemQuantityUpdateSchema.safeParse(rawData);

        if (!validationResult.success) {
            return createBasketErrorResponse(validationResult.error.issues[0]?.message || 'Invalid form data');
        }

        // Extract the validated quantity update fields
        const { itemId, quantity } = validationResult.data;

        const client = createClient(context).ShopperBaskets;

        // Update item quantity (quantity is guaranteed to be >= 1 by schema validation)
        const updatedBasket = await client.updateItemInBasket({
            parameters: {
                basketId,
                itemId,
            },
            body: {
                quantity,
            },
        });

        // Update the basket cache to reflect the changes
        updateBasket(context, updatedBasket);

        return createBasketSuccessResponse(updatedBasket);
    } catch (error) {
        const { responseMessage } = await extractResponseError(error as Error);
        return createBasketErrorResponse(responseMessage || 'An unexpected error occurred');
    }
}
