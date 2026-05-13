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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    serializeRedirectCookie,
    readRedirectCookie,
    clearRedirectCookie,
    generateStateToken,
    validateProviderStateSize,
    validateStateToken,
    assertPaymentRedirectConfigured,
    __resetSigningSecretForTests,
} from './payment-redirect.server';
import type { PaymentRedirectState } from './payment-gateway.types';

const FUTURE_EXPIRY = () => new Date(Date.now() + 30 * 60 * 1000).toISOString();

function makeState(overrides: Partial<PaymentRedirectState> = {}): PaymentRedirectState {
    return {
        stateToken: 'state-token-uuid',
        basketId: 'bskt-1',
        providerName: 'test-provider',
        idempotencyKey: 'idem-key',
        expiresAt: FUTURE_EXPIRY(),
        providerState: '',
        shouldCreateAccount: false,
        contactPhone: '',
        ...overrides,
    };
}

function makeRequestWithCookieHeader(cookieValue: string): Request {
    return new Request('https://example.com/action/payment-redirect-return', {
        headers: { Cookie: cookieValue },
    });
}

beforeEach(() => {
    __resetSigningSecretForTests();
    process.env.PAYMENT_COOKIE_SECRET = 'test-secret-32-bytes-of-deterministic-data';
    delete process.env.CLIENT_SECRET;
});

afterEach(() => {
    delete process.env.PAYMENT_COOKIE_SECRET;
    delete process.env.CLIENT_SECRET;
    __resetSigningSecretForTests();
});

describe('payment-redirect.server', () => {
    describe('generateStateToken', () => {
        it('produces RFC 4122 UUID-shaped strings', () => {
            const token = generateStateToken();
            expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('produces unique values across calls (not deterministic)', () => {
            const a = generateStateToken();
            const b = generateStateToken();
            expect(a).not.toBe(b);
        });
    });

    describe('validateProviderStateSize', () => {
        it('returns true for empty string', () => {
            expect(validateProviderStateSize('')).toBe(true);
        });
        it('returns true at the 1024-byte boundary', () => {
            expect(validateProviderStateSize('a'.repeat(1024))).toBe(true);
        });
        it('returns false at 1025 bytes', () => {
            expect(validateProviderStateSize('a'.repeat(1025))).toBe(false);
        });
        it('counts UTF-8 byte length, not character length', () => {
            // 'é' is 2 bytes in UTF-8. 600 of them = 1200 bytes > 1024.
            expect(validateProviderStateSize('é'.repeat(600))).toBe(false);
            // 512 'é' = 1024 bytes, just at the boundary.
            expect(validateProviderStateSize('é'.repeat(512))).toBe(true);
        });
    });

    describe('serializeRedirectCookie + readRedirectCookie round-trip', () => {
        it('round-trips a fresh state', () => {
            const state = makeState({ basketId: 'bskt-rt', providerState: 'opaque' });
            const setCookie = serializeRedirectCookie(state);

            // Set-Cookie header value: extract just the cookie name=value pair for use as a Cookie header.
            const cookieValue = setCookie.split(';')[0];
            const request = makeRequestWithCookieHeader(cookieValue);

            const parsed = readRedirectCookie(request);
            expect(parsed).not.toBeNull();
            expect(parsed?.basketId).toBe('bskt-rt');
            expect(parsed?.providerState).toBe('opaque');
            expect(parsed?.stateToken).toBe(state.stateToken);
        });

        it('emits the correct cookie attributes', () => {
            const setCookie = serializeRedirectCookie(makeState());
            expect(setCookie).toMatch(/^__sfdc_payment_redirect=/);
            expect(setCookie).toContain('Path=/');
            expect(setCookie).toContain('HttpOnly');
            expect(setCookie).toContain('Secure');
            expect(setCookie).toContain('SameSite=Lax');
            expect(setCookie).toContain('Max-Age=1800');
        });

        it('reads null when no cookie is present', () => {
            const request = new Request('https://example.com/return');
            expect(readRedirectCookie(request)).toBeNull();
        });

        it('reads null for malformed cookie (no signature separator)', () => {
            const request = makeRequestWithCookieHeader('__sfdc_payment_redirect=no-dot-here');
            expect(readRedirectCookie(request)).toBeNull();
        });

        it('rejects tampered payload (signature no longer matches)', () => {
            const state = makeState({ basketId: 'bskt-tamper-orig' });
            const setCookie = serializeRedirectCookie(state);
            const cookieValue = setCookie.split(';')[0];
            // Tamper the JSON: replace original basketId with attacker-controlled value.
            // Cookie shape: name=<encoded-json>.<signature>
            const lastDot = cookieValue.lastIndexOf('.');
            const encodedJson = cookieValue.substring(cookieValue.indexOf('=') + 1, lastDot);
            const signature = cookieValue.substring(lastDot + 1);
            const json = decodeURIComponent(encodedJson);
            const tamperedJson = json.replace('bskt-tamper-orig', 'bskt-attacker');
            const tamperedCookieValue = `__sfdc_payment_redirect=${encodeURIComponent(tamperedJson)}.${signature}`;

            const request = makeRequestWithCookieHeader(tamperedCookieValue);
            expect(readRedirectCookie(request)).toBeNull();
        });

        it('rejects truncated signature (length mismatch fast-path)', () => {
            const setCookie = serializeRedirectCookie(makeState());
            const cookieValue = setCookie.split(';')[0];
            // Drop the last 4 hex chars from the signature.
            const truncated = cookieValue.slice(0, -4);
            const request = makeRequestWithCookieHeader(truncated);
            expect(readRedirectCookie(request)).toBeNull();
        });

        it('rejects expired cookie (application-level TTL)', () => {
            const state = makeState({ expiresAt: new Date(Date.now() - 1000).toISOString() });
            const setCookie = serializeRedirectCookie(state);
            const cookieValue = setCookie.split(';')[0];
            const request = makeRequestWithCookieHeader(cookieValue);
            expect(readRedirectCookie(request)).toBeNull();
        });

        it('rejects cookie signed with a different secret', () => {
            const setCookie = serializeRedirectCookie(makeState());
            const cookieValue = setCookie.split(';')[0];

            // Rotate the secret: simulates the attacker using a stale cookie after key rotation,
            // OR an attacker with no knowledge of the secret.
            __resetSigningSecretForTests();
            process.env.PAYMENT_COOKIE_SECRET = 'a-completely-different-secret-value';

            const request = makeRequestWithCookieHeader(cookieValue);
            expect(readRedirectCookie(request)).toBeNull();
        });
    });

    describe('clearRedirectCookie', () => {
        it('emits a Max-Age=0 cookie with matching name + flags', () => {
            const cleared = clearRedirectCookie();
            expect(cleared).toContain('__sfdc_payment_redirect=;');
            expect(cleared).toContain('Max-Age=0');
            expect(cleared).toContain('HttpOnly');
            expect(cleared).toContain('Secure');
            expect(cleared).toContain('SameSite=Lax');
        });
    });

    describe('validateStateToken', () => {
        const baseState = makeState({ stateToken: 'fixed-token-1234567890ab' });

        it('returns true for matching tokens', () => {
            expect(validateStateToken(baseState, 'fixed-token-1234567890ab')).toBe(true);
        });
        it('returns false for non-matching tokens of equal length', () => {
            expect(validateStateToken(baseState, 'fixed-token-XXXXXXXXXXab')).toBe(false);
        });
        it('returns false for empty url token', () => {
            expect(validateStateToken(baseState, '')).toBe(false);
        });
        it('returns false when state.stateToken is missing', () => {
            expect(validateStateToken({ ...baseState, stateToken: '' }, 'anything')).toBe(false);
        });
        it('returns false on length mismatch (no timing-leak)', () => {
            expect(validateStateToken(baseState, 'fixed-token-1234567890')).toBe(false);
            expect(validateStateToken(baseState, 'fixed-token-1234567890abEXTRA')).toBe(false);
        });
    });

    describe('signing secret resolution', () => {
        it('uses PAYMENT_COOKIE_SECRET when set', () => {
            __resetSigningSecretForTests();
            process.env.PAYMENT_COOKIE_SECRET = 'preferred-key';
            process.env.CLIENT_SECRET = 'fallback-key';
            // Sign + verify with the preferred key path
            const setCookie = serializeRedirectCookie(makeState());
            const cookieValue = setCookie.split(';')[0];
            expect(readRedirectCookie(makeRequestWithCookieHeader(cookieValue))).not.toBeNull();
        });

        it('falls back to CLIENT_SECRET when PAYMENT_COOKIE_SECRET is unset', () => {
            __resetSigningSecretForTests();
            delete process.env.PAYMENT_COOKIE_SECRET;
            process.env.CLIENT_SECRET = 'scapi-secret';
            const setCookie = serializeRedirectCookie(makeState());
            const cookieValue = setCookie.split(';')[0];
            expect(readRedirectCookie(makeRequestWithCookieHeader(cookieValue))).not.toBeNull();
        });

        it('caches the resolved secret across calls', () => {
            __resetSigningSecretForTests();
            process.env.PAYMENT_COOKIE_SECRET = 'first';
            const setCookie = serializeRedirectCookie(makeState());
            const cookieValue = setCookie.split(';')[0];

            // Mutate env AFTER first sign — the cache should hold the original value, so verify still passes.
            process.env.PAYMENT_COOKIE_SECRET = 'second';
            expect(readRedirectCookie(makeRequestWithCookieHeader(cookieValue))).not.toBeNull();
        });

        it('throws when neither secret is available', () => {
            __resetSigningSecretForTests();
            delete process.env.PAYMENT_COOKIE_SECRET;
            delete process.env.CLIENT_SECRET;
            expect(() => serializeRedirectCookie(makeState())).toThrow(/HMAC signing secret/);
        });

        describe('assertPaymentRedirectConfigured', () => {
            it('does not throw when the secret is configured', () => {
                __resetSigningSecretForTests();
                process.env.PAYMENT_COOKIE_SECRET = 'configured';
                expect(() => assertPaymentRedirectConfigured()).not.toThrow();
            });

            it('throws when no secret is available (boot-time fail-fast)', () => {
                __resetSigningSecretForTests();
                delete process.env.PAYMENT_COOKIE_SECRET;
                delete process.env.CLIENT_SECRET;
                expect(() => assertPaymentRedirectConfigured()).toThrow(/HMAC signing secret/);
            });
        });
    });
});
