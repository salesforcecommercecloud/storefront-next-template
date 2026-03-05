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
import { createAuthHelpers } from './index';
import type { AuthConfig, TokenResponse } from './types';

// Content-Type header constant (matches the one in index.ts)
const FORM_URLENCODED_HEADER = { 'Content-Type': 'application/x-www-form-urlencoded' };

// Mock the utils module
vi.mock('./utils', () => ({
    createCodeVerifier: vi.fn(() => 'mock-code-verifier-123'),
    generateCodeChallenge: vi.fn(() => Promise.resolve('mock-code-challenge-456')),
    getCodeAndUsidFromUrl: vi.fn((url: string) => {
        const urlObj = new URL(url);
        return {
            code: urlObj.searchParams.get('code') || '',
            usid: urlObj.searchParams.get('usid') || '',
        };
    }),
    createBasicAuthHeader: vi.fn((clientId: string, secret: string) => `Basic ${btoa(`${clientId}:${secret}`)}`),
    extractCookieFromResponse: vi.fn((response: Response, cookieName: string) => {
        const setCookie = response.headers.get('set-cookie');
        if (!setCookie) return undefined;
        const regex = new RegExp(`${cookieName}=([^;]+)`);
        const match = setCookie.match(regex);
        return match?.[1];
    }),
}));

describe('createAuthHelpers', () => {
    const mockTokenResponse: TokenResponse = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        id_token: 'mock-id-token',
        expires_in: 1800,
        refresh_token_expires_in: 2592000,
        token_type: 'Bearer',
        usid: 'mock-usid',
        customer_id: 'mock-customer-id',
        enc_user_id: 'mock-enc-user-id',
        idp_access_token: 'mock-idp-access-token',
    };

    const mockShopperLoginClient = {
        getAccessToken: vi.fn(),
        authorizeCustomer: vi.fn(),
        authenticateCustomer: vi.fn(),
        logoutCustomer: vi.fn(),
        authorizePasswordlessCustomer: vi.fn(),
        getPasswordLessAccessToken: vi.fn(),
        getPasswordResetToken: vi.fn(),
        resetPassword: vi.fn(),
    };

    const baseConfig: AuthConfig = {
        shopperLoginClient: mockShopperLoginClient as unknown as AuthConfig['shopperLoginClient'],
        clientId: 'test-client-id',
        redirectUri: 'https://example.com/callback',
        organizationId: 'f_ecom_test_prd',
        siteId: 'RefArch',
        baseUrl: 'https://test.api.commercecloud.salesforce.com',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loginAsGuest', () => {
        describe('with private client (clientSecret)', () => {
            it('should use client_credentials grant type', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.getAccessToken.mockResolvedValue({
                    data: mockTokenResponse,
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                const result = await auth.loginAsGuest();

                expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith({
                    params: {
                        header: {
                            Authorization: expect.stringContaining('Basic'),
                        },
                    },
                    headers: FORM_URLENCODED_HEADER,
                    body: {
                        grant_type: 'client_credentials',
                        channel_id: 'RefArch',
                    },
                });
                expect(result).toEqual(mockTokenResponse);
            });

            it('should pass usid when provided', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.getAccessToken.mockResolvedValue({
                    data: mockTokenResponse,
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.loginAsGuest({ usid: 'existing-usid' });

                expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith(
                    expect.objectContaining({
                        body: expect.objectContaining({
                            usid: 'existing-usid',
                        }),
                    })
                );
            });

            it('should pass dnt when provided', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.getAccessToken.mockResolvedValue({
                    data: mockTokenResponse,
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.loginAsGuest({ dnt: true });

                expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith(
                    expect.objectContaining({
                        body: expect.objectContaining({
                            dnt: 'true',
                        }),
                    })
                );
            });
        });

        describe('with public client (no clientSecret)', () => {
            it('should use PKCE flow with authorization_code_pkce grant', async () => {
                const redirectUrl = 'https://example.com/callback?code=auth-code-123&usid=returned-usid';

                mockShopperLoginClient.authorizeCustomer.mockResolvedValue({
                    data: redirectUrl,
                    response: {
                        headers: new Headers({ location: redirectUrl }),
                    },
                });

                mockShopperLoginClient.getAccessToken.mockResolvedValue({
                    data: mockTokenResponse,
                    response: new Response(),
                });

                const auth = createAuthHelpers(baseConfig);
                const result = await auth.loginAsGuest();

                // Should call authorizeCustomer with guest hint and redirect: 'manual'
                expect(mockShopperLoginClient.authorizeCustomer).toHaveBeenCalledWith({
                    params: {
                        query: {
                            client_id: 'test-client-id',
                            channel_id: 'RefArch',
                            redirect_uri: 'https://example.com/callback',
                            response_type: 'code',
                            hint: 'guest',
                            code_challenge: 'mock-code-challenge-456',
                        },
                    },
                    redirect: 'manual',
                });

                // Should exchange code for token
                expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith({
                    params: {},
                    headers: FORM_URLENCODED_HEADER,
                    body: {
                        grant_type: 'authorization_code_pkce',
                        client_id: 'test-client-id',
                        channel_id: 'RefArch',
                        code: 'auth-code-123',
                        code_verifier: 'mock-code-verifier-123',
                        redirect_uri: 'https://example.com/callback',
                        usid: 'returned-usid',
                    },
                });

                expect(result).toEqual(mockTokenResponse);
            });

            it('should throw error if no code is returned', async () => {
                mockShopperLoginClient.authorizeCustomer.mockResolvedValue({
                    data: '',
                    response: {
                        headers: new Headers({
                            location: 'https://example.com/callback?error=access_denied',
                        }),
                    },
                });

                const auth = createAuthHelpers(baseConfig);

                await expect(auth.loginAsGuest()).rejects.toThrow('Failed to get authorization code from guest login');
            });
        });
    });

    describe('loginWithCredentials', () => {
        it('should authenticate with username and password', async () => {
            const redirectUrl = 'https://example.com/callback?code=auth-code-123&usid=returned-usid';

            mockShopperLoginClient.authenticateCustomer.mockResolvedValue({
                data: redirectUrl,
                response: {
                    headers: new Headers({ location: redirectUrl }),
                },
            });

            mockShopperLoginClient.getAccessToken.mockResolvedValue({
                data: mockTokenResponse,
                response: new Response(),
            });

            const auth = createAuthHelpers(baseConfig);
            const result = await auth.loginWithCredentials({
                username: 'test@example.com',
                password: 'password123',
            });

            // Should call authenticateCustomer with:
            // - Authorization in params.header (OpenAPI-defined header parameter)
            // - Content-Type in headers (request-level HTTP header)
            // - redirect: 'manual' to prevent fetch from following redirects
            expect(mockShopperLoginClient.authenticateCustomer).toHaveBeenCalledWith({
                params: {
                    header: {
                        Authorization: expect.stringContaining('Basic'),
                    },
                },
                headers: FORM_URLENCODED_HEADER,
                body: {
                    client_id: 'test-client-id',
                    channel_id: 'RefArch',
                    redirect_uri: 'https://example.com/callback',
                    response_type: 'code',
                    code_challenge: 'mock-code-challenge-456',
                },
                redirect: 'manual',
            });

            expect(result).toEqual(mockTokenResponse);
        });

        it('should use private client auth when clientSecret is provided', async () => {
            const config: AuthConfig = {
                ...baseConfig,
                clientSecret: 'test-secret',
            };

            const redirectUrl = 'https://example.com/callback?code=auth-code-123&usid=returned-usid';

            mockShopperLoginClient.authenticateCustomer.mockResolvedValue({
                data: redirectUrl,
                response: {
                    headers: new Headers({ location: redirectUrl }),
                },
            });

            mockShopperLoginClient.getAccessToken.mockResolvedValue({
                data: mockTokenResponse,
                response: new Response(),
            });

            const auth = createAuthHelpers(config);
            await auth.loginWithCredentials({
                username: 'test@example.com',
                password: 'password123',
            });

            // Should include client secret auth header for token exchange
            expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith(
                expect.objectContaining({
                    params: {
                        header: {
                            Authorization: expect.stringContaining('Basic'),
                        },
                    },
                    headers: FORM_URLENCODED_HEADER,
                })
            );
        });

        it('should throw error if no code is returned', async () => {
            mockShopperLoginClient.authenticateCustomer.mockResolvedValue({
                data: '',
                response: {
                    headers: new Headers({
                        location: 'https://example.com/callback?error=invalid_credentials',
                    }),
                },
            });

            const auth = createAuthHelpers(baseConfig);

            await expect(
                auth.loginWithCredentials({
                    username: 'test@example.com',
                    password: 'wrong-password',
                })
            ).rejects.toThrow('Failed to get authorization code from credentials login');
        });
    });

    describe('refreshToken', () => {
        it('should refresh token with public client', async () => {
            mockShopperLoginClient.getAccessToken.mockResolvedValue({
                data: mockTokenResponse,
                response: new Response(),
            });

            const auth = createAuthHelpers(baseConfig);
            const result = await auth.refreshToken({
                refreshToken: 'existing-refresh-token',
            });

            expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith({
                params: {},
                headers: FORM_URLENCODED_HEADER,
                body: {
                    grant_type: 'refresh_token',
                    refresh_token: 'existing-refresh-token',
                    client_id: 'test-client-id',
                    channel_id: 'RefArch',
                },
            });
            expect(result).toEqual(mockTokenResponse);
        });

        it('should refresh token with private client', async () => {
            const config: AuthConfig = {
                ...baseConfig,
                clientSecret: 'test-secret',
            };

            mockShopperLoginClient.getAccessToken.mockResolvedValue({
                data: mockTokenResponse,
                response: new Response(),
            });

            const auth = createAuthHelpers(config);
            await auth.refreshToken({
                refreshToken: 'existing-refresh-token',
            });

            expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith({
                params: {
                    header: {
                        Authorization: expect.stringContaining('Basic'),
                    },
                },
                headers: FORM_URLENCODED_HEADER,
                body: {
                    grant_type: 'refresh_token',
                    refresh_token: 'existing-refresh-token',
                    client_id: 'test-client-id',
                    channel_id: 'RefArch',
                },
            });
        });

        it('should pass dnt when provided', async () => {
            mockShopperLoginClient.getAccessToken.mockResolvedValue({
                data: mockTokenResponse,
                response: new Response(),
            });

            const auth = createAuthHelpers(baseConfig);
            await auth.refreshToken({
                refreshToken: 'existing-refresh-token',
                dnt: true,
            });

            expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: expect.objectContaining({
                        dnt: 'true',
                    }),
                })
            );
        });
    });

    describe('logout', () => {
        it('should logout customer and revoke tokens', async () => {
            mockShopperLoginClient.logoutCustomer.mockResolvedValue({
                data: mockTokenResponse,
                response: new Response(),
            });

            const auth = createAuthHelpers(baseConfig);
            const result = await auth.logout({
                accessToken: 'current-access-token',
                refreshToken: 'current-refresh-token',
            });

            expect(mockShopperLoginClient.logoutCustomer).toHaveBeenCalledWith({
                params: {
                    header: {
                        Authorization: 'Bearer current-access-token',
                    },
                    query: {
                        client_id: 'test-client-id',
                        channel_id: 'RefArch',
                        refresh_token: 'current-refresh-token',
                    },
                },
            });
            expect(result).toEqual(mockTokenResponse);
        });
    });

    describe('social', () => {
        describe('getAuthorizationUrl', () => {
            it('should generate authorization URL with correct parameters', async () => {
                const auth = createAuthHelpers(baseConfig);
                const result = await auth.social.getAuthorizationUrl({
                    hint: 'google',
                });

                expect(result.url).toContain('shopper/auth/v1/organizations/f_ecom_test_prd/oauth2/authorize');
                expect(result.url).toContain('client_id=test-client-id');
                expect(result.url).toContain('channel_id=RefArch');
                expect(result.url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
                expect(result.url).toContain('response_type=code');
                expect(result.url).toContain('hint=google');
                expect(result.url).toContain('code_challenge=mock-code-challenge-456');
            });

            it('should return code verifier for PKCE flow', async () => {
                const auth = createAuthHelpers(baseConfig);
                const result = await auth.social.getAuthorizationUrl({
                    hint: 'facebook',
                });

                expect(result.codeVerifier).toBe('mock-code-verifier-123');
            });

            it('should use override redirectUri when provided', async () => {
                const auth = createAuthHelpers(baseConfig);
                const result = await auth.social.getAuthorizationUrl({
                    hint: 'apple',
                    redirectUri: 'https://custom.com/social-callback',
                });

                expect(result.url).toContain('redirect_uri=https%3A%2F%2Fcustom.com%2Fsocial-callback');
            });

            it('should include usid when provided', async () => {
                const auth = createAuthHelpers(baseConfig);
                const result = await auth.social.getAuthorizationUrl({
                    hint: 'google',
                    usid: 'existing-session-usid',
                });

                expect(result.url).toContain('usid=existing-session-usid');
            });

            it('should normalize baseUrl with trailing slash', async () => {
                const configWithTrailingSlash: AuthConfig = {
                    ...baseConfig,
                    baseUrl: 'https://test.api.commercecloud.salesforce.com/',
                };

                const auth = createAuthHelpers(configWithTrailingSlash);
                const result = await auth.social.getAuthorizationUrl({
                    hint: 'google',
                });

                // Should not have double slashes
                expect(result.url).not.toContain('//shopper');
                expect(result.url).toContain('salesforce.com/shopper');
            });
        });

        describe('exchangeCode', () => {
            it('should exchange code for tokens with public client', async () => {
                mockShopperLoginClient.getAccessToken.mockResolvedValue({
                    data: mockTokenResponse,
                    response: new Response(),
                });

                const auth = createAuthHelpers(baseConfig);
                const result = await auth.social.exchangeCode({
                    code: 'social-auth-code',
                    codeVerifier: 'stored-code-verifier',
                    redirectUri: 'https://example.com/social-callback',
                });

                expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith({
                    params: {},
                    headers: FORM_URLENCODED_HEADER,
                    body: {
                        grant_type: 'authorization_code_pkce',
                        client_id: 'test-client-id',
                        channel_id: 'RefArch',
                        code: 'social-auth-code',
                        code_verifier: 'stored-code-verifier',
                        redirect_uri: 'https://example.com/social-callback',
                    },
                });
                expect(result).toEqual(mockTokenResponse);
            });

            it('should exchange code for tokens with private client', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.getAccessToken.mockResolvedValue({
                    data: mockTokenResponse,
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.social.exchangeCode({
                    code: 'social-auth-code',
                    codeVerifier: 'stored-code-verifier',
                    redirectUri: 'https://example.com/social-callback',
                });

                expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith({
                    params: {
                        header: {
                            Authorization: expect.stringContaining('Basic'),
                        },
                    },
                    headers: FORM_URLENCODED_HEADER,
                    body: expect.objectContaining({
                        grant_type: 'authorization_code_pkce',
                    }),
                });
            });

            it('should include usid when provided', async () => {
                mockShopperLoginClient.getAccessToken.mockResolvedValue({
                    data: mockTokenResponse,
                    response: new Response(),
                });

                const auth = createAuthHelpers(baseConfig);
                await auth.social.exchangeCode({
                    code: 'social-auth-code',
                    codeVerifier: 'stored-code-verifier',
                    redirectUri: 'https://example.com/social-callback',
                    usid: 'session-usid',
                });

                expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith(
                    expect.objectContaining({
                        body: expect.objectContaining({
                            usid: 'session-usid',
                        }),
                    })
                );
            });

            it('should include dnt when provided', async () => {
                mockShopperLoginClient.getAccessToken.mockResolvedValue({
                    data: mockTokenResponse,
                    response: new Response(),
                });

                const auth = createAuthHelpers(baseConfig);
                await auth.social.exchangeCode({
                    code: 'social-auth-code',
                    codeVerifier: 'stored-code-verifier',
                    redirectUri: 'https://example.com/social-callback',
                    dnt: true,
                });

                expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith(
                    expect.objectContaining({
                        body: expect.objectContaining({
                            dnt: 'true',
                        }),
                    })
                );
            });
        });
    });

    describe('passwordless', () => {
        describe('authorize', () => {
            it('should initiate passwordless login with default callback mode', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.authorizePasswordlessCustomer.mockResolvedValue({
                    data: { status: 'ok' },
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.passwordless.authorize({
                    userId: 'user@example.com',
                    callbackUri: 'https://example.com/passwordless-callback',
                    mode: 'callback',
                });

                expect(mockShopperLoginClient.authorizePasswordlessCustomer).toHaveBeenCalledWith({
                    params: {
                        header: {
                            Authorization: expect.stringContaining('Basic'),
                        },
                    },
                    headers: FORM_URLENCODED_HEADER,
                    body: {
                        user_id: 'user@example.com',
                        mode: 'callback',
                        channel_id: 'RefArch',
                        callback_uri: 'https://example.com/passwordless-callback',
                    },
                });
            });

            it('should pass mode=sms when specified', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.authorizePasswordlessCustomer.mockResolvedValue({
                    data: { status: 'ok' },
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.passwordless.authorize({
                    userId: '+1234567890',
                    mode: 'sms',
                });

                expect(mockShopperLoginClient.authorizePasswordlessCustomer).toHaveBeenCalledWith(
                    expect.objectContaining({
                        body: expect.objectContaining({
                            mode: 'sms',
                        }),
                    })
                );
            });

            it('should throw error when clientSecret is not provided', async () => {
                const auth = createAuthHelpers(baseConfig);

                await expect(
                    auth.passwordless.authorize({
                        userId: 'user@example.com',
                        mode: 'email',
                    })
                ).rejects.toThrow('Client secret is required for passwordless login');
            });

            it('should include usid when provided', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.authorizePasswordlessCustomer.mockResolvedValue({
                    data: { status: 'ok' },
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.passwordless.authorize({
                    userId: 'user@example.com',
                    usid: 'session-usid',
                    mode: 'email',
                });

                expect(mockShopperLoginClient.authorizePasswordlessCustomer).toHaveBeenCalledWith(
                    expect.objectContaining({
                        body: expect.objectContaining({
                            usid: 'session-usid',
                        }),
                    })
                );
            });

            it('should include locale when provided', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.authorizePasswordlessCustomer.mockResolvedValue({
                    data: { status: 'ok' },
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.passwordless.authorize({
                    userId: 'user@example.com',
                    mode: 'email',
                    locale: 'en-US',
                });

                expect(mockShopperLoginClient.authorizePasswordlessCustomer).toHaveBeenCalledWith(
                    expect.objectContaining({
                        body: expect.objectContaining({
                            locale: 'en-US',
                        }),
                    })
                );
            });

            it('should include register_customer query and email/lastName in body when registerCustomer is true', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.authorizePasswordlessCustomer.mockResolvedValue({
                    data: { status: 'ok' },
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.passwordless.authorize({
                    userId: 'user@example.com',
                    registerCustomer: true,
                    email: 'user@example.com',
                    lastName: 'Doe',
                    mode: 'email',
                });

                expect(mockShopperLoginClient.authorizePasswordlessCustomer).toHaveBeenCalledWith({
                    params: {
                        header: {
                            Authorization: expect.stringContaining('Basic'),
                        },
                        query: { register_customer: 'true' },
                    },
                    headers: FORM_URLENCODED_HEADER,
                    body: expect.objectContaining({
                        user_id: 'user@example.com',
                        mode: 'email',
                        channel_id: 'RefArch',
                        email: 'user@example.com',
                        last_name: 'Doe',
                    }),
                });
            });

            it('should not include register_customer query when registerCustomer is false', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.authorizePasswordlessCustomer.mockResolvedValue({
                    data: { status: 'ok' },
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.passwordless.authorize({
                    userId: 'user@example.com',
                    registerCustomer: false,
                    mode: 'email',
                });

                const call = mockShopperLoginClient.authorizePasswordlessCustomer.mock.calls[0][0];
                expect(call.params?.query).toBeUndefined();
            });
        });

        describe('exchangeToken', () => {
            it('should exchange passwordless token for access tokens', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.getPasswordLessAccessToken.mockResolvedValue({
                    data: mockTokenResponse,
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.passwordless.exchangeToken({
                    pwdlessLoginToken: 'passwordless-token-from-link',
                });

                expect(mockShopperLoginClient.getPasswordLessAccessToken).toHaveBeenCalledWith({
                    params: {
                        header: {
                            Authorization: expect.stringContaining('Basic'),
                        },
                    },
                    headers: FORM_URLENCODED_HEADER,
                    body: {
                        grant_type: 'client_credentials',
                        hint: 'pwdless_login',
                        pwdless_login_token: 'passwordless-token-from-link',
                        code_verifier: 'mock-code-verifier-123',
                    },
                });
            });

            it('should throw error when clientSecret is not provided', async () => {
                const auth = createAuthHelpers(baseConfig);

                await expect(
                    auth.passwordless.exchangeToken({
                        pwdlessLoginToken: 'some-token',
                    })
                ).rejects.toThrow('Client secret is required for passwordless token exchange');
            });

            it('should include usid when provided', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.getPasswordLessAccessToken.mockResolvedValue({
                    data: mockTokenResponse,
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.passwordless.exchangeToken({
                    pwdlessLoginToken: 'passwordless-token',
                    usid: 'session-usid',
                });

                expect(mockShopperLoginClient.getPasswordLessAccessToken).toHaveBeenCalledWith(
                    expect.objectContaining({
                        body: expect.objectContaining({
                            usid: 'session-usid',
                        }),
                    })
                );
            });

            it('should include dnt when provided', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.getPasswordLessAccessToken.mockResolvedValue({
                    data: mockTokenResponse,
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.passwordless.exchangeToken({
                    pwdlessLoginToken: 'passwordless-token',
                    dnt: true,
                });

                expect(mockShopperLoginClient.getPasswordLessAccessToken).toHaveBeenCalledWith(
                    expect.objectContaining({
                        body: expect.objectContaining({
                            dnt: 'true',
                        }),
                    })
                );
            });
        });
    });

    describe('password', () => {
        describe('requestReset', () => {
            it('should request password reset with public client', async () => {
                mockShopperLoginClient.getPasswordResetToken.mockResolvedValue({
                    data: { status: 'ok' },
                    response: new Response(),
                });

                const auth = createAuthHelpers(baseConfig);
                await auth.password.requestReset({
                    userId: 'user@example.com',
                    callbackUri: 'https://example.com/reset-password',
                    mode: 'callback',
                });

                expect(mockShopperLoginClient.getPasswordResetToken).toHaveBeenCalledWith({
                    params: {},
                    headers: FORM_URLENCODED_HEADER,
                    body: {
                        user_id: 'user@example.com',
                        mode: 'callback',
                        channel_id: 'RefArch',
                        client_id: 'test-client-id',
                        callback_uri: 'https://example.com/reset-password',
                        hint: 'cross_device',
                    },
                });
            });

            it('should request password reset with private client', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.getPasswordResetToken.mockResolvedValue({
                    data: { status: 'ok' },
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.password.requestReset({
                    userId: 'user@example.com',
                    callbackUri: 'https://example.com/reset-password',
                    mode: 'callback',
                });

                expect(mockShopperLoginClient.getPasswordResetToken).toHaveBeenCalledWith({
                    params: {},
                    headers: expect.objectContaining({
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Authorization: expect.stringContaining('Basic'),
                    }),
                    body: expect.objectContaining({
                        user_id: 'user@example.com',
                    }),
                });
            });
        });

        describe('reset', () => {
            it('should reset password with public client', async () => {
                mockShopperLoginClient.resetPassword.mockResolvedValue({
                    data: mockTokenResponse,
                    response: new Response(),
                });

                const auth = createAuthHelpers(baseConfig);
                await auth.password.reset({
                    userId: 'user@example.com',
                    token: 'password-reset-token',
                    newPassword: 'newSecurePassword123',
                });

                expect(mockShopperLoginClient.resetPassword).toHaveBeenCalledWith({
                    params: {},
                    headers: FORM_URLENCODED_HEADER,
                    body: {
                        client_id: 'test-client-id',
                        user_id: 'user@example.com',
                        pwd_action_token: 'password-reset-token',
                        new_password: 'newSecurePassword123',
                        channel_id: 'RefArch',
                    },
                });
            });

            it('should reset password with private client', async () => {
                const config: AuthConfig = {
                    ...baseConfig,
                    clientSecret: 'test-secret',
                };

                mockShopperLoginClient.resetPassword.mockResolvedValue({
                    data: mockTokenResponse,
                    response: new Response(),
                });

                const auth = createAuthHelpers(config);
                await auth.password.reset({
                    userId: 'user@example.com',
                    token: 'password-reset-token',
                    newPassword: 'newSecurePassword123',
                });

                expect(mockShopperLoginClient.resetPassword).toHaveBeenCalledWith({
                    params: {
                        header: {
                            Authorization: expect.stringContaining('Basic'),
                        },
                    },
                    headers: FORM_URLENCODED_HEADER,
                    body: expect.objectContaining({
                        user_id: 'user@example.com',
                        pwd_action_token: 'password-reset-token',
                        new_password: 'newSecurePassword123',
                    }),
                });
            });
        });
    });

    describe('workspace guest login (proxyHost)', () => {
        it('should use client_credentials grant without auth header when proxyHost is set', async () => {
            const config: AuthConfig = {
                ...baseConfig,
                organizationId: 'zzzz_s01',
                proxyHost: 'https://scw:25010',
            };

            mockShopperLoginClient.getAccessToken.mockResolvedValue({
                data: mockTokenResponse,
                response: new Response(),
            });

            const auth = createAuthHelpers(config);
            const result = await auth.loginAsGuest();

            // Should use SDK client with client_credentials, no Authorization header
            expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith({
                params: {},
                headers: FORM_URLENCODED_HEADER,
                body: {
                    grant_type: 'client_credentials',
                    channel_id: 'RefArch',
                },
            });
            expect(result).toEqual(mockTokenResponse);
        });

        it('should include auth header when both proxyHost and clientSecret are set', async () => {
            const config: AuthConfig = {
                ...baseConfig,
                proxyHost: 'https://scw:25010',
                clientSecret: 'test-secret',
            };

            mockShopperLoginClient.getAccessToken.mockResolvedValue({
                data: mockTokenResponse,
                response: new Response(),
            });

            const auth = createAuthHelpers(config);
            await auth.loginAsGuest();

            expect(mockShopperLoginClient.getAccessToken).toHaveBeenCalledWith({
                params: {
                    header: {
                        Authorization: expect.stringContaining('Basic'),
                    },
                },
                headers: FORM_URLENCODED_HEADER,
                body: {
                    grant_type: 'client_credentials',
                    channel_id: 'RefArch',
                },
            });
        });

        it('should not use workspace flow when proxyHost is not set', async () => {
            // Without proxyHost, should use normal loginGuestPublic flow (PKCE)
            mockShopperLoginClient.authorizeCustomer.mockResolvedValue({
                response: new Response(null, {
                    status: 303,
                    headers: { location: 'https://example.com/callback?code=auth-code&usid=test-usid' },
                }),
            });
            mockShopperLoginClient.getAccessToken.mockResolvedValue({
                data: mockTokenResponse,
                response: new Response(),
            });

            const auth = createAuthHelpers(baseConfig);
            const result = await auth.loginAsGuest();

            expect(result.access_token).toBe('mock-access-token');
            expect(mockShopperLoginClient.authorizeCustomer).toHaveBeenCalled();
        });
    });
});
