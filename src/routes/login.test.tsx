import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LoaderFunctionArgs, ActionFunctionArgs, ClientActionFunctionArgs } from 'react-router';
import Login, { loader, action, clientAction } from './login';
import { render, screen } from '@testing-library/react';
import { getAuth, authorizePasswordless, flashAuth } from '@/middlewares/auth.server';
import { getAuth as getClientAuth, updateAuth } from '@/middlewares/auth.client';
import { updateBasket } from '@/middlewares/basket.client';
import { loginRegisteredUser } from '@/lib/api/auth/standard-login';
import { authorizeIDP } from '@/lib/api/auth/social-login';
import { mergeBasket } from '@/lib/api/basket';
import { getAppOrigin, isAbsoluteURL, extractResponseError } from '@/lib/utils';

vi.mock('@/middlewares/auth.server', () => ({
    getAuth: vi.fn(),
    authorizePasswordless: vi.fn(),
    flashAuth: vi.fn(),
}));

vi.mock('@/middlewares/auth.client', () => ({
    getAuth: vi.fn(),
    updateAuth: vi.fn(),
}));

vi.mock('@/middlewares/basket.client', () => ({
    updateBasket: vi.fn(),
}));

vi.mock('@/lib/api/auth/standard-login', () => ({
    loginRegisteredUser: vi.fn(),
}));

vi.mock('@/lib/api/auth/social-login', () => ({
    authorizeIDP: vi.fn(),
}));

vi.mock('@/lib/api/basket', () => ({
    mergeBasket: vi.fn(),
}));

vi.mock('@/lib/utils', () => ({
    isPasswordlessLoginEnabled: false,
    getAppOrigin: vi.fn(),
    isAbsoluteURL: vi.fn((url: string) => /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)),
    extractResponseError: vi.fn((err?: unknown) => ({
        responseMessage: err instanceof Error ? err.message : 'error',
    })),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
}));

// Mock child components to make component rendering assertions stable
vi.mock('@/components/login/standard-login-form', () => ({
    __esModule: true,
    default: () => <div data-testid="standard-form" />,
}));
vi.mock('@/components/login/passwordless-login-form', () => ({
    __esModule: true,
    default: () => <div data-testid="passwordless-form" />,
}));
vi.mock('@/components/buttons/social-login-buttons', () => ({
    __esModule: true,
    SocialLoginButtons: () => <div data-testid="social-buttons" />,
}));

vi.mock('@/config', () => ({
    getConfig: vi.fn(() => ({
        site: {
            features: {
                passwordlessLogin: {
                    enabled: true,
                    landingUri: '/passwordless-login-landing',
                    callbackUri: '/passwordless-login-callback',
                },
                socialLogin: {
                    enabled: true,
                    callbackUri: '/social-callback',
                    providers: ['Apple', 'Google'],
                },
            },
        },
        commerce: {
            api: {
                privateKeyEnabled: false,
            },
        },
    })),
}));

// Get mocked functions
const mockGetAuth = vi.mocked(getAuth);
const mockGetClientAuth = vi.mocked(getClientAuth);
const mockUpdateAuth = vi.mocked(updateAuth);
const mockUpdateBasket = vi.mocked(updateBasket);
const mockLoginRegisteredUser = vi.mocked(loginRegisteredUser);
const mockAuthorizeIDP = vi.mocked(authorizeIDP);
const mockAuthorizePasswordless = vi.mocked(authorizePasswordless);
const mockMergeBasket = vi.mocked(mergeBasket);
const mockGetAppOrigin = vi.mocked(getAppOrigin);
const mockIsAbsoluteURL = vi.mocked(isAbsoluteURL);
const mockExtractResponseError = vi.mocked(extractResponseError);
const mockFlashAuth = vi.mocked(flashAuth);

describe('Login Route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetAppOrigin.mockReturnValue('http://localhost:5173');
        mockIsAbsoluteURL.mockImplementation((url: string) => /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url));
        mockExtractResponseError.mockResolvedValue({ responseMessage: 'error' } as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('loader', () => {
        it('should redirect to home if user is already logged in', () => {
            mockGetAuth.mockReturnValue({
                access_token: 'valid-token',
                access_token_expiry: Date.now() + 10000,
                userType: 'registered',
                customer_id: 'customer-123',
            });

            const mockRequest = new Request('http://localhost:5173/login');
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = loader(args);

            expect(result).toHaveProperty('status', 302);
            expect(result).toHaveProperty('headers');
            if (result instanceof Response) {
                expect(result.headers.get('Location')).toBe('/');
            }
        });

        it('should redirect to returnUrl if user is already logged in and returnUrl is provided', () => {
            mockGetAuth.mockReturnValue({
                access_token: 'valid-token',
                access_token_expiry: Date.now() + 10000,
                userType: 'registered',
                customer_id: 'customer-123',
            });

            const mockRequest = new Request('http://localhost:5173/login?returnUrl=/product/123');
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = loader(args);

            expect(result).toHaveProperty('status', 302);
            if (result instanceof Response) {
                expect(result.headers.get('Location')).toBe('/product/123');
            }
        });

        it('should return loader data for guest user', () => {
            mockGetAuth.mockReturnValue({
                userType: 'guest',
            });

            const mockRequest = new Request('http://localhost:5173/login');
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = loader(args);

            // Check if result is not a Response (redirect)
            if (!(result instanceof Response)) {
                expect(result).toHaveProperty('mode');
                expect(result.mode).toBe('password');
            }
        });

        it('should parse passwordless sent state from URL', () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });

            const mockRequest = new Request('http://localhost:5173/login?passwordless=sent&email=test@example.com');
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = loader(args);

            if (!(result instanceof Response)) {
                expect(result.passwordlessSent).toBe(true);
                expect(result.email).toBe('test@example.com');
            }
        });

        it('should parse mode from URL query parameter', () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });

            const mockRequest = new Request('http://localhost:5173/login?mode=passwordless');
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = loader(args);

            if (!(result instanceof Response)) {
                expect(result.mode).toBe('passwordless');
            }
        });

        it('should include error from session', () => {
            mockGetAuth.mockReturnValue({
                userType: 'guest',
                error: 'Invalid credentials',
            });

            const mockRequest = new Request('http://localhost:5173/login');
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = loader(args);

            if (!(result instanceof Response)) {
                expect(result.error).toBe('Invalid credentials');
            }
        });

        it('should parse returnUrl, action, and actionParams from URL', () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });

            const mockRequest = new Request(
                'http://localhost:5173/login?returnUrl=/product/123&action=addToCart&actionParams=%7B%22productId%22%3A%22123%22%7D'
            );
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = loader(args);

            if (!(result instanceof Response)) {
                expect(result.returnUrl).toBe('/product/123');
                expect(result.action).toBe('addToCart');
                expect(result.actionParams).toBe('{"productId":"123"}');
            }
        });

        it('should include isSocialLoginEnabled in loader data', () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });

            const mockRequest = new Request('http://localhost:5173/login');
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = loader(args);

            if (!(result instanceof Response)) {
                expect(result.isSocialLoginEnabled).toBe(true);
            }
        });
    });

    describe('action - Standard Login', () => {
        it('should handle successful standard login', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockLoginRegisteredUser.mockResolvedValue({ success: true });

            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');
            formData.append('loginMode', 'password');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                body: formData,
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result).toBeInstanceOf(Array);
            expect(result[0]).toBe('/');
            expect(mockLoginRegisteredUser).toHaveBeenCalledWith(mockContext, {
                email: 'test@example.com',
                password: 'password123',
            });
        });

        it('should redirect to returnUrl on successful login', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockLoginRegisteredUser.mockResolvedValue({ success: true });

            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');
            formData.append('loginMode', 'password');
            formData.append('returnUrl', '/product/123');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                body: formData,
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result[0]).toBe('/product/123');
        });

        it('should preserve action and actionParams in returnUrl on successful login', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockLoginRegisteredUser.mockResolvedValue({ success: true });

            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');
            formData.append('loginMode', 'password');
            formData.append('returnUrl', '/product/123');
            formData.append('action', 'addToCart');
            formData.append('actionParams', '{"productId":"123"}');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                body: formData,
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result[0]).toContain('/product/123');
            expect(result[0]).toContain('action=addToCart');
            expect(result[0]).toContain('actionParams=');
        });

        it('should preserve returnUrl, action, and actionParams on failed login', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockLoginRegisteredUser.mockResolvedValue({ success: false });

            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'wrong-password');
            formData.append('loginMode', 'password');
            formData.append('returnUrl', '/product/123');
            formData.append('action', 'addToCart');
            formData.append('actionParams', '{"productId":"123"}');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                body: formData,
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result[0]).toContain('mode=password');
            // URL params are encoded, so check for encoded version
            expect(result[0]).toContain('returnUrl=');
            expect(decodeURIComponent(result[0])).toContain('returnUrl=/product/123');
            expect(result[0]).toContain('action=addToCart');
            expect(result[0]).toContain('actionParams=');
        });

        it('should redirect back to login on failed standard login', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockLoginRegisteredUser.mockResolvedValue({ success: false });

            const formData = new FormData();
            formData.append('email', 'test@example.com');
            formData.append('password', 'wrong-password');
            formData.append('loginMode', 'password');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                body: formData,
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result[0]).toBe('/login?mode=password');
        });

        it('should require both email and password for standard login', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });

            const formData = new FormData();
            formData.append('email', 'test@example.com');
            // Missing password

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                body: formData,
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result[0]).toBe('/login?mode=password');
            expect(mockLoginRegisteredUser).not.toHaveBeenCalled();
        });
    });

    describe('action - Social Login', () => {
        it('should handle successful social login authorization', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockAuthorizeIDP.mockResolvedValue({
                success: true,
                redirectUrl:
                    'http://localhost:5173/mobify/proxy/api/shopper/auth/v1/organizations/test/oauth2/authorize',
            });

            const formData = new FormData();
            formData.append('loginMode', 'social');
            formData.append('provider', 'Google');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                body: formData,
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result[0]).toContain('oauth2/authorize');
            expect(mockAuthorizeIDP).toHaveBeenCalledWith(mockContext, {
                hint: 'Google',
                redirectURI: 'http://localhost:5173/social-callback',
            });
        });

        it('should pass provider hint as-is for social login', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockAuthorizeIDP.mockResolvedValue({
                success: true,
                redirectUrl: 'http://example.com/oauth',
            });

            const formData = new FormData();
            formData.append('loginMode', 'social');
            formData.append('provider', 'Google');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                body: formData,
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            await action(args);

            expect(mockAuthorizeIDP).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    hint: 'Google',
                })
            );
        });

        it('should require provider for social login', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });

            const formData = new FormData();
            formData.append('loginMode', 'social');
            // Missing provider

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                body: formData,
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result[0]).toBe('/login?mode=password');
            expect(mockAuthorizeIDP).not.toHaveBeenCalled();
        });

        it('should redirect back to login on failed social authorization', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockAuthorizeIDP.mockResolvedValue({ success: false });

            const formData = new FormData();
            formData.append('loginMode', 'social');
            formData.append('provider', 'Google');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                body: formData,
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result[0]).toBe('/login?mode=password');
        });
    });

    describe('action - Passwordless Login', () => {
        it('should handle successful passwordless authorization', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockAuthorizePasswordless.mockResolvedValue(new Response(null, { status: 202 }));

            const formData = new FormData();
            formData.append('loginMode', 'passwordless');
            formData.append('email', 'test@example.com');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                body: formData,
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result[0]).toBe('/login?passwordless=sent&email=test%40example.com');
            expect(mockAuthorizePasswordless).toHaveBeenCalledWith(
                mockContext,
                expect.objectContaining({
                    userid: 'test@example.com',
                })
            );
        });

        it('should require email for passwordless login', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });

            const formData = new FormData();
            formData.append('loginMode', 'passwordless');
            // Missing email

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                body: formData,
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result[0]).toBe('/login?mode=passwordless');
            expect(mockAuthorizePasswordless).not.toHaveBeenCalled();
        });

        it('should redirect back to passwordless mode on failure', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            const error = new Error('failed to authorize');
            mockAuthorizePasswordless.mockRejectedValue(error);

            const formData = new FormData();
            formData.append('loginMode', 'passwordless');
            formData.append('email', 'test@example.com');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                body: formData,
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result[0]).toBe('/login?mode=passwordless');
            expect(mockAuthorizePasswordless).toHaveBeenCalledWith(
                mockContext,
                expect.objectContaining({
                    userid: 'test@example.com',
                })
            );
            expect(mockExtractResponseError).toHaveBeenCalledWith(error);
            expect(mockFlashAuth).toHaveBeenCalledWith(mockContext, 'error');
        });
    });

    describe('clientAction', () => {
        it('should update auth and redirect on successful login', async () => {
            const mockServerAction = vi
                .fn()
                .mockResolvedValue(['/', { userType: 'registered', customer_id: 'test-123' }]);
            mockGetClientAuth.mockReturnValue({ userType: 'guest' });

            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ClientActionFunctionArgs = {
                request: new Request('http://localhost:5173/login'),
                params: {},
                context: mockContext,
                serverAction: mockServerAction,
            } as any;

            const result = await clientAction(args);

            expect(mockUpdateAuth).toHaveBeenCalled();
            expect(result).toHaveProperty('status', 302);
        });

        it('should merge basket when transitioning from guest to registered', async () => {
            const mockBasket = { basketId: 'merged-basket', productItems: [] };
            const mockServerAction = vi
                .fn()
                .mockResolvedValue(['/', { userType: 'registered', customer_id: 'test-123' }]);
            mockGetClientAuth.mockReturnValue({ userType: 'guest' });
            mockMergeBasket.mockResolvedValue(mockBasket);

            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ClientActionFunctionArgs = {
                request: new Request('http://localhost:5173/login'),
                params: {},
                context: mockContext,
                serverAction: mockServerAction,
            } as any;

            await clientAction(args);

            expect(mockMergeBasket).toHaveBeenCalledWith(mockContext);
            expect(mockUpdateBasket).toHaveBeenCalledWith(mockContext, mockBasket);
        });

        it('should not merge basket if already registered', async () => {
            const mockServerAction = vi
                .fn()
                .mockResolvedValue(['/', { userType: 'registered', customer_id: 'test-123' }]);
            mockGetClientAuth.mockReturnValue({ userType: 'registered' });

            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ClientActionFunctionArgs = {
                request: new Request('http://localhost:5173/login'),
                params: {},
                context: mockContext,
                serverAction: mockServerAction,
            } as any;

            await clientAction(args);

            expect(mockMergeBasket).not.toHaveBeenCalled();
        });

        it('should handle basket merge errors gracefully', async () => {
            const mockServerAction = vi
                .fn()
                .mockResolvedValue(['/', { userType: 'registered', customer_id: 'test-123' }]);
            mockGetClientAuth.mockReturnValue({ userType: 'guest' });
            mockMergeBasket.mockRejectedValue(new Error('Basket merge failed'));

            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ClientActionFunctionArgs = {
                request: new Request('http://localhost:5173/login'),
                params: {},
                context: mockContext,
                serverAction: mockServerAction,
            } as any;

            const result = await clientAction(args);

            expect(consoleErrorSpy).toHaveBeenCalledWith('[Standard Login] Failed to merge basket:', expect.any(Error));
            expect(result).toHaveProperty('status', 302); // Should still redirect

            consoleErrorSpy.mockRestore();
        });

        it('should use window.location.assign for absolute URLs', async () => {
            const mockServerAction = vi
                .fn()
                .mockResolvedValue(['http://localhost:5173/mobify/proxy/api/oauth', { userType: 'guest' }]);
            mockGetClientAuth.mockReturnValue({ userType: 'guest' });

            // Mock window.location.assign
            const mockAssign = vi.fn();
            Object.defineProperty(window, 'location', {
                value: { assign: mockAssign },
                writable: true,
            });

            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ClientActionFunctionArgs = {
                request: new Request('http://localhost:5173/login'),
                params: {},
                context: mockContext,
                serverAction: mockServerAction,
            } as any;

            const result = await clientAction(args);

            expect(mockAssign).toHaveBeenCalledWith('http://localhost:5173/mobify/proxy/api/oauth');
            expect(result).toBeNull();
        });

        it('should use React Router redirect for relative URLs', async () => {
            const mockServerAction = vi.fn().mockResolvedValue(['/dashboard', { userType: 'registered' }]);
            mockGetClientAuth.mockReturnValue({ userType: 'guest' });

            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ClientActionFunctionArgs = {
                request: new Request('http://localhost:5173/login'),
                params: {},
                context: mockContext,
                serverAction: mockServerAction,
            } as any;

            const result = await clientAction(args);

            expect(result).toHaveProperty('status', 302);
            if (result) {
                expect(result.headers.get('Location')).toBe('/dashboard');
            }
        });
    });

    describe('component', () => {
        it('renders StandardLoginForm when mode is password', () => {
            render(
                <Login
                    loaderData={{
                        error: undefined,
                        passwordlessSent: false,
                        email: undefined,
                        mode: 'password',
                        isPasswordlessLoginEnabled: false,
                        isSocialLoginEnabled: true,
                        returnUrl: null,
                        action: null,
                        actionParams: null,
                    }}
                />
            );

            expect(screen.getByTestId('standard-form')).toBeInTheDocument();
            expect(screen.getByTestId('social-buttons')).toBeInTheDocument();
        });

        it('passes returnUrl, action, and actionParams to StandardLoginForm', () => {
            const loaderData = {
                error: undefined,
                passwordlessSent: false,
                email: undefined,
                mode: 'password',
                isPasswordlessLoginEnabled: false,
                isSocialLoginEnabled: true,
                returnUrl: '/product/123',
                action: 'addToCart',
                actionParams: '{"productId":"123"}',
            };

            render(<Login loaderData={loaderData} />);

            expect(screen.getByTestId('standard-form')).toBeInTheDocument();
        });

        it('renders PasswordlessLoginForm when mode is passwordless', () => {
            render(
                <Login
                    loaderData={{
                        error: undefined,
                        passwordlessSent: false,
                        email: undefined,
                        mode: 'passwordless',
                        isPasswordlessLoginEnabled: true,
                        isSocialLoginEnabled: true,
                        returnUrl: null,
                        action: null,
                        actionParams: null,
                    }}
                />
            );

            expect(screen.getByTestId('passwordless-form')).toBeInTheDocument();
            expect(screen.getByTestId('social-buttons')).toBeInTheDocument();
        });

        it('hides social login buttons when social login is disabled', () => {
            render(
                <Login
                    loaderData={{
                        error: undefined,
                        passwordlessSent: false,
                        email: undefined,
                        mode: 'password',
                        isPasswordlessLoginEnabled: false,
                        isSocialLoginEnabled: false,
                        returnUrl: null,
                        action: null,
                        actionParams: null,
                    }}
                />
            );

            expect(screen.getByTestId('standard-form')).toBeInTheDocument();
            expect(screen.queryByTestId('social-buttons')).not.toBeInTheDocument();
        });
    });
});
