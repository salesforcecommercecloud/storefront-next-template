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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import Signup, { loader, action } from './_empty.signup';
import { registerCustomer } from '@/lib/api/auth/register';
import { isPasswordValid } from '@/lib/utils';
import { getAuth } from '@/middlewares/auth.server';
import { getTranslation } from '@/lib/i18next';

const { t } = getTranslation();

// Mock the auth API
vi.mock('@/lib/api/auth/register', () => ({
    registerCustomer: vi.fn(),
}));

// Mock utils
vi.mock('@/lib/utils', async () => {
    const actual = await vi.importActual('@/lib/utils');
    return {
        ...actual,
        isPasswordValid: vi.fn(),
    };
});

// Mock auth middleware
vi.mock('@/middlewares/auth.server', () => ({
    getAuth: vi.fn(),
}));

// Mock PasswordRequirement component to avoid needing to deal with its complexity
vi.mock('@/components/password-requirements', () => ({
    PasswordRequirement: () => null,
}));

// Helper to render with createRoutesStub (provides full data router context for Form/Link components)
const renderWithRoutesStub = () => {
    const Stub = createRoutesStub([
        {
            path: '/',
            Component: Signup,
        },
    ]);
    return render(<Stub initialEntries={['/']} />);
};

const mockRegisterCustomer = vi.mocked(registerCustomer);
const mockIsPasswordValid = vi.mocked(isPasswordValid);
const mockGetAuth = vi.mocked(getAuth);

describe('signup route', () => {
    const mockContext = {
        get: vi.fn(),
        set: vi.fn(),
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('loader', () => {
        it('should redirect to home when user is already registered', () => {
            mockGetAuth.mockReturnValue({
                userType: 'registered',
            } as any);

            const mockRequest = new Request('http://localhost/signup');
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
                unstable_pattern: 'signup',
            };

            const result = loader(args);

            expect(mockGetAuth).toHaveBeenCalledWith(mockContext);
            expect(result).toBeInstanceOf(Response);
            if (result instanceof Response) {
                expect(result.status).toBe(302);
                expect(result.headers.get('Location')).toBe('/');
            }
        });

        it('should return null when user is not registered', () => {
            mockGetAuth.mockReturnValue({
                userType: 'guest',
            } as any);

            const mockRequest = new Request('http://localhost/signup');
            const args: LoaderFunctionArgs = {
                request: mockRequest,
                params: {},
                context: mockContext,
                unstable_pattern: 'signup',
            };

            const result = loader(args);

            expect(mockGetAuth).toHaveBeenCalledWith(mockContext);
            expect(result).toBeNull();
        });
    });

    describe('action', () => {
        beforeEach(() => {
            mockGetAuth.mockReturnValue({
                userType: 'guest',
                customerId: 'test-customer-123',
            } as any);
        });

        describe('validation errors', () => {
            it('should return error when firstName is missing', async () => {
                const formData = new URLSearchParams();
                formData.append('lastName', 'Doe');
                formData.append('email', 'test@example.com');
                formData.append('password', 'Test123!');
                formData.append('confirmPassword', 'Test123!');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: t('signup:allFieldsRequired'),
                });
                expect(mockRegisterCustomer).not.toHaveBeenCalled();
            });

            it('should return error when lastName is missing', async () => {
                const formData = new URLSearchParams();
                formData.append('firstName', 'John');
                formData.append('email', 'test@example.com');
                formData.append('password', 'Test123!');
                formData.append('confirmPassword', 'Test123!');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: t('signup:allFieldsRequired'),
                });
                expect(mockRegisterCustomer).not.toHaveBeenCalled();
            });

            it('should return error when email is missing', async () => {
                const formData = new URLSearchParams();
                formData.append('firstName', 'John');
                formData.append('lastName', 'Doe');
                formData.append('password', 'Test123!');
                formData.append('confirmPassword', 'Test123!');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: t('signup:allFieldsRequired'),
                });
                expect(mockRegisterCustomer).not.toHaveBeenCalled();
            });

            it('should return error when password is missing', async () => {
                const formData = new URLSearchParams();
                formData.append('firstName', 'John');
                formData.append('lastName', 'Doe');
                formData.append('email', 'test@example.com');
                formData.append('confirmPassword', 'Test123!');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: t('signup:allFieldsRequired'),
                });
                expect(mockRegisterCustomer).not.toHaveBeenCalled();
            });

            it('should return error when confirmPassword is missing', async () => {
                const formData = new URLSearchParams();
                formData.append('firstName', 'John');
                formData.append('lastName', 'Doe');
                formData.append('email', 'test@example.com');
                formData.append('password', 'Test123!');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: t('signup:allFieldsRequired'),
                });
                expect(mockRegisterCustomer).not.toHaveBeenCalled();
            });

            it('should return error when passwords do not match', async () => {
                const formData = new URLSearchParams();
                formData.append('firstName', 'John');
                formData.append('lastName', 'Doe');
                formData.append('email', 'test@example.com');
                formData.append('password', 'Test123!');
                formData.append('confirmPassword', 'Different123!');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: t('signup:passwordsDoNotMatch'),
                });
                expect(mockRegisterCustomer).not.toHaveBeenCalled();
            });

            it('should return error when password is not secure', async () => {
                mockIsPasswordValid.mockReturnValue(false);

                const formData = new URLSearchParams();
                formData.append('firstName', 'John');
                formData.append('lastName', 'Doe');
                formData.append('email', 'test@example.com');
                formData.append('password', 'weak');
                formData.append('confirmPassword', 'weak');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                const result = await action(args);

                expect(mockIsPasswordValid).toHaveBeenCalledWith('weak');
                expect(result).toEqual({
                    error: t('signup:passwordNotSecure'),
                });
                expect(mockRegisterCustomer).not.toHaveBeenCalled();
            });
        });

        describe('successful registration', () => {
            it('should redirect to home on successful registration', async () => {
                mockIsPasswordValid.mockReturnValue(true);
                mockRegisterCustomer.mockResolvedValue({ success: true } as any);

                const formData = new URLSearchParams();
                formData.append('firstName', 'John');
                formData.append('lastName', 'Doe');
                formData.append('email', 'test@example.com');
                formData.append('password', 'Test123!');
                formData.append('confirmPassword', 'Test123!');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                const result = await action(args);

                expect(mockIsPasswordValid).toHaveBeenCalledWith('Test123!');
                expect(mockRegisterCustomer).toHaveBeenCalledWith(mockContext, {
                    customer: {
                        firstName: 'John',
                        lastName: 'Doe',
                        login: 'test@example.com',
                        email: 'test@example.com',
                    },
                    password: 'Test123!',
                });
                expect(result).toBeInstanceOf(Response);
                if (result instanceof Response) {
                    expect(result.status).toBe(302);
                    expect(result.headers.get('Location')).toBe('/');
                }
            });

            it('should redirect to returnUrl when provided on successful registration', async () => {
                mockIsPasswordValid.mockReturnValue(true);
                mockRegisterCustomer.mockResolvedValue({ success: true } as any);

                const formData = new URLSearchParams();
                formData.append('firstName', 'John');
                formData.append('lastName', 'Doe');
                formData.append('email', 'test@example.com');
                formData.append('password', 'Test123!');
                formData.append('confirmPassword', 'Test123!');

                const mockRequest = new Request('http://localhost/signup?returnUrl=/checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                const result = await action(args);

                expect(mockRegisterCustomer).toHaveBeenCalled();
                expect(result).toBeInstanceOf(Response);
                if (result instanceof Response) {
                    expect(result.status).toBe(302);
                    expect(result.headers.get('Location')).toBe('/checkout');
                }
            });
        });

        describe('failed registration', () => {
            it('should return error on registration failure', async () => {
                mockIsPasswordValid.mockReturnValue(true);
                mockRegisterCustomer.mockResolvedValue({ success: false, error: 'Email already exists' } as any);

                const formData = new URLSearchParams();
                formData.append('firstName', 'John');
                formData.append('lastName', 'Doe');
                formData.append('email', 'test@example.com');
                formData.append('password', 'Test123!');
                formData.append('confirmPassword', 'Test123!');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                const result = await action(args);

                expect(mockRegisterCustomer).toHaveBeenCalled();
                expect(result).toEqual({
                    error: 'Email already exists',
                });
            });

            it('should return generic error when registration fails without specific error', async () => {
                mockIsPasswordValid.mockReturnValue(true);
                mockRegisterCustomer.mockResolvedValue({ success: false } as any);

                const formData = new URLSearchParams();
                formData.append('firstName', 'John');
                formData.append('lastName', 'Doe');
                formData.append('email', 'test@example.com');
                formData.append('password', 'Test123!');
                formData.append('confirmPassword', 'Test123!');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: t('errors:genericTryAgain'),
                });
            });
        });

        describe('edge cases', () => {
            it('should handle empty string fields as missing', async () => {
                const formData = new URLSearchParams();
                formData.append('firstName', '');
                formData.append('lastName', 'Doe');
                formData.append('email', 'test@example.com');
                formData.append('password', 'Test123!');
                formData.append('confirmPassword', 'Test123!');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: t('signup:allFieldsRequired'),
                });
            });

            it('should handle special characters in email', async () => {
                mockIsPasswordValid.mockReturnValue(true);
                mockRegisterCustomer.mockResolvedValue({ success: true } as any);

                const formData = new URLSearchParams();
                formData.append('firstName', 'John');
                formData.append('lastName', 'Doe');
                formData.append('email', 'test+user@example.com');
                formData.append('password', 'Test123!');
                formData.append('confirmPassword', 'Test123!');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                await action(args);

                expect(mockRegisterCustomer).toHaveBeenCalledWith(mockContext, {
                    customer: {
                        firstName: 'John',
                        lastName: 'Doe',
                        login: 'test+user@example.com',
                        email: 'test+user@example.com',
                    },
                    password: 'Test123!',
                });
            });

            it('should handle special characters in names', async () => {
                mockIsPasswordValid.mockReturnValue(true);
                mockRegisterCustomer.mockResolvedValue({ success: true } as any);

                const formData = new URLSearchParams();
                formData.append('firstName', "O'Brien");
                formData.append('lastName', 'de la Cruz');
                formData.append('email', 'test@example.com');
                formData.append('password', 'Test123!');
                formData.append('confirmPassword', 'Test123!');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                await action(args);

                expect(mockRegisterCustomer).toHaveBeenCalledWith(mockContext, {
                    customer: {
                        firstName: "O'Brien",
                        lastName: 'de la Cruz',
                        login: 'test@example.com',
                        email: 'test@example.com',
                    },
                    password: 'Test123!',
                });
            });

            it('should not trim whitespace from passwords', async () => {
                // Passwords with whitespace should not match if one has spaces
                const formData = new URLSearchParams();
                formData.append('firstName', 'John');
                formData.append('lastName', 'Doe');
                formData.append('email', 'test@example.com');
                formData.append('password', ' Test123! ');
                formData.append('confirmPassword', 'Test123!');

                const mockRequest = new Request('http://localhost/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData.toString(),
                });

                const args: ActionFunctionArgs = {
                    request: mockRequest,
                    params: {},
                    context: mockContext,
                    unstable_pattern: 'signup',
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: t('signup:passwordsDoNotMatch'),
                });
            });
        });
    });

    describe('Component', () => {
        beforeEach(() => {
            // For component tests, ensure user is not already registered
            mockGetAuth.mockReturnValue({
                userType: 'guest',
                customerId: 'test-customer-123',
            } as any);
        });

        it('should render form with all required elements', () => {
            renderWithRoutesStub();

            // Title and subtitle
            expect(screen.getByText(t('signup:title'))).toBeInTheDocument();
            expect(screen.getByText(t('signup:subtitle'))).toBeInTheDocument();

            // Form fields
            expect(screen.getByLabelText(t('signup:form.firstNameLabel'))).toBeInTheDocument();
            expect(screen.getByLabelText(t('signup:form.lastNameLabel'))).toBeInTheDocument();
            expect(screen.getByLabelText(t('signup:form.emailLabel'))).toBeInTheDocument();
            expect(screen.getByLabelText(t('signup:form.passwordLabel'))).toBeInTheDocument();
            expect(screen.getByLabelText(t('signup:form.confirmPasswordLabel'))).toBeInTheDocument();

            // Submit button
            expect(screen.getByRole('button', { name: t('signup:form.createAccountButton') })).toBeInTheDocument();

            // Sign in link
            expect(screen.getByText(/Have an account?/i)).toBeInTheDocument();
            expect(screen.getByText(t('signup:signIn'))).toBeInTheDocument();
            const signInLink = screen.getByText(t('signup:signIn')).closest('a');
            expect(signInLink).toHaveAttribute('href', '/login');
        });

        it('should display error when form submission fails', async () => {
            const user = userEvent.setup();
            const errorMessage = 'Email already exists';
            mockIsPasswordValid.mockReturnValue(true);
            mockRegisterCustomer.mockResolvedValue({ success: false, error: errorMessage } as any);

            const Stub = createRoutesStub([
                {
                    path: '/',
                    Component: Signup,
                    action: async ({ request }) => action({ request, params: {}, context: mockContext } as any),
                },
            ]);
            render(<Stub initialEntries={['/']} />);

            // Fill out the form
            await user.type(screen.getByLabelText(t('signup:form.firstNameLabel')), 'John');
            await user.type(screen.getByLabelText(t('signup:form.lastNameLabel')), 'Doe');
            await user.type(screen.getByLabelText(t('signup:form.emailLabel')), 'test@example.com');
            await user.type(screen.getByLabelText(t('signup:form.passwordLabel')), 'Test123!');
            await user.type(screen.getByLabelText(t('signup:form.confirmPasswordLabel')), 'Test123!');

            // Submit the form
            const submitButton = screen.getByRole('button', { name: t('signup:form.createAccountButton') });
            await user.click(submitButton);

            // Wait for error to appear
            await waitFor(() => {
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
            });
        });

        it('should display validation error when passwords do not match', async () => {
            const user = userEvent.setup();
            mockIsPasswordValid.mockReturnValue(true);

            const Stub = createRoutesStub([
                {
                    path: '/',
                    Component: Signup,
                    action: async ({ request }) => action({ request, params: {}, context: mockContext } as any),
                },
            ]);
            render(<Stub initialEntries={['/']} />);

            // Fill out the form with mismatched passwords
            await user.type(screen.getByLabelText(t('signup:form.firstNameLabel')), 'John');
            await user.type(screen.getByLabelText(t('signup:form.lastNameLabel')), 'Doe');
            await user.type(screen.getByLabelText(t('signup:form.emailLabel')), 'test@example.com');
            await user.type(screen.getByLabelText(t('signup:form.passwordLabel')), 'Test123!');
            await user.type(screen.getByLabelText(t('signup:form.confirmPasswordLabel')), 'Different123!');

            // Submit the form
            const submitButton = screen.getByRole('button', { name: t('signup:form.createAccountButton') });
            await user.click(submitButton);

            // Wait for error to appear
            await waitFor(() => {
                expect(screen.getByText(t('signup:passwordsDoNotMatch'))).toBeInTheDocument();
            });
        });

        it('should not show error on initial render', () => {
            renderWithRoutesStub();

            // No error should be visible initially
            expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        });
    });
});
