import { describe, it, expect, beforeEach } from 'vitest';
import {
    getRefreshTokenExpiry,
    MAX_GUEST_REFRESH_TOKEN_EXPIRY,
    MAX_REGISTERED_REFRESH_TOKEN_EXPIRY,
} from './auth.utils';
import type { AppConfig } from '@/config';

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
});
