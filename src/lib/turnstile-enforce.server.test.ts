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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enforceTurnstile } from './turnstile-enforce.server';
import type { AppConfig } from '@/types/config';

vi.mock('@/lib/turnstile-verify.server', () => ({
    verifyTurnstileToken: vi.fn(),
}));
vi.mock('@/lib/turnstile-utils', () => ({
    getTurnstileSiteKey: vi.fn(),
    getTurnstileSecretKey: vi.fn(),
}));

function mockLogger() {
    return { warn: vi.fn(), debug: vi.fn() };
}

function makeRequest(origin = 'https://storefront.example.com') {
    return new Request('https://storefront.example.com/action/test', {
        method: 'POST',
        headers: { origin },
    });
}

const TURNSTILE_ENABLED_CONFIG = {
    security: {
        turnstile: {
            enabled: true,
            verification: { enabled: true },
            sites: {},
        },
    },
} as unknown as AppConfig;

describe('enforceTurnstile', () => {
    let mockVerifyTurnstileToken: ReturnType<typeof vi.fn>;
    let mockGetTurnstileSiteKey: ReturnType<typeof vi.fn>;
    let mockGetTurnstileSecretKey: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        const verifyMod = await import('@/lib/turnstile-verify.server');
        mockVerifyTurnstileToken = vi.mocked(verifyMod.verifyTurnstileToken);

        const utilsMod = await import('@/lib/turnstile-utils');
        mockGetTurnstileSiteKey = vi.mocked(utilsMod.getTurnstileSiteKey);
        mockGetTurnstileSecretKey = vi.mocked(utilsMod.getTurnstileSecretKey);
    });

    it('allows request when verification is disabled', async () => {
        const config = { security: { turnstile: { enabled: true, verification: { enabled: false } } } };
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: config as unknown as AppConfig,
            turnstileToken: undefined,
            logger,
            actionName: 'test',
        });

        expect(result).toBe(true);
        expect(mockVerifyTurnstileToken).not.toHaveBeenCalled();
    });

    it('allows request when turnstile.enabled is false', async () => {
        const config = { security: { turnstile: { enabled: false, verification: { enabled: true } } } };
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: config as unknown as AppConfig,
            turnstileToken: undefined,
            logger,
            actionName: 'test',
        });

        expect(result).toBe(true);
    });

    it('allows request when security config is absent', async () => {
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: {} as AppConfig,
            turnstileToken: undefined,
            logger,
            actionName: 'test',
        });

        expect(result).toBe(true);
    });

    it('blocks request when Origin and Referer headers are both missing', async () => {
        const logger = mockLogger();
        const request = new Request('https://storefront.example.com/action/test', {
            method: 'POST',
            // No origin or referer header
        });

        const result = await enforceTurnstile({
            request,
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: 'some-token',
            logger,
            actionName: 'test-action',
            email: 'user@example.com',
        });

        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('No Origin or Referer header'),
            expect.objectContaining({ action: 'test-action' })
        );
    });

    it('blocks request when origin does not match any configured domain', async () => {
        mockGetTurnstileSiteKey.mockReturnValue(null);
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest('https://evil.example.com'),
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: 'some-token',
            logger,
            actionName: 'test-action',
            email: 'user@example.com',
        });

        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('No site key match'),
            expect.objectContaining({ action: 'test-action' })
        );
    });

    it('blocks request when no secret key is configured for the site', async () => {
        mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
        mockGetTurnstileSecretKey.mockReturnValue(null);
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: 'some-token',
            logger,
            actionName: 'test-action',
        });

        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('No secret key configured'),
            expect.objectContaining({ siteKey: 'site-key-123' })
        );
    });

    it('blocks request when turnstile token is missing', async () => {
        mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
        mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: undefined,
            logger,
            actionName: 'test-action',
            email: 'user@example.com',
        });

        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Missing token'),
            expect.objectContaining({ action: 'test-action', email: 'user@example.com' })
        );
        expect(mockVerifyTurnstileToken).not.toHaveBeenCalled();
    });

    it('blocks request when Cloudflare verification fails', async () => {
        mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
        mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
        mockVerifyTurnstileToken.mockResolvedValue({ success: false, errorCodes: ['invalid-input-response'] });
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: 'bad-token',
            logger,
            actionName: 'test-action',
        });

        expect(result).toBe(false);
        expect(mockVerifyTurnstileToken).toHaveBeenCalledWith({
            token: 'bad-token',
            secretKey: 'secret-key-456',
            remoteIp: undefined,
        });
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Verification failed'),
            expect.objectContaining({ errorCodes: ['invalid-input-response'] })
        );
    });

    it('allows request when Cloudflare verification succeeds', async () => {
        mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
        mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
        mockVerifyTurnstileToken.mockResolvedValue({
            success: true,
            challengeTs: '2026-04-22T00:00:00Z',
            errorCodes: [],
        });
        const logger = mockLogger();

        const result = await enforceTurnstile({
            request: makeRequest(),
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: 'valid-token',
            logger,
            actionName: 'test-action',
        });

        expect(result).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith(
            expect.stringContaining('Verification passed'),
            expect.objectContaining({ action: 'test-action' })
        );
    });

    it('extracts remote IP from x-forwarded-for header', async () => {
        mockGetTurnstileSiteKey.mockReturnValue('site-key-123');
        mockGetTurnstileSecretKey.mockReturnValue('secret-key-456');
        mockVerifyTurnstileToken.mockResolvedValue({ success: true, errorCodes: [] });

        const request = new Request('https://storefront.example.com/action/test', {
            method: 'POST',
            headers: {
                origin: 'https://storefront.example.com',
                'x-forwarded-for': '203.0.113.50, 70.41.3.18',
            },
        });

        await enforceTurnstile({
            request,
            config: TURNSTILE_ENABLED_CONFIG,
            turnstileToken: 'valid-token',
            logger: mockLogger(),
            actionName: 'test-action',
        });

        expect(mockVerifyTurnstileToken).toHaveBeenCalledWith(expect.objectContaining({ remoteIp: '203.0.113.50' }));
    });
});
