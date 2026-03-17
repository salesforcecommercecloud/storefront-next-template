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

/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Cookies from 'js-cookie';
import { getCookie, setNamespacedCookie, removeCookie, getAllCookies } from './cookies.client';
import { getCookieNameWithSiteId, getCookieConfig } from './cookie-utils';

// Mock js-cookie
vi.mock('js-cookie');

// Mock cookie-utils
vi.mock('./cookie-utils', () => ({
    getCookieNameWithSiteId: vi.fn(),
    getCookieConfig: vi.fn(),
}));

describe('cookies.client', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    describe('getAllCookies', () => {
        it('should get all cookies using js-cookie', () => {
            const mockCookies = {
                token_RefArch: 'abc123',
                userId_RefArch: 'user456',
                sessionId: 'xyz789',
            };
            vi.stubGlobal('document', {});
            (vi.mocked(Cookies.get) as any).mockReturnValue(mockCookies);

            const result = getAllCookies();

            expect(Cookies.get).toHaveBeenCalledWith();
            expect(result).toEqual(mockCookies);
        });

        it('should return empty object when document is undefined', () => {
            vi.stubGlobal('document', undefined);

            const result = getAllCookies();

            expect(result).toEqual({});
            expect(Cookies.get).not.toHaveBeenCalled();
        });
    });

    describe('getCookie', () => {
        it('should get a cookie value with namespacing', () => {
            const cookieValue = 'test-token-123';

            vi.mocked(getCookieNameWithSiteId).mockReturnValue('refresh-token_RefArch');
            (vi.mocked(Cookies.get) as any).mockReturnValue(cookieValue);

            const result = getCookie('refresh-token');

            expect(getCookieNameWithSiteId).toHaveBeenCalledWith('refresh-token');
            expect(Cookies.get).toHaveBeenCalledWith('refresh-token_RefArch');
            expect(result).toBe(cookieValue);
        });

        it('should return empty string when cookie does not exist or is falsy', () => {
            vi.mocked(getCookieNameWithSiteId).mockReturnValue('non-existent_RefArch');
            (vi.mocked(Cookies.get) as any).mockReturnValue(undefined);

            expect(getCookie('non-existent')).toBe('');

            (vi.mocked(Cookies.get) as any).mockReturnValue(null);
            expect(getCookie('null-cookie')).toBe('');
        });
    });

    describe('setNamespacedCookie', () => {
        const defaultConfig = {
            path: '/',
            sameSite: 'lax' as const,
            secure: true,
        };

        beforeEach(() => {
            vi.mocked(getCookieConfig).mockReturnValue(defaultConfig);
        });

        it('should set a cookie value with namespacing and default config', () => {
            const value = 'test-token-123';

            vi.mocked(getCookieNameWithSiteId).mockReturnValue('refresh-token_RefArch');
            vi.mocked(Cookies.set).mockReturnValue('refresh-token_RefArch=test-token-123');

            const result = setNamespacedCookie('refresh-token', value);

            expect(getCookieNameWithSiteId).toHaveBeenCalledWith('refresh-token');
            expect(getCookieConfig).toHaveBeenCalledWith(undefined);
            expect(Cookies.set).toHaveBeenCalledWith('refresh-token_RefArch', value, defaultConfig);
            expect(result).toBe('refresh-token_RefArch=test-token-123');
        });

        it('should convert number and boolean values to strings', () => {
            vi.mocked(getCookieNameWithSiteId)
                .mockReturnValueOnce('timestamp_RefArch')
                .mockReturnValueOnce('flag_RefArch');

            setNamespacedCookie('timestamp', 1234567890);
            expect(Cookies.set).toHaveBeenCalledWith('timestamp_RefArch', '1234567890', defaultConfig);

            setNamespacedCookie('flag', true);
            expect(Cookies.set).toHaveBeenCalledWith('flag_RefArch', 'true', defaultConfig);
        });

        it('should apply provided cookie options', () => {
            const cookieOptions = {
                domain: '.example.com',
                maxAge: 3600,
            };
            const expectedConfig = {
                ...defaultConfig,
                domain: '.example.com',
                maxAge: 3600,
            };

            vi.mocked(getCookieConfig).mockReturnValue(expectedConfig);
            vi.mocked(getCookieNameWithSiteId).mockReturnValue('auth_RefArch');

            setNamespacedCookie('auth', 'token', cookieOptions);

            expect(getCookieConfig).toHaveBeenCalledWith(cookieOptions);
            expect(Cookies.set).toHaveBeenCalledWith('auth_RefArch', 'token', expectedConfig);
        });
    });

    describe('removeCookie', () => {
        it('should remove cookie using namespaced name from getCookieNameWithSiteId', () => {
            vi.mocked(getCookieNameWithSiteId).mockReturnValue('refresh-token_RefArch');

            removeCookie('refresh-token');

            expect(getCookieNameWithSiteId).toHaveBeenCalledWith('refresh-token');
            expect(Cookies.remove).toHaveBeenCalledWith('refresh-token_RefArch');
        });
    });
});
