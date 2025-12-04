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

// Mock commerce-sdk-isomorphic helpers to match dynamic imports in implementation
vi.mock('commerce-sdk-isomorphic/helpers', () => ({
    refreshAccessToken: vi.fn(),
    loginGuestUser: vi.fn(),
    loginGuestUserPrivate: vi.fn(),
    loginRegisteredUserB2C: vi.fn(),
    authorizePasswordless: vi.fn(),
    getPasswordLessAccessToken: vi.fn(),
}));

// Mock createClient
vi.mock('@/lib/scapi', () => ({
    default: vi.fn(),
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

// Helper to create mock ShopperLogin client
function createMockShopperLoginClient() {
    return {
        getInstance: vi.fn().mockResolvedValue({
            clientConfig: {
                parameters: {
                    redirectURI: 'https://example.com/callback',
                    siteId: 'test-site',
                    clientId: 'test-client-id',
                },
            },
            getPasswordResetToken: vi.fn().mockResolvedValue(undefined),
            resetPassword: vi.fn().mockResolvedValue(undefined),
        }),
    };
}

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
        access_token: 'access_token',
        access_token_expiry: Date.now() + 1_000,
        refresh_token: 'refresh_token',
        refresh_token_expiry: Date.now() + 10_000,
        userType: 'guest',
        usid: 'usid',
        customer_id: 'customer_id',
        codeVerifier: 'codeVerifier',
        dwsid: 'dwsid',
        idp_access_token: 'idp_access_token',
        trackingConsent: TrackingConsent.Declined,
    };
}

function getMockRegisteredAuthData(): AuthData {
    return {
        access_token: 'access_token',
        access_token_expiry: Date.now() + 1_000,
        refresh_token: 'refresh_token',
        refresh_token_expiry: Date.now() + 10_000,
        userType: 'registered',
        usid: 'usid',
        customer_id: 'customer_id',
        codeVerifier: 'codeVerifier',
        dwsid: 'dwsid',
        idp_access_token: 'idp_access_token',
        trackingConsent: TrackingConsent.Declined,
    };
}

describe('auth middleware (server)', () => {
    let mockCreateClient: any;
    let mockHelpers: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Set required environment variables
        vi.stubEnv('COMMERCE_API_SLAS_SECRET', 'test-secret');

        // Get mocked modules
        mockCreateClient = (await import('@/lib/scapi')).default;
        mockHelpers = await import('commerce-sdk-isomorphic/helpers');

        // Setup default mock implementation
        mockCreateClient.mockReturnValue({
            ShopperLogin: createMockShopperLoginClient(),
        });
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

            expect(storage.get('access_token')).toBe('access-token-123');
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

            mockHelpers.refreshAccessToken.mockResolvedValue(mockTokenResponse);

            const result = await refreshAccessToken(provider, refreshToken);

            expect(mockHelpers.refreshAccessToken).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                parameters: {
                    refreshToken,
                },
                credentials: {},
            });
            expect(result).toEqual(mockTokenResponse);
        });

        it('should include client secret when SLAS is private', async () => {
            const { provider } = mockContext({}, true);
            const mockTokenResponse = getMockTokenResponse();
            const refreshToken = 'refresh-token-456';

            mockHelpers.refreshAccessToken.mockResolvedValue(mockTokenResponse);

            const result = await refreshAccessToken(provider, refreshToken);

            expect(mockHelpers.refreshAccessToken).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                parameters: {
                    refreshToken,
                },
                credentials: {
                    clientSecret: 'test-secret',
                },
            });
            expect(result).toEqual(mockTokenResponse);
        });

        it('should handle refresh token failure', async () => {
            const { provider } = mockContext();
            const refreshToken = 'invalid-refresh-token';
            const mockError = new Error('Invalid refresh token');

            mockHelpers.refreshAccessToken.mockRejectedValue(mockError);

            await expect(refreshAccessToken(provider, refreshToken)).rejects.toThrow('Invalid refresh token');
        });

        it('should include DNT value when provided in options', async () => {
            const { provider } = mockContext();
            const mockTokenResponse = getMockTokenResponse();
            const refreshToken = 'refresh-token-456';

            mockHelpers.refreshAccessToken.mockResolvedValue(mockTokenResponse);

            const result = await refreshAccessToken(provider, refreshToken, {
                trackingConsent: TrackingConsent.Declined,
            });

            expect(mockHelpers.refreshAccessToken).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                parameters: {
                    refreshToken,
                    dnt: true, // TrackingConsent.Declined converts to true
                },
                credentials: {},
            });
            expect(result).toEqual(mockTokenResponse);
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

            mockHelpers.refreshAccessToken.mockResolvedValue(mockTokenResponse);

            const result = await refreshAccessToken(provider, refreshToken);

            expect(mockHelpers.refreshAccessToken).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                parameters: {
                    refreshToken,
                    dnt: true, // TrackingConsent.Declined converts to true
                },
                credentials: {},
            });
            expect(result).toEqual(mockTokenResponse);
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

            mockHelpers.refreshAccessToken.mockResolvedValue(mockTokenResponse);

            // Pass Accepted in options, should override context value
            const result = await refreshAccessToken(provider, refreshToken, {
                trackingConsent: TrackingConsent.Accepted,
            });

            expect(mockHelpers.refreshAccessToken).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                parameters: {
                    refreshToken,
                    dnt: false, // TrackingConsent.Accepted converts to false
                },
                credentials: {},
            });
            expect(result).toEqual(mockTokenResponse);
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

            mockHelpers.refreshAccessToken.mockResolvedValue(mockTokenResponse);

            const result = await refreshAccessToken(provider, refreshToken);

            expect(mockHelpers.refreshAccessToken).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                parameters: {
                    refreshToken,
                    // No dnt parameter
                },
                credentials: {},
            });
            expect(result).toEqual(mockTokenResponse);
        });
    });

    describe('loginGuestUser', () => {
        it('should login guest user without usid', async () => {
            const { provider } = mockContext();
            const mockTokenResponse = getMockTokenResponse();

            mockHelpers.loginGuestUser.mockResolvedValue(mockTokenResponse);

            const result = await loginGuestUser(provider);

            expect(mockHelpers.loginGuestUser).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                parameters: {
                    redirectURI: 'https://example.com/callback',
                },
            });
            expect(result).toEqual(mockTokenResponse);
        });

        it('should login guest user with usid', async () => {
            const { provider } = mockContext();
            const mockTokenResponse = getMockTokenResponse();
            const usid = 'existing-usid';

            mockHelpers.loginGuestUser.mockResolvedValue(mockTokenResponse);

            const result = await loginGuestUser(provider, { usid });

            expect(mockHelpers.loginGuestUser).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                parameters: {
                    redirectURI: 'https://example.com/callback',
                    usid,
                },
            });
            expect(result).toEqual(mockTokenResponse);
        });

        it('should use loginGuestUserPrivate when SLAS is private', async () => {
            const { provider } = mockContext({}, true);
            const mockTokenResponse = getMockTokenResponse();

            mockHelpers.loginGuestUserPrivate.mockResolvedValue(mockTokenResponse);

            const result = await loginGuestUser(provider);

            expect(mockHelpers.loginGuestUserPrivate).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                credentials: {
                    clientSecret: 'test-secret',
                },
                parameters: {},
            });
            expect(result).toEqual(mockTokenResponse);
        });

        it('should handle guest login failure', async () => {
            const { provider } = mockContext();
            const mockError = new Error('Guest login failed');

            mockHelpers.loginGuestUser.mockRejectedValue(mockError);

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

            mockHelpers.loginRegisteredUserB2C.mockResolvedValue(mockTokenResponse);

            const result = await loginRegisteredUser(provider, email, password);

            expect(mockHelpers.loginRegisteredUserB2C).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                credentials: {
                    username: email,
                    password,
                },
                parameters: {
                    redirectURI: 'https://example.com/callback',
                    usid: 'usid',
                },
            });
            expect(result).toEqual(mockTokenResponse);
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

            mockHelpers.loginRegisteredUserB2C.mockResolvedValue(mockTokenResponse);

            const result = await loginRegisteredUser(provider, email, password, { customParameters });

            expect(mockHelpers.loginRegisteredUserB2C).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                credentials: {
                    username: email,
                    password,
                },
                parameters: {
                    redirectURI: 'https://example.com/callback',
                    usid: 'usid',
                    body: customParameters,
                },
            });
            expect(result).toEqual(mockTokenResponse);
        });

        it('should include client secret when SLAS is private', async () => {
            const authData = getMockRegisteredAuthData();
            // Remove trackingConsent so dnt is not included by default
            delete authData.trackingConsent;
            const { provider } = mockContext(authData, true);
            const mockTokenResponse = getMockTokenResponse();
            const email = 'test@example.com';
            const password = 'password123';

            mockHelpers.loginRegisteredUserB2C.mockResolvedValue(mockTokenResponse);

            const result = await loginRegisteredUser(provider, email, password);

            expect(mockHelpers.loginRegisteredUserB2C).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                credentials: {
                    username: email,
                    password,
                    clientSecret: 'test-secret',
                },
                parameters: {
                    redirectURI: 'https://example.com/callback',
                    usid: 'usid',
                },
            });
            expect(result).toEqual(mockTokenResponse);
        });

        it('should handle login failure with invalid credentials', async () => {
            const { provider } = mockContext();
            const email = 'test@example.com';
            const password = 'wrong-password';
            const mockError = new Error('Invalid credentials');

            mockHelpers.loginRegisteredUserB2C.mockRejectedValue(mockError);

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

            mockHelpers.loginRegisteredUserB2C.mockResolvedValue(mockTokenResponse);

            const result = await loginRegisteredUser(provider, email, password);

            expect(mockHelpers.loginRegisteredUserB2C).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                credentials: {
                    username: email,
                    password,
                },
                parameters: {
                    redirectURI: 'https://example.com/callback',
                    usid: 'usid',
                    dnt: true, // TrackingConsent.Declined converts to true
                },
            });
            expect(result).toEqual(mockTokenResponse);
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

            mockHelpers.loginRegisteredUserB2C.mockResolvedValue(mockTokenResponse);

            const result = await loginRegisteredUser(provider, email, password);

            expect(mockHelpers.loginRegisteredUserB2C).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                credentials: {
                    username: email,
                    password,
                },
                parameters: {
                    redirectURI: 'https://example.com/callback',
                    usid: 'usid',
                    // No dnt parameter
                },
            });
            expect(result).toEqual(mockTokenResponse);
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

            mockHelpers.loginRegisteredUserB2C.mockResolvedValue(mockTokenResponse);

            const result = await loginRegisteredUser(provider, email, password);

            expect(mockHelpers.loginRegisteredUserB2C).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                credentials: {
                    username: email,
                    password,
                },
                parameters: {
                    redirectURI: 'https://example.com/callback',
                    usid: 'usid',
                    dnt: false, // TrackingConsent.Accepted converts to false
                },
            });
            expect(result).toEqual(mockTokenResponse);
        });
    });

    describe('authorizePasswordless', () => {
        it('should authorize passwordless login successfully', async () => {
            const { provider } = mockContext(getMockAuthData());
            const userid = 'test@example.com';

            const mockResponse = {
                status: 200,
                json: vi.fn(),
            };

            mockHelpers.authorizePasswordless.mockResolvedValue(mockResponse);

            const result = await authorizePasswordless(provider, {
                userid,
            });

            expect(result).toBe(mockResponse);
            expect(result.status).toBe(200);
            expect(mockHelpers.authorizePasswordless).toHaveBeenCalledWith(
                expect.objectContaining({
                    slasClient: expect.anything(),
                    parameters: expect.objectContaining({
                        userid,
                        mode: 'callback',
                        usid: 'usid',
                    }),
                })
            );
        });

        it('should authorize passwordless with redirect path', async () => {
            const { provider } = mockContext();
            const userid = 'test@example.com';
            const redirectPath = '/dashboard';

            const mockResponse = {
                status: 200,
                json: vi.fn(),
            };

            mockHelpers.authorizePasswordless.mockResolvedValue(mockResponse);

            const result = await authorizePasswordless(provider, {
                userid,
                redirectPath,
            });

            expect(result).toBe(mockResponse);
            expect(result.status).toBe(200);
            expect(mockHelpers.authorizePasswordless).toHaveBeenCalledWith(
                expect.objectContaining({
                    parameters: expect.objectContaining({
                        callbackURI: expect.stringContaining('redirectUrl=/dashboard'),
                    }),
                })
            );
        });

        it('should throw error on passwordless authorization failure', async () => {
            const { provider } = mockContext();
            const userid = 'test@example.com';
            const mockError = new Error('Authorization failed');

            mockHelpers.authorizePasswordless.mockRejectedValue(mockError);

            await expect(authorizePasswordless(provider, { userid })).rejects.toThrow('Authorization failed');
        });

        it('should return response with non-200 status', async () => {
            const { provider } = mockContext();
            const userid = 'test@example.com';

            const mockResponse = {
                status: 400,
                json: vi.fn().mockResolvedValue({ message: 'Bad request' }),
            };

            mockHelpers.authorizePasswordless.mockResolvedValue(mockResponse);

            const result = await authorizePasswordless(provider, { userid });

            expect(result.status).toBe(400);
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

            mockHelpers.getPasswordLessAccessToken.mockResolvedValue(mockTokenResponse);

            const result = await getPasswordLessAccessToken(provider, token);

            expect(mockHelpers.getPasswordLessAccessToken).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                credentials: expect.any(Object),
                parameters: {
                    pwdlessLoginToken: token,
                    usid: 'usid',
                },
            });
            expect(result).toEqual(mockTokenResponse);
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

            mockHelpers.getPasswordLessAccessToken.mockResolvedValue(mockTokenResponse);

            const result = await getPasswordLessAccessToken(provider, token);

            expect(mockHelpers.getPasswordLessAccessToken).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                credentials: expect.any(Object),
                parameters: {
                    pwdlessLoginToken: token,
                    usid: 'usid',
                    dnt: '1', // TrackingConsent.Declined = '1' (SDK inconsistency: this helper expects string)
                },
            });
            expect(result).toEqual(mockTokenResponse);
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

            mockHelpers.getPasswordLessAccessToken.mockResolvedValue(mockTokenResponse);

            const result = await getPasswordLessAccessToken(provider, token);

            expect(mockHelpers.getPasswordLessAccessToken).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                credentials: expect.any(Object),
                parameters: {
                    pwdlessLoginToken: token,
                    usid: 'usid',
                    // No dnt parameter
                },
            });
            expect(result).toEqual(mockTokenResponse);
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

            mockHelpers.getPasswordLessAccessToken.mockResolvedValue(mockTokenResponse);

            const result = await getPasswordLessAccessToken(provider, token);

            expect(mockHelpers.getPasswordLessAccessToken).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                credentials: expect.any(Object),
                parameters: {
                    pwdlessLoginToken: token,
                    usid: 'usid',
                    // No dnt parameter
                },
            });
            expect(result).toEqual(mockTokenResponse);
        });

        it('should serialize DNT value false to "0"', async () => {
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

            mockHelpers.getPasswordLessAccessToken.mockResolvedValue(mockTokenResponse);

            const result = await getPasswordLessAccessToken(provider, token);

            expect(mockHelpers.getPasswordLessAccessToken).toHaveBeenCalledWith({
                slasClient: expect.anything(),
                credentials: expect.any(Object),
                parameters: {
                    pwdlessLoginToken: token,
                    usid: 'usid',
                    dnt: '0', // TrackingConsent.Accepted = '0' (SDK inconsistency: this helper expects string)
                },
            });
            expect(result).toEqual(mockTokenResponse);
        });

        it('should handle invalid passwordless token', async () => {
            const { provider } = mockContext(getMockAuthData());
            const token = 'invalid-token';
            const mockError = new Error('Invalid token');

            mockHelpers.getPasswordLessAccessToken.mockRejectedValue(mockError);

            await expect(getPasswordLessAccessToken(provider, token)).rejects.toThrow('Invalid token');
        });
    });

    describe('getPasswordResetToken', () => {
        it('should request password reset token successfully with public SLAS', async () => {
            const { provider } = mockContext({}, false);
            const email = 'test@example.com';
            const mockSlasClient = await (await mockCreateClient(provider)).ShopperLogin.getInstance();

            await getPasswordResetToken(provider, { email });

            expect(mockSlasClient.getPasswordResetToken).toHaveBeenCalledWith({
                headers: {
                    Authorization: '',
                },
                body: {
                    user_id: email,
                    mode: 'callback',
                    channel_id: 'test-site',
                    client_id: 'test-client-id',
                    callback_uri: 'https://example.com/reset-password-callback',
                    hint: 'cross_device',
                },
            });

            // Verify performance timer was called
            expect(mockPerformanceTimer.mark).toHaveBeenCalledWith('authGetPasswordResetToken', 'start');
            expect(mockPerformanceTimer.mark).toHaveBeenCalledWith('authGetPasswordResetToken', 'end');
        });

        it('should request password reset token with private SLAS and include authorization header', async () => {
            const { provider } = mockContext({}, true);
            const email = 'test@example.com';
            const mockSlasClient = await (await mockCreateClient(provider)).ShopperLogin.getInstance();

            await getPasswordResetToken(provider, { email });

            expect(mockSlasClient.getPasswordResetToken).toHaveBeenCalledWith({
                headers: {
                    Authorization: expect.stringMatching(/^Basic /),
                },
                body: {
                    user_id: email,
                    mode: 'callback',
                    channel_id: 'test-site',
                    client_id: 'test-client-id',
                    callback_uri: 'https://example.com/reset-password-callback',
                    hint: 'cross_device',
                },
            });
        });

        it('should handle absolute callback URI', async () => {
            const { provider, appConfig } = mockContext({}, false);
            appConfig.site.features.resetPassword.callbackUri = 'https://custom-domain.com/reset';
            const email = 'test@example.com';
            const mockSlasClient = await (await mockCreateClient(provider)).ShopperLogin.getInstance();

            await getPasswordResetToken(provider, { email });

            expect(mockSlasClient.getPasswordResetToken).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: expect.objectContaining({
                        callback_uri: 'https://custom-domain.com/reset',
                    }),
                })
            );
        });

        it('should handle relative callback URI and prepend app origin', async () => {
            const { provider, appConfig } = mockContext({}, false);
            appConfig.site.features.resetPassword.callbackUri = '/reset-password';
            const email = 'test@example.com';
            const mockSlasClient = await (await mockCreateClient(provider)).ShopperLogin.getInstance();

            await getPasswordResetToken(provider, { email });

            expect(mockSlasClient.getPasswordResetToken).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: expect.objectContaining({
                        callback_uri: 'https://example.com/reset-password',
                    }),
                })
            );
        });

        it('should handle password reset token request failure', async () => {
            const { provider } = mockContext({}, false);
            const email = 'test@example.com';
            const mockError = new Error('Failed to send reset email');
            const mockSlasClient = await (await mockCreateClient(provider)).ShopperLogin.getInstance();
            mockSlasClient.getPasswordResetToken.mockRejectedValue(mockError);

            await expect(getPasswordResetToken(provider, { email })).rejects.toThrow('Failed to send reset email');
        });

        it('should call performance timer even on failure', async () => {
            const { provider } = mockContext({}, false);
            const email = 'test@example.com';
            const mockError = new Error('Failed to send reset email');
            const mockSlasClient = await (await mockCreateClient(provider)).ShopperLogin.getInstance();
            mockSlasClient.getPasswordResetToken.mockRejectedValue(mockError);

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
            const mockSlasClient = await (await mockCreateClient(provider)).ShopperLogin.getInstance();

            await resetPasswordWithToken(provider, { email, token, newPassword });

            expect(mockSlasClient.resetPassword).toHaveBeenCalledWith({
                headers: {
                    Authorization: '',
                },
                body: {
                    user_id: email,
                    new_password: newPassword,
                    pwd_action_token: token,
                    channel_id: 'test-site',
                    client_id: 'test-client-id',
                },
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
            const mockSlasClient = await (await mockCreateClient(provider)).ShopperLogin.getInstance();

            await resetPasswordWithToken(provider, { email, token, newPassword });

            expect(mockSlasClient.resetPassword).toHaveBeenCalledWith({
                headers: {
                    Authorization: expect.stringMatching(/^Basic /),
                },
                body: {
                    user_id: email,
                    new_password: newPassword,
                    pwd_action_token: token,
                    channel_id: 'test-site',
                    client_id: 'test-client-id',
                },
            });
        });

        it('should encode client credentials correctly for private SLAS', async () => {
            const { provider } = mockContext({}, true);
            const email = 'test@example.com';
            const token = 'reset-token-123';
            const newPassword = 'NewSecurePassword123!';
            await (await mockCreateClient(provider)).ShopperLogin.getInstance();
            await resetPasswordWithToken(provider, { email, token, newPassword });

            // Check that stringToBase64 was called with correct credentials
            const mockUtils = await import('@/lib/utils');
            expect(mockUtils.stringToBase64).toHaveBeenCalledWith('test-client-id:test-secret');
        });

        it('should handle password reset failure with invalid token', async () => {
            const { provider } = mockContext({}, false);
            const email = 'test@example.com';
            const token = 'invalid-token';
            const newPassword = 'NewSecurePassword123!';
            const mockError = new Error('Invalid or expired token');
            const mockSlasClient = await (await mockCreateClient(provider)).ShopperLogin.getInstance();
            mockSlasClient.resetPassword.mockRejectedValue(mockError);

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
            const mockSlasClient = await (await mockCreateClient(provider)).ShopperLogin.getInstance();
            mockSlasClient.resetPassword.mockRejectedValue(mockError);

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
            const mockSlasClient = await (await mockCreateClient(provider)).ShopperLogin.getInstance();
            mockSlasClient.resetPassword.mockRejectedValue(mockError);

            await expect(resetPasswordWithToken(provider, { email, token, newPassword })).rejects.toThrow();

            expect(mockPerformanceTimer.mark).toHaveBeenCalledWith('authResetPasswordWithToken', 'start');
            expect(mockPerformanceTimer.mark).toHaveBeenCalledWith('authResetPasswordWithToken', 'end');
        });

        it('should handle all parameters correctly', async () => {
            const { provider } = mockContext({}, false);
            const email = 'user+test@example.com'; // Email with special chars
            const token = 'token-with-special-chars_123==';
            const newPassword = 'P@ssw0rd!2024#Complex';
            const mockSlasClient = await (await mockCreateClient(provider)).ShopperLogin.getInstance();

            await resetPasswordWithToken(provider, { email, token, newPassword });

            expect(mockSlasClient.resetPassword).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: expect.objectContaining({
                        user_id: email,
                        new_password: newPassword,
                        pwd_action_token: token,
                    }),
                })
            );
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
            mockHelpers.loginGuestUser.mockResolvedValue(mockTokenResponse);

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
            mockHelpers.loginGuestUser.mockResolvedValue(mockTokenResponse);

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
            mockHelpers.refreshAccessToken.mockResolvedValue(mockTokenResponse);

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
            expect(mockHelpers.loginGuestUser).not.toHaveBeenCalled();
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

            // Verify access_token_expiry was set from JWT
            const expiry = storage.get('access_token_expiry');
            expect(expiry).toBeDefined();
            expect(typeof expiry).toBe('number');
            expect(expiry).toBe(exp * 1000); // Should be in milliseconds
        });

        it('should destroy all 7 cookies when isDestroyed is set', async () => {
            mockParseAllCookies.mockReturnValue({
                'cc-nx-g': 'guest-refresh-token',
            });

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

            // Verify all 7 cookies were deleted:
            // cc-nx-g, cc-nx, cc-at, usid, customerId, cc-idp-at, cc-cv
            expect(mockSerialize).toHaveBeenCalledTimes(7);
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
            mockHelpers.refreshAccessToken.mockResolvedValue(mockTokenResponse);

            await authMiddleware({ request, context, params: {} }, next);

            // Verify serialize was called multiple times
            // Cookies: refresh_token, access_token, usid, customer_id, idp_access_token,
            // delete other refresh token, delete code verifier
            expect(mockSerialize).toHaveBeenCalled();
            expect(mockSerialize.mock.calls.length).toBeGreaterThanOrEqual(6);

            // Verify tokens from mock response were serialized
            expect(mockSerialize).toHaveBeenCalledWith('refresh-token-456', expect.any(Object));
            expect(mockSerialize).toHaveBeenCalledWith('access-token-123', expect.any(Object));
            expect(mockSerialize).toHaveBeenCalledWith('usid-abc', expect.any(Object));
            expect(mockSerialize).toHaveBeenCalledWith('customer-789', expect.any(Object));
            expect(mockSerialize).toHaveBeenCalledWith('idp-access-token-123', expect.any(Object));
        });

        it('should delete other refresh token cookie when switching user types', async () => {
            mockParseAllCookies.mockReturnValue({});

            const request = new Request('https://example.com/test');

            const now = Date.now();
            const context = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();
            storage.set('isUpdated', true);
            storage.set('userType', 'registered'); // Switching from guest to registered
            storage.set('refresh_token', 'registered-refresh-token');
            storage.set('refresh_token_expiry', now + 3600000);
            storage.set('access_token', 'access-token');
            storage.set('access_token_expiry', now + 1800000);

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

            // Verify all 7 cookies were deleted due to error
            expect(mockSerialize).toHaveBeenCalledTimes(7);
        });

        it('should use getCookieNameWithSiteId to get cookie names', async () => {
            mockParseAllCookies.mockReturnValue({});
            mockgetCookieNameWithSiteId.mockImplementation((name: string) => `namespace_${name}`);

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
            expect(mockgetCookieNameWithSiteId).toHaveBeenCalledWith('cc-idp-at', context);
            expect(mockgetCookieNameWithSiteId).toHaveBeenCalledWith('cc-cv', context);
        });

        it('should handle missing cookies gracefully', async () => {
            // No cookies present
            mockParseAllCookies.mockReturnValue({});

            const mockTokenResponse = getMockTokenResponse();
            mockHelpers.loginGuestUser.mockResolvedValue(mockTokenResponse);

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
            expect(mockHelpers.loginGuestUser).toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });

        it('should prioritize registered refresh token over guest when both exist', async () => {
            // Both refresh tokens present (shouldn't happen in practice but test defensive logic)
            mockParseAllCookies.mockReturnValue({
                'cc-nx': 'registered-refresh-token',
                'cc-nx-g': 'guest-refresh-token',
            });

            const mockTokenResponse = getMockTokenResponse();
            mockHelpers.refreshAccessToken.mockResolvedValue(mockTokenResponse);

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
            expect(storage.get('refresh_token')).toBe('registered-refresh-token');
        });

        it('should read and reconstruct IDP access token from cookies', async () => {
            const mockTokenResponse = getMockTokenResponse();
            mockHelpers.loginGuestUser.mockResolvedValue(mockTokenResponse);

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
            expect(storage.get('idp_access_token')).toBe('idp-access-token');
        });

        it('should read and reconstruct code verifier from cookie', async () => {
            const mockTokenResponse = getMockTokenResponse();
            mockHelpers.loginGuestUser.mockResolvedValue(mockTokenResponse);

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

            const request = new Request('https://example.com/test');

            const now = Date.now();
            const context = new RouterContextProvider();
            const storage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();
            storage.set('isUpdated', true);
            storage.set('userType', 'guest');
            storage.set('refresh_token', 'refresh-token');
            storage.set('refresh_token_expiry', now + 3600000);
            storage.set('access_token', 'access-token');
            storage.set('access_token_expiry', now + 1800000);
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
