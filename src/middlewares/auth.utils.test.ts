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
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    getRefreshTokenExpiry,
    MAX_GUEST_REFRESH_TOKEN_EXPIRY,
    MAX_REGISTERED_REFRESH_TOKEN_EXPIRY,
    decodeSLASAccessToken,
    getSLASAccessTokenClaims,
    isTrackingConsentEnabled,
    getPublicSessionData,
} from './auth.utils';
import type { SessionData } from '@/lib/api/types';
import type { AppConfig } from '@/config';
import { createTestContext } from '@/lib/test-utils';
import { mockBuildConfig } from '@/test-utils/config';
import { TrackingConsent } from '@/types/tracking-consent';

describe('auth.utils', () => {
    let mockConfig: AppConfig;

    beforeEach(() => {
        // Reset config mocks before each test
        mockConfig = {
            commerce: {
                api: {
                    clientId: '',
                    organizationId: '',
                    siteId: '',
                    shortCode: '',
                    proxy: '',
                    callback: '',
                    privateKeyEnabled: false,
                    guestRefreshTokenExpirySeconds: undefined,
                    registeredRefreshTokenExpirySeconds: undefined,
                },
            },
        } as AppConfig;
    });

    describe('getRefreshTokenExpiry', () => {
        const API_EXPIRY = 7776000; // 90 days in seconds

        it.each([
            ['not provided', undefined],
            ['explicitly undefined', undefined],
        ])('should return API response value when userType is %s', (_, userType) => {
            const result = getRefreshTokenExpiry(API_EXPIRY, userType);

            expect(result).toBe(API_EXPIRY);
        });

        it.each([
            ['guest', 'guestRefreshTokenExpirySeconds', 'guest' as const, 2592000],
            ['registered', 'registeredRefreshTokenExpirySeconds', 'registered' as const, 7776000],
        ])('should return %s user override when config is set', (_, configKey, userType, customExpiry) => {
            (mockConfig.commerce.api as any)[configKey] = customExpiry;

            const result = getRefreshTokenExpiry(API_EXPIRY, userType, mockConfig);

            expect(result).toBe(customExpiry);
        });

        it.each([
            ['guest', 'guest' as const, MAX_GUEST_REFRESH_TOKEN_EXPIRY],
            ['registered', 'registered' as const, MAX_REGISTERED_REFRESH_TOKEN_EXPIRY],
        ])('should cap API response to maximum for %s when no config override is set', (_, userType, expectedMax) => {
            const result = getRefreshTokenExpiry(API_EXPIRY, userType, mockConfig);

            expect(result).toBe(expectedMax);
        });

        it.each([
            ['guest', 'guest' as const, 'registeredRefreshTokenExpirySeconds', MAX_GUEST_REFRESH_TOKEN_EXPIRY],
            [
                'registered',
                'registered' as const,
                'guestRefreshTokenExpirySeconds',
                MAX_REGISTERED_REFRESH_TOKEN_EXPIRY,
            ],
        ])('should not use wrong user type override for %s', (_, userType, wrongConfigKey, expectedMax) => {
            (mockConfig.commerce.api as any)[wrongConfigKey] = 1000000;

            const result = getRefreshTokenExpiry(API_EXPIRY, userType, mockConfig);

            expect(result).toBe(expectedMax);
        });

        describe('maximum expiry validation', () => {
            it('should cap guest token API response to 30 days maximum', () => {
                const SIXTY_DAYS = 60 * 24 * 60 * 60;
                const result = getRefreshTokenExpiry(SIXTY_DAYS, 'guest', mockConfig);

                expect(result).toBe(MAX_GUEST_REFRESH_TOKEN_EXPIRY);
            });

            it('should cap registered token API response to 90 days maximum', () => {
                const ONE_HUNDRED_EIGHTY_DAYS = 180 * 24 * 60 * 60;
                const result = getRefreshTokenExpiry(ONE_HUNDRED_EIGHTY_DAYS, 'registered', mockConfig);

                expect(result).toBe(MAX_REGISTERED_REFRESH_TOKEN_EXPIRY);
            });

            it('should cap guest token config override to 30 days maximum', () => {
                const SIXTY_DAYS = 60 * 24 * 60 * 60;
                mockConfig.commerce.api.guestRefreshTokenExpirySeconds = SIXTY_DAYS;

                const result = getRefreshTokenExpiry(API_EXPIRY, 'guest', mockConfig);

                expect(result).toBe(MAX_GUEST_REFRESH_TOKEN_EXPIRY);
            });

            it('should cap registered token config override to 90 days maximum', () => {
                const ONE_HUNDRED_EIGHTY_DAYS = 180 * 24 * 60 * 60;
                mockConfig.commerce.api.registeredRefreshTokenExpirySeconds = ONE_HUNDRED_EIGHTY_DAYS;

                const result = getRefreshTokenExpiry(API_EXPIRY, 'registered', mockConfig);

                expect(result).toBe(MAX_REGISTERED_REFRESH_TOKEN_EXPIRY);
            });

            it('should allow valid guest token values under maximum', () => {
                const FIFTEEN_DAYS = 15 * 24 * 60 * 60;
                mockConfig.commerce.api.guestRefreshTokenExpirySeconds = FIFTEEN_DAYS;

                const result = getRefreshTokenExpiry(API_EXPIRY, 'guest', mockConfig);

                expect(result).toBe(FIFTEEN_DAYS);
            });

            it('should allow valid registered token values under maximum', () => {
                const SIXTY_DAYS = 60 * 24 * 60 * 60;
                mockConfig.commerce.api.registeredRefreshTokenExpirySeconds = SIXTY_DAYS;

                const result = getRefreshTokenExpiry(API_EXPIRY, 'registered', mockConfig);

                expect(result).toBe(SIXTY_DAYS);
            });
        });

        describe('edge cases', () => {
            it('should handle zero API expiry', () => {
                const result = getRefreshTokenExpiry(0, 'guest', mockConfig);

                expect(result).toBe(0);
            });

            it('should not cap API expiry when no userType is provided', () => {
                const LARGE_EXPIRY = 999999999;
                const result = getRefreshTokenExpiry(LARGE_EXPIRY);

                expect(result).toBe(LARGE_EXPIRY);
            });

            it('should prioritize config override even when API expiry is zero', () => {
                const CUSTOM_EXPIRY = 5000;
                mockConfig.commerce.api.guestRefreshTokenExpirySeconds = CUSTOM_EXPIRY;

                const result = getRefreshTokenExpiry(0, 'guest', mockConfig);

                expect(result).toBe(CUSTOM_EXPIRY);
            });

            it('should handle undefined config as no override', () => {
                const result = getRefreshTokenExpiry(API_EXPIRY, 'guest', mockConfig);

                expect(result).toBe(MAX_GUEST_REFRESH_TOKEN_EXPIRY); // API response is 90 days, capped to 30 days for guest
            });
        });

        it('should handle both overrides set and use correct one (capped) based on userType', () => {
            const GUEST_OVERRIDE = 5184000; // 60 days (exceeds max)
            const REGISTERED_OVERRIDE = 15552000; // 180 days (exceeds max)
            mockConfig.commerce.api.guestRefreshTokenExpirySeconds = GUEST_OVERRIDE;
            mockConfig.commerce.api.registeredRefreshTokenExpirySeconds = REGISTERED_OVERRIDE;

            const guestResult = getRefreshTokenExpiry(API_EXPIRY, 'guest', mockConfig);
            const registeredResult = getRefreshTokenExpiry(API_EXPIRY, 'registered', mockConfig);

            expect(guestResult).toBe(MAX_GUEST_REFRESH_TOKEN_EXPIRY); // Capped to 30 days
            expect(registeredResult).toBe(MAX_REGISTERED_REFRESH_TOKEN_EXPIRY); // Capped to 90 days
            expect(guestResult).not.toBe(registeredResult);
        });
    });

    describe('SLAS Access Token utilities', () => {
        // Helper to create a test SLAS access token
        const createTestToken = (payload: Record<string, unknown>): string => {
            const header = { alg: 'HS256', typ: 'JWT' };
            const encodeBase64Url = (obj: Record<string, unknown>): string => {
                const json = JSON.stringify(obj);
                const base64 = Buffer.from(json).toString('base64');
                return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
            };

            return [encodeBase64Url(header), encodeBase64Url(payload), 'fake-signature'].join('.');
        };

        describe('decodeSLASAccessToken', () => {
            it('should decode a valid SLAS access token', () => {
                const payload = { exp: 1234567890, sub: 'user123', iat: 1234567800 };
                const token = createTestToken(payload);

                const decoded = decodeSLASAccessToken(token);

                expect(decoded.exp).toBe(1234567890);
                expect(decoded.sub).toBe('user123');
                expect(decoded.iat).toBe(1234567800);
            });

            it('should handle tokens with custom claims', () => {
                const payload = {
                    exp: 1234567890,
                    customClaim: 'customValue',
                    nested: { key: 'value' },
                };
                const token = createTestToken(payload);

                const decoded = decodeSLASAccessToken(token);

                expect(decoded.customClaim).toBe('customValue');
                expect(decoded.nested).toEqual({ key: 'value' });
            });

            it('should throw error for empty token', () => {
                expect(() => decodeSLASAccessToken('')).toThrow('Invalid token: must be a non-empty string');
            });

            it('should throw error for null token', () => {
                expect(() => decodeSLASAccessToken(null as unknown as string)).toThrow(
                    'Invalid token: must be a non-empty string'
                );
            });

            it('should throw error for token with wrong number of parts', () => {
                expect(() => decodeSLASAccessToken('invalid.token')).toThrow(
                    'Invalid JWT: must have 3 parts (header.payload.signature)'
                );
                expect(() => decodeSLASAccessToken('too.many.parts.here')).toThrow(
                    'Invalid JWT: must have 3 parts (header.payload.signature)'
                );
            });

            it('should throw error for token with empty payload', () => {
                expect(() => decodeSLASAccessToken('header..signature')).toThrow('Invalid JWT: missing payload');
            });

            it('should throw error for token with invalid base64', () => {
                expect(() => decodeSLASAccessToken('header.invalid!!!.signature')).toThrow('Failed to decode JWT');
            });

            it('should throw error for token with invalid JSON in payload', () => {
                const invalidJson = Buffer.from('not valid json').toString('base64');
                const token = `header.${invalidJson}.signature`;
                expect(() => decodeSLASAccessToken(token)).toThrow('Failed to decode JWT');
            });

            it('should handle base64url encoding with - and _', () => {
                // Create payload that results in + and / in standard base64
                const payload = { exp: 1234567890, data: 'test?>test?>test' };
                const token = createTestToken(payload);

                const decoded = decodeSLASAccessToken(token);

                expect(decoded.exp).toBe(1234567890);
                expect(decoded.data).toBe('test?>test?>test');
            });
        });

        describe('getSLASAccessTokenClaims', () => {
            it('should return expiry timestamp in milliseconds and trackingConsent claim', () => {
                const expSeconds = 1234567890;
                const token = createTestToken({ exp: expSeconds, dnt: true });

                const claims = getSLASAccessTokenClaims(token);

                expect(claims.expiry).toBe(expSeconds * 1000);
                expect(claims.trackingConsent).toBe(TrackingConsent.Declined);
            });

            it('should return null expiry for token without exp claim', () => {
                const token = createTestToken({ sub: 'user123' });

                const claims = getSLASAccessTokenClaims(token);

                expect(claims.expiry).toBeNull();
                expect(claims.trackingConsent).toBeNull();
            });

            it('should return null for invalid token', () => {
                const claims1 = getSLASAccessTokenClaims('invalid.token');
                const claims2 = getSLASAccessTokenClaims('');

                expect(claims1.expiry).toBeNull();
                expect(claims1.trackingConsent).toBeNull();
                expect(claims2.expiry).toBeNull();
                expect(claims2.trackingConsent).toBeNull();
            });

            it('should handle exp as 0', () => {
                const token = createTestToken({ exp: 0 });

                const claims = getSLASAccessTokenClaims(token);

                expect(claims.expiry).toBe(0);
            });

            it('should handle realistic SLAS token', () => {
                const now = Date.now();
                const expSeconds = Math.floor(now / 1000) + 1800; // 30 minutes
                const token = createTestToken({ exp: expSeconds });

                const claims = getSLASAccessTokenClaims(token);

                expect(claims.expiry).toBe(expSeconds * 1000);
                expect(claims.expiry).toBeGreaterThan(now);
            });

            it('should handle dnt as boolean true (Declined)', () => {
                const token = createTestToken({ exp: 1234567890, dnt: true });

                const claims = getSLASAccessTokenClaims(token);

                expect(claims.trackingConsent).toBe(TrackingConsent.Declined);
            });

            it('should handle dnt as boolean false (Accepted)', () => {
                const token = createTestToken({ exp: 1234567890, dnt: false });

                const claims = getSLASAccessTokenClaims(token);

                expect(claims.trackingConsent).toBe(TrackingConsent.Accepted);
            });

            it('should handle dnt as string "true" (Declined)', () => {
                const token = createTestToken({ exp: 1234567890, dnt: 'true' });

                const claims = getSLASAccessTokenClaims(token);

                expect(claims.trackingConsent).toBe(TrackingConsent.Declined);
            });

            it('should handle dnt as string "1" (Declined)', () => {
                const token = createTestToken({ exp: 1234567890, dnt: '1' });

                const claims = getSLASAccessTokenClaims(token);

                expect(claims.trackingConsent).toBe(TrackingConsent.Declined);
            });

            it('should handle dnt as string "false" (Accepted)', () => {
                const token = createTestToken({ exp: 1234567890, dnt: 'false' });

                const claims = getSLASAccessTokenClaims(token);

                expect(claims.trackingConsent).toBe(TrackingConsent.Accepted);
            });

            it('should handle dnt as string "0" (Accepted)', () => {
                const token = createTestToken({ exp: 1234567890, dnt: '0' });

                const claims = getSLASAccessTokenClaims(token);

                expect(claims.trackingConsent).toBe(TrackingConsent.Accepted);
            });

            it('should return null trackingConsent when dnt claim is missing', () => {
                const token = createTestToken({ exp: 1234567890 });

                const claims = getSLASAccessTokenClaims(token);

                expect(claims.trackingConsent).toBeNull();
            });
        });
    });

    describe('Tracking Consent utilities', () => {
        describe('isTrackingConsentEnabled', () => {
            beforeEach(() => {
                vi.resetModules();
            });

            it('should return true when tracking consent is enabled in config', () => {
                const testConfig = {
                    ...mockBuildConfig.app,
                    engagement: {
                        ...mockBuildConfig.app.engagement,
                        analytics: {
                            ...mockBuildConfig.app.engagement.analytics,
                            trackingConsent: {
                                enabled: true,
                                defaultTrackingConsent: TrackingConsent.Declined,
                            },
                        },
                    },
                };
                const context = createTestContext({ appConfig: testConfig });

                const result = isTrackingConsentEnabled(context);

                expect(result).toBe(true);
            });

            it('should return false when tracking consent is disabled in config', () => {
                const testConfig = {
                    ...mockBuildConfig.app,
                    engagement: {
                        ...mockBuildConfig.app.engagement,
                        analytics: {
                            ...mockBuildConfig.app.engagement.analytics,
                            trackingConsent: {
                                enabled: false,
                                defaultTrackingConsent: TrackingConsent.Declined,
                            },
                        },
                    },
                };
                const context = createTestContext({ appConfig: testConfig });

                const result = isTrackingConsentEnabled(context);

                expect(result).toBe(false);
            });

            it('should return false when tracking consent config is missing', () => {
                const testConfig = {
                    ...mockBuildConfig.app,
                    engagement: {
                        ...mockBuildConfig.app.engagement,
                        analytics: {
                            ...mockBuildConfig.app.engagement.analytics,
                            trackingConsent: undefined,
                        },
                    },
                };
                const context = createTestContext({ appConfig: testConfig });

                const result = isTrackingConsentEnabled(context);

                expect(result).toBe(false);
            });

            it('should return false when engagement config is missing', () => {
                // Override engagement to remove analytics config
                const testConfig = {
                    ...mockBuildConfig.app,
                    engagement: {
                        ...mockBuildConfig.app.engagement,
                        analytics: {} as any,
                    },
                };
                const context = createTestContext({ appConfig: testConfig });

                const result = isTrackingConsentEnabled(context);

                expect(result).toBe(false);
            });
        });
    });

    describe('getPublicSessionData', () => {
        it('should extract only non-sensitive fields from session data', () => {
            const fullSession: SessionData = {
                accessToken: 'secret-access-token',
                refreshToken: 'secret-refresh-token',
                accessTokenExpiry: 1234567890,
                refreshTokenExpiry: 9876543210,
                customerId: 'customer-123',
                userType: 'registered',
                usid: 'usid-456',
                encUserId: 'enc-user-789',
                trackingConsent: TrackingConsent.Accepted,
                codeVerifier: 'secret-code-verifier',
                idpAccessToken: 'secret-idp-token',
                idpAccessTokenExpiry: 1111111111,
                dwsid: 'secret-dwsid',
            };

            const publicData = getPublicSessionData(fullSession);

            // Should include only these non-sensitive fields
            expect(publicData).toEqual({
                customerId: 'customer-123',
                userType: 'registered',
                usid: 'usid-456',
                encUserId: 'enc-user-789',
                trackingConsent: TrackingConsent.Accepted,
            });

            // Verify sensitive fields are NOT present
            expect(publicData).not.toHaveProperty('accessToken');
            expect(publicData).not.toHaveProperty('refreshToken');
            expect(publicData).not.toHaveProperty('codeVerifier');
            expect(publicData).not.toHaveProperty('idpAccessToken');
            expect(publicData).not.toHaveProperty('dwsid');
        });
    });
});
