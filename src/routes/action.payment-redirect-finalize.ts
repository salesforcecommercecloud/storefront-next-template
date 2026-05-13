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

import { redirect, type ActionFunctionArgs } from 'react-router';
import { getBasket } from '@/middlewares/basket.server';
import { calculateBasket, getBasketCurrency } from '@/lib/api/basket.server';
import { createApiClients } from '@/lib/api-clients.server';
import { buildUrlFromContext } from '@/lib/url.server';
import { getLogger } from '@/lib/logger.server';
import { ACTION_HOOK_IDS, runHookSafe } from '@/targets/action-hook.server';
import { readRedirectCookie, clearRedirectCookie, validateStateToken } from '@/lib/payment-redirect.server';
import { finalizeOrderSuccess } from '@/lib/payment/post-order.server';
import { frameworkDisabledResponse, isPaymentFrameworkEnabled } from '@/lib/payment/framework-enabled.server';

/**
 * POST handler invoked from the auto-submit form rendered by `payment-redirect-return`.
 * This is where the order is actually created — splitting it from the GET loader prevents
 * prefetch/back-button replay, since loaders may run multiple times but actions only run
 * on explicit submission.
 *
 * Flow:
 *   1. Re-read + re-validate the redirect cookie (the GET handler validated it once but
 *      the cookie travels with this POST too).
 *   2. Clear the cookie BEFORE order creation. Once the cookie is consumed, a refresh /
 *      replay cannot match a second time even if order creation throws mid-flight.
 *   3. Run the extension's onRedirectReturn hook (verify with provider, attach instrument).
 *   4. createOrder. On failure run onOrderFailure (best-effort void).
 *   5. afterPlaceOrder hook + redirect to order confirmation.
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<Response> {
    if (!isPaymentFrameworkEnabled()) return frameworkDisabledResponse();
    const logger = getLogger(context);
    const url = new URL(request.url);
    const tokenFromUrl = url.searchParams.get('token') || '';

    const state = readRedirectCookie(request);
    if (!state) {
        logger.warn('[Payment] redirect-finalize: no cookie (already consumed or expired)');
        return redirect(`${buildUrlFromContext('/checkout', context)}?error=payment_expired`);
    }

    if (!validateStateToken(state, tokenFromUrl)) {
        logger.warn('[Payment] redirect-finalize: state token mismatch');
        return redirect(`${buildUrlFromContext('/checkout', context)}?error=payment_invalid`);
    }

    // Pre-build a redirect helper that always clears the cookie. Once we've validated
    // the cookie, no other request should be able to use it — even if this handler
    // throws unexpectedly downstream.
    const clearCookieHeader = clearRedirectCookie();
    const errorRedirect = (errorCode: string) =>
        new Response(null, {
            status: 302,
            headers: {
                Location: `${buildUrlFromContext('/checkout', context)}?error=${errorCode}`,
                'Set-Cookie': clearCookieHeader,
            },
        });

    try {
        const basketResource = await getBasket(context);
        const basket = basketResource.current;
        if (!basket?.basketId || basket.basketId !== state.basketId) {
            logger.error('[Payment] redirect-finalize: basket mismatch or missing', {
                cookieBasketId: state.basketId,
                currentBasketId: basket?.basketId,
            });
            return errorRedirect('basket_changed');
        }

        const returnParams = url.searchParams;
        const returnHookResult = await runHookSafe({
            hookId: ACTION_HOOK_IDS.CHECKOUT_PAYMENTS_ON_REDIRECT_RETURN,
            context: {
                data: {
                    basket,
                    returnParams,
                    stateToken: state.stateToken,
                    providerState: state.providerState,
                },
                actionContext: context,
            },
            logger,
            fallbackStep: 'placeOrder',
            blocking: true,
        });
        if (returnHookResult.errorResponse) {
            return errorRedirect('payment_failed');
        }

        const currency = getBasketCurrency(context, basket);
        // Race window: another tab could mutate the basket between calculate and createOrder.
        // SCAPI's createOrder is the authoritative validator — totals are recalculated server-
        // side before the order is persisted. We accept the (very narrow) window where a
        // stale calculate result is sent because the SCAPI write path catches drift.
        const calculatedBasket = await calculateBasket(context, basket.basketId, currency);
        const clients = createApiClients(context);

        let order;
        try {
            const result = await clients.shopperOrders.createOrder({
                params: {},
                body: { basketId: calculatedBasket.basketId },
            });
            order = result.data;
        } catch (orderError) {
            const failureHookResult = await runHookSafe({
                hookId: ACTION_HOOK_IDS.CHECKOUT_PAYMENTS_ON_ORDER_FAILURE,
                context: {
                    data: { basket: calculatedBasket, formData: new FormData(), error: orderError },
                    actionContext: context,
                },
                logger,
                fallbackStep: 'placeOrder',
            });
            if (failureHookResult.errorResponse) {
                logger.error(
                    '[Payment] redirect-finalize: onOrderFailure hook itself failed — orphaned authorization possible, requires manual reconciliation',
                    {
                        basketId: calculatedBasket.basketId,
                        providerName: state.providerName,
                    }
                );
            }
            logger.error('[Payment] redirect-finalize: order creation failed', { error: orderError });
            return errorRedirect('order_failed');
        }

        if (!order || !order.orderNo) {
            logger.error('[Payment] redirect-finalize: empty order response');
            return errorRedirect('order_failed');
        }

        logger.info('[Payment] redirect-finalize: order created', {
            orderNo: order.orderNo,
            basketId: basket.basketId,
            providerName: state.providerName,
        });

        const afterPlaceResult = await runHookSafe({
            hookId: ACTION_HOOK_IDS.CHECKOUT_PAYMENTS_AFTER_PLACE_ORDER,
            context: { data: { order, basket: calculatedBasket, formData: new FormData() }, actionContext: context },
            logger,
            fallbackStep: 'placeOrder',
        });
        if (afterPlaceResult.errorResponse) {
            logger.warn(
                '[Payment] redirect-finalize: afterPlaceOrder hook failed — order placed, requires manual review',
                { orderNo: order.orderNo }
            );
        }

        return finalizeOrderSuccess({
            context,
            orderNo: order.orderNo,
            extraHeaders: { 'Set-Cookie': clearCookieHeader },
        });
    } catch (error) {
        logger.error('[Payment] redirect-finalize: unexpected error', { error });
        return errorRedirect('unexpected');
    }
}
