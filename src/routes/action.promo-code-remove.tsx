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
import { getTranslation } from '@/lib/i18next';

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
        const couponItemId = formData.get('couponItemId') as string;
        if (!couponItemId) {
            return {
                success: false,
                error: t('errors:couponItemIdRequired'),
            };
        }

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
