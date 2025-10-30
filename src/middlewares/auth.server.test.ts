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
    getPasswordLessAccessToken,
    getAuth,
    updateAuth,
    destroyAuth,
    flashAuth,
} from './auth.server';
import type { ShopperLoginTypes } from 'commerce-sdk-isomorphic';

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
}));

// Helper to create mock ShopperLogin client
function createMockShopperLoginClient() {
    return {
        getInstance: vi.fn().mockResolvedValue({
            clientConfig: {
                parameters: {
                    redirectURI: 'https://example.com/callback',
                },
            },
        }),
    };
}

function getMockTokenResponse(): ShopperLoginTypes.TokenResponse {
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
            const { provider } = mockContext(getMockAuthData());
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
            const { provider } = mockContext(getMockAuthData());
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
            const { provider } = mockContext(getMockAuthData(), true);
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

            mockHelpers.authorizePasswordless.mockResolvedValue({
                status: 200,
                json: vi.fn(),
            });

            const result = await authorizePasswordless(provider, {
                userid,
            });

            expect(result.success).toBe(true);
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

            mockHelpers.authorizePasswordless.mockResolvedValue({
                status: 200,
                json: vi.fn(),
            });

            const result = await authorizePasswordless(provider, {
                userid,
                redirectPath,
            });

            expect(result.success).toBe(true);
            expect(mockHelpers.authorizePasswordless).toHaveBeenCalledWith(
                expect.objectContaining({
                    parameters: expect.objectContaining({
                        callbackURI: expect.stringContaining('redirectUrl=/dashboard'),
                    }),
                })
            );
        });

        it('should handle passwordless authorization failure', async () => {
            const { provider } = mockContext();
            const userid = 'test@example.com';
            const mockError = new Error('Authorization failed');

            const mockExtractResponseError = (await import('@/lib/utils')).extractResponseError as any;
            mockExtractResponseError.mockResolvedValue({
                responseMessage: 'Authorization failed',
            });

            mockHelpers.authorizePasswordless.mockRejectedValue(mockError);

            const result = await authorizePasswordless(provider, { userid });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Authorization failed');
        });

        it('should handle non-200 response status', async () => {
            const { provider } = mockContext();
            const userid = 'test@example.com';

            mockHelpers.authorizePasswordless.mockResolvedValue({
                status: 400,
                json: vi.fn().mockResolvedValue({ message: 'Bad request' }),
            });

            const result = await authorizePasswordless(provider, { userid });

            expect(result.success).toBe(false);
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
});
