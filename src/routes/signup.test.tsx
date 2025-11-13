import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import Signup, { loader, action } from './signup';
import { registerCustomer } from '@/lib/api/auth/register';
import { isPasswordValid } from '@/lib/utils';
import { getAuth } from '@/middlewares/auth.server';
import uiStrings from '@/temp-ui-string';

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

// Mock SignupForm component
vi.mock('@/components/signup-form', () => ({
    SignupForm: ({ error }: { error?: string }) => (
        <div data-testid="signup-form">{error && <div data-testid="form-error">{error}</div>}</div>
    ),
}));

// Mock React Router components
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        Form: ({ children, ...props }: { children: React.ReactNode; method?: string }) => (
            <form {...props}>{children}</form>
        ),
        Link: ({ children, to, ...props }: { children: React.ReactNode; to: string; className?: string }) => (
            <a href={to} {...props}>
                {children}
            </a>
        ),
        useActionData: vi.fn(),
    };
});

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
    return render(<MemoryRouter>{component}</MemoryRouter>);
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
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: uiStrings.signup.allFieldsRequired,
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
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: uiStrings.signup.allFieldsRequired,
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
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: uiStrings.signup.allFieldsRequired,
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
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: uiStrings.signup.allFieldsRequired,
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
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: uiStrings.signup.allFieldsRequired,
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
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: uiStrings.signup.passwordsDoNotMatch,
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
                };

                const result = await action(args);

                expect(mockIsPasswordValid).toHaveBeenCalledWith('weak');
                expect(result).toEqual({
                    error: uiStrings.signup.passwordNotSecure,
                });
                expect(mockRegisterCustomer).not.toHaveBeenCalled();
            });
        });

        describe('successful registration', () => {
            it('should return redirectUrl and auth on successful registration', async () => {
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
                expect(result).toEqual({
                    redirectUrl: '/',
                    auth: mockGetAuth(mockContext),
                });
            });

            it('should use returnUrl when provided on successful registration', async () => {
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
                };

                const result = await action(args);

                expect(mockRegisterCustomer).toHaveBeenCalled();
                expect(result).toEqual({
                    redirectUrl: '/checkout',
                    auth: mockGetAuth(mockContext),
                });
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
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: uiStrings.errors.genericTryAgain,
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
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: uiStrings.signup.allFieldsRequired,
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
                };

                const result = await action(args);

                expect(result).toEqual({
                    error: uiStrings.signup.passwordsDoNotMatch,
                });
            });
        });
    });

    describe('Component', () => {
        let mockUseActionData: ReturnType<typeof vi.fn>;

        beforeEach(async () => {
            const reactRouter = await import('react-router');
            mockUseActionData = vi.mocked(reactRouter.useActionData);
        });

        it('should render form with all required elements', () => {
            mockUseActionData.mockReturnValue(undefined);

            renderWithRouter(<Signup />);

            // Title and subtitle
            expect(screen.getByText(uiStrings.signup.title)).toBeInTheDocument();
            expect(screen.getByText(uiStrings.signup.subtitle)).toBeInTheDocument();

            // Form
            expect(screen.getByTestId('signup-form')).toBeInTheDocument();

            // Sign in link
            expect(screen.getByText(/Have an account?/i)).toBeInTheDocument();
            expect(screen.getByText(uiStrings.signup.signIn)).toBeInTheDocument();
            const signInLink = screen.getByText(uiStrings.signup.signIn).closest('a');
            expect(signInLink).toHaveAttribute('href', '/login');
        });

        it('should pass error from actionData to SignupForm', () => {
            const errorMessage = 'Registration failed';
            mockUseActionData.mockReturnValue({
                error: errorMessage,
            });

            renderWithRouter(<Signup />);

            expect(screen.getByTestId('form-error')).toHaveTextContent(errorMessage);
        });

        it('should not show error when actionData is undefined', () => {
            mockUseActionData.mockReturnValue(undefined);

            renderWithRouter(<Signup />);

            expect(screen.queryByTestId('form-error')).not.toBeInTheDocument();
        });

        it('should not show error when actionData has no error', () => {
            mockUseActionData.mockReturnValue({});

            renderWithRouter(<Signup />);

            expect(screen.queryByTestId('form-error')).not.toBeInTheDocument();
        });

        it('should render form element with POST method', () => {
            mockUseActionData.mockReturnValue(undefined);

            renderWithRouter(<Signup />);

            const form = screen.getByTestId('signup-form').closest('form');
            expect(form).toBeInTheDocument();
            expect(form).toHaveAttribute('method', 'POST');
        });
    });
});
