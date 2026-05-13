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
import { ACTION_HOOK_IDS, runHookSafe } from '@/targets/action-hook.server';
import { frameworkDisabledResponse, isPaymentFrameworkEnabled } from '@/lib/payment/framework-enabled.server';

/**
 * Generic payment webhook dispatcher.
 *
 * This route exists so payment extensions implementing deferred or async-confirmation
 * patterns have a stable URL to register with their provider. The framework demuxes by the
 * `provider` query parameter (e.g., `/action/payment-webhook?provider=stripe`) and hands
 * off to the registered `onWebhook` hook handler with the raw body, headers, and a parsed
 * signature header value.
 *
 * Trust contract (extension responsibility):
 *  - The framework does NOT verify the webhook signature. Each PSP signs differently
 *    (Stripe `Stripe-Signature` header, PayPal cert chain, Adyen HMAC over concatenated
 *    payload), so the verification step belongs in the extension's `onWebhook` handler.
 *  - The framework provides primitives in `lib/payment/webhook-signature.server.ts`
 *    (`verifyHmacSha256`, `parseSignedHeader`, `isWithinReplayWindow`) for extensions to
 *    compose their PSP-specific verification.
 *  - Extensions MUST verify the signature before reading any state-mutating data from the
 *    payload. An unverified webhook may be forged.
 *
 * Why this is safe to expose without signature verification at the framework layer:
 *  - The route reads the raw body and passes it through unchanged. No basket/order
 *    mutation happens before the hook runs.
 *  - If no hook is registered (no extension installed), the route returns 200 OK so
 *    misconfigured providers don't see ongoing failures (the noop is intentional —
 *    forwarding to nowhere is the right answer when nobody's listening).
 *  - The raw payload + signature header are surfaced via the hook data interface so the
 *    extension can verify before processing.
 *
 * Provider configuration:
 *   - Webhook URL: https://<your-storefront-domain>/action/payment-webhook?provider=<name>
 *   - Method: POST
 *   - Content-Type: as the provider sends (typically application/json or
 *     application/x-www-form-urlencoded)
 *
 * Response semantics:
 *   - 200: hook ran (or no hook registered — both are "we acknowledged the request")
 *   - 400: missing/invalid `provider` query param
 *   - 4xx/5xx: hook explicitly rejected (e.g., signature mismatch — extension throws
 *     ActionHookError, framework converts to error response)
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<Response> {
    if (!isPaymentFrameworkEnabled()) return frameworkDisabledResponse();
    const logger = getLogger(context);
    const url = new URL(request.url);
    const providerName = url.searchParams.get('provider');

    if (!providerName || providerName.length > 64) {
        logger.warn('[Payment] webhook: missing or invalid provider query param', { providerName });
        return Response.json({ error: 'provider query param is required' }, { status: 400 });
    }

    // Read raw body BEFORE any parsing. PSP signatures are computed over the exact bytes;
    // even a re-serialized JSON object will fail signature verification.
    const rawBody = await request.text();

    // Build a header snapshot the hook can inspect for signature verification.
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
    });

    logger.debug('[Payment] webhook: dispatching', {
        providerName,
        bodySize: rawBody.length,
    });

    const hookResult = await runHookSafe({
        hookId: ACTION_HOOK_IDS.CHECKOUT_PAYMENTS_ON_WEBHOOK,
        context: {
            data: {
                providerName,
                rawBody,
                headers,
                // Parsed body is provided as a convenience for extensions that have already
                // verified the signature and want to dispatch on event type.
                // Extensions MUST NOT use this before verifying the raw body's signature.
                providerEventType: '',
                providerPayload: null,
                signature: headers['stripe-signature'] || headers['x-signature'] || '',
                orderNo: '',
            },
            actionContext: context,
        },
        logger,
        fallbackStep: 'webhook',
    });

    if (hookResult.errorResponse) return hookResult.errorResponse;

    return Response.json({ received: true });
}
