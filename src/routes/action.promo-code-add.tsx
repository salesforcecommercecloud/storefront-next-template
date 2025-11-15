import type { ClientActionFunctionArgs } from 'react-router';
import { ApiError, type ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { getBasket, updateBasket } from '@/middlewares/basket.client';
import { extractResponseError } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';
import { promoCodeFormSchema } from '@/components/promo-code-form';
import uiStrings from '@/temp-ui-string';

/**
 * Client action for adding a promo code to the shopping basket.
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
export async function clientAction({ request, context }: ClientActionFunctionArgs): Promise<{
    success: boolean;
    basket?: ShopperBasketsV2.schemas['Basket'];
    error?: string;
}> {
    if (request.method !== 'POST') {
        throw new Response(uiStrings.errors.methodNotAllowed, { status: 405 });
    }

    const { basketId } = getBasket(context);
    if (!basketId) {
        return {
            success: false,
            error: uiStrings.errors.noBasketFound,
        };
    }

    try {
        const formData = await request.formData();
        const promoCode = formData.get('promoCode') as string;

        // Use Zod schema for validation
        const validationResult = promoCodeFormSchema.safeParse({ code: promoCode });
        if (!validationResult.success) {
            return {
                success: false,
                error: validationResult.error.issues[0]?.message || uiStrings.errors.promoCodeRequired,
            };
        }

        const { code: validatedPromoCode } = validationResult.data;
        const config = getConfig(context);
        const clients = createApiClients(context);
        const { data: updatedBasket } = await clients.shopperBasketsV2.addCouponToBasket({
            params: {
                path: { organizationId: config.commerce.api.organizationId, basketId },
                query: {
                    siteId: config.commerce.api.siteId,
                },
            },
            body: {
                code: validatedPromoCode,
            },
        });

        // Update the basket cache to reflect the changes
        updateBasket(context, updatedBasket);

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
