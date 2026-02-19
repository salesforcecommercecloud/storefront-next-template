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
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { RouterContextProvider } from 'react-router';
import type { SessionData as AuthData } from '@/lib/api/types';
import type { AuthStorageData } from '@/middlewares/auth.utils';
import { performanceTimerContext } from '@/middlewares/performance-metrics';
import { appConfigContext, type AppConfig } from '@/config';
import { mockConfig } from '@/test-utils/config';
import { TrackingConsent } from '@/types/tracking-consent';
import authMiddleware, {
    refreshAccessToken,
    loginGuestUser,
    loginRegisteredUser,
    authorizePasswordless,
    getPasswordResetToken,
    resetPasswordWithToken,
    getPasswordLessAccessToken,
    getAuth,
    updateAuth,
    destroyAuth,
    flashAuth,
} from './auth.server';
import type { ShopperLogin } from '@salesforce/storefront-next-runtime/scapi';

// Mock createApiClients to return mocked auth namespace
const mockAuth = {
    refreshToken: vi.fn(),
    loginAsGuest: vi.fn(),
    loginWithCredentials: vi.fn(),
    passwordless: {
        authorize: vi.fn(),
        exchangeToken: vi.fn(),
    },
    password: {
        requestReset: vi.fn(),
        reset: vi.fn(),
    },
};

vi.mock('@/lib/api-clients', () => ({
    createApiClients: vi.fn(() => ({
        auth: mockAuth,
    })),
}));

// Mock cookies.server
vi.mock('@/lib/cookies.server', () => ({
    parseAllCookies: vi.fn(),
    createCookie: vi.fn(),
}));

// Mock cookie-utils
vi.mock('@/lib/cookie-utils', () => ({
    getCookieConfig: vi.fn((overrides = {}) => ({
        httpOnly: false,
        secure: true,
        sameSite: 'lax' as const,
        path: '/',
        ...overrides,
    })),
    getCookieNameWithSiteId: vi.fn((name: string) => name),
}));

// Mock performance metrics
const mockPerformanceTimer = {
    mark: vi.fn(),
};

vi.mock('@/middlewares/performance-metrics', () => ({
    performanceTimerContext: Symbol('performanceTimerContext'),
    PERFORMANCE_MARKS: {
        authRefreshAccessToken: 'authRefreshAccessToken',
        authLoginGuestUser: 'authLoginGuestUser',
        authLoginGuestUserPrivate: 'authLoginGuestUserPrivate',
        authLoginRegisteredUser: 'authLoginRegisteredUser',
        authAuthorizePasswordless: 'authAuthorizePasswordless',
        authGetPasswordResetToken: 'authGetPasswordResetToken',
        authResetPasswordWithToken: 'authResetPasswordWithToken',
        authGetPasswordLessAccessToken: 'authGetPasswordLessAccessToken',
        authRefreshToken: 'authRefreshToken',
        authGuestLogin: 'authGuestLogin',
    },
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
    extractResponseError: vi.fn().mockResolvedValue({
        responseMessage: 'Default error message',
        status_code: '500',
    }),
    getAppOrigin: vi.fn(() => 'https://example.com'),
    isAbsoluteURL: vi.fn((url: string) => url.startsWith('http')),
    stringToBase64: vi.fn((str: string) => Buffer.from(str).toString('base64')),
}));

function getMockTokenResponse(): ShopperLogin.schemas['TokenResponse'] {
    return {
        access_token: 'access-token-123',
        id_token: 'id-token-123',
        refresh_token: 'refresh-token-456',
        expires_in: 1800,
        refresh_token_expires_in: 3600,
        token_type: 'Bearer',
        usid: 'usid-abc',
        customer_id: 'customer-789',
        enc_user_id: 'enc-user-id-123',
        idp_access_token: 'idp-access-token-123',
    };
}

/**
 * Creates a mock AuthResponse (token data with dwsid included).
 * This matches the SDK's new simplified API that extracts dwsid internally.
 */
function getMockAuthResponse(tokenResponse?: ShopperLogin.schemas['TokenResponse'], dwsid?: string) {
    return {
        ...(tokenResponse ?? getMockTokenResponse()),
        dwsid,
    };
}

function mockContext(
    data: AuthStorageData = {},
    isSlasPrivate = false
): {
    provider: RouterContextProvider;
    storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>;
    appConfig: AppConfig;
} {
    const provider = new RouterContextProvider();
    const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>(
        Object.entries(data) as [keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]][]
    );

    // Create mock app config
    const appConfig: AppConfig = {
        ...mockConfig,
        commerce: {
            ...mockConfig.commerce,
            api: {
                ...mockConfig.commerce.api,
                privateKeyEnabled: isSlasPrivate,
            },
        },
    };

    // Mock provider.get to return storage, performance timer, or appConfig based on context key
    vi.spyOn(provider, 'get').mockImplementation((key) => {
        if (key === performanceTimerContext) {
            return mockPerformanceTimer;
        }
        if (key === appConfigContext) {
            return appConfig;
        }
        return storage;
    });

    return {
        provider,
        storage,
        appConfig,
    };
}

function getMockAuthData(): AuthData {
    return {
        accessToken: 'access_token',
        accessTokenExpiry: Date.now() + 1_000,
        refreshToken: 'refresh_token',
        refreshTokenExpiry: Date.now() + 10_000,
        userType: 'guest',
        usid: 'usid',
        customerId: 'customer_id',
        codeVerifier: 'codeVerifier',
        dwsid: 'dwsid',
        idpAccessToken: 'idp_access_token',
        trackingConsent: TrackingConsent.Declined,
    };
}

function getMockRegisteredAuthData(): AuthData {
    return {
        accessToken: 'access_token',
        accessTokenExpiry: Date.now() + 1_000,
        refreshToken: 'refresh_token',
        refreshTokenExpiry: Date.now() + 10_000,
        userType: 'registered',
        usid: 'usid',
        customerId: 'customer_id',
        codeVerifier: 'codeVerifier',
        dwsid: 'dwsid',
        idpAccessToken: 'idp_access_token',
        trackingConsent: TrackingConsent.Declined,
    };
}

describe('auth middleware (server)', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Set required environment variables
        vi.stubEnv('COMMERCE_API_SLAS_SECRET', 'test-secret');

        // Reset mock implementations
        mockAuth.refreshToken.mockReset();
        mockAuth.loginAsGuest.mockReset();
        mockAuth.loginWithCredentials.mockReset();
        mockAuth.passwordless.authorize.mockReset();
        mockAuth.passwordless.exchangeToken.mockReset();
        mockAuth.password.requestReset.mockReset();
        mockAuth.password.reset.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
    });
    describe('getAuth()', () => {
        test('should retrieve auth data from context', () => {
            const data = getMockAuthData();
            const { provider } = mockContext(data);

            const result = getAuth(provider);

            expect(result).toEqual(data);
        });

        test('should return empty object for empty storage', () => {
            const { provider } = mockContext();

            const result = getAuth(provider);

            expect(result).toEqual({});
        });
    });

    describe('updateAuth()', () => {
        test('should update storage and mark as updated', () => {
            const data = getMockAuthData();
            const { provider, storage } = mockContext(data);

            updateAuth(provider, getMockTokenResponse());

            expect(storage.get('accessToken')).toBe('access-token-123');
            expect(storage.get('isUpdated')).toBe(true);
        });
    });

    describe('destroyAuth()', () => {
        test('should mark storage as destroyed', () => {
            const data = getMockAuthData();
            const { provider, storage } = mockContext(data);

            destroyAuth(provider);

            expect(storage.get('isDestroyed')).toBe(true);
        });
    });

    describe('flashAuth()', () => {
        test('should set error message in storage', () => {
            const data = getMockAuthData();
            const { provider, storage } = mockContext(data);

            flashAuth(provider, 'Authentication failed');

            expect(storage.get('error')).toBe('Authentication failed');
        });

        test('should use empty string when no message provided', () => {
            const data = getMockAuthData();
            const { provider, storage } = mockContext(data);

            flashAuth(provider);

            expect(storage.get('error')).toBe('');
        });
    });
    describe('refreshAccessToken', () => {
        it('should refresh access token successfully', async () => {
            const { provider } = mockContext();
            const mockTokenResponse = getMockTokenResponse();
            const refreshToken = 'refresh-token-456';

            mockAuth.refreshToken.mockResolvedValue(getMockAuthResponse(mockTokenResponse, 'test-dwsid'));

            const result = await refreshAccessToken(provider, refreshToken);

            expect(mockAuth.refreshToken).toHaveBeenCalledWith({
                refreshToken,
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: 'test-dwsid' });
        });

        it('should include client secret when SLAS is private', async () => {
            const { provider } = mockContext({}, true);
            const mockTokenResponse = getMockTokenResponse();
            const refreshToken = 'refresh-token-456';

            mockAuth.refreshToken.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await refreshAccessToken(provider, refreshToken);

            // Note: clientSecret is now handled internally by createApiClients
            expect(mockAuth.refreshToken).toHaveBeenCalledWith({
                refreshToken,
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should handle refresh token failure', async () => {
            const { provider } = mockContext();
            const refreshToken = 'invalid-refresh-token';
            const mockError = new Error('Invalid refresh token');

            mockAuth.refreshToken.mockRejectedValue(mockError);

            await expect(refreshAccessToken(provider, refreshToken)).rejects.toThrow('Invalid refresh token');
        });

        it('should include DNT value when provided in options', async () => {
            const { provider } = mockContext();
            const mockTokenResponse = getMockTokenResponse();
            const refreshToken = 'refresh-token-456';

            mockAuth.refreshToken.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await refreshAccessToken(provider, refreshToken, {
                trackingConsent: TrackingConsent.Declined,
            });

            expect(mockAuth.refreshToken).toHaveBeenCalledWith({
                refreshToken,
                dnt: true, // TrackingConsent.Declined converts to true
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should include DNT value from auth context when feature is enabled and not provided in options', async () => {
            const authData = getMockAuthData();
            authData.trackingConsent = TrackingConsent.Declined; // DNT enabled (TrackingConsent enum)
            const { provider, appConfig } = mockContext(authData);
            // Enable tracking consent feature
            appConfig.engagement = {
                ...appConfig.engagement,
                analytics: {
                    ...appConfig.engagement.analytics,
                    trackingConsent: {
                        enabled: true,
                        defaultTrackingConsent: TrackingConsent.Accepted,
                    },
                },
            };

            const mockTokenResponse = getMockTokenResponse();
            const refreshToken = 'refresh-token-456';

            mockAuth.refreshToken.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await refreshAccessToken(provider, refreshToken);

            expect(mockAuth.refreshToken).toHaveBeenCalledWith({
                refreshToken,
                dnt: true, // TrackingConsent.Declined converts to true
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should prioritize DNT from options over auth context', async () => {
            const authData = getMockAuthData();
            authData.trackingConsent = TrackingConsent.Declined; // DNT enabled in context
            const { provider, appConfig } = mockContext(authData);
            // Enable tracking consent feature
            appConfig.engagement = {
                ...appConfig.engagement,
                analytics: {
                    ...appConfig.engagement.analytics,
                    trackingConsent: {
                        enabled: true,
                        defaultTrackingConsent: TrackingConsent.Accepted,
                    },
                },
            };

            const mockTokenResponse = getMockTokenResponse();
            const refreshToken = 'refresh-token-456';

            mockAuth.refreshToken.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            // Pass Accepted in options, should override context value
            const result = await refreshAccessToken(provider, refreshToken, {
                trackingConsent: TrackingConsent.Accepted,
            });

            expect(mockAuth.refreshToken).toHaveBeenCalledWith({
                refreshToken,
                dnt: false, // TrackingConsent.Accepted converts to false
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should not include DNT when feature is disabled', async () => {
            const authData = getMockAuthData();
            authData.trackingConsent = TrackingConsent.Declined;
            const { provider, appConfig } = mockContext(authData);
            // Ensure tracking consent is disabled
            appConfig.engagement = {
                ...appConfig.engagement,
                analytics: {
                    ...appConfig.engagement.analytics,
                    trackingConsent: undefined,
                },
            };

            const mockTokenResponse = getMockTokenResponse();
            const refreshToken = 'refresh-token-456';

            mockAuth.refreshToken.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await refreshAccessToken(provider, refreshToken);

            expect(mockAuth.refreshToken).toHaveBeenCalledWith({
                refreshToken,
                // No dnt parameter when feature is disabled
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });
    });

    describe('loginGuestUser', () => {
        it('should login guest user without usid', async () => {
            const { provider } = mockContext();
            const mockTokenResponse = getMockTokenResponse();

            mockAuth.loginAsGuest.mockResolvedValue(getMockAuthResponse(mockTokenResponse, 'guest-dwsid'));

            const result = await loginGuestUser(provider);

            expect(mockAuth.loginAsGuest).toHaveBeenCalledWith({
                usid: undefined,
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: 'guest-dwsid' });
        });

        it('should login guest user with usid', async () => {
            const { provider } = mockContext();
            const mockTokenResponse = getMockTokenResponse();
            const usid = 'existing-usid';

            mockAuth.loginAsGuest.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await loginGuestUser(provider, { usid });

            expect(mockAuth.loginAsGuest).toHaveBeenCalledWith({
                usid,
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should use loginGuestUserPrivate when SLAS is private', async () => {
            const { provider } = mockContext({}, true);
            const mockTokenResponse = getMockTokenResponse();

            mockAuth.loginAsGuest.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await loginGuestUser(provider);

            // Note: private vs public client is now handled internally by createApiClients
            expect(mockAuth.loginAsGuest).toHaveBeenCalledWith({
                usid: undefined,
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should handle guest login failure', async () => {
            const { provider } = mockContext();
            const mockError = new Error('Guest login failed');

            mockAuth.loginAsGuest.mockRejectedValue(mockError);

            await expect(loginGuestUser(provider)).rejects.toThrow('Guest login failed');
        });
    });

    describe('loginRegisteredUser', () => {
        it('should login registered user successfully', async () => {
            const authData = getMockRegisteredAuthData();
            // Remove trackingConsent so dnt is not included by default
            delete authData.trackingConsent;
            const { provider } = mockContext(authData);
            const mockTokenResponse = getMockTokenResponse();
            const email = 'test@example.com';
            const password = 'password123';

            mockAuth.loginWithCredentials.mockResolvedValue(getMockAuthResponse(mockTokenResponse, 'registered-dwsid'));

            const result = await loginRegisteredUser(provider, email, password);

            expect(mockAuth.loginWithCredentials).toHaveBeenCalledWith({
                username: email,
                password,
                usid: 'usid',
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: 'registered-dwsid' });
        });

        it('should login registered user with custom parameters', async () => {
            const authData = getMockRegisteredAuthData();
            // Remove trackingConsent so dnt is not included by default
            delete authData.trackingConsent;
            const { provider } = mockContext(authData);
            const mockTokenResponse = getMockTokenResponse();
            const email = 'test@example.com';
            const password = 'password123';
            const customParameters = { c_customField: 'value' };

            mockAuth.loginWithCredentials.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await loginRegisteredUser(provider, email, password, { customParameters });

            // Note: customParameters are no longer passed to the new auth namespace
            expect(mockAuth.loginWithCredentials).toHaveBeenCalledWith({
                username: email,
                password,
                usid: 'usid',
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should include client secret when SLAS is private', async () => {
            const authData = getMockRegisteredAuthData();
            // Remove trackingConsent so dnt is not included by default
            delete authData.trackingConsent;
            const { provider } = mockContext(authData, true);
            const mockTokenResponse = getMockTokenResponse();
            const email = 'test@example.com';
            const password = 'password123';

            mockAuth.loginWithCredentials.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await loginRegisteredUser(provider, email, password);

            // Note: clientSecret is now handled internally by createApiClients
            expect(mockAuth.loginWithCredentials).toHaveBeenCalledWith({
                username: email,
                password,
                usid: 'usid',
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should handle login failure with invalid credentials', async () => {
            const { provider } = mockContext();
            const email = 'test@example.com';
            const password = 'wrong-password';
            const mockError = new Error('Invalid credentials');

            mockAuth.loginWithCredentials.mockRejectedValue(mockError);

            await expect(loginRegisteredUser(provider, email, password)).rejects.toThrow('Invalid credentials');
        });

        it('should include DNT value when feature is enabled and DNT exists in auth context', async () => {
            const authData = getMockRegisteredAuthData();
            authData.trackingConsent = TrackingConsent.Declined; // DNT enabled (TrackingConsent enum)
            const { provider, appConfig } = mockContext(authData);
            // Enable tracking consent feature
            appConfig.engagement = {
                ...appConfig.engagement,
                analytics: {
                    ...appConfig.engagement.analytics,
                    trackingConsent: {
                        enabled: true,
                        defaultTrackingConsent: TrackingConsent.Accepted,
                    },
                },
            };

            const mockTokenResponse = getMockTokenResponse();
            const email = 'test@example.com';
            const password = 'password123';

            mockAuth.loginWithCredentials.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await loginRegisteredUser(provider, email, password);

            expect(mockAuth.loginWithCredentials).toHaveBeenCalledWith({
                username: email,
                password,
                usid: 'usid',
                dnt: true, // TrackingConsent.Declined converts to true
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should not include DNT when feature is disabled', async () => {
            const authData = getMockRegisteredAuthData();
            authData.trackingConsent = TrackingConsent.Declined;
            const { provider, appConfig } = mockContext(authData);
            // Ensure tracking consent is disabled
            appConfig.engagement = {
                ...appConfig.engagement,
                analytics: {
                    ...appConfig.engagement.analytics,
                    trackingConsent: undefined,
                },
            };

            const mockTokenResponse = getMockTokenResponse();
            const email = 'test@example.com';
            const password = 'password123';

            mockAuth.loginWithCredentials.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await loginRegisteredUser(provider, email, password);

            expect(mockAuth.loginWithCredentials).toHaveBeenCalledWith({
                username: email,
                password,
                usid: 'usid',
                // No dnt parameter when feature is disabled
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should use DNT value false when provided', async () => {
            const authData = getMockRegisteredAuthData();
            authData.trackingConsent = TrackingConsent.Accepted; // DNT set to false (tracking accepted)
            const { provider, appConfig } = mockContext(authData);
            // Enable tracking consent feature
            appConfig.engagement = {
                ...appConfig.engagement,
                analytics: {
                    ...appConfig.engagement.analytics,
                    trackingConsent: {
                        enabled: true,
                        defaultTrackingConsent: TrackingConsent.Accepted,
                    },
                },
            };

            const mockTokenResponse = getMockTokenResponse();
            const email = 'test@example.com';
            const password = 'password123';

            mockAuth.loginWithCredentials.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await loginRegisteredUser(provider, email, password);

            expect(mockAuth.loginWithCredentials).toHaveBeenCalledWith({
                username: email,
                password,
                usid: 'usid',
                dnt: false, // TrackingConsent.Accepted converts to false
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });
    });

    describe('authorizePasswordless', () => {
        it('should authorize passwordless login successfully', async () => {
            const { provider } = mockContext(getMockAuthData());
            const userid = 'test@example.com';

            const mockResponse = {
                data: 'success',
                response: new Response(null, { status: 200 }),
            };

            mockAuth.passwordless.authorize.mockResolvedValue(mockResponse);

            const result = await authorizePasswordless(provider, {
                userid,
            });

            expect(result).toBe(mockResponse);
            expect(result.response.status).toBe(200);
            expect(mockAuth.passwordless.authorize).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: userid,
                    mode: 'callback',
                    usid: 'usid',
                })
            );
        });

        it('should authorize passwordless with redirect path', async () => {
            const { provider } = mockContext();
            const userid = 'test@example.com';
            const redirectPath = '/dashboard';

            const mockResponse = {
                data: 'success',
                response: new Response(null, { status: 200 }),
            };

            mockAuth.passwordless.authorize.mockResolvedValue(mockResponse);

            const result = await authorizePasswordless(provider, {
                userid,
                redirectPath,
            });

            expect(result).toBe(mockResponse);
            expect(result.response.status).toBe(200);
            expect(mockAuth.passwordless.authorize).toHaveBeenCalledWith(
                expect.objectContaining({
                    callbackUri: expect.stringContaining('redirectUrl=%2Fdashboard'),
                })
            );
        });

        it('should throw error on passwordless authorization failure', async () => {
            const { provider } = mockContext();
            const userid = 'test@example.com';
            const mockError = new Error('Authorization failed');

            mockAuth.passwordless.authorize.mockRejectedValue(mockError);

            await expect(authorizePasswordless(provider, { userid })).rejects.toThrow('Authorization failed');
        });

        it('should return response with non-200 status', async () => {
            const { provider } = mockContext();
            const userid = 'test@example.com';

            const mockResponse = {
                data: 'error',
                response: new Response(JSON.stringify({ message: 'Bad request' }), { status: 400 }),
            };

            mockAuth.passwordless.authorize.mockResolvedValue(mockResponse);

            const result = await authorizePasswordless(provider, { userid });

            expect(result.response.status).toBe(400);
        });
    });

    describe('getPasswordLessAccessToken', () => {
        it('should get passwordless access token successfully', async () => {
            const authData = getMockAuthData();
            // Remove trackingConsent so dnt is not included by default
            delete authData.trackingConsent;
            const { provider } = mockContext(authData);
            const mockTokenResponse = getMockTokenResponse();
            const token = 'passwordless-token-123';

            mockAuth.passwordless.exchangeToken.mockResolvedValue(
                getMockAuthResponse(mockTokenResponse, 'pwdless-dwsid')
            );

            const result = await getPasswordLessAccessToken(provider, token);

            expect(mockAuth.passwordless.exchangeToken).toHaveBeenCalledWith({
                pwdlessLoginToken: token,
                usid: 'usid',
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: 'pwdless-dwsid' });
        });

        it('should include DNT value when feature is enabled and DNT exists in auth context', async () => {
            const authData = getMockAuthData();
            authData.trackingConsent = TrackingConsent.Declined; // DNT enabled (TrackingConsent enum)
            const { provider, appConfig } = mockContext(authData);
            // Enable tracking consent feature
            appConfig.engagement = {
                ...appConfig.engagement,
                analytics: {
                    ...appConfig.engagement.analytics,
                    trackingConsent: {
                        enabled: true,
                        defaultTrackingConsent: TrackingConsent.Accepted,
                    },
                },
            };

            const mockTokenResponse = getMockTokenResponse();
            const token = 'passwordless-token-123';

            mockAuth.passwordless.exchangeToken.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await getPasswordLessAccessToken(provider, token);

            expect(mockAuth.passwordless.exchangeToken).toHaveBeenCalledWith({
                pwdlessLoginToken: token,
                usid: 'usid',
                dnt: true, // TrackingConsent.Declined converts to true
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should not include DNT when feature is disabled', async () => {
            const authData = getMockAuthData();
            authData.trackingConsent = TrackingConsent.Declined;
            const { provider, appConfig } = mockContext(authData);
            // Ensure tracking consent is disabled
            appConfig.engagement = {
                ...appConfig.engagement,
                analytics: {
                    ...appConfig.engagement.analytics,
                    trackingConsent: undefined,
                },
            };

            const mockTokenResponse = getMockTokenResponse();
            const token = 'passwordless-token-123';

            mockAuth.passwordless.exchangeToken.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await getPasswordLessAccessToken(provider, token);

            expect(mockAuth.passwordless.exchangeToken).toHaveBeenCalledWith({
                pwdlessLoginToken: token,
                usid: 'usid',
                // No dnt parameter when feature is disabled
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should not include DNT when it does not exist in auth context', async () => {
            const authData = getMockAuthData();
            delete authData.trackingConsent; // No tracking consent value
            const { provider, appConfig } = mockContext(authData);
            // Enable tracking consent feature
            appConfig.engagement = {
                ...appConfig.engagement,
                analytics: {
                    ...appConfig.engagement.analytics,
                    trackingConsent: {
                        enabled: true,
                        defaultTrackingConsent: TrackingConsent.Accepted,
                    },
                },
            };

            const mockTokenResponse = getMockTokenResponse();
            const token = 'passwordless-token-123';

            mockAuth.passwordless.exchangeToken.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await getPasswordLessAccessToken(provider, token);

            expect(mockAuth.passwordless.exchangeToken).toHaveBeenCalledWith({
                pwdlessLoginToken: token,
                usid: 'usid',
                // No dnt parameter when trackingConsent is not set
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should use DNT value false when trackingConsent is Accepted', async () => {
            const authData = getMockAuthData();
            authData.trackingConsent = TrackingConsent.Accepted; // DNT disabled (tracking accepted)
            const { provider, appConfig } = mockContext(authData);
            // Enable tracking consent feature
            appConfig.engagement = {
                ...appConfig.engagement,
                analytics: {
                    ...appConfig.engagement.analytics,
                    trackingConsent: {
                        enabled: true,
                        defaultTrackingConsent: TrackingConsent.Accepted,
                    },
                },
            };

            const mockTokenResponse = getMockTokenResponse();
            const token = 'passwordless-token-123';

            mockAuth.passwordless.exchangeToken.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const result = await getPasswordLessAccessToken(provider, token);

            expect(mockAuth.passwordless.exchangeToken).toHaveBeenCalledWith({
                pwdlessLoginToken: token,
                usid: 'usid',
                dnt: false, // TrackingConsent.Accepted converts to false
            });
            expect(result).toEqual({ ...mockTokenResponse, dwsid: undefined });
        });

        it('should handle invalid passwordless token', async () => {
            const { provider } = mockContext(getMockAuthData());
            const token = 'invalid-token';
            const mockError = new Error('Invalid token');

            mockAuth.passwordless.exchangeToken.mockRejectedValue(mockError);

            await expect(getPasswordLessAccessToken(provider, token)).rejects.toThrow('Invalid token');
        });
    });

    describe('getPasswordResetToken', () => {
        it('should request password reset token successfully with public SLAS', async () => {
            const { provider } = mockContext({}, false);
            const email = 'test@example.com';

            mockAuth.password.requestReset.mockResolvedValue(undefined);

            await getPasswordResetToken(provider, { email });

            expect(mockAuth.password.requestReset).toHaveBeenCalledWith({
                userId: email,
                callbackUri: 'https://example.com/reset-password-callback',
            });

            // Verify performance timer was called
            expect(mockPerformanceTimer.mark).toHaveBeenCalledWith('authGetPasswordResetToken', 'start');
            expect(mockPerformanceTimer.mark).toHaveBeenCalledWith('authGetPasswordResetToken', 'end');
        });

        it('should request password reset token with private SLAS and include authorization header', async () => {
            const { provider } = mockContext({}, true);
            const email = 'test@example.com';

            mockAuth.password.requestReset.mockResolvedValue(undefined);

            await getPasswordResetToken(provider, { email });

            // Note: Authorization header is now handled internally by createApiClients
            expect(mockAuth.password.requestReset).toHaveBeenCalledWith({
                userId: email,
                callbackUri: 'https://example.com/reset-password-callback',
            });
        });

        it('should handle absolute callback URI', async () => {
            const { provider, appConfig } = mockContext({}, false);
            appConfig.features.resetPassword.callbackUri = 'https://custom-domain.com/reset';
            const email = 'test@example.com';

            mockAuth.password.requestReset.mockResolvedValue(undefined);

            await getPasswordResetToken(provider, { email });

            expect(mockAuth.password.requestReset).toHaveBeenCalledWith({
                userId: email,
                callbackUri: 'https://custom-domain.com/reset',
            });
        });

        it('should handle relative callback URI and prepend app origin', async () => {
            const { provider, appConfig } = mockContext({}, false);
            appConfig.features.resetPassword.callbackUri = '/reset-password';
            const email = 'test@example.com';

            mockAuth.password.requestReset.mockResolvedValue(undefined);

            await getPasswordResetToken(provider, { email });

            expect(mockAuth.password.requestReset).toHaveBeenCalledWith({
                userId: email,
                callbackUri: 'https://example.com/reset-password',
            });
        });

        it('should handle password reset token request failure', async () => {
            const { provider } = mockContext({}, false);
            const email = 'test@example.com';
            const mockError = new Error('Failed to send reset email');

            mockAuth.password.requestReset.mockRejectedValue(mockError);

            await expect(getPasswordResetToken(provider, { email })).rejects.toThrow('Failed to send reset email');
        });

        it('should call performance timer even on failure', async () => {
            const { provider } = mockContext({}, false);
            const email = 'test@example.com';
            const mockError = new Error('Failed to send reset email');

            mockAuth.password.requestReset.mockRejectedValue(mockError);

            await expect(getPasswordResetToken(provider, { email })).rejects.toThrow();

            expect(mockPerformanceTimer.mark).toHaveBeenCalledWith('authGetPasswordResetToken', 'start');
            expect(mockPerformanceTimer.mark).toHaveBeenCalledWith('authGetPasswordResetToken', 'end');
        });
    });

    describe('resetPasswordWithToken', () => {
        it('should reset password successfully with public SLAS', async () => {
            const { provider } = mockContext({}, false);
            const email = 'test@example.com';
            const token = 'reset-token-123';
            const newPassword = 'NewSecurePassword123!';

            mockAuth.password.reset.mockResolvedValue(undefined);

            await resetPasswordWithToken(provider, { email, token, newPassword });

            expect(mockAuth.password.reset).toHaveBeenCalledWith({
                userId: email,
                token,
                newPassword,
            });

            // Verify performance timer was called
            expect(mockPerformanceTimer.mark).toHaveBeenCalledWith('authResetPasswordWithToken', 'start');
            expect(mockPerformanceTimer.mark).toHaveBeenCalledWith('authResetPasswordWithToken', 'end');
        });

        it('should reset password with private SLAS and include authorization header', async () => {
            const { provider } = mockContext({}, true);
            const email = 'test@example.com';
            const token = 'reset-token-123';
            const newPassword = 'NewSecurePassword123!';

            mockAuth.password.reset.mockResolvedValue(undefined);

            await resetPasswordWithToken(provider, { email, token, newPassword });

            // Note: Authorization header is now handled internally by createApiClients
            expect(mockAuth.password.reset).toHaveBeenCalledWith({
                userId: email,
                token,
                newPassword,
            });
        });

        it('should encode client credentials correctly for private SLAS', async () => {
            const { provider } = mockContext({}, true);
            const email = 'test@example.com';
            const token = 'reset-token-123';
            const newPassword = 'NewSecurePassword123!';

            mockAuth.password.reset.mockResolvedValue(undefined);

            await resetPasswordWithToken(provider, { email, token, newPassword });

            // Note: Client credential encoding is now handled internally by createApiClients
            expect(mockAuth.password.reset).toHaveBeenCalledWith({
                userId: email,
                token,
                newPassword,
            });
        });

        it('should handle password reset failure with invalid token', async () => {
            const { provider } = mockContext({}, false);
            const email = 'test@example.com';
            const token = 'invalid-token';
            const newPassword = 'NewSecurePassword123!';
            const mockError = new Error('Invalid or expired token');

            mockAuth.password.reset.mockRejectedValue(mockError);

            await expect(resetPasswordWithToken(provider, { email, token, newPassword })).rejects.toThrow(
                'Invalid or expired token'
            );
        });

        it('should handle password reset failure due to weak password', async () => {
            const { provider } = mockContext({}, false);
            const email = 'test@example.com';
            const token = 'reset-token-123';
            const newPassword = 'weak';
            const mockError = new Error('Password does not meet requirements');

            mockAuth.password.reset.mockRejectedValue(mockError);

            await expect(resetPasswordWithToken(provider, { email, token, newPassword })).rejects.toThrow(
                'Password does not meet requirements'
            );
        });

        it('should call performance timer even on failure', async () => {
            const { provider } = mockContext({}, false);
            const email = 'test@example.com';
            const token = 'reset-token-123';
            const newPassword = 'NewSecurePassword123!';
            const mockError = new Error('Reset failed');

            mockAuth.password.reset.mockRejectedValue(mockError);

            await expect(resetPasswordWithToken(provider, { email, token, newPassword })).rejects.toThrow();

            expect(mockPerformanceTimer.mark).toHaveBeenCalledWith('authResetPasswordWithToken', 'start');
            expect(mockPerformanceTimer.mark).toHaveBeenCalledWith('authResetPasswordWithToken', 'end');
        });

        it('should handle all parameters correctly', async () => {
            const { provider } = mockContext({}, false);
            const email = 'user+test@example.com'; // Email with special chars
            const token = 'token-with-special-chars_123==';
            const newPassword = 'P@ssw0rd!2024#Complex';

            mockAuth.password.reset.mockResolvedValue(undefined);

            await resetPasswordWithToken(provider, { email, token, newPassword });

            expect(mockAuth.password.reset).toHaveBeenCalledWith({
                userId: email,
                token,
                newPassword,
            });
        });
    });

    describe('authMiddleware', () => {
        let mockParseAllCookies: any;
        let mockCreateCookie: any;
        let mockGetCookieConfig: any;
        let mockgetCookieNameWithSiteId: any;

        beforeEach(async () => {
            // Get mocked modules
            const cookiesServer = await import('@/lib/cookies.server');
            const cookieUtils = await import('@/lib/cookie-utils');

            mockParseAllCookies = cookiesServer.parseAllCookies;
            mockCreateCookie = cookiesServer.createCookie;
            mockGetCookieConfig = cookieUtils.getCookieConfig;
            mockgetCookieNameWithSiteId = cookieUtils.getCookieNameWithSiteId;

            // Default mock implementations
            mockParseAllCookies.mockReturnValue({});
            mockgetCookieNameWithSiteId.mockImplementation((name: string) => name);
            mockGetCookieConfig.mockImplementation((overrides = {}) => ({
                httpOnly: false,
                secure: true,
                sameSite: 'lax' as const,
                path: '/',
                ...overrides,
            }));

            // Mock createCookie to return a cookie object with serialize method
            mockCreateCookie.mockImplementation(() => ({
                serialize: vi.fn().mockResolvedValue('Set-Cookie: mock=value'),
            }));
        });

        it('should parse cookies and reconstruct auth data from separate cookies', async () => {
            const mockTokenResponse = getMockTokenResponse();
            mockAuth.loginAsGuest.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            // Create valid JWT with expiry
            const now = Math.floor(Date.now() / 1000);
            const exp = now + 1800; // 30 min from now
            const mockAccessToken = `header.${btoa(JSON.stringify({ exp }))}.signature`;

            // Mock parseAllCookies to return split cookies
            mockParseAllCookies.mockReturnValue({
                'cc-nx-g': 'guest-refresh-token',
                'cc-at': mockAccessToken,
                usid: 'test-usid',
                customerId: 'test-customer-id',
            });

            const request = new Request('https://example.com/test', {
                headers: {
                    Cookie: 'cc-nx-g=guest-refresh-token; cc-at=access-token; usid=test-usid; customerId=test-customer-id',
                },
            });

            const context = new RouterContextProvider();
            const appConfig = { ...mockConfig };
            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return appConfig;
                return undefined;
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Verify parseAllCookies was called
            expect(mockParseAllCookies).toHaveBeenCalledWith(
                'cc-nx-g=guest-refresh-token; cc-at=access-token; usid=test-usid; customerId=test-customer-id'
            );

            // Verify next was called
            expect(next).toHaveBeenCalled();
        });

        it('should determine user type from refresh token cookie presence - guest', async () => {
            const mockTokenResponse = getMockTokenResponse();
            mockAuth.loginAsGuest.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            // Mock guest refresh token cookie only
            mockParseAllCookies.mockReturnValue({
                'cc-nx-g': 'guest-refresh-token',
            });

            const request = new Request('https://example.com/test', {
                headers: {
                    Cookie: 'cc-nx-g=guest-refresh-token',
                },
            });

            const context = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();

            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                // Return storage when asked for authStorageContext
                return storage;
            });

            vi.spyOn(context, 'set').mockImplementation((_key, value) => {
                if (typeof value === 'object' && value instanceof Map) {
                    // Copy entries from the middleware's storage to our test storage
                    value.forEach((v, k) => storage.set(k, v));
                }
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Verify userType was set to 'guest' in storage
            expect(storage.get('userType')).toBe('guest');
        });

        it('should determine user type from refresh token cookie presence - registered', async () => {
            const mockTokenResponse = getMockTokenResponse();
            mockAuth.refreshToken.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            // Create valid JWT with expiry
            const now = Math.floor(Date.now() / 1000);
            const exp = now + 1800;
            const mockAccessToken = `header.${btoa(JSON.stringify({ exp }))}.signature`;

            // Mock registered refresh token cookie only
            mockParseAllCookies.mockReturnValue({
                'cc-nx': 'registered-refresh-token',
                'cc-at': mockAccessToken,
            });

            const request = new Request('https://example.com/test', {
                headers: {
                    Cookie: 'cc-nx=registered-refresh-token; cc-at=access-token',
                },
            });

            const context = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();

            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                return storage;
            });

            vi.spyOn(context, 'set').mockImplementation((_key, value) => {
                if (typeof value === 'object' && value instanceof Map) {
                    value.forEach((v, k) => storage.set(k, v));
                }
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Verify userType was set to 'registered' in storage
            expect(storage.get('userType')).toBe('registered');
        });

        it('should skip auth retrieval for /resource/auth/ routes', async () => {
            mockParseAllCookies.mockReturnValue({});

            const request = new Request('https://example.com/resource/auth/login', {
                method: 'POST',
            });

            const context = new RouterContextProvider();
            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                return new Map();
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Verify that guest login was NOT called (auth retrieval skipped)
            expect(mockAuth.loginAsGuest).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });

        it('should extract access token expiry from JWT during middleware initialization', async () => {
            // Create JWT with specific expiry
            const now = Math.floor(Date.now() / 1000);
            const exp = now + 1800; // 30 min from now
            const payload = JSON.stringify({ exp });
            const base64Payload = btoa(payload);
            const mockAccessToken = `header.${base64Payload}.signature`;

            mockParseAllCookies.mockReturnValue({
                'cc-nx-g': 'guest-refresh-token',
                'cc-at': mockAccessToken,
            });

            const request = new Request('https://example.com/test', {
                headers: {
                    Cookie: `cc-nx-g=guest-refresh-token; cc-at=${mockAccessToken}`,
                },
            });

            const context = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();

            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                return storage;
            });

            vi.spyOn(context, 'set').mockImplementation((_key, value) => {
                if (typeof value === 'object' && value instanceof Map) {
                    value.forEach((v, k) => storage.set(k, v));
                }
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Verify accessTokenExpiry was set from JWT
            const expiry = storage.get('accessTokenExpiry');
            expect(expiry).toBeDefined();
            expect(typeof expiry).toBe('number');
            expect(expiry).toBe(exp * 1000); // Should be in milliseconds
        });

        it('should destroy all 10 cookies when isDestroyed is set', async () => {
            mockParseAllCookies.mockReturnValue({
                'cc-nx-g': 'guest-refresh-token',
            });

            // Mock guest login for when middleware falls back to guest auth
            const mockTokenResponse = getMockTokenResponse();
            mockAuth.loginAsGuest.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const request = new Request('https://example.com/test');

            const context = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();
            storage.set('isDestroyed', true);

            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                return storage;
            });

            vi.spyOn(context, 'set').mockImplementation((_key, value) => {
                if (typeof value === 'object' && value instanceof Map) {
                    value.forEach((v, k) => storage.set(k, v));
                }
            });

            const mockSerialize = vi.fn().mockResolvedValue('Set-Cookie: mock=deleted');
            mockCreateCookie.mockReturnValue({
                serialize: mockSerialize,
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Verify all 10 cookies were deleted:
            // cc-nx-g, cc-nx, cc-at, usid, customerId, encUserId, cc-idp-at, dwsid, cc-cv, tc
            expect(mockSerialize).toHaveBeenCalledTimes(10);
            expect(mockSerialize).toHaveBeenCalledWith(
                '',
                expect.objectContaining({
                    expires: expect.any(Date),
                    maxAge: undefined,
                })
            );
        });

        it('should set separate cookies when auth tokens are refreshed including IDP tokens', async () => {
            // Create expired JWT to trigger refresh flow
            const now = Math.floor(Date.now() / 1000);
            const exp = now - 100; // Expired token
            const expiredAccessToken = `header.${btoa(JSON.stringify({ exp }))}.signature`;

            // Mock cookies with expired access token but valid refresh token
            mockParseAllCookies.mockReturnValue({
                'cc-nx-g': 'old-refresh-token',
                'cc-at': expiredAccessToken,
            });

            const request = new Request('https://example.com/test');

            const context = new RouterContextProvider();
            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                return new Map();
            });

            const mockSerialize = vi.fn().mockResolvedValue('Set-Cookie: mock=value');
            mockCreateCookie.mockReturnValue({
                serialize: mockSerialize,
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            // Mock token response to control what gets written after refresh
            const mockTokenResponse = getMockTokenResponse();
            mockAuth.refreshToken.mockResolvedValue(getMockAuthResponse(mockTokenResponse, 'refresh-dwsid'));

            await authMiddleware({ request, context, params: {} }, next);

            // Verify serialize was called multiple times
            // Cookies: refreshToken, accessToken, usid, customerId, idpAccessToken, dwsid,
            // delete other refresh token, delete code verifier
            expect(mockSerialize).toHaveBeenCalled();
            expect(mockSerialize.mock.calls.length).toBeGreaterThanOrEqual(6);

            // Verify tokens from mock response were serialized
            expect(mockSerialize).toHaveBeenCalledWith('refresh-token-456', expect.any(Object));
            expect(mockSerialize).toHaveBeenCalledWith('access-token-123', expect.any(Object));
            expect(mockSerialize).toHaveBeenCalledWith('usid-abc', expect.any(Object));
            expect(mockSerialize).toHaveBeenCalledWith('customer-789', expect.any(Object));
            expect(mockSerialize).toHaveBeenCalledWith('idp-access-token-123', expect.any(Object));
            expect(mockSerialize).toHaveBeenCalledWith('refresh-dwsid', expect.any(Object));
        });

        it('should delete other refresh token cookie when switching user types', async () => {
            mockParseAllCookies.mockReturnValue({});

            // Mock guest login for when middleware falls back to guest auth
            const mockTokenResponse = getMockTokenResponse();
            mockAuth.loginAsGuest.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const request = new Request('https://example.com/test');

            const now = Date.now();
            const context = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();
            storage.set('isUpdated', true);
            storage.set('userType', 'registered'); // Switching from guest to registered
            storage.set('refreshToken', 'registered-refresh-token');
            storage.set('refreshTokenExpiry', now + 3600000);
            storage.set('accessToken', 'access-token');
            storage.set('accessTokenExpiry', now + 1800000);

            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                return storage;
            });

            vi.spyOn(context, 'set').mockImplementation((_key, value) => {
                if (typeof value === 'object' && value instanceof Map) {
                    value.forEach((v, k) => storage.set(k, v));
                }
            });

            const mockSerialize = vi.fn().mockResolvedValue('Set-Cookie: mock=value');
            mockCreateCookie.mockReturnValue({
                serialize: mockSerialize,
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Verify the "other" refresh token cookie (guest in this case) was deleted
            // One call should be to delete the guest cookie with empty string
            const deleteCallsWithEmptyString = mockSerialize.mock.calls.filter(
                (call) => call[0] === '' && call[1]?.expires instanceof Date
            );
            expect(deleteCallsWithEmptyString.length).toBeGreaterThan(0);
        });

        it('should handle error in storage and destroy cookies', async () => {
            mockParseAllCookies.mockReturnValue({
                'cc-nx-g': 'guest-refresh-token',
            });

            // Mock guest login for when middleware falls back to guest auth
            const mockTokenResponse = getMockTokenResponse();
            mockAuth.loginAsGuest.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const request = new Request('https://example.com/test');

            const context = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();
            storage.set('error', 'Authentication error');

            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                return storage;
            });

            vi.spyOn(context, 'set').mockImplementation((_key, value) => {
                if (typeof value === 'object' && value instanceof Map) {
                    value.forEach((v, k) => storage.set(k, v));
                }
            });

            const mockSerialize = vi.fn().mockResolvedValue('Set-Cookie: mock=deleted');
            mockCreateCookie.mockReturnValue({
                serialize: mockSerialize,
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Verify all 10 cookies were deleted due to error
            // cc-nx-g, cc-nx, cc-at, usid, customerId, encUserId, cc-idp-at, dwsid, cc-cv, tc
            expect(mockSerialize).toHaveBeenCalledTimes(10);
        });

        it('should use getCookieNameWithSiteId to get cookie names', async () => {
            mockParseAllCookies.mockReturnValue({});
            mockgetCookieNameWithSiteId.mockImplementation((name: string) => `namespace_${name}`);

            // Mock guest login for when middleware falls back to guest auth
            const mockTokenResponse = getMockTokenResponse();
            mockAuth.loginAsGuest.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const request = new Request('https://example.com/test', {
                headers: {
                    Cookie: 'namespace_cc-nx-g=guest-token',
                },
            });

            const context = new RouterContextProvider();
            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                return new Map();
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Verify getCookieNameWithSiteId was called for each cookie
            expect(mockgetCookieNameWithSiteId).toHaveBeenCalledWith('cc-nx-g', context);
            expect(mockgetCookieNameWithSiteId).toHaveBeenCalledWith('cc-nx', context);
            expect(mockgetCookieNameWithSiteId).toHaveBeenCalledWith('cc-at', context);
            expect(mockgetCookieNameWithSiteId).toHaveBeenCalledWith('usid', context);
            expect(mockgetCookieNameWithSiteId).toHaveBeenCalledWith('customerId', context);
            expect(mockgetCookieNameWithSiteId).toHaveBeenCalledWith('encUserId', context);
            expect(mockgetCookieNameWithSiteId).toHaveBeenCalledWith('cc-idp-at', context);
            expect(mockgetCookieNameWithSiteId).toHaveBeenCalledWith('cc-cv', context);
        });

        it('should handle missing cookies gracefully', async () => {
            // No cookies present
            mockParseAllCookies.mockReturnValue({});

            const mockTokenResponse = getMockTokenResponse();
            mockAuth.loginAsGuest.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const request = new Request('https://example.com/test');

            const context = new RouterContextProvider();
            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                return new Map();
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Should fall back to guest login when no cookies present
            expect(mockAuth.loginAsGuest).toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });

        it('should prioritize registered refresh token over guest when both exist', async () => {
            // Both refresh tokens present (shouldn't happen in practice but test defensive logic)
            mockParseAllCookies.mockReturnValue({
                'cc-nx': 'registered-refresh-token',
                'cc-nx-g': 'guest-refresh-token',
            });

            const mockTokenResponse = getMockTokenResponse();
            mockAuth.refreshToken.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const request = new Request('https://example.com/test', {
                headers: {
                    Cookie: 'cc-nx=registered-refresh-token; cc-nx-g=guest-refresh-token',
                },
            });

            const context = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();

            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                return storage;
            });

            vi.spyOn(context, 'set').mockImplementation((_key, value) => {
                if (typeof value === 'object' && value instanceof Map) {
                    value.forEach((v, k) => storage.set(k, v));
                }
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Should use registered type (cc-nx takes priority)
            expect(storage.get('userType')).toBe('registered');
            expect(storage.get('refreshToken')).toBe('registered-refresh-token');
        });

        it('should read and reconstruct IDP access token from cookies', async () => {
            const mockTokenResponse = getMockTokenResponse();
            mockAuth.loginAsGuest.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            // Create valid JWT with expiry
            const now = Math.floor(Date.now() / 1000);
            const exp = now + 1800;
            const mockAccessToken = `header.${btoa(JSON.stringify({ exp }))}.signature`;

            // Mock cookies including IDP access token
            mockParseAllCookies.mockReturnValue({
                'cc-nx-g': 'guest-refresh-token',
                'cc-at': mockAccessToken,
                'cc-idp-at': 'idp-access-token',
            });

            const request = new Request('https://example.com/test', {
                headers: {
                    Cookie: 'cc-nx-g=guest-refresh-token; cc-at=access-token; cc-idp-at=idp-access-token',
                },
            });

            const context = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();

            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                return storage;
            });

            vi.spyOn(context, 'set').mockImplementation((_key, value) => {
                if (typeof value === 'object' && value instanceof Map) {
                    value.forEach((v, k) => storage.set(k, v));
                }
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Verify IDP access token was reconstructed from cookies
            expect(storage.get('idpAccessToken')).toBe('idp-access-token');
        });

        it('should read and reconstruct code verifier from cookie', async () => {
            const mockTokenResponse = getMockTokenResponse();
            mockAuth.loginAsGuest.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            // Create valid JWT with expiry
            const now = Math.floor(Date.now() / 1000);
            const exp = now + 1800;
            const mockAccessToken = `header.${btoa(JSON.stringify({ exp }))}.signature`;

            // Mock cookies including code verifier
            mockParseAllCookies.mockReturnValue({
                'cc-nx-g': 'guest-refresh-token',
                'cc-at': mockAccessToken,
                'cc-cv': 'code-verifier-abc123',
            });

            const request = new Request('https://example.com/test', {
                headers: {
                    Cookie: 'cc-nx-g=guest-refresh-token; cc-at=access-token; cc-cv=code-verifier-abc123',
                },
            });

            const context = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();

            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                return storage;
            });

            vi.spyOn(context, 'set').mockImplementation((_key, value) => {
                if (typeof value === 'object' && value instanceof Map) {
                    value.forEach((v, k) => storage.set(k, v));
                }
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Verify code verifier was reconstructed from cookie
            expect(storage.get('codeVerifier')).toBe('code-verifier-abc123');
        });

        it('should delete code verifier cookie when not present in storage', async () => {
            mockParseAllCookies.mockReturnValue({});

            // Mock guest login for when middleware falls back to guest auth
            const mockTokenResponse = getMockTokenResponse();
            mockAuth.loginAsGuest.mockResolvedValue(getMockAuthResponse(mockTokenResponse));

            const request = new Request('https://example.com/test');

            const now = Date.now();
            const context = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();
            storage.set('isUpdated', true);
            storage.set('userType', 'guest');
            storage.set('refreshToken', 'refresh-token');
            storage.set('refreshTokenExpiry', now + 3600000);
            storage.set('accessToken', 'access-token');
            storage.set('accessTokenExpiry', now + 1800000);
            // Note: codeVerifier is NOT in storage (e.g., after successful social login)

            vi.spyOn(context, 'get').mockImplementation((key) => {
                if (key === performanceTimerContext) return mockPerformanceTimer;
                if (key === appConfigContext) return mockConfig;
                return storage;
            });

            vi.spyOn(context, 'set').mockImplementation((_key, value) => {
                if (typeof value === 'object' && value instanceof Map) {
                    value.forEach((v, k) => storage.set(k, v));
                }
            });

            const mockSerialize = vi.fn().mockResolvedValue('Set-Cookie: mock=deleted');
            mockCreateCookie.mockReturnValue({
                serialize: mockSerialize,
            });

            const mockResponse = new Response('OK');
            const next = vi.fn().mockResolvedValue(mockResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Verify code verifier cookie was deleted (empty string with expired date)
            const deleteCodeVerifierCalls = mockSerialize.mock.calls.filter(
                (call) => call[0] === '' && call[1]?.httpOnly === true && call[1]?.expires instanceof Date
            );
            expect(deleteCodeVerifierCalls.length).toBeGreaterThan(0);
        });
    });
});
