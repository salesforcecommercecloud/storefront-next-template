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
import { ensureBasketId, updateBasketResource } from '@/middlewares/basket.server';
import { createApiClients } from '@/lib/api-clients.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';

/**
 * Server action for removing an item from the shopping cart
 *
 * This action handles the removal of a specific item from the user's shopping basket.
 * It performs the following operations:
 * - Validates the request method (POST only)
 * - Extracts the itemId from form data
 * - Validates required parameters (itemId and basketId)
 * - Calls the Commerce Cloud API to remove the item
 * - Returns success/error response with appropriate messaging
 *
 * The action integrates with:
 * - Auth and basket middlewares for session and basket management
 * - Shopper Baskets API for cart operations
 * - Error handling utilities for consistent error responses
 *
 * Used by cart components for item removal functionality (see cart-content.tsx for usage example)
 *
 * @returns Promise resolving to success/error response object
 * @returns success - Boolean indicating if the operation was successful
 * @returns basket - Updated basket object (on success)
 * @returns error - Error message string (on failure)
 *
 * @throws Response with 405 status if request method is not POST
 * @throws Error if item ID is missing or invalid
 * @throws Error if no basket is found in the session
 *
 * @example
 * ```tsx
 * // Form submission will trigger this action
 * <form method="POST" action="/action/remove-cart-item">
 *   <input name="itemId" value="item-123" />
 *   <button type="submit">Remove Item</button>
 * </form>
 * ```
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const logger = getLogger(context);
    logger.debug('CartItemRemove: action starting');

    if (request.method !== 'POST') {
        return Response.json(
            {
                success: false,
                error: createActionError({ code: ErrorCode.METHOD_NOT_ALLOWED, message: 'Method not allowed' }),
            },
            { status: 405 }
        );
    }

    const basketId = await ensureBasketId(context);
    if (!basketId) {
        logger.warn('CartItemRemove: no basket found');
        return Response.json(
            {
                success: false,
                error: createActionError({ code: ErrorCode.NOT_FOUND, message: 'No basket found' }),
            },
            { status: 404 }
        );
    }

    try {
        const formData = await request.formData();
        const itemId = formData.get('itemId') as string;
        if (!itemId) {
            logger.warn('CartItemRemove: missing itemId in form data');
            return Response.json(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'itemId is required' }),
                },
                { status: 400 }
            );
        }

        logger.debug('CartItemRemove: removing item', { itemId, basketId });
        const clients = createApiClients(context);
        const { data: updatedBasket } = await clients.shopperBasketsV2.removeItemFromBasket({
            params: {
                path: {
                    basketId,
                    itemId,
                },
            },
        });

        updateBasketResource(context, updatedBasket);

        logger.info('CartItemRemove: item removed successfully');
        return Response.json({ success: true, basket: updatedBasket });
    } catch (error) {
        logger.error('CartItemRemove: failed', { error });
        return Response.json({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
