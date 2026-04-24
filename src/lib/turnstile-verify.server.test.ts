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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstileToken } from './turnstile-verify.server';

describe('verifyTurnstileToken', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return success when Cloudflare returns success: true', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(
                JSON.stringify({
                    success: true,
                    challenge_ts: '2026-04-20T12:00:00.000Z',
                    hostname: 'store.example.com',
                    'error-codes': [],
                    action: '',
                }),
                { status: 200 }
            )
        );

        const result = await verifyTurnstileToken({
            token: 'valid-token',
            secretKey: '1x0000000000000000000000000000000AA',
        });

        expect(result.success).toBe(true);
        expect(result.challengeTs).toBe('2026-04-20T12:00:00.000Z');
        expect(result.hostname).toBe('store.example.com');
        expect(result.errorCodes).toEqual([]);
    });

    it('should return failure when Cloudflare returns success: false', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(
                JSON.stringify({
                    success: false,
                    'error-codes': ['invalid-input-response'],
                }),
                { status: 200 }
            )
        );

        const result = await verifyTurnstileToken({
            token: 'invalid-token',
            secretKey: '2x0000000000000000000000000000000AA',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('invalid-input-response');
    });

    it('should send correct request body with remoteIp', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(JSON.stringify({ success: true, 'error-codes': [] }), { status: 200 })
        );

        await verifyTurnstileToken({
            token: 'test-token',
            secretKey: 'test-secret',
            remoteIp: '192.168.1.1',
        });

        expect(fetch).toHaveBeenCalledWith(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('remoteip=192.168.1.1'),
            })
        );
    });

    it('should return error when token is missing', async () => {
        const result = await verifyTurnstileToken({
            token: '',
            secretKey: 'test-secret',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('missing-input-response');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should return error when secret key is missing', async () => {
        const result = await verifyTurnstileToken({
            token: 'test-token',
            secretKey: '',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('missing-input-secret');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle HTTP errors', async () => {
        vi.mocked(fetch).mockResolvedValue(new Response('Server Error', { status: 500 }));

        const result = await verifyTurnstileToken({
            token: 'test-token',
            secretKey: 'test-secret',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('http-error-500');
    });

    it('should handle network errors', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('Network failure'));

        const result = await verifyTurnstileToken({
            token: 'test-token',
            secretKey: 'test-secret',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('internal-error');
    });

    it('should handle timeout (AbortError)', async () => {
        const abortError = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
        vi.mocked(fetch).mockRejectedValue(abortError);

        const result = await verifyTurnstileToken({
            token: 'test-token',
            secretKey: 'test-secret',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('timeout-or-duplicate');
    });

    it('should handle token-already-spent error', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(
                JSON.stringify({
                    success: false,
                    'error-codes': ['timeout-or-duplicate'],
                }),
                { status: 200 }
            )
        );

        const result = await verifyTurnstileToken({
            token: 'already-used-token',
            secretKey: '3x0000000000000000000000000000000AA',
        });

        expect(result.success).toBe(false);
        expect(result.errorCodes).toContain('timeout-or-duplicate');
    });
});
