import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AppConfig } from '@/config';
import { getCookieNameWithSiteId, getCookieConfig, COOKIE_NAMESPACE_EXCLUSIONS } from './cookie-utils';

// Mock getConfig
vi.mock('@/config/get-config', () => ({
    getConfig: vi.fn(),
}));

import { getConfig } from '@/config/get-config';

describe('cookie-utils', () => {
    const mockAppConfig: AppConfig = {
        commerce: {
            api: {
                siteId: 'RefArch',
            },
        },
    } as AppConfig;

    describe('COOKIE_NAMESPACE_EXCLUSIONS', () => {
        it('should contain expected excluded cookies', () => {
            expect(COOKIE_NAMESPACE_EXCLUSIONS).toContain('dwsid');
            expect(COOKIE_NAMESPACE_EXCLUSIONS).toBeInstanceOf(Array);
        });
    });

    describe('getCookieNameWithSiteId', () => {
        beforeEach(() => {
            vi.stubGlobal('window', undefined);
            vi.mocked(getConfig).mockReturnValue(mockAppConfig);
        });

        afterEach(() => {
            vi.unstubAllGlobals();
            vi.clearAllMocks();
        });

        it('should return excluded cookie names as-is', () => {
            expect(getCookieNameWithSiteId('dwsid')).toBe('dwsid');
        });

        it('should namespace non-excluded cookies with siteId', () => {
            expect(getCookieNameWithSiteId('refresh-token')).toBe('refresh-token_RefArch');
            expect(getCookieNameWithSiteId('access-token')).toBe('access-token_RefArch');
        });

        it('should use getConfig to get siteId', () => {
            vi.mocked(getConfig).mockReturnValue({
                commerce: {
                    api: {
                        siteId: 'ClientSite',
                    },
                },
            } as AppConfig);

            expect(getCookieNameWithSiteId('refresh-token')).toBe('refresh-token_ClientSite');
        });

        it('should throw error when siteId is not available', () => {
            vi.mocked(getConfig).mockReturnValue({
                commerce: {
                    api: {},
                },
            } as AppConfig);

            expect(() => getCookieNameWithSiteId('refresh-token')).toThrow(
                'siteId not available for cookie namespacing'
            );
        });

        it('should handle cookies with special characters', () => {
            expect(getCookieNameWithSiteId('my-cookie_name.v2')).toBe('my-cookie_name.v2_RefArch');
        });

        it('should handle empty string cookie name', () => {
            expect(getCookieNameWithSiteId('')).toBe('_RefArch');
        });

        it('should work with different siteIds', () => {
            vi.mocked(getConfig).mockReturnValueOnce({ commerce: { api: { siteId: 'Site1' } } } as AppConfig);
            expect(getCookieNameWithSiteId('auth')).toBe('auth_Site1');

            vi.mocked(getConfig).mockReturnValueOnce({ commerce: { api: { siteId: 'Site2' } } } as AppConfig);
            expect(getCookieNameWithSiteId('auth')).toBe('auth_Site2');
        });
    });

    describe('getCookieConfig', () => {
        beforeEach(() => {
            vi.mocked(getConfig).mockReturnValue(mockAppConfig);
        });

        afterEach(() => {
            vi.clearAllMocks();
        });

        it('should return defaults when no options provided', () => {
            const config = getCookieConfig();

            expect(config).toEqual({
                path: '/',
                sameSite: 'lax',
                secure: true,
            });
        });

        it('should merge provided options with defaults', () => {
            const config = getCookieConfig({
                httpOnly: true,
                maxAge: 3600,
            });

            expect(config).toEqual({
                path: '/',
                sameSite: 'lax',
                secure: true,
                httpOnly: true,
                maxAge: 3600,
            });
        });

        it('should allow overriding default values', () => {
            const config = getCookieConfig({
                path: '/custom',
                sameSite: 'strict',
                secure: false,
            });

            expect(config).toEqual({
                path: '/custom',
                sameSite: 'strict',
                secure: false,
            });
        });

        it('should apply domain from appConfig (highest priority)', () => {
            vi.mocked(getConfig).mockReturnValue({
                site: {
                    cookies: {
                        domain: '.example.com',
                    },
                },
            } as AppConfig);

            const config = getCookieConfig({});

            expect(config).toEqual({
                path: '/',
                sameSite: 'lax',
                secure: true,
                domain: '.example.com',
            });
        });

        it('should override provided domain with appConfig domain', () => {
            vi.mocked(getConfig).mockReturnValue({
                site: {
                    cookies: {
                        domain: '.env-domain.com',
                    },
                },
            } as AppConfig);

            const config = getCookieConfig({
                domain: '.code-domain.com',
                path: '/custom',
            });

            expect(config).toEqual({
                path: '/custom',
                sameSite: 'lax',
                secure: true,
                domain: '.env-domain.com', // appConfig wins
            });
        });

        it('should handle appConfig without cookie domain', () => {
            vi.mocked(getConfig).mockReturnValue({
                site: {
                    cookies: {},
                },
            } as AppConfig);

            const config = getCookieConfig({ domain: '.test.com' });

            expect(config).toEqual({
                path: '/',
                sameSite: 'lax',
                secure: true,
                domain: '.test.com',
            });
        });

        it('should handle appConfig with empty string domain', () => {
            vi.mocked(getConfig).mockReturnValue({
                site: {
                    cookies: {
                        domain: '',
                    },
                },
            } as AppConfig);

            const config = getCookieConfig({ domain: '.test.com' });

            // Empty string is falsy, so it doesn't override
            expect(config).toEqual({
                path: '/',
                sameSite: 'lax',
                secure: true,
                domain: '.test.com',
            });
        });

        it('should handle appConfig without site or cookies properties', () => {
            vi.mocked(getConfig).mockReturnValue({} as AppConfig);

            const config = getCookieConfig({ httpOnly: true });

            expect(config).toEqual({
                path: '/',
                sameSite: 'lax',
                secure: true,
                httpOnly: true,
            });
        });

        it('should preserve Date objects for expires', () => {
            const expiryDate = new Date('2025-12-31');
            const config = getCookieConfig({
                expires: expiryDate,
            });

            expect(config.expires).toBe(expiryDate);
            expect(config.expires).toBeInstanceOf(Date);
        });

        it('should handle all cookie attributes', () => {
            vi.mocked(getConfig).mockReturnValue({
                site: {
                    cookies: {
                        domain: '.example.com',
                    },
                },
            } as AppConfig);

            const expiryDate = new Date('2025-12-31');
            const config = getCookieConfig({
                path: '/api',
                secure: false,
                sameSite: 'none',
                expires: expiryDate,
                maxAge: 7200,
                httpOnly: true,
            });

            expect(config).toEqual({
                path: '/api',
                secure: false,
                sameSite: 'none',
                expires: expiryDate,
                maxAge: 7200,
                httpOnly: true,
                domain: '.example.com', // from appConfig
            });
        });

        it('should work with undefined options', () => {
            const config = getCookieConfig(undefined);

            expect(config).toEqual({
                path: '/',
                sameSite: 'lax',
                secure: true,
            });
        });

        it('should preserve custom properties from provided options', () => {
            const config = getCookieConfig({
                path: '/',
                customProp: 'customValue',
            } as any);

            expect(config).toMatchObject({
                path: '/',
                sameSite: 'lax',
                secure: true,
                customProp: 'customValue',
            });
        });

        it.each([
            ['strict', 'strict' as const],
            ['lax', 'lax' as const],
            ['none', 'none' as const],
        ])('should handle sameSite: %s', (_, sameSiteValue) => {
            const config = getCookieConfig({
                sameSite: sameSiteValue,
            });

            expect(config.sameSite).toBe(sameSiteValue);
        });

        it('should verify precedence order: appConfig > options > defaults', () => {
            vi.mocked(getConfig).mockReturnValue({
                site: {
                    cookies: {
                        domain: '.appconfig.com',
                    },
                },
            } as AppConfig);

            // Test all three levels of precedence
            const config = getCookieConfig({
                domain: '.options.com', // Will be overridden by appConfig
                path: '/options', // Will override default
                // secure not provided, will use default
            });

            expect(config).toEqual({
                domain: '.appconfig.com', // HIGHEST: from appConfig
                path: '/options', // MIDDLE: from options
                secure: true, // LOWEST: from defaults
                sameSite: 'lax', // LOWEST: from defaults
            });
        });
    });
});
