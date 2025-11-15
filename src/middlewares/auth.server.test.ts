import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { RouterContextProvider } from 'react-router';
import type { SessionData as AuthData } from '@/lib/api/types';
import type { AuthStorageData } from '@/middlewares/auth.utils';
import { performanceTimerContext } from '@/middlewares/performance-metrics';
import { appConfigContext, type AppConfig } from '@/config';
import { mockConfig } from '@/test-utils/config';
import {
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
        idp_refresh_token: 'idp_refresh_token',
        dnt: 'true',
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
        idp_refresh_token: 'idp_refresh_token',
        dnt: 'true',
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
            const { provider } = mockContext(getMockRegisteredAuthData());
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
            const { provider } = mockContext(getMockRegisteredAuthData());
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
            const { provider } = mockContext(getMockRegisteredAuthData(), true);
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
            const { provider } = mockContext(getMockAuthData());
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
});
