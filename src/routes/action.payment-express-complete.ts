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
import { getBasket } from '@/middlewares/basket.server';
import { createApiClients } from '@/lib/api-clients.server';
import { calculateBasket, getBasketCurrency } from '@/lib/api/basket.server';
import { getLogger } from '@/lib/logger.server';
import { ACTION_HOOK_IDS, runHookSafe } from '@/targets/action-hook.server';
import { finalizeOrderSuccess } from '@/lib/payment/post-order.server';
import { frameworkDisabledResponse, isPaymentFrameworkEnabled } from '@/lib/payment/framework-enabled.server';

/**
 * Handles express checkout completion (Apple Pay, Google Pay, PayPal Express).
 *
 * Express payments bypass the normal checkout form — the provider's SDK collects
 * address and payment info in its own UI and POSTs the result here.
 *
 * Trust contract (extension responsibility):
 *  - The form data on this request is shopper-controlled (anyone can craft a POST). The
 *    framework does NOT verify the shipping address or payment amount itself.
 *  - The extension's `onExpressComplete` hook MUST verify the provider token / signature
 *    against the provider's API before mutating the basket. If verification fails the
 *    hook should return a non-success result and the framework will not create an order.
 *  - The framework's job is to invoke the verification hook, recalculate totals, and
 *    create the order; everything before that is the extension's responsibility.
 *
 * If `onExpressComplete` is not registered, this route returns 400 (no provider available).
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<Response> {
    if (!isPaymentFrameworkEnabled()) return frameworkDisabledResponse();
    const logger = getLogger(context);

    try {
        const formData = await request.formData();

        const basketResource = await getBasket(context);
        const basket = basketResource.current;
        if (!basket?.basketId) {
            return Response.json({ success: false, error: 'No active basket' }, { status: 400 });
        }

        const expressHookResult = await runHookSafe({
            hookId: ACTION_HOOK_IDS.CHECKOUT_PAYMENTS_ON_EXPRESS_COMPLETE,
            context: { data: { basket, formData }, actionContext: context },
            logger,
            fallbackStep: 'placeOrder',
            blocking: true,
        });
        if (expressHookResult.errorResponse) return expressHookResult.errorResponse;

        // Post-hook contract check: the extension's onExpressComplete is required to attach
        // a payment instrument to the basket (after verifying the provider token and amount
        // server-side). If no instrument is present we refuse to create the order — without
        // this guard, anyone POSTing to this endpoint without a real provider token could
        // place an order using only an address.
        const postHookBasket = (await getBasket(context)).current;
        if (!postHookBasket?.basketId || !postHookBasket?.paymentInstruments?.length) {
            logger.warn(
                '[Payment] express-complete: no payment instrument attached after onExpressComplete — refusing to create order'
            );
            return Response.json(
                { success: false, error: 'Express checkout is not configured', code: 'no_extension' },
                { status: 400 }
            );
        }

        const currency = getBasketCurrency(context, postHookBasket);
        // Race window: another tab could mutate the basket between calculate and createOrder.
        // SCAPI's createOrder is the authoritative validator and rejects on drift.
        const calculatedBasket = await calculateBasket(context, postHookBasket.basketId, currency);
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
                context: { data: { basket: calculatedBasket, formData, error: orderError }, actionContext: context },
                logger,
                fallbackStep: 'placeOrder',
            });
            if (failureHookResult.errorResponse) {
                logger.error(
                    '[Payment] express-complete: onOrderFailure hook itself failed — orphaned authorization possible, requires manual reconciliation',
                    { basketId: calculatedBasket.basketId }
                );
            }
            // Surface the original error structurally so monitoring can categorize SCAPI
            // failures (vs. the generic 500 the outer catch returns).
            const message = orderError instanceof Error ? orderError.message : 'Order creation failed';
            logger.error('[Payment] express-complete: createOrder failed', { error: orderError });
            return Response.json({ success: false, error: message, code: 'order_failed' }, { status: 502 });
        }

        if (!order || !order.orderNo) {
            return Response.json({ success: false, error: 'Order creation returned empty result' }, { status: 500 });
        }

        logger.info('[Payment] express-complete: order created', { orderNo: order.orderNo });

        const afterPlaceResult = await runHookSafe({
            hookId: ACTION_HOOK_IDS.CHECKOUT_PAYMENTS_AFTER_PLACE_ORDER,
            context: { data: { order, basket: calculatedBasket, formData }, actionContext: context },
            logger,
            fallbackStep: 'placeOrder',
        });
        if (afterPlaceResult.errorResponse) {
            logger.warn(
                '[Payment] express-complete: afterPlaceOrder hook failed — order placed, requires manual review',
                { orderNo: order.orderNo }
            );
        }

        return finalizeOrderSuccess({ context, orderNo: order.orderNo });
    } catch (error) {
        logger.error('[Payment] express-complete: failed', { error });
        return Response.json({ success: false, error: 'Express checkout failed. Please try again.' }, { status: 500 });
    }
}
