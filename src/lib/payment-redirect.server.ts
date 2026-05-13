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

import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import type { PaymentRedirectState } from '@/lib/payment-gateway.types';
import { parseAllCookies } from '@/lib/cookie-utils.server';

const COOKIE_NAME = '__sfdc_payment_redirect';
const MAX_AGE_SECONDS = 1800;
const MAX_PROVIDER_STATE_BYTES = 1024;
// HMAC-SHA256 in hex is exactly 64 chars. Hardcoded so length-mismatched signatures are
// rejected before timingSafeEqual is even called. If the algorithm ever changes (e.g., to
// a different hash or encoding), update this and the corresponding Buffer.from('hex') decode.
const HMAC_HEX_LENGTH = 64;

/**
 * Returns the HMAC signing secret. Cached on first resolution so we don't re-read
 * process.env on every signing/verifying call (which is hot during checkout). Must be
 * deterministic across instances — MRT is serverless, so the init and finalize requests
 * may hit different instances.
 *
 * Two env vars supported, in priority order:
 *
 * 1. PAYMENT_COOKIE_SECRET (preferred for production). A key dedicated to redirect
 *    cookies. Use this when you want clean isolation between SCAPI auth and payment
 *    cookie signing — rotating one key doesn't invalidate the other, and a leak of
 *    CLIENT_SECRET doesn't expose payment-cookie integrity. Recommended for any
 *    deployment that handles real money.
 *
 * 2. CLIENT_SECRET (zero-config fallback). Already required for SCAPI auth, so it's
 *    guaranteed to be present. Falling back to it lets the redirect framework work
 *    out of the box on local dev / staging without additional configuration. The
 *    trade-off: shared key means a CLIENT_SECRET rotation also silently invalidates
 *    all in-flight redirect cookies (which expire after 30 minutes anyway, so the blast
 *    radius is limited).
 *
 * @env PAYMENT_COOKIE_SECRET - (Recommended for production) Dedicated HMAC key.
 *      Generate with: `openssl rand -hex 32`
 * @env CLIENT_SECRET - Fallback HMAC key (already required for SCAPI auth).
 */
let cachedSigningSecret: string | null = null;

function getSigningSecret(): string {
    if (cachedSigningSecret !== null) return cachedSigningSecret;
    const secret = process.env.PAYMENT_COOKIE_SECRET || process.env.CLIENT_SECRET;
    if (!secret) {
        throw new Error(
            '[Payment] No HMAC signing secret available. Set PAYMENT_COOKIE_SECRET (preferred) or CLIENT_SECRET in MRT env. CLIENT_SECRET is also required for SCAPI auth.'
        );
    }
    cachedSigningSecret = secret;
    return cachedSigningSecret;
}

/**
 * Module-load self-check. Throws synchronously on import if the signing secret is
 * missing, so a misconfigured deployment fails at boot rather than letting the first
 * shopper hit a 500 mid-checkout.
 */
export function assertPaymentRedirectConfigured(): void {
    getSigningSecret();
}

/** Test-only helper. Resets the cached secret so env changes between tests are honored. */
export function __resetSigningSecretForTests(): void {
    cachedSigningSecret = null;
}

function sign(payload: string): string {
    return createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
}

function verifySignature(payload: string, signature: string): boolean {
    // Length pre-check is defensive: HMAC-SHA256 hex is always 64 chars (HMAC_HEX_LENGTH),
    // so a different length means malformed or tampered. Cheap reject before allocating
    // Buffers for timingSafeEqual.
    if (signature.length !== HMAC_HEX_LENGTH) return false;
    const expected = sign(payload);
    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

export function generateStateToken(): string {
    return randomUUID();
}

export function validateProviderStateSize(providerState: string): boolean {
    return Buffer.byteLength(providerState, 'utf-8') <= MAX_PROVIDER_STATE_BYTES;
}

/**
 * Serialize a PaymentRedirectState into an HMAC-signed Set-Cookie header value.
 * Format: `<url-encoded-json>.<hmac-sha256-hex>`
 */
export function serializeRedirectCookie(state: PaymentRedirectState): string {
    const payload = JSON.stringify(state);
    const signature = sign(payload);
    const value = `${encodeURIComponent(payload)}.${signature}`;

    const parts = [
        `${COOKIE_NAME}=${value}`,
        `Path=/`,
        `HttpOnly`,
        `Secure`,
        `SameSite=Lax`,
        `Max-Age=${MAX_AGE_SECONDS}`,
    ];
    return parts.join('; ');
}

/**
 * Read and verify the PaymentRedirectState from the request's Cookie header.
 * Returns null if missing, malformed, expired, or signature is invalid.
 */
export function readRedirectCookie(request: Request): PaymentRedirectState | null {
    const cookieHeader = request.headers.get('Cookie');
    const cookies = parseAllCookies(cookieHeader);
    const raw = cookies[COOKIE_NAME];

    if (!raw) return null;

    try {
        const lastDotIndex = raw.lastIndexOf('.');
        if (lastDotIndex === -1) return null;

        const encodedPayload = raw.substring(0, lastDotIndex);
        const signature = raw.substring(lastDotIndex + 1);

        if (!signature || signature.length !== HMAC_HEX_LENGTH) return null;

        const payload = decodeURIComponent(encodedPayload);
        if (!verifySignature(payload, signature)) return null;

        const state: PaymentRedirectState = JSON.parse(payload);

        if (new Date(state.expiresAt) < new Date()) {
            return null;
        }

        return state;
    } catch {
        return null;
    }
}

export function clearRedirectCookie(): string {
    return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/** Timing-safe stateToken comparison. */
export function validateStateToken(state: PaymentRedirectState, tokenFromUrl: string): boolean {
    if (!state.stateToken || !tokenFromUrl || state.stateToken.length !== tokenFromUrl.length) {
        return false;
    }
    return timingSafeEqual(Buffer.from(state.stateToken), Buffer.from(tokenFromUrl));
}
