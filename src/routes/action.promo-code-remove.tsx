import type { ClientActionFunctionArgs } from 'react-router';
import type { ShopperBasketsTypes } from 'commerce-sdk-isomorphic';
import { getBasket, updateBasket } from '@/middlewares/basket.client';
import { extractResponseError } from '@/lib/utils';
import createClient from '@/lib/scapi';
import uiStrings from '@/temp-ui-string';

/**
 * Client action for removing a promo code from the shopping basket.
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
export async function clientAction({
    request,
    context,
}: ClientActionFunctionArgs): Promise<{ success: boolean; basket?: ShopperBasketsTypes.Basket; error?: string }> {
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
        const couponItemId = formData.get('couponItemId') as string;
        if (!couponItemId) {
            return {
                success: false,
                error: uiStrings.errors.couponItemIdRequired,
            };
        }

        const client = createClient(context).ShopperBaskets;
        const updatedBasket = await client.removeCouponFromBasket({
            parameters: {
                basketId,
                couponItemId,
            },
        });

        // Update the basket cache to reflect the changes
        updateBasket(context, updatedBasket);

        return { success: true, basket: updatedBasket };
    } catch (error) {
        const { responseMessage } = await extractResponseError(error as Error);
        return {
            success: false,
            error: responseMessage,
        };
    }
}
