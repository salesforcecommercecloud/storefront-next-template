/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Cookies from 'js-cookie';
import { getCookie, setCookie, removeCookie, myUnescape, myEscape, getCookieConfig } from './cookies.client';

// Mock js-cookie
vi.mock('js-cookie');

// Mock the config module
vi.mock('@/config', () => ({
    config: {
        app: {
            site: {
                cookies: {
                    domain: undefined,
                },
            },
        },
    },
}));

describe('cookies', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getCookieConfig', () => {
        it('should return default configuration without cookie domain', () => {
            const cookieConfig = getCookieConfig();

            expect(cookieConfig).toEqual({
                path: '/',
                sameSite: 'lax',
                secure: true,
            });
            expect(cookieConfig.domain).toBeUndefined();
        });

        it('should include domain when appConfig is provided', () => {
            // Create mock appConfig with domain set
            const mockAppConfig = {
                site: {
                    cookies: { domain: '.example.com' },
                },
            } as any;

            const cookieConfig = getCookieConfig({}, mockAppConfig);

            expect(cookieConfig).toEqual({
                path: '/',
                sameSite: 'lax',
                secure: true,
                domain: '.example.com',
            });
        });

        it('should merge with provided options', () => {
            const cookieConfig = getCookieConfig({
                httpOnly: false,
                expires: new Date('2025-12-31'),
            });

            expect(cookieConfig).toMatchObject({
                httpOnly: false,
                expires: expect.any(Date),
                path: '/',
                sameSite: 'lax',
                secure: true,
            });
        });

        it('should give precedence: appConfig > provided options > defaults', () => {
            // Create mock appConfig with domain set
            const mockAppConfig = {
                site: {
                    cookies: { domain: '.env-domain.com' },
                },
            } as any;

            const cookieConfig = getCookieConfig(
                {
                    domain: '.code-domain.com',
                    path: '/custom',
                    secure: false,
                },
                mockAppConfig
            );

            // Precedence order verification:
            // - domain: .env-domain.com (appConfig override wins)
            // - path: /custom (provided option wins over default)
            // - secure: false (provided option wins over default)
            // - sameSite: lax (default, not overridden)
            expect(cookieConfig).toEqual({
                domain: '.env-domain.com', // APP CONFIG wins
                path: '/custom', // PROVIDED wins over default
                secure: false, // PROVIDED wins over default
                sameSite: 'lax', // DEFAULT (not overridden)
            });
        });

        it('should preserve additional properties from provided options', () => {
            const cookieConfig = getCookieConfig({
                httpOnly: true,
                expires: new Date('2025-12-31'),
                maxAge: 3600,
            });

            expect(cookieConfig).toMatchObject({
                httpOnly: true,
                expires: expect.any(Date),
                maxAge: 3600,
                path: '/',
                sameSite: 'lax',
                secure: true,
            });
        });

        it.each([
            ['empty object', {}],
            ['undefined', undefined],
        ])('should handle %s cookie options', (_, options) => {
            const cookieConfig = getCookieConfig(options);

            expect(cookieConfig).toEqual({
                path: '/',
                sameSite: 'lax',
                secure: true,
            });
        });

        it('should not override provided options when appConfig domain is empty string', () => {
            const mockAppConfig = {
                site: {
                    cookies: { domain: '' },
                },
            } as any;

            const cookieConfig = getCookieConfig(
                {
                    domain: '.code-domain.com',
                },
                mockAppConfig
            );

            // Empty string is falsy, so it won't override
            expect(cookieConfig).toEqual({
                domain: '.code-domain.com',
                path: '/',
                sameSite: 'lax',
                secure: true,
            });
        });

        it('should handle appConfig with missing cookies property', () => {
            const mockAppConfig = {
                site: {
                    cookies: undefined,
                },
            } as any;

            const cookieConfig = getCookieConfig({}, mockAppConfig);

            expect(cookieConfig).toEqual({
                path: '/',
                sameSite: 'lax',
                secure: true,
            });
        });
    });

    describe('getCookie', () => {
        it('should decode a properly encoded cookie value', () => {
            const originalData = { userType: 'guest', access_token: 'test-token-123' };

            const cookieValue = btoa(myUnescape(encodeURIComponent(JSON.stringify(originalData))));

            vi.mocked(Cookies.get).mockReturnValue(cookieValue as string & { [key: string]: string });

            const result = getCookie('test-cookie');

            expect(Cookies.get).toHaveBeenCalledWith('test-cookie');
            expect(result).toEqual(originalData);
        });

        it.each([
            ['cookie does not exist', undefined, 'non-existent-cookie'],
            ['cookie value is null', null, 'null-cookie'],
            ['decoding fails', 'invalid-base64-!@#$%', 'invalid-cookie'],
        ])('should return empty object when %s', (_, mockValue, cookieName) => {
            vi.mocked(Cookies.get).mockReturnValue(mockValue as any);

            const result = getCookie(cookieName);

            expect(result).toEqual({});
        });

        it('should handle complex session data with special characters', () => {
            const complexData = {
                userType: 'registered',
                access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0',
                customer_id: 'user-123-!@#$%^&*()',
                email: 'test+user@example.com',
                refresh_token: 'refresh_token_with_special_chars_=/',
                access_token_expiry: 1234567890123,
                refresh_token_expiry: 9876543210123,
            };
            const cookieValue = btoa(myUnescape(encodeURIComponent(JSON.stringify(complexData))));

            vi.mocked(Cookies.get).mockReturnValue(cookieValue as any);

            const result = getCookie('session-cookie');

            expect(result).toEqual(complexData);
        });
    });

    describe('setCookie', () => {
        it('should encode and set a cookie value correctly with default config', () => {
            const data = { userType: 'guest', access_token: 'test-token' };
            const expectedEncodedValue = encodeURIComponent(btoa(myUnescape(encodeURIComponent(JSON.stringify(data)))));

            setCookie('test-cookie', data);

            expect(Cookies.set).toHaveBeenCalledWith('test-cookie', expect.any(String), {
                path: '/',
                sameSite: 'lax',
                secure: true,
            });

            const encodedValue = vi.mocked(Cookies.set).mock.calls[0][1];
            expect(encodedValue).toBe(expectedEncodedValue);
        });

        it('should apply cookie domain when provided in options', () => {
            const data = { userType: 'guest', access_token: 'test-token' };

            setCookie('test-cookie', data, { domain: '.example.com' });

            expect(Cookies.set).toHaveBeenCalledWith('test-cookie', expect.any(String), {
                path: '/',
                sameSite: 'lax',
                secure: true,
                domain: '.example.com',
            });
        });

        it('should merge with provided options', () => {
            const data = { userType: 'guest', access_token: 'test-token' };
            const options = {
                expires: new Date('2025-12-31'),
                httpOnly: false,
            };

            setCookie('test-cookie', data, options);

            expect(Cookies.set).toHaveBeenCalledWith('test-cookie', expect.any(String), {
                expires: expect.any(Date),
                httpOnly: false,
                path: '/',
                sameSite: 'lax',
                secure: true,
            });
        });

        it('should use provided options over defaults', () => {
            const data = { userType: 'guest', access_token: 'test-token' };
            const options = {
                domain: '.code-domain.com',
                path: '/custom',
            };

            setCookie('test-cookie', data, options);

            // Provided options override defaults
            expect(Cookies.set).toHaveBeenCalledWith('test-cookie', expect.any(String), {
                domain: '.code-domain.com', // PROVIDED
                path: '/custom', // PROVIDED wins over default
                sameSite: 'lax', // DEFAULT
                secure: true, // DEFAULT
            });
        });

        it('should encode empty object', () => {
            const expectedEncodedValue = btoa(myUnescape(encodeURIComponent(JSON.stringify({}))));

            setCookie('test-cookie', {} as any);

            // Empty object is truthy, so it gets encoded
            expect(Cookies.set).toHaveBeenCalledWith('test-cookie', expect.any(String), {
                path: '/',
                sameSite: 'lax',
                secure: true,
            });

            const encodedValue = vi.mocked(Cookies.set).mock.calls[0][1];
            expect(encodedValue).toBe(expectedEncodedValue);
        });

        it.each([
            ['null', null],
            ['undefined', undefined],
        ])('should return empty string for %s value', (_, value) => {
            setCookie('test-cookie', value as any);

            expect(Cookies.set).toHaveBeenCalledWith('test-cookie', '', {
                path: '/',
                sameSite: 'lax',
                secure: true,
            });
        });

        it('should handle setCookie with no options provided', () => {
            const data = { userType: 'guest', access_token: 'test-token' };

            setCookie('test-cookie', data);

            expect(Cookies.set).toHaveBeenCalledWith('test-cookie', expect.any(String), {
                path: '/',
                sameSite: 'lax',
                secure: true,
            });
        });
    });

    describe('removeCookie', () => {
        it('should call Cookies.remove with the cookie name', () => {
            removeCookie('test-cookie');

            expect(Cookies.remove).toHaveBeenCalledWith('test-cookie');
        });
    });

    describe('myEscape and myUnescape', () => {
        it('myUnescape should handle unicode escape sequences (%uXXXX)', () => {
            // Test unicode escape sequence format (%uXXXX)
            // %u4e2d represents the Chinese character '中'
            const input = 'test%u4e2dvalue';
            const result = myUnescape(input);
            expect(result).toBe('test中value');
        });

        it('myUnescape should handle standard percent encoding (%XX)', () => {
            // Test standard percent encoding
            const input = 'test%20value%21'; // space and !
            const result = myUnescape(input);
            expect(result).toBe('test value!');
        });

        it('myUnescape should handle mixed unicode and standard escapes', () => {
            // Mix both formats
            const input = '%u4e2d%20test'; // 中 + space + test
            const result = myUnescape(input);
            expect(result).toBe('中 test');
        });

        it('myEscape should convert special characters to percent encoding', () => {
            // Test myEscape with special characters
            const input = 'test 中 value!';
            const result = myEscape(input);
            // Should escape space, unicode char, and special chars
            expect(result).toMatch(/%/);
            expect(result).not.toBe(input);
        });

        it('myEscape should handle characters that need zero padding in hex', () => {
            // Test with control characters (0-15) that produce single-digit hex
            // and need zero-padding (e.g., \x01 becomes %01, not %1)
            const input = '\x01\x0f'; // Characters with codes 1 and 15
            const result = myEscape(input);
            expect(result).toBe('%01%0f');
        });
    });
});
