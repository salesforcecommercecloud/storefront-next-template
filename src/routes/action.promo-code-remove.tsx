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
 * Server action for removing a promo code from the shopping basket.
 *
 * This action handles POST requests to remove a specific coupon from the current user's basket.
 * It validates the coupon item ID, retrieves the current basket from the session,
 * and calls the Commerce Cloud API to remove the coupon from the basket.
 *
 * @returns Promise resolving to success/error response object
 * @returns success - Boolean indicating if the operation was successful
 * @returns basket - Updated basket object (on success)
 * @returns error - Error message string (on failure)
 *
 * @throws Response with 405 status if request method is not POST
 * @throws Error if coupon item ID is missing or invalid
 * @throws Error if no basket is found in the session
 *
 * @example
 * ```tsx
 * // Form submission will trigger this action
 * <form method="POST" action="/action/promo-code-remove">
 *   <input name="couponItemId" value="coupon-123" />
 *   <button type="submit">Remove Code</button>
 * </form>
 * ```
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const logger = getLogger(context);

    if (request.method !== 'POST') {
        logger.warn('PromoCodeRemove: method not allowed', { method: request.method });
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
        logger.warn('PromoCodeRemove: no basket found');
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
        const couponItemId = formData.get('couponItemId') as string;
        if (!couponItemId) {
            logger.warn('PromoCodeRemove: missing couponItemId');
            return Response.json(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.REQUIRED_FIELD,
                        message: 'couponItemId is required',
                    }),
                },
                { status: 400 }
            );
        }

        logger.debug('PromoCodeRemove: starting', { basketId, couponItemId });

        const clients = createApiClients(context);
        const { data: updatedBasket } = await clients.shopperBasketsV2.removeCouponFromBasket({
            params: {
                path: {
                    basketId,
                    couponItemId,
                },
            },
        });

        // Update the basket cache to reflect the changes
        updateBasketResource(context, updatedBasket);

        logger.info('PromoCodeRemove: succeeded', { basketId, couponItemId });
        return Response.json({ success: true, basket: updatedBasket });
    } catch (error) {
        logger.error('PromoCodeRemove: failed', { error });
        return Response.json({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
