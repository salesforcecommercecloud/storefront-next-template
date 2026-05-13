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
import { serializeRedirectCookie, generateStateToken, validateProviderStateSize } from '@/lib/payment-redirect.server';
import type { PaymentRedirectState } from '@/lib/payment-gateway.types';
import { getBasket } from '@/middlewares/basket.server';
import { frameworkDisabledResponse, isPaymentFrameworkEnabled } from '@/lib/payment/framework-enabled.server';

// RFC 4122 UUID v1-v8 (we're agnostic about version; only the shape is enforced).
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true if the request's Origin (or Referer) matches the request URL's host.
 * Mitigates cross-site requests that try to mint a redirect cookie for a victim. The
 * payment route is same-origin in normal use; rejecting cross-origin is safe.
 */
function isSameOrigin(request: Request): boolean {
    let originHost: string | null = null;
    const origin = request.headers.get('origin');
    if (origin) {
        try {
            originHost = new URL(origin).host;
        } catch {
            return false;
        }
    } else {
        const referer = request.headers.get('referer');
        if (!referer) return false;
        try {
            originHost = new URL(referer).host;
        } catch {
            return false;
        }
    }
    try {
        return originHost === new URL(request.url).host;
    } catch {
        return false;
    }
}

/**
 * Serializes payment redirect state into an HMAC-signed httpOnly cookie before
 * the shopper is redirected to the external payment provider.
 *
 * Generates the stateToken server-side and returns it so the client can include
 * it in the provider's return URL for validation on redirect back.
 *
 * Validation contract:
 *  - Same-origin only (Origin or Referer host matches the request host).
 *  - basketId must match the current shopper's basket — prevents minting cookies for
 *    arbitrary basket IDs.
 *  - idempotencyKey is required and must look like a UUID. The framework auto-generates
 *    it on checkout mount; if a client doesn't send one, it's a misconfiguration.
 *  - providerName is non-empty and length-bounded.
 *  - providerState is bounded (1KB) and validated for size before signing.
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<Response> {
    if (!isPaymentFrameworkEnabled()) return frameworkDisabledResponse();
    const logger = getLogger(context);

    if (!isSameOrigin(request)) {
        logger.warn('[Payment] redirect-init blocked: cross-origin request');
        return Response.json({ error: 'cross-origin requests are not allowed' }, { status: 403 });
    }

    try {
        const body = await request.json();

        // Required-field shape check.
        if (typeof body.basketId !== 'string' || !body.basketId) {
            logger.warn('[Payment] redirect-init: missing or invalid basketId');
            return Response.json({ error: 'basketId is required' }, { status: 400 });
        }
        if (typeof body.providerName !== 'string' || !body.providerName || body.providerName.length > 64) {
            logger.warn('[Payment] redirect-init: missing/invalid providerName', { providerName: body.providerName });
            return Response.json({ error: 'providerName is required and must be ≤64 chars' }, { status: 400 });
        }
        if (typeof body.idempotencyKey !== 'string' || !UUID_PATTERN.test(body.idempotencyKey)) {
            logger.warn('[Payment] redirect-init: missing/invalid idempotencyKey shape');
            return Response.json({ error: 'idempotencyKey must be a UUID' }, { status: 400 });
        }

        const providerState = typeof body.providerState === 'string' ? body.providerState : '';
        if (!validateProviderStateSize(providerState)) {
            return Response.json({ error: 'providerState exceeds maximum size (1KB)' }, { status: 400 });
        }

        // Verify the basket belongs to the current shopper. Without this, anyone with a
        // session could mint a signed cookie for an arbitrary basketId.
        const basketResource = await getBasket(context);
        const currentBasket = basketResource.current;
        if (!currentBasket?.basketId || currentBasket.basketId !== body.basketId) {
            logger.warn('[Payment] redirect-init: basketId mismatch with current session', {
                claimedBasketId: body.basketId,
                currentBasketId: currentBasket?.basketId,
            });
            return Response.json({ error: 'basket does not belong to current session' }, { status: 403 });
        }

        const stateToken = generateStateToken();

        const state: PaymentRedirectState = {
            stateToken,
            basketId: body.basketId,
            providerName: body.providerName,
            idempotencyKey: body.idempotencyKey,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            providerState,
            shouldCreateAccount: body.shouldCreateAccount === true,
            contactPhone: typeof body.contactPhone === 'string' ? body.contactPhone : '',
        };

        logger.debug('[Payment] redirect-init: cookie minted', {
            basketId: state.basketId,
            providerName: state.providerName,
        });

        return new Response(JSON.stringify({ success: true, stateToken }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': serializeRedirectCookie(state),
            },
        });
    } catch (error) {
        logger.error('[Payment] redirect-init: failed', { error });
        return Response.json({ error: 'failed to initialize redirect' }, { status: 500 });
    }
}
