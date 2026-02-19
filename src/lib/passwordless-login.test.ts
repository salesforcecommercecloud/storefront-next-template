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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { redirect } from 'react-router';
import { decodeJwt, createRemoteJWKSet, jwtVerify } from 'jose';
import {
    handlePasswordlessCallback,
    handlePasswordlessLanding,
    resetMarketingCloudTokenCache,
} from './passwordless-login';
import { updateAuth, getPasswordLessAccessToken } from '@/middlewares/auth.server';
import { mergeBasket } from '@/lib/api/basket';
import { getAppOrigin, getErrorMessage } from '@/lib/utils';
import { getTranslation } from '@/lib/i18next';

// Hoist dependencies for use in vi.mock (avoids async imports which fail on Windows)
const { createContext: reactCreateContext, actualReactRouter } = vi.hoisted(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const reactRouter = require('react-router');
    return { createContext: React.createContext, actualReactRouter: reactRouter };
});

const { t } = getTranslation();
// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn();
vi.stubGlobal('crypto', { randomUUID: mockRandomUUID });

vi.mock('react-router', () => {
    return {
        ...actualReactRouter,
        createContext: reactCreateContext,
        redirect: vi.fn(),
    };
});

// Mock jose library
vi.mock('jose', () => ({
    decodeJwt: vi.fn(),
    createRemoteJWKSet: vi.fn(),
    jwtVerify: vi.fn(),
}));

// Mock auth middleware
vi.mock('@/middlewares/auth.server', () => ({
    updateAuth: vi.fn(),
    getPasswordLessAccessToken: vi.fn(),
}));

// Mock basket API
vi.mock('@/lib/api/basket', () => ({
    mergeBasket: vi.fn(),
}));

// Mock utility functions
vi.mock('@/lib/utils', () => ({
    getAppOrigin: vi.fn(),
    getErrorMessage: vi.fn(),
}));

// Mock config module
vi.mock('@/config', () => ({
    getConfig: vi.fn(() => ({
        commerce: {
            api: {
                organizationId: 'f_ecom_zzrf_001',
                clientId: 'c9c45bfd-0ed3-4aa2-9971-40f88962b836',
                shortCode: 'kv7kzm78',
                siteId: 'RefArchGlobal',
            },
            sites: [
                {
                    defaultSiteId: 'RefArchGlobal',
                    defaultLocale: 'en-US',
                    defaultCurrency: 'USD',
                    supportedLocales: [{ id: 'en-US', preferredCurrency: 'USD' }],
                    supportedCurrencies: ['USD'],
                    cookies: {},
                },
            ],
        },
        features: {
            passwordlessLogin: {
                enabled: true,
                callbackUri: '/passwordless-login-callback',
                landingUri: '/passwordless-login-landing',
            },
        },
    })),
}));

// Create mock context
const mockContext = {
    get: vi.fn(),
    set: vi.fn(),
} as any;

// Get mocked functions
const mockRedirect = vi.mocked(redirect);
const mockDecodeJwt = vi.mocked(decodeJwt);
const mockCreateRemoteJWKSet = vi.mocked(createRemoteJWKSet);
const mockJwtVerify = vi.mocked(jwtVerify);
const mockGetPasswordLessAccessToken = vi.mocked(getPasswordLessAccessToken);
const mockUpdateAuth = vi.mocked(updateAuth);
const mockMergeBasket = vi.mocked(mergeBasket);
const mockGetAppOrigin = vi.mocked(getAppOrigin);
const mockGetErrorMessage = vi.mocked(getErrorMessage);

const createMockHeaders = (slasCallbackToken?: string) => ({
    get: vi.fn((header: string) => {
        if (header === 'x-slas-callback-token') {
            return slasCallbackToken || null;
        }
        return null;
    }),
});

describe('passwordless-login', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Reset Marketing Cloud token cache to prevent test interference
        resetMarketingCloudTokenCache();

        // Properly stub environment variables instead of mutating process.env
        vi.stubEnv('MARKETING_CLOUD_CLIENT_ID', 'test-client-id');
        vi.stubEnv('MARKETING_CLOUD_CLIENT_SECRET', 'test-client-secret');
        vi.stubEnv('MARKETING_CLOUD_SUBDOMAIN', 'test-subdomain');
        vi.stubEnv('MARKETING_CLOUD_PASSWORDLESS_LOGIN_TEMPLATE', 'test-template-id');

        // Set up default mocks
        mockGetAppOrigin.mockReturnValue('https://example.com');
        mockRandomUUID.mockReturnValue('123456781234123412341234567');

        // Mock getErrorMessage to return error message string
        mockGetErrorMessage.mockImplementation((error) => {
            if (error instanceof Error) {
                return error.message;
            }
            return String(error);
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });

    describe('handlePasswordlessCallback', () => {
        describe('successful passwordless login callback', () => {
            it('should handle successful callback with valid token and email data', async () => {
                const mockSlasToken = 'eyJhbGciOiJSUzI1NiJ9.test.token';
                const mockRequest = {
                    url: 'https://example.com/passwordless-callback',
                    headers: createMockHeaders(mockSlasToken),
                    json: vi.fn().mockResolvedValue({
                        email_id: 'test@example.com',
                        token: 'magic-link-token',
                    }),
                } as any;

                // Mock JWT validation
                mockDecodeJwt.mockReturnValue({
                    iss: 'https://zzrf_001/anything',
                });
                mockCreateRemoteJWKSet.mockReturnValue({} as any);
                mockJwtVerify.mockResolvedValue({
                    payload: { iss: 'https://zzrf_001/anything', aud: 'test-audience' },
                } as any);

                // Mock successful Marketing Cloud API calls
                mockFetch
                    .mockResolvedValueOnce({
                        ok: true,
                        json: vi.fn().mockResolvedValue({
                            accessToken: 'mc-access-token',
                        }),
                    } as any)
                    .mockResolvedValueOnce({
                        ok: true,
                        json: vi.fn().mockResolvedValue({
                            messageKey: 'test-message-key',
                        }),
                    } as any);

                const result = await handlePasswordlessCallback({
                    request: mockRequest,
                    context: mockContext,
                    params: {},
                    unstable_pattern: {} as any,
                });

                expect(result).toEqual({
                    success: true,
                    data: { messageKey: 'test-message-key' },
                });

                // Verify JWT validation was called
                expect(mockDecodeJwt).toHaveBeenCalledWith(mockSlasToken);
                expect(mockJwtVerify).toHaveBeenCalled();

                // Verify Marketing Cloud API calls
                expect(mockFetch).toHaveBeenCalledTimes(2);
                expect(mockFetch).toHaveBeenNthCalledWith(
                    1,
                    'https://test-subdomain.auth.marketingcloudapis.com/v2/token',
                    expect.objectContaining({
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            grant_type: 'client_credentials',
                            client_id: 'test-client-id',
                            client_secret: 'test-client-secret',
                        }),
                    })
                );
            });

            it('should handle callback with redirect URL', async () => {
                const mockSlasToken = 'eyJhbGciOiJSUzI1NiJ9.test.token';
                const mockRequest = {
                    url: 'https://example.com/passwordless-callback?redirectUrl=%2Fdashboard',
                    headers: createMockHeaders(mockSlasToken),
                    json: vi.fn().mockResolvedValue({
                        email_id: 'test@example.com',
                        token: 'magic-link-token',
                    }),
                } as any;

                // Mock JWT validation
                mockDecodeJwt.mockReturnValue({
                    iss: 'https://zzrf_001/anything',
                });
                mockCreateRemoteJWKSet.mockReturnValue({} as any);
                mockJwtVerify.mockResolvedValue({
                    payload: { iss: 'https://zzrf_001/anything', aud: 'test-audience' },
                } as any);

                // Mock successful Marketing Cloud API calls
                mockFetch
                    .mockResolvedValueOnce({
                        ok: true,
                        json: vi.fn().mockResolvedValue({
                            accessToken: 'mc-access-token',
                        }),
                    } as any)
                    .mockResolvedValueOnce({
                        ok: true,
                        json: vi.fn().mockResolvedValue({
                            messageKey: 'test-message-key',
                        }),
                    } as any);

                const result = await handlePasswordlessCallback({
                    request: mockRequest,
                    context: mockContext,
                    params: {},
                    unstable_pattern: {} as any,
                });

                expect(result.success).toBe(true);

                // Verify the magic link includes the redirect URL - check the last call since token might be cached
                const emailSendCall = mockFetch.mock.calls.find((call) => call[0].includes('/email/messages/'));
                expect(emailSendCall).toBeDefined();
                if (emailSendCall) {
                    expect(emailSendCall[1]).toEqual(
                        expect.objectContaining({
                            body: expect.stringContaining('redirectUrl=%2Fdashboard'),
                        })
                    );
                }
            });
        });

        describe('error handling', () => {
            it('should return error when SLAS callback token is missing', async () => {
                const mockRequest = {
                    url: 'https://example.com/passwordless-callback',
                    headers: createMockHeaders(), // No token
                    json: vi.fn(),
                } as any;

                const result = await handlePasswordlessCallback({
                    request: mockRequest,
                    context: mockContext,
                    params: {},
                    unstable_pattern: {} as any,
                });

                expect(result).toEqual({
                    success: false,
                    error: t('errors:passwordless.missingCallbackToken'),
                });
            });

            it('should return error when email data is missing', async () => {
                const mockSlasToken = 'eyJhbGciOiJSUzI1NiJ9.test.token';
                const mockRequest = {
                    url: 'https://example.com/passwordless-callback',
                    headers: createMockHeaders(mockSlasToken),
                    json: vi.fn().mockResolvedValue({}), // Missing email_id and token
                } as any;

                // Mock JWT validation
                mockDecodeJwt.mockReturnValue({
                    iss: 'https://zzrf_001/anything',
                });
                mockCreateRemoteJWKSet.mockReturnValue({} as any);
                mockJwtVerify.mockResolvedValue({
                    payload: { iss: 'https://zzrf_001/anything', aud: 'test-audience' },
                } as any);

                const result = await handlePasswordlessCallback({
                    request: mockRequest,
                    context: mockContext,
                    params: {},
                    unstable_pattern: {} as any,
                });

                expect(result).toEqual({
                    success: false,
                    error: t('errors:passwordless.missingRequiredFields'),
                });
            });

            it('should handle JWT validation errors', async () => {
                const mockSlasToken = 'invalid-token';
                const mockRequest = {
                    url: 'https://example.com/passwordless-callback',
                    headers: createMockHeaders(mockSlasToken),
                    json: vi.fn().mockResolvedValue({
                        email_id: 'test@example.com',
                        token: 'magic-link-token',
                    }),
                } as any;

                // Mock JWT validation failure
                mockDecodeJwt.mockImplementation(() => {
                    throw new Error('Invalid token format');
                });

                const result = await handlePasswordlessCallback({
                    request: mockRequest,
                    context: mockContext,
                    params: {},
                    unstable_pattern: {} as any,
                });

                expect(result.success).toBe(false);
                expect(result.error).toContain('Invalid token format');
            });
        });
    });

    describe('handlePasswordlessLanding', () => {
        describe('successful passwordless login landing', () => {
            it('should handle successful landing with valid token', async () => {
                const mockRequest = {
                    url: 'https://example.com/passwordless-landing?token=valid-token',
                } as any;

                const mockTokenResponse = {
                    access_token: 'access-token-123',
                    id_token: 'id-token-123',
                    refresh_token: 'refresh-token-456',
                    expires_in: 3600,
                    refresh_token_expires_in: 7200,
                    token_type: 'Bearer' as const,
                    usid: 'usid-123',
                    customer_id: 'customer-789',
                    enc_user_id: 'enc-user-id-123',
                    idp_access_token: 'idp-token-123',
                };

                mockGetPasswordLessAccessToken.mockResolvedValue(mockTokenResponse);
                mockMergeBasket.mockResolvedValue({} as any);
                mockRedirect.mockReturnValue('redirect-response' as any);

                const result = await handlePasswordlessLanding({
                    request: mockRequest,
                    context: mockContext,
                    params: {},
                    unstable_pattern: {} as any,
                });

                expect(mockGetPasswordLessAccessToken).toHaveBeenCalledWith(mockContext, 'valid-token');
                expect(mockUpdateAuth).toHaveBeenCalledWith(mockContext, mockTokenResponse);
                expect(mockUpdateAuth).toHaveBeenCalledWith(mockContext, expect.any(Function));
                expect(mockMergeBasket).toHaveBeenCalledWith(mockContext);
                expect(mockRedirect).toHaveBeenCalledWith('/account');
                expect(result).toBe('redirect-response');
            });

            it('should handle landing with redirect URL', async () => {
                const mockRequest = {
                    url: 'https://example.com/passwordless-landing?token=valid-token&redirectUrl=%2Fdashboard',
                } as any;

                const mockTokenResponse = {
                    access_token: 'access-token-123',
                    id_token: 'id-token-123',
                    refresh_token: 'refresh-token-456',
                    expires_in: 3600,
                    refresh_token_expires_in: 7200,
                    token_type: 'Bearer' as const,
                    usid: 'usid-123',
                    customer_id: 'customer-789',
                    enc_user_id: 'enc-user-id-123',
                    idp_access_token: 'idp-token-123',
                };

                mockGetPasswordLessAccessToken.mockResolvedValue(mockTokenResponse);
                mockMergeBasket.mockResolvedValue({} as any);
                mockRedirect.mockReturnValue('redirect-response' as any);

                const result = await handlePasswordlessLanding({
                    request: mockRequest,
                    context: mockContext,
                    params: {},
                    unstable_pattern: {} as any,
                });

                expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
                expect(result).toBe('redirect-response');
            });

            it('should continue even if basket merge fails', async () => {
                const mockRequest = {
                    url: 'https://example.com/passwordless-landing?token=valid-token',
                } as any;

                const mockTokenResponse = {
                    access_token: 'access-token-123',
                    id_token: 'id-token-123',
                    refresh_token: 'refresh-token-456',
                    expires_in: 3600,
                    refresh_token_expires_in: 7200,
                    token_type: 'Bearer' as const,
                    usid: 'usid-123',
                    customer_id: 'customer-789',
                    enc_user_id: 'enc-user-id-123',
                    idp_access_token: 'idp-token-123',
                };

                mockGetPasswordLessAccessToken.mockResolvedValue(mockTokenResponse);
                mockMergeBasket.mockRejectedValue(new Error('Basket merge failed'));
                mockRedirect.mockReturnValue('redirect-response' as any);

                // Mock console.error to avoid test output noise
                const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

                const result = await handlePasswordlessLanding({
                    request: mockRequest,
                    context: mockContext,
                    params: {},
                    unstable_pattern: {} as any,
                });

                expect(consoleSpy).toHaveBeenCalledWith(
                    '[Passwordless Login] Failed to merge basket:',
                    expect.any(Error)
                );
                expect(mockRedirect).toHaveBeenCalledWith('/account');
                expect(result).toBe('redirect-response');

                consoleSpy.mockRestore();
            });
        });

        describe('error handling', () => {
            it('should redirect to login when token is missing', async () => {
                const mockRequest = {
                    url: 'https://example.com/passwordless-landing', // No token
                } as any;

                mockRedirect.mockReturnValue('redirect-response' as any);

                const result = await handlePasswordlessLanding({
                    request: mockRequest,
                    context: mockContext,
                    params: {},
                    unstable_pattern: {} as any,
                });

                // Should redirect with error in URL parameter
                const errorMessage = t('errors:passwordless.missingToken');
                expect(mockRedirect).toHaveBeenCalledWith(`/login?error=${encodeURIComponent(errorMessage)}`);
                expect(result).toBe('redirect-response');
            });

            it('should handle token validation errors', async () => {
                const mockRequest = {
                    url: 'https://example.com/passwordless-landing?token=invalid-token',
                } as any;

                const mockError = new Error('Invalid token');
                mockGetPasswordLessAccessToken.mockRejectedValue(mockError);
                mockRedirect.mockReturnValue('redirect-response' as any);

                // Mock console.error to avoid test output noise
                const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

                const result = await handlePasswordlessLanding({
                    request: mockRequest,
                    context: mockContext,
                    params: {},
                    unstable_pattern: {} as any,
                });

                // Should redirect with error in URL parameter
                const errorMessage = t('errors:genericTryAgain');
                expect(mockRedirect).toHaveBeenCalledWith(`/login?error=${encodeURIComponent(errorMessage)}`);
                expect(result).toBe('redirect-response');

                consoleSpy.mockRestore();
            });
        });
    });
});
