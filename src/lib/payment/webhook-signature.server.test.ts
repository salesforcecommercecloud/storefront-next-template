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

import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyHmacSha256, parseSignedHeader, isWithinReplayWindow } from './webhook-signature.server';

describe('webhook-signature.server', () => {
    describe('verifyHmacSha256', () => {
        const SECRET = 'shared-webhook-secret';
        const sign = (body: string) => createHmac('sha256', SECRET).update(body, 'utf8').digest('hex');

        it('returns true for a correctly-signed body', () => {
            const body = '{"event":"payment.succeeded"}';
            expect(verifyHmacSha256(body, sign(body), SECRET)).toBe(true);
        });

        it('returns false for a tampered body', () => {
            const body = '{"event":"payment.succeeded"}';
            const sig = sign(body);
            const tamperedBody = '{"event":"payment.failed"}';
            expect(verifyHmacSha256(tamperedBody, sig, SECRET)).toBe(false);
        });

        it('returns false for a wrong secret', () => {
            const body = '{"event":"x"}';
            expect(verifyHmacSha256(body, sign(body), 'different-secret')).toBe(false);
        });

        it('returns false for empty signature', () => {
            expect(verifyHmacSha256('body', '', SECRET)).toBe(false);
        });

        it('returns false for empty secret', () => {
            expect(verifyHmacSha256('body', sign('body'), '')).toBe(false);
        });

        it('returns false on length mismatch (no exception)', () => {
            // 32-char hex (truncated) vs the expected 64
            expect(verifyHmacSha256('body', 'abc', SECRET)).toBe(false);
        });

        it('returns false on malformed hex (no exception)', () => {
            // 64 chars but not valid hex
            expect(verifyHmacSha256('body', 'z'.repeat(64), SECRET)).toBe(false);
        });

        it('treats whitespace-different bodies as different signatures', () => {
            // PSP signs raw bytes; even one extra space invalidates.
            const body1 = '{"a":1}';
            const body2 = '{"a": 1}';
            const sig = sign(body1);
            expect(verifyHmacSha256(body1, sig, SECRET)).toBe(true);
            expect(verifyHmacSha256(body2, sig, SECRET)).toBe(false);
        });
    });

    describe('parseSignedHeader', () => {
        it('parses Stripe-style t=...,v1=... headers', () => {
            const parsed = parseSignedHeader('t=1700000000,v1=abc123,v0=def456');
            expect(parsed.get('t')).toEqual(['1700000000']);
            expect(parsed.get('v1')).toEqual(['abc123']);
            expect(parsed.get('v0')).toEqual(['def456']);
        });

        it('preserves multiple values per key (signature rotation)', () => {
            const parsed = parseSignedHeader('t=1,v1=sig1,v1=sig2');
            expect(parsed.get('v1')).toEqual(['sig1', 'sig2']);
        });

        it('returns empty map for null/undefined/empty', () => {
            expect(parseSignedHeader(null).size).toBe(0);
            expect(parseSignedHeader(undefined).size).toBe(0);
            expect(parseSignedHeader('').size).toBe(0);
        });

        it('skips malformed parts (no equals sign, leading equals)', () => {
            const parsed = parseSignedHeader('t=1,malformed,=value,v1=ok');
            expect(parsed.get('t')).toEqual(['1']);
            expect(parsed.get('v1')).toEqual(['ok']);
            expect(parsed.has('')).toBe(false);
        });

        it('trims whitespace around keys and values', () => {
            const parsed = parseSignedHeader(' t = 1700000000 , v1 = sig ');
            expect(parsed.get('t')).toEqual(['1700000000']);
            expect(parsed.get('v1')).toEqual(['sig']);
        });
    });

    describe('isWithinReplayWindow', () => {
        it('returns true for current timestamp', () => {
            const nowSec = Math.floor(Date.now() / 1000);
            expect(isWithinReplayWindow(nowSec)).toBe(true);
        });

        it('returns true for slightly skewed timestamp within tolerance', () => {
            const nowSec = Math.floor(Date.now() / 1000);
            expect(isWithinReplayWindow(nowSec - 60)).toBe(true);
            expect(isWithinReplayWindow(nowSec + 60)).toBe(true);
        });

        it('returns false beyond tolerance', () => {
            const nowSec = Math.floor(Date.now() / 1000);
            expect(isWithinReplayWindow(nowSec - 1000)).toBe(false);
            expect(isWithinReplayWindow(nowSec + 1000)).toBe(false);
        });

        it('respects custom tolerance', () => {
            const nowSec = Math.floor(Date.now() / 1000);
            expect(isWithinReplayWindow(nowSec - 60, 30)).toBe(false);
            expect(isWithinReplayWindow(nowSec - 60, 120)).toBe(true);
        });

        it('returns false for non-finite or non-positive timestamps', () => {
            expect(isWithinReplayWindow(0)).toBe(false);
            expect(isWithinReplayWindow(-1)).toBe(false);
            expect(isWithinReplayWindow(Number.NaN)).toBe(false);
            expect(isWithinReplayWindow(Number.POSITIVE_INFINITY)).toBe(false);
        });
    });
});
