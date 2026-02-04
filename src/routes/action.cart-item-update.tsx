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

// Commerce SDK
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';

// Middlewares
import { ensureBasketId, updateBasketResource } from '@/middlewares/basket.server';

// API
import { createApiClients } from '@/lib/api-clients';

// Utils
import { cartItemUpdateSchema, parseCartItemUpdateFromFormData } from '@/lib/basket-schemas';
import {
    type BasketActionResponse,
    createBasketSuccessResponse,
    createBasketErrorResponse,
} from './types/action-responses';
import { getTranslation } from '@/lib/i18next';

// @sfdc-extension-line SFDC_EXT_BOPIS
import { handleCartItemDeliveryOptionChange } from '@/extensions/bopis/lib/actions/cart-item-delivery-option-handler';

/**
 * Server action for updating a cart item (variant and/or quantity)
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
export async function action({ request, context }: ActionFunctionArgs): Promise<BasketActionResponse> {
    const { t } = getTranslation();

    if (request.method !== 'PATCH') {
        throw new Response(t('errors:methodNotAllowed'), { status: 405 });
    }

    const basketId = await ensureBasketId(context);
    if (!basketId) {
        return createBasketErrorResponse(t('errors:noBasketFound'));
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

        const clients = createApiClients(context);

        // @sfdc-extension-block-start SFDC_EXT_BOPIS
        const response = await handleCartItemDeliveryOptionChange(validationResult.data, context);
        if (response) {
            return response;
        }
        // @sfdc-extension-block-end SFDC_EXT_BOPIS

        // Build the update body - only include productId if it's provided (for variant changes)
        const updateBody: { quantity: number; productId?: string } = {
            quantity,
        };

        if (productId) {
            updateBody.productId = productId;
        }

        // Update the item with new productId and/or quantity
        const { data: updatedBasket } = await clients.shopperBasketsV2.updateItemInBasket({
            params: {
                path: {
                    basketId,
                    itemId,
                },
            },
            body: updateBody,
        });

        // Update the basket cache to reflect the changes
        updateBasketResource(context, updatedBasket);

        return createBasketSuccessResponse(updatedBasket);
    } catch (error) {
        if (error instanceof ApiError) {
            return createBasketErrorResponse(error.body?.detail || error.statusText);
        }
        return createBasketErrorResponse(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
}
