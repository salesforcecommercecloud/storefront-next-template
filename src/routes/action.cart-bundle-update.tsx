/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// React Router
import type { ClientActionFunctionArgs } from 'react-router';

// Commerce SDK
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';

// Middlewares
import { getBasket, updateBasket } from '@/middlewares/basket.client';

// API
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';

// Utils
import {
    type BasketActionResponse,
    createBasketSuccessResponse,
    createBasketErrorResponse,
} from './types/action-responses';

// Constants
import uiStrings from '@/temp-ui-string';

/**
 * Client action for updating multiple items in a bundle
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
        const itemsJson = formData.get('items')?.toString();

        if (!itemsJson) {
            return createBasketErrorResponse('Items data is required');
        }

        // Parse the items array
        const items = JSON.parse(itemsJson);

        if (!Array.isArray(items) || items.length === 0) {
            return createBasketErrorResponse('Items must be a non-empty array');
        }

        // Validate each item has required fields
        for (const item of items) {
            if (!item.itemId || !item.quantity || item.quantity <= 0) {
                return createBasketErrorResponse('Each item must have valid itemId and quantity');
            }
        }

        const config = getConfig(context);
        const clients = createApiClients(context);

        // Update all items in the bundle using updateItemsInBasket
        const { data: updatedBasket } = await clients.shopperBasketsV2.updateItemsInBasket({
            params: {
                path: { organizationId: config.commerce.api.organizationId, basketId },
                query: {
                    siteId: config.commerce.api.siteId,
                },
            },
            body: items,
        });

        // Update the basket cache to reflect the changes
        updateBasket(context, updatedBasket);

        return createBasketSuccessResponse(updatedBasket);
    } catch (error) {
        if (error instanceof ApiError) {
            return createBasketErrorResponse(error.body?.detail || error.statusText);
        }
        return createBasketErrorResponse(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
}
