import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { authorizeIDP, loginIDPUser, handleSocialLoginLanding } from './social-login';
import {
    authorizeIDP as authorizeIDPHelper,
    loginIDPUser as loginIDPUserHelper,
} from 'commerce-sdk-isomorphic/helpers';
import createClient from '@/lib/scapi';
import { flashAuth, getAuth, updateAuth } from '@/middlewares/auth.server';
import { getConfig } from '@/config';
import { extractResponseError } from '@/lib/utils';
import { mergeBasket } from '@/lib/api/basket';

vi.mock('commerce-sdk-isomorphic/helpers', () => ({
    authorizeIDP: vi.fn(),
    loginIDPUser: vi.fn(),
}));

vi.mock('@/lib/scapi', () => ({
    default: vi.fn(() => ({
        ShopperLogin: {
            getInstance: vi.fn(() =>
                Promise.resolve({
                    clientConfig: {
                        parameters: {
                            redirectURI: 'https://default.example/callback',
                        },
                    },
                })
            ),
        },
    })),
}));

vi.mock('@/middlewares/auth.server', () => ({
    flashAuth: vi.fn(),
    getAuth: vi.fn(() => ({ usid: 'session-usid', codeVerifier: 'stored-code-verifier' })),
    updateAuth: vi.fn(),
}));

vi.mock('@/config', () => ({
    getConfig: vi.fn(() => ({
        commerce: {
            api: {
                privateKeyEnabled: false,
            },
        },
    })),
}));

vi.mock('@/lib/utils', () => ({
    extractResponseError: vi.fn((err?: any) => Promise.resolve({ responseMessage: (err && err.message) || 'error' })),
}));

const mockedHelpers = {
    authorizeIDP: vi.mocked(authorizeIDPHelper),
    loginIDPUser: vi.mocked(loginIDPUserHelper),
};

describe('Social Login', () => {
    const mockContext = {} as unknown as ActionFunctionArgs['context'];
    const scapi = vi.mocked(createClient);
    const auth = {
        flashAuth: vi.mocked(flashAuth),
        getAuth: vi.mocked(getAuth),
        updateAuth: vi.mocked(updateAuth),
    };
    const cfg = { getConfig: vi.mocked(getConfig) };
    const utils = { extractResponseError: vi.mocked(extractResponseError) };

    beforeEach(() => {
        vi.clearAllMocks();
        // default config
        cfg.getConfig.mockReturnValue({ commerce: { api: { privateKeyEnabled: false } } } as any);
        // default auth session
        auth.getAuth.mockReturnValue({ usid: 'session-usid', codeVerifier: 'stored-code-verifier' } as any);
        // default scapi redirectURI already set in mock
    });

    afterEach(() => {
        delete (process as any).env.COMMERCE_API_SLAS_SECRET;
    });

    describe('authorizeIDP', () => {
        it('calls helper with correct args and updates session (public client)', async () => {
            const expectedUrl = 'https://slas/idp/auth-url';
            const expectedVerifier = 'code-verifier-123';
            mockedHelpers.authorizeIDP.mockResolvedValue({ url: expectedUrl, codeVerifier: expectedVerifier } as any);

            const result = await authorizeIDP(mockContext, {
                hint: 'Google',
                // omit redirectURI to ensure fallback to slas client config
            });

            // ensure SCAPI ShopperLogin instance was requested
            expect(scapi).toHaveBeenCalledWith(mockContext);

            // helper called with composed args
            expect(mockedHelpers.authorizeIDP).toHaveBeenCalledWith({
                slasClient: expect.any(Object),
                parameters: {
                    redirectURI: 'https://default.example/callback',
                    hint: 'Google',
                    usid: 'session-usid',
                },
                privateClient: false,
            });

            // session updated with codeVerifier
            expect(auth.updateAuth).toHaveBeenCalledWith(mockContext, expect.any(Function));

            expect(result).toEqual({ success: true, redirectUrl: expectedUrl });
        });

        it('passes explicit redirectURI and privateClient=true when configured', async () => {
            cfg.getConfig.mockReturnValue({ commerce: { api: { privateKeyEnabled: true } } } as any);
            mockedHelpers.authorizeIDP.mockResolvedValue({ url: 'x', codeVerifier: 'y' } as any);

            const result = await authorizeIDP(mockContext, {
                hint: 'Apple',
                redirectURI: 'https://app.example/social-callback',
                usid: 'param-usid',
            });

            expect(mockedHelpers.authorizeIDP).toHaveBeenCalledWith({
                slasClient: expect.any(Object),
                parameters: {
                    redirectURI: 'https://app.example/social-callback',
                    hint: 'Apple',
                    usid: 'param-usid',
                },
                privateClient: true,
            });

            expect(result.success).toBe(true);
        });

        it('handles errors and flashes message', async () => {
            const err = new Error('boom');
            mockedHelpers.authorizeIDP.mockRejectedValue(err);
            utils.extractResponseError.mockResolvedValue({ responseMessage: 'boom' } as any);

            const result = await authorizeIDP(mockContext, { hint: 'Google' });

            expect(auth.flashAuth).toHaveBeenCalledWith(mockContext, 'boom');
            expect(result).toEqual({ success: false, error: 'boom' });
        });
    });

    describe('loginIDPUser', () => {
        it('calls helper with correct args (public client, no clientSecret)', async () => {
            mockedHelpers.loginIDPUser.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' } as any);

            const result = await loginIDPUser(mockContext, {
                code: 'auth-code',
                redirectURI: 'https://app.example/social-callback',
            });

            expect(mockedHelpers.loginIDPUser).toHaveBeenCalledWith({
                slasClient: expect.any(Object),
                credentials: {
                    codeVerifier: 'stored-code-verifier',
                },
                parameters: {
                    redirectURI: 'https://app.example/social-callback',
                    code: 'auth-code',
                    usid: 'session-usid',
                },
            });

            // Tokens saved and codeVerifier cleared via two updateAuth calls
            expect(auth.updateAuth).toHaveBeenCalledTimes(2);
            expect(result).toEqual({ success: true });
        });

        it('includes clientSecret when privateKeyEnabled=true', async () => {
            cfg.getConfig.mockReturnValue({ commerce: { api: { privateKeyEnabled: true } } } as any);
            (process as any).env.COMMERCE_API_SLAS_SECRET = 'super-secret';
            mockedHelpers.loginIDPUser.mockResolvedValue({ accessToken: 'at' } as any);

            await loginIDPUser(mockContext, {
                code: 'auth-code',
                redirectURI: 'https://app.example/social-callback',
                usid: 'explicit-usid',
            });

            expect(mockedHelpers.loginIDPUser).toHaveBeenCalledWith({
                slasClient: expect.any(Object),
                credentials: {
                    codeVerifier: 'stored-code-verifier',
                    clientSecret: 'super-secret',
                },
                parameters: {
                    redirectURI: 'https://app.example/social-callback',
                    code: 'auth-code',
                    usid: 'explicit-usid',
                },
            });
        });

        it('handles missing codeVerifier by flashing error and returning failure', async () => {
            auth.getAuth.mockReturnValue({ usid: 'session-usid', codeVerifier: undefined } as any);
            utils.extractResponseError.mockResolvedValue({ responseMessage: 'Code verifier missing' } as any);

            const result = await loginIDPUser(mockContext, {
                code: 'auth-code',
                redirectURI: 'https://app.example/social-callback',
            });

            expect(auth.flashAuth).toHaveBeenCalledWith(mockContext, 'Code verifier missing');
            expect(result).toEqual({ success: false, error: 'Code verifier missing' });
            expect(mockedHelpers.loginIDPUser).not.toHaveBeenCalled();
        });

        it('handles helper error and flashes message', async () => {
            mockedHelpers.loginIDPUser.mockRejectedValue(new Error('login failed'));
            utils.extractResponseError.mockResolvedValue({ responseMessage: 'login failed' } as any);

            const result = await loginIDPUser(mockContext, {
                code: 'auth-code',
                redirectURI: 'https://app.example/social-callback',
            });

            expect(auth.flashAuth).toHaveBeenCalledWith(mockContext, 'login failed');
            expect(result).toEqual({ success: false, error: 'login failed' });
        });
    });
});

vi.mock('@/lib/api/basket', () => ({
    mergeBasket: vi.fn(),
}));

vi.mock('@/temp-ui-string', () => ({
    default: {
        socialCallback: {
            socialError: 'Social login error',
        },
    },
}));

const mockFlashAuth = vi.mocked(flashAuth);
const mockMergeBasket = vi.mocked(mergeBasket);
const mockGetConfig = vi.mocked(getConfig);
const mockGetAuth = vi.mocked(getAuth);

describe('handleSocialLoginCallback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedHelpers.loginIDPUser.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' } as any);
        mockGetAuth.mockReturnValue({ usid: 'session-usid', codeVerifier: 'stored-code-verifier' } as any);

        // Default config mock
        mockGetConfig.mockReturnValue({
            commerce: {
                api: {
                    privateKeyEnabled: false,
                },
            },
            site: {
                features: {
                    socialLogin: {
                        callbackUri: '/social-callback',
                    },
                },
            },
        } as any);
    });

    describe('Successful Login Flow', () => {
        it('should handle successful login with code and usid', async () => {
            mockMergeBasket.mockResolvedValue({
                basketId: 'merged-basket-123',
                productItems: [{ productId: 'test-product' }],
            } as any);

            const mockRequest = new Request(
                'http://localhost:5173/social-callback?code=auth_code_123&usid=user_session_id'
            );
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await handleSocialLoginLanding(args);

            expect(mockedHelpers.loginIDPUser).toHaveBeenCalledTimes(1);
            const loginCall = mockedHelpers.loginIDPUser.mock.calls[0]?.[0];
            expect(loginCall?.parameters).toMatchObject({
                code: 'auth_code_123',
                usid: 'user_session_id',
                redirectURI: 'http://localhost:5173/social-callback',
            });
            expect(mockMergeBasket).toHaveBeenCalledWith(mockContext);
            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(302);
            expect(result.headers.get('Location')).toBe('/');
        });

        it('should handle successful login without usid parameter', async () => {
            mockMergeBasket.mockResolvedValue({
                basketId: 'merged-basket-123',
            } as any);

            const mockRequest = new Request('http://localhost:5173/social-callback?code=auth_code_123');
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await handleSocialLoginLanding(args);

            expect(mockedHelpers.loginIDPUser).toHaveBeenCalledTimes(1);
            const loginCall = mockedHelpers.loginIDPUser.mock.calls[0]?.[0];
            expect(loginCall?.parameters).toMatchObject({
                code: 'auth_code_123',
                usid: 'session-usid',
                redirectURI: 'http://localhost:5173/social-callback',
            });
            expect(result.status).toBe(302);
            expect(result.headers.get('Location')).toBe('/');
        });

        it('should handle basket merge errors gracefully and still redirect', async () => {
            mockMergeBasket.mockRejectedValue(new Error('Basket merge failed'));

            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const mockRequest = new Request('http://localhost:5173/social-callback?code=auth_code_123');
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await handleSocialLoginLanding(args);

            expect(mockMergeBasket).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith('[Social Login] Failed to merge basket:', expect.any(Error));
            // Should still redirect to home despite basket merge failure
            expect(result.status).toBe(302);
            expect(result.headers.get('Location')).toBe('/');

            consoleErrorSpy.mockRestore();
        });

        it('should use config callbackUri for redirectURI construction', async () => {
            mockGetConfig.mockReturnValue({
                commerce: {
                    api: {
                        privateKeyEnabled: false,
                    },
                },
                site: {
                    features: {
                        socialLogin: {
                            callbackUri: '/custom-callback',
                        },
                    },
                },
            } as any);

            mockMergeBasket.mockResolvedValue({ basketId: 'test' } as any);

            const mockRequest = new Request('http://localhost:5173/custom-callback?code=test');
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            await handleSocialLoginLanding(args);

            const loginCall = mockedHelpers.loginIDPUser.mock.calls[0]?.[0];
            expect(loginCall?.parameters).toMatchObject({
                code: 'test',
                usid: 'session-usid',
                redirectURI: 'http://localhost:5173/custom-callback',
            });
        });
    });

    describe('Failed Login', () => {
        it('should redirect to login on failed IDP login', async () => {
            mockedHelpers.loginIDPUser.mockRejectedValue(new Error('Invalid code'));

            const mockRequest = new Request('http://localhost:5173/social-callback?code=invalid_code');
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await handleSocialLoginLanding(args);

            expect(mockedHelpers.loginIDPUser).toHaveBeenCalled();
            expect(mockMergeBasket).not.toHaveBeenCalled();
            expect(result.status).toBe(302);
            expect(result.headers.get('Location')).toBe('/login');
        });
    });

    describe('Error Handling', () => {
        it('should redirect to login on error from social provider', async () => {
            const mockRequest = new Request('http://localhost:5173/social-callback?error=access_denied');
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await handleSocialLoginLanding(args);

            expect(mockFlashAuth).toHaveBeenCalledWith(mockContext, 'Social login error');
            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(302);
            expect(result.headers.get('Location')).toBe('/login');
        });

        it('should redirect to login when no code or error provided', async () => {
            const mockRequest = new Request('http://localhost:5173/social-callback');
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await handleSocialLoginLanding(args);

            expect(mockedHelpers.loginIDPUser).not.toHaveBeenCalled();
            expect(mockMergeBasket).not.toHaveBeenCalled();
            expect(result.status).toBe(302);
            expect(result.headers.get('Location')).toBe('/login');
        });
    });
});
