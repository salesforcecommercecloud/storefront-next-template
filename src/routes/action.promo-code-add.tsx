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
import { createPromoCodeFormSchema } from '@/components/promo-code-form';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';

/**
 * Server action for adding a promo code to the shopping basket.
 *
 * This action handles POST requests to apply a promo code to the current user's basket.
 * It validates the promo code input, retrieves the current basket from the session,
 * and calls the Commerce Cloud API to add the coupon to the basket.
 * @returns Promise resolving to success/error response object
 * @returns success - Boolean indicating if the operation was successful
 * @returns basket - Updated basket object (on success)
 * @returns error - Error message string (on failure)
 *
 * @throws Response with 405 status if request method is not POST
 * @throws Error if promo code validation fails
 * @throws Error if no basket is found in the session
 *
 * @example
 * ```tsx
 * // Form submission will trigger this action
 * <form method="POST" action="/action/promo-code-add">
 *   <input name="promoCode" value="SAVE10" />
 *   <button type="submit">Apply Code</button>
 * </form>
 * ```
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const logger = getLogger(context);
    const { t } = getTranslation();

    if (request.method !== 'POST') {
        logger.warn('PromoCodeAdd: method not allowed', { method: request.method });
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
        logger.warn('PromoCodeAdd: no basket found');
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
        const promoCode = formData.get('promoCode') as string;

        // Use Zod schema for validation
        const promoCodeFormSchema = createPromoCodeFormSchema(t);
        const validationResult = promoCodeFormSchema.safeParse({ code: promoCode });
        if (!validationResult.success) {
            logger.warn('PromoCodeAdd: validation failed');
            return Response.json(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.INVALID_INPUT,
                        message: validationResult.error.issues[0]?.message || 'Promo code is required',
                    }),
                },
                { status: 400 }
            );
        }

        const { code: validatedPromoCode } = validationResult.data;
        logger.debug('PromoCodeAdd: starting', { basketId });

        const clients = createApiClients(context);
        const { data: updatedBasket } = await clients.shopperBasketsV2.addCouponToBasket({
            params: {
                path: { basketId },
            },
            body: {
                code: validatedPromoCode,
            },
        });

        // Update the basket cache to reflect the changes
        updateBasketResource(context, updatedBasket);

        logger.info('PromoCodeAdd: succeeded', { basketId });
        return Response.json({ success: true, basket: updatedBasket });
    } catch (error) {
        logger.error('PromoCodeAdd: failed', { error });
        return Response.json({ success: false, error: createActionError({ error }) }, { status: 500 });
    }
}
