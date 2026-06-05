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
import { getLogger } from '@/lib/logger.server';
import { createApiClients } from '@/lib/api-clients.server';
import { getAuth } from '@/middlewares/auth.server';
import { getCustomerProfileForCheckout } from '@/lib/api/customer.server';
import type { CustomerProfile } from '@/components/checkout/utils/checkout-context-types';
import { saveCheckoutDataToProfile, finalizeOrderSuccess } from '@/lib/checkout/place-order-orchestration.server';
import { createActionError, httpStatusForErrorCode } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { ApiError } from '@/scapi';

/**
 * Finalizes an order whose creation was driven by an extension's `onPlaceOrder`
 * callback. The storefront's click handler POSTs here after `onPlaceOrder`
 * resolves with the orderNo.
 *
 * Runs in order: shopper-scope check via SCAPI getOrder, profile save (non-fatal
 * - the order already exists so teardown must still run), basket teardown +
 * confirmation URL.
 *
 * POST { orderNo, shouldCreateAccount?, checkoutRegistrationIntent?,
 *        useDifferentBilling?, savePaymentToProfile?, contactPhone? }
 *   -> 200 { success: true, redirectUrl } | 4xx/5xx { success: false, error }
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<Response> {
    const logger = getLogger(context);

    if (request.method !== 'POST') {
        return new Response(null, { status: 405 });
    }

    const formData = await request.formData();
    const orderNo = formData.get('orderNo')?.toString() ?? '';

    if (!orderNo) {
        logger.warn('[Checkout] place-order-finalize: missing orderNo');
        const error = createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'orderNo is required' });
        return Response.json({ success: false, error }, { status: httpStatusForErrorCode(error.code) });
    }

    const shouldCreateAccount = formData.get('shouldCreateAccount') === 'true';
    const checkoutRegistrationIntent = formData.get('checkoutRegistrationIntent') === 'true';
    const savePaymentToProfile = formData.get('savePaymentToProfile') === 'true';
    const useDifferentBilling = formData.get('useDifferentBilling') === 'true';
    const contactPhoneFromForm = formData.get('contactPhone')?.toString() || undefined;

    const auth = getAuth(context);
    const userType = auth.userType ?? 'guest';
    const registeredViaCheckout =
        userType === 'registered' && Boolean(auth.customerId) && shouldCreateAccount && checkoutRegistrationIntent;

    // SCAPI getOrder is shopper-scoped: 404 means the orderNo is unknown OR not owned
    // by the current shopper (SCAPI doesn't distinguish, to avoid leaking existence).
    // The order is already created and paid at this point, so we retry once on transient
    // failures (5xx, network) before failing - 404/4xx are not retried since they're not
    // transient and retrying would just delay the error response.
    const clients = createApiClients(context);
    let order;
    try {
        order = await getOrderWithRetry(clients, orderNo, logger);
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            logger.warn('[Checkout] place-order-finalize: order not found for current shopper', { orderNo });
            const notFoundError = createActionError({ code: ErrorCode.NOT_FOUND, message: 'Order not found' });
            return Response.json(
                { success: false, error: notFoundError },
                { status: httpStatusForErrorCode(notFoundError.code) }
            );
        }
        logger.error('[Checkout] place-order-finalize: getOrder failed after retry', { orderNo, error });
        const failureError = createActionError({ error, code: ErrorCode.OPERATION_FAILED });
        // Forward the upstream SCAPI status when known (preserves observability for 5xx).
        const status =
            error instanceof ApiError && error.status >= 400 && error.status < 600
                ? error.status
                : httpStatusForErrorCode(failureError.code);
        return Response.json({ success: false, error: failureError }, { status });
    }

    // Profile save (non-fatal: the order is already created; we always continue to teardown).
    if (auth.customerId) {
        // Form-supplied phone wins because OTP basket transfers can strip phone from the billing address.
        const contactPhone =
            contactPhoneFromForm ||
            order.billingAddress?.phone ||
            order.shipments?.[0]?.shippingAddress?.phone ||
            (order.customerInfo as { phone?: string } | undefined)?.phone;

        let profileSnapshot: CustomerProfile | null = null;
        try {
            const loaded = await getCustomerProfileForCheckout(context, auth.customerId);
            if (loaded?.customer) {
                profileSnapshot = {
                    customer: loaded.customer,
                    addresses: loaded.addresses ?? [],
                    paymentInstruments: loaded.paymentInstruments ?? [],
                    preferredShippingAddress: loaded.preferredShippingAddress,
                    preferredBillingAddress: loaded.preferredBillingAddress,
                };
            }
        } catch (error) {
            logger.error('[Checkout] place-order-finalize: failed to load customer profile', { error });
        }

        // Newly registered shopper with no addresses and no phone is treated like a fresh registration.
        let isNewlyRegisteredWithEmptyProfile = false;
        if (userType === 'registered' && !registeredViaCheckout && profileSnapshot?.customer) {
            const c = profileSnapshot.customer;
            isNewlyRegisteredWithEmptyProfile =
                (!profileSnapshot.addresses || profileSnapshot.addresses.length === 0) && !c.phoneHome;
        }

        try {
            await saveCheckoutDataToProfile(context, {
                customerId: auth.customerId,
                order,
                registeredViaCheckout,
                isNewlyRegisteredWithEmptyProfile,
                savePaymentToProfile,
                useDifferentBilling,
                contactPhone,
                profileSnapshot,
            });
        } catch (error) {
            logger.error('[Checkout] place-order-finalize: profile save failed', { orderNo, error });
        }
    }

    logger.info('[Checkout] place-order-finalize: tearing down basket', { orderNo });
    const redirectUrl = finalizeOrderSuccess(context, {
        orderNo,
        registration:
            registeredViaCheckout && order.customerInfo?.email ? { email: order.customerInfo.email } : undefined,
    });

    return Response.json({ success: true, redirectUrl });
}

const GET_ORDER_RETRY_DELAY_MS = 500;

/**
 * Retry once on transient failures: SCAPI 5xx and non-ApiError throws (network,
 * timeout). 4xx (including 404) skip the retry since they're terminal.
 */
async function getOrderWithRetry(
    clients: ReturnType<typeof createApiClients>,
    orderNo: string,
    logger: ReturnType<typeof getLogger>
) {
    try {
        const response = await clients.shopperOrders.getOrder({ params: { path: { orderNo } } });
        return response.data;
    } catch (error) {
        const isTransient = !(error instanceof ApiError) || error.status >= 500;
        if (!isTransient) throw error;
        logger.warn('[Checkout] place-order-finalize: getOrder failed, retrying once', { orderNo, error });
        await new Promise((resolve) => setTimeout(resolve, GET_ORDER_RETRY_DELAY_MS));
        const response = await clients.shopperOrders.getOrder({ params: { path: { orderNo } } });
        return response.data;
    }
}
