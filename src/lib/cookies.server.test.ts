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
import { createCookie, parseAllCookies } from './cookies.server';
import { getCookieNameWithSiteId, getCookieConfig } from './cookie-utils';

// Mock cookie-utils
vi.mock('./cookie-utils', () => ({
    getCookieNameWithSiteId: vi.fn(),
    getCookieConfig: vi.fn(),
}));

describe('cookies.server', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock implementations
        vi.mocked(getCookieNameWithSiteId).mockImplementation((name: string) => `${name}_RefArch`);
        vi.mocked(getCookieConfig).mockImplementation((config: any) => ({
            path: '/',
            sameSite: 'lax' as const,
            secure: true,
            ...config,
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createCookie', () => {
        describe('parse', () => {
            it('should return null for null cookie header', async () => {
                const cookie = createCookie('test', {});
                const result = await cookie.parse(null);
                expect(result).toBeNull();
            });

            it('should return null for empty cookie header', async () => {
                const cookie = createCookie('test', {});
                const result = await cookie.parse('');
                expect(result).toBeNull();
            });

            it('should parse a simple string value as-is without decoding', async () => {
                const cookie = createCookie<string>('token', {});
                const cookieValue = 'abc123';
                const cookieHeader = `token_RefArch=${cookieValue}`;

                const result = await cookie.parse(cookieHeader);
                expect(result).toBe(cookieValue);
            });

            it('should return null when cookie is not present', async () => {
                const cookie = createCookie('token', {});
                const cookieHeader = 'other_cookie=value';

                const result = await cookie.parse(cookieHeader);
                expect(result).toBeNull();
            });

            it('should handle multiple cookies and extract the correct one', async () => {
                const cookie = createCookie<string>('token', {});
                const cookieValue = 'my-token';
                const cookieHeader = `other=value; token_RefArch=${cookieValue}; another=data`;

                const result = await cookie.parse(cookieHeader);
                expect(result).toBe(cookieValue);
            });

            it('should handle cookie values with equals sign', async () => {
                const cookie = createCookie<string>('token', {});
                const cookieValue = 'base64==';
                const cookieHeader = `token_RefArch=${cookieValue}`;

                const result = await cookie.parse(cookieHeader);
                expect(result).toBe(cookieValue);
            });

            it('should handle empty cookie value', async () => {
                const cookie = createCookie('token', {});
                const cookieHeader = 'token_RefArch=';

                const result = await cookie.parse(cookieHeader);
                expect(result).toBeNull();
            });

            it('should call getCookieNameWithSiteId with correct arguments', () => {
                createCookie('test-cookie', {});
                expect(getCookieNameWithSiteId).toHaveBeenCalledWith('test-cookie', undefined);
            });
        });

        describe('serialize', () => {
            it('should serialize a simple string value without encoding', async () => {
                const cookie = createCookie<string>('token', {});
                const value = 'abc123';

                const result = await cookie.serialize(value);
                expect(result).toContain(`token_RefArch=${value}`);
            });

            it('should serialize a number value as string', async () => {
                const cookie = createCookie<number>('count', {});
                const value = 42;

                const result = await cookie.serialize(value);
                expect(result).toContain(`count_RefArch=${value}`);
            });

            it('should handle empty string for cookie deletion', async () => {
                const cookie = createCookie('token', {});

                const result = await cookie.serialize('');
                expect(result).toContain('token_RefArch=');
            });

            it('should add Path attribute', async () => {
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/custom',
                    sameSite: 'lax',
                    secure: true,
                });

                const cookie = createCookie('token', {});
                const result = await cookie.serialize('value');

                expect(result).toContain('Path=/custom');
            });

            it('should add Domain attribute', async () => {
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/',
                    sameSite: 'lax',
                    secure: true,
                    domain: '.example.com',
                });

                const cookie = createCookie('token', {});
                const result = await cookie.serialize('value');

                expect(result).toContain('Domain=.example.com');
            });

            it('should add Expires attribute', async () => {
                const expiryDate = new Date('2025-12-31T23:59:59Z');
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/',
                    sameSite: 'lax',
                    secure: true,
                    expires: expiryDate,
                });

                const cookie = createCookie('token', {});
                const result = await cookie.serialize('value');

                expect(result).toContain(`Expires=${expiryDate.toUTCString()}`);
            });

            it('should add Max-Age attribute', async () => {
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/',
                    sameSite: 'lax',
                    secure: true,
                    maxAge: 3600,
                });

                const cookie = createCookie('token', {});
                const result = await cookie.serialize('value');

                expect(result).toContain('Max-Age=3600');
            });

            it('should add HttpOnly attribute', async () => {
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/',
                    sameSite: 'lax',
                    secure: true,
                    httpOnly: true,
                });

                const cookie = createCookie('token', {});
                const result = await cookie.serialize('value');

                expect(result).toContain('HttpOnly');
            });

            it('should add Secure attribute', async () => {
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/',
                    sameSite: 'lax',
                    secure: true,
                });

                const cookie = createCookie('token', {});
                const result = await cookie.serialize('value');

                expect(result).toContain('Secure');
            });

            it('should add SameSite=Lax attribute', async () => {
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/',
                    sameSite: 'lax',
                    secure: true,
                });

                const cookie = createCookie('token', {});
                const result = await cookie.serialize('value');

                expect(result).toContain('SameSite=Lax');
            });

            it('should add SameSite=Strict attribute', async () => {
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/',
                    sameSite: 'strict',
                    secure: true,
                });

                const cookie = createCookie('token', {});
                const result = await cookie.serialize('value');

                expect(result).toContain('SameSite=Strict');
            });

            it('should add SameSite=None attribute', async () => {
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/',
                    sameSite: 'none',
                    secure: true,
                });

                const cookie = createCookie('token', {});
                const result = await cookie.serialize('value');

                expect(result).toContain('SameSite=None');
            });

            it('should add Partitioned attribute', async () => {
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/',
                    sameSite: 'none',
                    secure: true,
                    partitioned: true,
                });

                const cookie = createCookie('token', {});
                const result = await cookie.serialize('value');

                expect(result).toContain('Partitioned');
            });

            it('should not add Partitioned attribute when false', async () => {
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/',
                    sameSite: 'lax',
                    secure: true,
                    partitioned: false,
                });

                const cookie = createCookie('token', {});
                const result = await cookie.serialize('value');

                expect(result).not.toContain('Partitioned');
            });

            it('should merge defaultConfig with serialize config', async () => {
                const defaultConfig = { httpOnly: true, path: '/api' };
                const serializeConfig = { maxAge: 3600 };

                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/api',
                    sameSite: 'lax',
                    secure: true,
                    httpOnly: true,
                    maxAge: 3600,
                });

                const cookie = createCookie('token', defaultConfig);
                await cookie.serialize('value', serializeConfig);

                // Verify getCookieConfig was called with merged config and context
                expect(getCookieConfig).toHaveBeenCalledWith({ ...defaultConfig, ...serializeConfig }, undefined);
            });

            it('should pass both defaultConfig and serialize config through getCookieConfig', async () => {
                const defaultConfig = { httpOnly: false };
                const serializeConfig = { maxAge: 3600, domain: '.hardcoded.com' };

                // Mock getCookieConfig to return with domain from appConfig (highest priority)
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/',
                    sameSite: 'lax',
                    secure: true,
                    httpOnly: false,
                    maxAge: 3600,
                    domain: '.example.com', // From appConfig, overrides .hardcoded.com
                });

                const cookie = createCookie('token', defaultConfig);
                const result = await cookie.serialize('value', serializeConfig);

                // Verify appConfig domain takes precedence
                expect(result).toContain('Domain=.example.com');
                expect(result).not.toContain('Domain=.hardcoded.com');

                // Verify both configs were passed
                expect(getCookieConfig).toHaveBeenCalledWith(
                    { httpOnly: false, maxAge: 3600, domain: '.hardcoded.com' },
                    undefined
                );
            });

            it('should serialize config override defaultConfig', async () => {
                const defaultConfig = { path: '/default' };
                const serializeConfig = { path: '/override' };

                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/override',
                    sameSite: 'lax',
                    secure: true,
                });

                const cookie = createCookie('token', defaultConfig);
                const result = await cookie.serialize('value', serializeConfig);

                expect(result).toContain('Path=/override');
                expect(result).not.toContain('Path=/default');
            });

            it('should handle all attributes together', async () => {
                const expiryDate = new Date('2025-12-31T23:59:59Z');
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/api',
                    sameSite: 'strict',
                    secure: true,
                    domain: '.example.com',
                    expires: expiryDate,
                    maxAge: 3600,
                    httpOnly: true,
                    partitioned: true,
                });

                const cookie = createCookie('token', {});
                const result = await cookie.serialize('value');

                expect(result).toContain('token_RefArch=');
                expect(result).toContain('Domain=.example.com');
                expect(result).toContain('Path=/api');
                expect(result).toContain(`Expires=${expiryDate.toUTCString()}`);
                expect(result).toContain('Max-Age=3600');
                expect(result).toContain('HttpOnly');
                expect(result).toContain('Secure');
                expect(result).toContain('SameSite=Strict');
                expect(result).toContain('Partitioned');
            });

            it('should format Set-Cookie header correctly', async () => {
                vi.mocked(getCookieConfig).mockReturnValue({
                    path: '/',
                    sameSite: 'lax',
                    secure: true,
                    httpOnly: true,
                });

                const cookie = createCookie<string>('token', {});
                const result = await cookie.serialize('test-value');

                // Should be in format: name=value; attribute1; attribute2; ...
                const parts = result.split('; ');
                expect(parts[0]).toMatch(/^token_RefArch=/);
                expect(parts).toContain('Path=/');
                expect(parts).toContain('HttpOnly');
                expect(parts).toContain('Secure');
                expect(parts).toContain('SameSite=Lax');
            });
        });

        describe('namespacing', () => {
            it('should namespace cookie name on creation', () => {
                createCookie('my-cookie', {});

                expect(getCookieNameWithSiteId).toHaveBeenCalledWith('my-cookie', undefined);
            });

            it('should use namespaced name consistently for parse and serialize', async () => {
                const cookie = createCookie('token', {});

                // Parse should look for namespaced name
                await cookie.parse('token_RefArch=value');

                // Serialize should use namespaced name
                const result = await cookie.serialize('value');
                expect(result).toContain('token_RefArch=');
            });
        });

        describe('type safety', () => {
            it('should maintain type safety for string values', async () => {
                const cookie = createCookie<string>('token', {});
                const value = 'test-token';

                const serialized = await cookie.serialize(value);
                expect(serialized).toContain(value);

                const cookieHeader = `token_RefArch=${value}`;
                const parsed = await cookie.parse(cookieHeader);
                expect(parsed).toBe(value);
            });
        });
    });

    describe('parseAllCookies', () => {
        it('should return empty object for null cookie header', () => {
            const result = parseAllCookies(null);
            expect(result).toEqual({});
        });

        it('should return empty object for empty cookie header', () => {
            const result = parseAllCookies('');
            expect(result).toEqual({});
        });

        it('should parse a single cookie', () => {
            const result = parseAllCookies('token=abc123');
            expect(result).toEqual({ token: 'abc123' });
        });

        it('should parse multiple cookies', () => {
            const result = parseAllCookies('token=abc123; user=john; count=42');
            expect(result).toEqual({
                token: 'abc123',
                user: 'john',
                count: '42',
            });
        });

        it('should handle cookie values with equals sign', () => {
            const result = parseAllCookies('token=base64==; other=value');
            expect(result).toEqual({
                token: 'base64==',
                other: 'value',
            });
        });

        it('should trim cookie parts but preserve spaces in keys and values', () => {
            const result = parseAllCookies('token=abc123; user=john');
            expect(result).toEqual({
                token: 'abc123',
                user: 'john',
            });
        });

        it('should ignore empty cookie parts', () => {
            const result = parseAllCookies('token=abc123;; ;user=john');
            expect(result).toEqual({
                token: 'abc123',
                user: 'john',
            });
        });
    });
});
