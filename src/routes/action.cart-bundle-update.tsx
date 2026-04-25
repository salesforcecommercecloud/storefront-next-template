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
// React Router
import type { ActionFunctionArgs } from 'react-router';

// Middlewares
import { ensureBasketId, updateBasketResource } from '@/middlewares/basket.server';

// API
import { createApiClients } from '@/lib/api-clients.server';

// Utils
import { createBasketSuccessResponse } from './types/action-responses';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';

// Constants

/**
 * Server action for updating multiple items in a bundle
 *
 * This action handles updating a bundle and its child products in the basket.
 * It can update:
 * - Parent bundle quantity
 * - Child product variants (e.g., changing color, size of bundled items)
 * - Both parent quantity and child variants simultaneously
 *
 * This action performs the following operations:
 * - Validates the request method (PATCH only)
 * - Extracts items array from form data
 * - Validates that items is a valid array
 * - Calls the Commerce Cloud API updateItemsInBasket to update all items in one call
 * - Returns standardized success/error response
 *
 * The action integrates with:
 * - Auth and basket middlewares for session and basket management
 * - Shopper Baskets API for cart operations (updateItemsInBasket)
 * - Standardized response utilities for consistent error handling
 *
 * Used by cart edit modal for updating bundle items
 *
 * @returns Promise resolving to BasketActionResponse
 * @returns success - Boolean indicating if the operation was successful
 * @returns basket - Updated basket object (on success)
 * @returns error - Error message string (on failure)
 *
 * @throws Response with 405 status if request method is not PATCH
 * @throws Error if items data is invalid or missing
 * @throws Error if no basket is found in the session
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const logger = getLogger(context);
    logger.debug('CartBundleUpdate: action starting');

    if (request.method !== 'PATCH') {
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
        logger.warn('CartBundleUpdate: no basket found');
        return Response.json(
            { success: false, error: createActionError({ code: ErrorCode.NOT_FOUND, message: 'No basket found' }) },
            { status: 404 }
        );
    }

    try {
        const formData = await request.formData();
        const itemsJson = formData.get('items')?.toString();

        if (!itemsJson) {
            logger.warn('CartBundleUpdate: missing items data in form data');
            return Response.json(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'Items data is required' }),
                },
                { status: 400 }
            );
        }

        // Parse the items array
        const items = JSON.parse(itemsJson);

        if (!Array.isArray(items) || items.length === 0) {
            logger.warn('CartBundleUpdate: items must be a non-empty array');
            return Response.json(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.INVALID_INPUT,
                        message: 'Items must be a non-empty array',
                    }),
                },
                { status: 400 }
            );
        }

        // Validate each item has required fields
        for (const item of items) {
            if (!item.itemId || !item.quantity || item.quantity <= 0) {
                logger.warn('CartBundleUpdate: invalid item data', { itemId: item.itemId, quantity: item.quantity });
                return Response.json(
                    {
                        success: false,
                        error: createActionError({
                            code: ErrorCode.INVALID_INPUT,
                            message: 'Each item must have valid itemId and quantity',
                        }),
                    },
                    { status: 400 }
                );
            }
        }

        logger.debug('CartBundleUpdate: updating items', { itemCount: items.length, basketId });
        const clients = createApiClients(context);

        // Update all items in the bundle using updateItemsInBasket
        const { data: updatedBasket } = await clients.shopperBasketsV2.updateItemsInBasket({
            params: {
                path: { basketId },
            },
            body: items,
        });

        // Update the basket cache to reflect the changes
        updateBasketResource(context, updatedBasket);

        logger.info('CartBundleUpdate: bundle updated successfully');
        return Response.json(createBasketSuccessResponse(updatedBasket));
    } catch (error) {
        logger.error('CartBundleUpdate: failed', { error });
        return Response.json({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
