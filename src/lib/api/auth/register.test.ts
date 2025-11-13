import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ActionFunctionArgs } from 'react-router';
import { registerCustomer } from './register';
import { loginRegisteredUser } from './standard-login';
import createClient from '@/lib/scapi';
import uiStrings from '@/temp-ui-string';

// Mock standard-login module
vi.mock('./standard-login', () => ({
    loginRegisteredUser: vi.fn(),
}));

// Mock scapi client
vi.mock('@/lib/scapi', () => ({
    default: vi.fn(() => ({
        ShopperCustomers: {
            registerCustomer: vi.fn(),
        },
    })),
}));

// Mock UI strings
vi.mock('@/temp-ui-string', () => ({
    default: {
        errors: {
            missingRegistrationField: 'Customer registration is missing required field.',
            autoLoginAfterRegistrationFailed: 'Auto-login after registration failed',
            genericTryAgain: 'Something is wrong. Please try again.',
        },
    },
}));

describe('registerCustomer', () => {
    const mockContext = {} as unknown as ActionFunctionArgs['context'];
    const mockRegisterCustomer = vi.fn();
    const mockLoginRegisteredUser = vi.mocked(loginRegisteredUser);
    const mockCreateClient = vi.mocked(createClient);

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        mockCreateClient.mockReturnValue({
            ShopperCustomers: {
                registerCustomer: mockRegisterCustomer,
            },
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('successful registration', () => {
        it('should successfully register a customer and auto-login', async () => {
            const registrationData = {
                customer: {
                    login: 'test@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                },
                password: 'SecurePassword123!',
            };

            mockRegisterCustomer.mockResolvedValue({});
            mockLoginRegisteredUser.mockResolvedValue({ success: true });

            const result = await registerCustomer(mockContext, registrationData);

            // Verify client creation
            expect(mockCreateClient).toHaveBeenCalledWith(mockContext);

            // Verify registerCustomer was called with correct data
            expect(mockRegisterCustomer).toHaveBeenCalledWith({
                body: {
                    customer: {
                        login: 'test@example.com',
                        firstName: 'John',
                        lastName: 'Doe',
                    },
                    password: 'SecurePassword123!',
                },
            });

            // Verify auto-login was called
            expect(mockLoginRegisteredUser).toHaveBeenCalledWith(
                mockContext,
                {
                    email: 'test@example.com',
                    password: 'SecurePassword123!',
                },
                {}
            );

            expect(result).toEqual({ success: true });
        });

        it('should successfully register a customer with custom parameters and pass them to login', async () => {
            const registrationData = {
                customer: {
                    login: 'test@example.com',
                    firstName: 'Jane',
                    lastName: 'Smith',
                },
                password: 'SecurePassword456!',
                c_customField1: 'value1',
                c_customField2: 123,
                c_customField3: true,
                c_customArray: ['item1', 'item2'],
            };

            mockRegisterCustomer.mockResolvedValue({});
            mockLoginRegisteredUser.mockResolvedValue({ success: true });

            const result = await registerCustomer(mockContext, registrationData);

            // Verify registerCustomer doesn't receive custom parameters
            expect(mockRegisterCustomer).toHaveBeenCalledWith({
                body: {
                    customer: {
                        login: 'test@example.com',
                        firstName: 'Jane',
                        lastName: 'Smith',
                    },
                    password: 'SecurePassword456!',
                },
            });

            // Verify custom parameters are passed to login
            expect(mockLoginRegisteredUser).toHaveBeenCalledWith(
                mockContext,
                {
                    email: 'test@example.com',
                    password: 'SecurePassword456!',
                },
                {
                    c_customField1: 'value1',
                    c_customField2: 123,
                    c_customField3: true,
                    c_customArray: ['item1', 'item2'],
                }
            );

            expect(result).toEqual({ success: true });
        });
    });

    describe('validation errors', () => {
        it('should return error when login (email) is missing', async () => {
            const registrationData = {
                customer: {
                    login: '',
                    firstName: 'John',
                    lastName: 'Doe',
                },
                password: 'SecurePassword123!',
            };

            const result = await registerCustomer(mockContext, registrationData);

            expect(mockRegisterCustomer).not.toHaveBeenCalled();
            expect(mockLoginRegisteredUser).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: uiStrings.errors.genericTryAgain,
            });
        });

        it('should return error when firstName is missing', async () => {
            const registrationData = {
                customer: {
                    login: 'test@example.com',
                    firstName: '',
                    lastName: 'Doe',
                },
                password: 'SecurePassword123!',
            };

            const result = await registerCustomer(mockContext, registrationData);

            expect(mockRegisterCustomer).not.toHaveBeenCalled();
            expect(mockLoginRegisteredUser).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: uiStrings.errors.genericTryAgain,
            });
        });

        it('should return error when lastName is missing', async () => {
            const registrationData = {
                customer: {
                    login: 'test@example.com',
                    firstName: 'John',
                    lastName: '',
                },
                password: 'SecurePassword123!',
            };

            const result = await registerCustomer(mockContext, registrationData);

            expect(mockRegisterCustomer).not.toHaveBeenCalled();
            expect(mockLoginRegisteredUser).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: uiStrings.errors.genericTryAgain,
            });
        });

        it('should return error when all required fields are missing', async () => {
            const registrationData = {
                customer: {
                    login: '',
                    firstName: '',
                    lastName: '',
                },
                password: 'SecurePassword123!',
            };

            const result = await registerCustomer(mockContext, registrationData);

            expect(mockRegisterCustomer).not.toHaveBeenCalled();
            expect(mockLoginRegisteredUser).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: uiStrings.errors.genericTryAgain,
            });
        });

        it('should return error when login is undefined', async () => {
            const registrationData = {
                customer: {
                    firstName: 'John',
                    lastName: 'Doe',
                },
                password: 'SecurePassword123!',
            } as any;

            const result = await registerCustomer(mockContext, registrationData);

            expect(mockRegisterCustomer).not.toHaveBeenCalled();
            expect(mockLoginRegisteredUser).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: uiStrings.errors.genericTryAgain,
            });
        });
    });

    describe('registration API errors', () => {
        it('should handle registration API failure', async () => {
            const registrationData = {
                customer: {
                    login: 'test@example.com',
                    firstName: 'John',
                    lastName: 'Doe',
                },
                password: 'SecurePassword123!',
            };

            mockRegisterCustomer.mockRejectedValue(new Error('Registration failed'));

            const result = await registerCustomer(mockContext, registrationData);

            expect(mockRegisterCustomer).toHaveBeenCalled();
            expect(mockLoginRegisteredUser).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                error: uiStrings.errors.genericTryAgain,
            });
        });
    });
});
