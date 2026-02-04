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
import {
    createRoutesStub,
    type LoaderFunctionArgs,
    type ActionFunctionArgs,
    type ClientActionFunctionArgs,
} from 'react-router';
import Login, { loader, action, clientAction } from './_empty.login';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getAuth, authorizePasswordless } from '@/middlewares/auth.server';
import { getAuth as getClientAuth, updateAuth } from '@/middlewares/auth.client';
import { updateBasketResource } from '@/middlewares/basket.server';
import { loginRegisteredUser } from '@/lib/api/auth/standard-login';
import { authorizeIDP } from '@/lib/api/auth/social-login';
import { mergeBasket } from '@/lib/api/basket';
import { getAppOrigin, isAbsoluteURL, extractResponseError } from '@/lib/utils';

vi.mock('@/middlewares/auth.server', () => ({
    getAuth: vi.fn(),
    authorizePasswordless: vi.fn(),
}));

vi.mock('@/middlewares/auth.client', () => ({
    getAuth: vi.fn(),
    updateAuth: vi.fn(),
}));

vi.mock('@/middlewares/basket.server', () => ({
    updateBasketResource: vi.fn(),
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

// Mock passwordless form since we're focusing on standard login full-flow tests
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
        commerce: {
            api: {
                privateKeyEnabled: false,
            },
        },
    })),
}));

vi.mock('@/lib/i18next', () => ({
    getTranslation: vi.fn(() => ({
        t: vi.fn((key: string) => {
            if (key === 'errors:genericTryAgain') {
                return 'An error occurred. Please try again.';
            }
            return key;
        }),
    })),
}));

// Get mocked functions
const mockGetAuth = vi.mocked(getAuth);
const mockGetClientAuth = vi.mocked(getClientAuth);
const mockUpdateAuth = vi.mocked(updateAuth);
const mockUpdateBasket = vi.mocked(updateBasketResource);
const mockLoginRegisteredUser = vi.mocked(loginRegisteredUser);
const mockAuthorizeIDP = vi.mocked(authorizeIDP);
const mockAuthorizePasswordless = vi.mocked(authorizePasswordless);
const mockMergeBasket = vi.mocked(mergeBasket);
const mockGetAppOrigin = vi.mocked(getAppOrigin);
const mockIsAbsoluteURL = vi.mocked(isAbsoluteURL);
const mockExtractResponseError = vi.mocked(extractResponseError);

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
            // Mock getAuth to return registered user auth after successful login
            mockGetAuth.mockReturnValue({
                userType: 'registered',
                customer_id: 'test-customer-123',
                access_token: 'test-token',
            });
            mockLoginRegisteredUser.mockResolvedValue({ success: true });

            const formData = new URLSearchParams();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');
            formData.append('loginMode', 'password');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result).toHaveProperty('redirectUrl', '/');
            expect(result).toHaveProperty('auth');
            expect(result.auth).toMatchObject({ userType: 'registered' });
            expect(mockLoginRegisteredUser).toHaveBeenCalledWith(mockContext, {
                email: 'test@example.com',
                password: 'password123',
            });
        });

        it('should redirect to returnUrl on successful login', async () => {
            mockGetAuth.mockReturnValue({
                userType: 'registered',
                customer_id: 'test-customer-123',
                access_token: 'test-token',
            });
            mockLoginRegisteredUser.mockResolvedValue({ success: true });

            const formData = new URLSearchParams();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');
            formData.append('loginMode', 'password');
            formData.append('returnUrl', '/product/123');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result).toHaveProperty('redirectUrl', '/product/123');
            expect(result).toHaveProperty('auth');
        });

        it('should preserve action and actionParams in returnUrl on successful login', async () => {
            mockGetAuth.mockReturnValue({
                userType: 'registered',
                customer_id: 'test-customer-123',
                access_token: 'test-token',
            });
            mockLoginRegisteredUser.mockResolvedValue({ success: true });

            const formData = new URLSearchParams();
            formData.append('email', 'test@example.com');
            formData.append('password', 'password123');
            formData.append('loginMode', 'password');
            formData.append('returnUrl', '/product/123');
            formData.append('action', 'addToCart');
            formData.append('actionParams', '{"productId":"123"}');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result.redirectUrl).toContain('/product/123');
            expect(result.redirectUrl).toContain('action=addToCart');
            expect(result.redirectUrl).toContain('actionParams=');
            expect(result).toHaveProperty('auth');
        });

        it('should return error on failed login', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockLoginRegisteredUser.mockResolvedValue({ success: false });

            const formData = new URLSearchParams();
            formData.append('email', 'test@example.com');
            formData.append('password', 'wrong-password');
            formData.append('loginMode', 'password');
            formData.append('returnUrl', '/product/123');
            formData.append('action', 'addToCart');
            formData.append('actionParams', '{"productId":"123"}');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result).toHaveProperty('error', 'An error occurred. Please try again.');
        });

        it('should return error on failed standard login', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockLoginRegisteredUser.mockResolvedValue({ success: false });

            const formData = new URLSearchParams();
            formData.append('email', 'test@example.com');
            formData.append('password', 'wrong-password');
            formData.append('loginMode', 'password');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result).toHaveProperty('error', 'An error occurred. Please try again.');
        });

        it('should require both email and password for standard login', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });

            const formData = new URLSearchParams();
            formData.append('email', 'test@example.com');
            // Missing password

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result).toHaveProperty('error', 'An error occurred. Please try again.');
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

            const formData = new URLSearchParams();
            formData.append('loginMode', 'social');
            formData.append('provider', 'Google');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result.redirectUrl).toContain('oauth2/authorize');
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

            const formData = new URLSearchParams();
            formData.append('loginMode', 'social');
            formData.append('provider', 'Google');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
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

            const formData = new URLSearchParams();
            formData.append('loginMode', 'social');
            // Missing provider

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result).toHaveProperty('error', 'An error occurred. Please try again.');
            expect(mockAuthorizeIDP).not.toHaveBeenCalled();
        });

        it('should return error on failed social authorization', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockAuthorizeIDP.mockResolvedValue({ success: false });

            const formData = new URLSearchParams();
            formData.append('loginMode', 'social');
            formData.append('provider', 'Google');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result).toHaveProperty('error', 'An error occurred. Please try again.');
        });
    });

    describe('action - Passwordless Login', () => {
        it('should handle successful passwordless authorization', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockAuthorizePasswordless.mockResolvedValue(undefined as any);

            const formData = new URLSearchParams();
            formData.append('loginMode', 'passwordless');
            formData.append('email', 'test@example.com');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result.redirectUrl).toBe('/login?passwordless=sent&email=test%40example.com');
            expect(mockAuthorizePasswordless).toHaveBeenCalledWith(
                mockContext,
                expect.objectContaining({
                    userid: 'test@example.com',
                })
            );
        });

        it('should require email for passwordless login', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });

            const formData = new URLSearchParams();
            formData.append('loginMode', 'passwordless');
            // Missing email

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result).toHaveProperty('error', 'An error occurred. Please try again.');
            expect(mockAuthorizePasswordless).not.toHaveBeenCalled();
        });

        it('should return error on passwordless failure', async () => {
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            const error = new Error('failed to authorize');
            mockAuthorizePasswordless.mockRejectedValue(error);

            const formData = new URLSearchParams();
            formData.append('loginMode', 'passwordless');
            formData.append('email', 'test@example.com');

            const mockRequest = new Request('http://localhost:5173/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });
            const mockContext = { get: vi.fn(), set: vi.fn() };
            const args: ActionFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
            } as any;

            const result = await action(args);

            expect(result).toHaveProperty('error', 'An error occurred. Please try again.');
            expect(mockAuthorizePasswordless).toHaveBeenCalledWith(
                mockContext,
                expect.objectContaining({
                    userid: 'test@example.com',
                })
            );
        });
    });

    const describeClientAction = typeof clientAction === 'function' ? describe : describe.skip;

    describeClientAction('clientAction', () => {
        it('should update auth and redirect on successful login', async () => {
            const mockServerAction = vi.fn().mockResolvedValue({
                redirectUrl: '/',
                auth: { userType: 'registered', customer_id: 'test-123' },
            });
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
            const mockServerAction = vi.fn().mockResolvedValue({
                redirectUrl: '/',
                auth: { userType: 'registered', customer_id: 'test-123' },
            });
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
            const mockServerAction = vi.fn().mockResolvedValue({
                redirectUrl: '/',
                auth: { userType: 'registered', customer_id: 'test-123' },
            });
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
            const mockServerAction = vi.fn().mockResolvedValue({
                redirectUrl: '/',
                auth: { userType: 'registered', customer_id: 'test-123' },
            });
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
            const mockServerAction = vi.fn().mockResolvedValue({
                redirectUrl: 'http://localhost:5173/mobify/proxy/api/oauth',
                auth: { userType: 'guest' },
            });
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
            const mockServerAction = vi.fn().mockResolvedValue({
                redirectUrl: '/dashboard',
                auth: { userType: 'registered' },
            });
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
            if (result && result instanceof Response) {
                expect(result.headers.get('Location')).toBe('/dashboard');
            }
        });
    });

    describe('component', () => {
        // Helper to render with createRoutesStub and real action for full-flow tests
        const renderWithAction = (loaderData: Parameters<typeof Login>[0]['loaderData']) => {
            const WrappedComponent = () => <Login loaderData={loaderData} />;
            const actionContext = { get: vi.fn(), set: vi.fn() } as any;
            const Stub = createRoutesStub([
                {
                    path: '/',
                    Component: WrappedComponent,
                    action: async ({ request }) => action({ request, params: {}, context: actionContext } as any),
                },
            ]);
            return render(<Stub initialEntries={['/']} />);
        };

        it('renders standard login form with all required elements', () => {
            renderWithAction({
                passwordlessSent: false,
                email: undefined,
                mode: 'password',
                isPasswordlessLoginEnabled: false,
                isSocialLoginEnabled: true,
            });

            expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

            expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
            expect(screen.getByTestId('social-buttons')).toBeInTheDocument();
        });

        it('displays error when login fails', async () => {
            const user = userEvent.setup();
            mockGetAuth.mockReturnValue({ userType: 'guest' });
            mockLoginRegisteredUser.mockResolvedValue({ success: false });

            renderWithAction({
                passwordlessSent: false,
                email: undefined,
                mode: 'password',
                isPasswordlessLoginEnabled: false,
                isSocialLoginEnabled: true,
            });

            await user.type(screen.getByLabelText(/email/i), 'test@example.com');
            await user.type(screen.getByLabelText(/password/i), 'wrongpassword');

            const submitButton = screen.getByRole('button', { name: /sign in/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('An error occurred. Please try again.')).toBeInTheDocument();
            });
        });

        it('renders PasswordlessLoginForm when mode is passwordless', () => {
            renderWithAction({
                passwordlessSent: false,
                email: undefined,
                mode: 'passwordless',
                isPasswordlessLoginEnabled: true,
                isSocialLoginEnabled: true,
            });

            expect(screen.getByTestId('passwordless-form')).toBeInTheDocument();
            expect(screen.getByTestId('social-buttons')).toBeInTheDocument();
        });

        it('hides social login buttons when social login is disabled', () => {
            renderWithAction({
                passwordlessSent: false,
                email: undefined,
                mode: 'password',
                isPasswordlessLoginEnabled: false,
                isSocialLoginEnabled: false,
            });

            expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
            expect(screen.queryByTestId('social-buttons')).not.toBeInTheDocument();
        });

        it('should not show error on initial render', () => {
            renderWithAction({
                passwordlessSent: false,
                email: undefined,
                mode: 'password',
                isPasswordlessLoginEnabled: false,
                isSocialLoginEnabled: true,
            });

            expect(screen.queryByText('An error occurred. Please try again.')).not.toBeInTheDocument();
        });
    });
});
