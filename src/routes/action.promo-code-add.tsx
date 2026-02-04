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
import { ApiError, type ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { ensureBasketId, updateBasketResource } from '@/middlewares/basket.server';
import { extractResponseError } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { createPromoCodeFormSchema } from '@/components/promo-code-form';
import { getTranslation } from '@/lib/i18next';

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
export async function action({ request, context }: ActionFunctionArgs): Promise<{
    success: boolean;
    basket?: ShopperBasketsV2.schemas['Basket'];
    error?: string;
}> {
    const { t } = getTranslation();

    if (request.method !== 'POST') {
        throw new Response(t('errors:methodNotAllowed'), { status: 405 });
    }

    const basketId = await ensureBasketId(context);
    if (!basketId) {
        return {
            success: false,
            error: t('errors:noBasketFound'),
        };
    }

    try {
        const formData = await request.formData();
        const promoCode = formData.get('promoCode') as string;

        // Use Zod schema for validation
        const promoCodeFormSchema = createPromoCodeFormSchema(t);
        const validationResult = promoCodeFormSchema.safeParse({ code: promoCode });
        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.issues[0]?.message || t('errors:promoCodeRequired'),
            };
        }

        const { code: validatedPromoCode } = validationResult.data;
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

        return { success: true, basket: updatedBasket };
    } catch (error) {
        if (error instanceof ApiError) {
            return {
                success: false,
                error: error.body?.detail || error.statusText,
            };
        }
        const { responseMessage } = await extractResponseError(error as Error);
        return {
            success: false,
            error: responseMessage,
        };
    }
}
