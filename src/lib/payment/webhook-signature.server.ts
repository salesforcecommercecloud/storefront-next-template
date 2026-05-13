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

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Helpers for payment webhook signature verification.
 *
 * Each PSP signs its webhooks differently — Stripe with a `t=...,v1=...` header and a
 * pinned-secret HMAC, PayPal with a transmission-id + cert chain, Adyen with HMAC over a
 * concatenated payload, etc. The framework cannot abstract that fully. What it CAN
 * provide is a small set of primitives extensions compose to verify their PSP's format:
 *
 *  - `verifyHmacSha256(rawBody, signature, secret)` — generic HMAC-SHA256 verification with
 *    timing-safe comparison. Works for any PSP whose verification reduces to "HMAC-SHA256
 *    the request body with our shared secret and compare to a header".
 *  - `parseSignedHeader(header, scheme)` — parses Stripe-style `t=...,v1=...,v0=...` headers
 *    into a map. Useful to extract the timestamp + signature pair for replay-window checks.
 *
 * Webhook routes themselves live in `src/extensions/<provider>/routes/`. The framework
 * provides the generic `/action/payment-webhook` dispatcher (see action.payment-webhook.ts)
 * for the simple case where one route demuxes to extension hooks by `provider` query param.
 */

/**
 * Verifies an HMAC-SHA256 signature against a raw request body.
 *
 * @param rawBody - The exact bytes of the request body (NOT a parsed JSON object).
 *                  Most PSPs sign the raw bytes; even one whitespace difference invalidates
 *                  the signature, so callers must read with `await request.text()` (NOT
 *                  `request.json()`) before parsing.
 * @param providedSignature - The hex-encoded signature received from the provider.
 * @param secret - The shared secret used to sign the webhook (provider-issued).
 * @returns true if the signature is valid, false otherwise. Comparison is timing-safe.
 *          Returns false (does not throw) on malformed input so callers can fall through
 *          to a clean "rejected" response without try/catch.
 */
export function verifyHmacSha256(rawBody: string, providedSignature: string, secret: string): boolean {
    if (!secret || !providedSignature || providedSignature.length === 0) return false;

    const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    if (expected.length !== providedSignature.length) return false;

    try {
        return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(providedSignature, 'hex'));
    } catch {
        // Buffer.from('hex') silently truncates on invalid hex; the length check above
        // catches obvious cases, but a safety net here avoids any chance of a throw.
        return false;
    }
}

/**
 * Parses a Stripe-style signed header of the form `t=1234567890,v1=abc123,v0=def456,...`
 * into a map. Used for PSPs whose webhook verification spec packs multiple values into a
 * single header (timestamp, signature scheme version, signature itself).
 *
 * @returns Map of key -> array of values. Multiple values per key are preserved
 *          (e.g., Stripe rotates v1 signatures during key rolls).
 */
export function parseSignedHeader(header: string | null | undefined): Map<string, string[]> {
    const result = new Map<string, string[]>();
    if (!header) return result;
    for (const part of header.split(',')) {
        const eqIdx = part.indexOf('=');
        if (eqIdx <= 0) continue;
        const key = part.slice(0, eqIdx).trim();
        const value = part.slice(eqIdx + 1).trim();
        if (!key) continue;
        const existing = result.get(key);
        if (existing) {
            existing.push(value);
        } else {
            result.set(key, [value]);
        }
    }
    return result;
}

/**
 * Helper for replay-window checks. Returns true if the timestamp is within `toleranceSec`
 * of now (defaults to 5 minutes per Stripe's default).
 *
 * Webhooks may arrive late (provider retries) but a request with a stale timestamp + valid
 * signature could be a replay attack with a leaked signature. Combining HMAC verification
 * with a replay window is the standard defense.
 *
 * @param timestampSec - Provider-supplied timestamp in Unix seconds (NOT milliseconds).
 * @param toleranceSec - Allowed clock skew in seconds. Default 300 (5 min).
 * @returns true if within window, false if stale or in the future beyond tolerance.
 */
export function isWithinReplayWindow(timestampSec: number, toleranceSec: number = 300): boolean {
    if (!Number.isFinite(timestampSec) || timestampSec <= 0) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    const delta = Math.abs(nowSec - timestampSec);
    return delta <= toleranceSec;
}
