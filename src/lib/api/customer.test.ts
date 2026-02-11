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
import { describe, test, expect, vi, beforeEach, afterAll } from 'vitest';
import {
    lookupCustomerByEmail,
    isRegisteredCustomer,
    getCurrentCustomer,
    customerLookup,
    extractNameFromEmail,
    registerGuestUser,
} from './customer';
import { getAuth } from '@/middlewares/auth.server';
import { createApiClients } from '@/lib/api-clients';
import { getTranslation } from '@/lib/i18next';
import { createTestContext } from '@/lib/test-utils';

vi.mock('@/middlewares/auth.server');
vi.mock('@/lib/api-clients');

const mockContext = createTestContext();
const { t } = getTranslation();

describe('Customer API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('lookupCustomerByEmail', () => {
        test('should return invalid result for malformed email', async () => {
            const result = await lookupCustomerByEmail(mockContext, 'invalid-email');

            expect(result.isRegistered).toBe(false);
            expect(result.error).toBe('Invalid email format');
        });

        test('should return guest result for empty email', async () => {
            const result = await lookupCustomerByEmail(mockContext, '');

            expect(result.isRegistered).toBe(false);
            expect(result.error).toBe('Invalid email format');
        });

        test('should check current user email when logged in as registered user', async () => {
            const mockSession = {
                userType: 'registered' as const,
                customerId: 'cust123',
                accessToken: 'token',
                accessTokenExpiry: Date.now() + 10000,
            };

            const mockCustomer = {
                login: 'test@example.com',
                customerId: 'cust123',
            };

            const mockClient = {
                getCustomer: vi.fn().mockResolvedValue({ data: mockCustomer }),
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);
            vi.mocked(createApiClients).mockReturnValue({
                shopperCustomers: mockClient,
            } as any);

            const result = await lookupCustomerByEmail(mockContext, 'test@example.com');

            expect(result.isRegistered).toBe(true);
            expect(result.customer).toEqual(mockCustomer);
            expect(result.requiresLogin).toBe(false);
            expect(mockClient.getCustomer).toHaveBeenCalledWith({
                params: {
                    path: {
                        customerId: 'cust123',
                    },
                },
            });
        });

        test('should handle case mismatch in email comparison', async () => {
            const mockSession = {
                userType: 'registered' as const,
                customerId: 'cust123',
            };

            const mockCustomer = {
                login: 'Test@Example.COM',
                customerId: 'cust123',
            };

            const mockClient = {
                getCustomer: vi.fn().mockResolvedValue({ data: mockCustomer }),
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);
            vi.mocked(createApiClients).mockReturnValue({
                shopperCustomers: mockClient,
            } as any);

            const result = await lookupCustomerByEmail(mockContext, 'test@example.com');

            expect(result.isRegistered).toBe(true);
            expect(result.customer).toEqual(mockCustomer);
        });

        test('should return guest result when current user email does not match', async () => {
            const mockSession = {
                userType: 'registered' as const,
                customerId: 'cust123',
            };

            const mockCustomer = {
                login: 'different@example.com',
                customerId: 'cust123',
            };

            const mockClient = {
                getCustomer: vi.fn().mockResolvedValue({ data: mockCustomer }),
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);
            vi.mocked(createApiClients).mockReturnValue({
                shopperCustomers: mockClient,
            } as any);

            const result = await lookupCustomerByEmail(mockContext, 'test@example.com');

            expect(result.isRegistered).toBe(false);
            expect(result.requiresLogin).toBe(false);
        });

        test('should handle API errors gracefully', async () => {
            const mockSession = {
                userType: 'registered' as const,
                customerId: 'cust123',
            };

            const mockClient = {
                getCustomer: vi.fn().mockRejectedValue(new Error('API Error')),
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);
            vi.mocked(createApiClients).mockReturnValue({
                shopperCustomers: mockClient,
            } as any);

            const result = await lookupCustomerByEmail(mockContext, 'test@example.com');

            expect(result.isRegistered).toBe(false);
            expect(result.requiresLogin).toBe(false);
        });

        test('should return guest result for guest session', async () => {
            const mockSession = {
                userType: 'guest' as const,
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);

            const result = await lookupCustomerByEmail(mockContext, 'test@example.com');

            expect(result.isRegistered).toBe(false);
            expect(result.requiresLogin).toBe(false);
        });
    });

    describe('isRegisteredCustomer', () => {
        test('should return true for valid registered user session', () => {
            const mockSession = {
                userType: 'registered' as const,
                customerId: 'cust123',
                accessToken: 'token',
                accessTokenExpiry: Date.now() + 10000,
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);

            const result = isRegisteredCustomer(mockContext);
            expect(result).toBe(true);
        });

        test('should return false for guest user', () => {
            const mockSession = {
                userType: 'guest' as const,
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);

            const result = isRegisteredCustomer(mockContext);
            expect(result).toBe(false);
        });

        test('should return false for expired token', () => {
            const mockSession = {
                userType: 'registered' as const,
                customerId: 'cust123',
                accessToken: 'token',
                accessTokenExpiry: Date.now() - 10000, // Expired
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);

            const result = isRegisteredCustomer(mockContext);
            expect(result).toBe(false);
        });

        test('should return false for missing customerId', () => {
            const mockSession = {
                userType: 'registered' as const,
                accessToken: 'token',
                accessTokenExpiry: Date.now() + 10000,
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);

            const result = isRegisteredCustomer(mockContext);
            expect(result).toBe(false);
        });
    });

    describe('getCurrentCustomer', () => {
        test('should return customer for valid registered user', async () => {
            const mockSession = {
                userType: 'registered' as const,
                customerId: 'cust123',
                accessToken: 'token',
                accessTokenExpiry: Date.now() + 10000,
            };

            const mockCustomer = {
                customerId: 'cust123',
                login: 'test@example.com',
            };

            const mockClient = {
                getCustomer: vi.fn().mockResolvedValue({ data: mockCustomer }),
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);
            vi.mocked(createApiClients).mockReturnValue({
                shopperCustomers: mockClient,
            } as any);

            const result = await getCurrentCustomer(mockContext);

            expect(result).toEqual(mockCustomer);
            expect(mockClient.getCustomer).toHaveBeenCalledWith({
                params: {
                    path: {
                        customerId: 'cust123',
                    },
                },
            });
        });

        test('should return null for guest user', async () => {
            const mockSession = {
                userType: 'guest' as const,
                // no customerId
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);

            const result = await getCurrentCustomer(mockContext);
            expect(result).toBeNull();
        });
    });

    describe('customerLookup', () => {
        test('should return current_user recommendation for matching email', async () => {
            const mockSession = {
                userType: 'registered' as const,
                customerId: 'cust123',
            };

            const mockCustomer = {
                login: 'test@example.com',
                customerId: 'cust123',
            };

            const mockClient = {
                getCustomer: vi.fn().mockResolvedValue({ data: mockCustomer }),
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);
            vi.mocked(createApiClients).mockReturnValue({
                shopperCustomers: mockClient,
            } as any);

            const result = await customerLookup(mockContext, 'test@example.com');

            expect(result.recommendation).toBe('current_user');
            expect(result.message).toBe('Using your account information');
            expect(result.isRegistered).toBe(true);
        });

        test('should return guest recommendation for unknown email', async () => {
            const mockSession = {
                userType: 'guest' as const,
            };

            vi.mocked(getAuth).mockReturnValue(mockSession);

            const result = await customerLookup(mockContext, 'unknown@example.com');

            expect(result.recommendation).toBe('guest');
            expect(result.message).toBe('Continuing as guest. You can login later if you have an account.');
            expect(result.isRegistered).toBe(false);
        });

        test('should handle invalid email gracefully', async () => {
            const result = await customerLookup(mockContext, 'invalid-email');

            expect(result.recommendation).toBe('guest');
            expect(result.isRegistered).toBe(false);
        });
    });

    describe('extractNameFromEmail', () => {
        describe('basic separator patterns', () => {
            test('should extract names separated by dots', () => {
                const result = extractNameFromEmail('john.doe@example.com');
                expect(result).toEqual({ firstName: 'John', lastName: 'Doe' });
            });

            test('should extract names separated by underscores', () => {
                const result = extractNameFromEmail('jane_smith@company.org');
                expect(result).toEqual({ firstName: 'Jane', lastName: 'Smith' });
            });

            test('should extract names separated by hyphens', () => {
                const result = extractNameFromEmail('bob-wilson@startup.io');
                expect(result).toEqual({ firstName: 'Bob', lastName: 'Wilson' });
            });
        });

        describe('number suffix handling', () => {
            test('should remove number suffixes', () => {
                const result = extractNameFromEmail('alice.cooper123@email.com');
                expect(result).toEqual({ firstName: 'Alice', lastName: 'Cooper' });
            });

            test('should handle multiple digits', () => {
                const result = extractNameFromEmail('mike.jones99@domain.net');
                expect(result).toEqual({ firstName: 'Mike', lastName: 'Jones' });
            });

            test('should preserve numbers in the middle', () => {
                const result = extractNameFromEmail('user2.admin3@test.com');
                expect(result).toEqual({ firstName: 'User2', lastName: 'Admin' });
            });
        });

        describe('camelCase pattern recognition', () => {
            test('should detect camelCase and split properly', () => {
                const result = extractNameFromEmail('johnDoe@example.com');
                expect(result).toEqual({ firstName: 'John', lastName: 'Doe' });
            });

            test('should handle complex camelCase', () => {
                const result = extractNameFromEmail('maryJane@website.org');
                expect(result).toEqual({ firstName: 'Mary', lastName: 'Jane' });
            });

            test('should not split single uppercase letter', () => {
                const result = extractNameFromEmail('testA@domain.com');
                expect(result).toEqual({ firstName: 'Testa', lastName: 'User' });
            });
        });

        describe('capitalization normalization', () => {
            test('should capitalize all lowercase names', () => {
                const result = extractNameFromEmail('john.doe@company.com');
                expect(result).toEqual({ firstName: 'John', lastName: 'Doe' });
            });

            test('should normalize all uppercase names', () => {
                const result = extractNameFromEmail('JOHN.DOE@COMPANY.COM');
                expect(result).toEqual({ firstName: 'John', lastName: 'Doe' });
            });

            test('should normalize mixed case names', () => {
                const result = extractNameFromEmail('MixedCase.Username@domain.org');
                expect(result).toEqual({ firstName: 'Mixedcase', lastName: 'Username' });
            });
        });

        describe('single name fallbacks', () => {
            test('should use single name as firstName with User lastName', () => {
                const result = extractNameFromEmail('admin@company.com');
                expect(result).toEqual({ firstName: 'Admin', lastName: 'User' });
            });

            test('should handle single name with numbers', () => {
                const result = extractNameFromEmail('support123@help.org');
                expect(result).toEqual({ firstName: 'Support', lastName: 'User' });
            });

            test('should capitalize single names', () => {
                const result = extractNameFromEmail('manager@business.net');
                expect(result).toEqual({ firstName: 'Manager', lastName: 'User' });
            });
        });

        describe('edge cases and error handling', () => {
            test('should handle empty string', () => {
                const result = extractNameFromEmail('');
                expect(result).toEqual({ firstName: 'Guest', lastName: 'User' });
            });

            test('should handle null input', () => {
                // Test null input by casting to the expected string type
                const result = extractNameFromEmail(null as unknown as string);
                expect(result).toEqual({ firstName: 'Guest', lastName: 'User' });
            });

            test('should handle undefined input', () => {
                // Test undefined input by casting to the expected string type
                const result = extractNameFromEmail(undefined as unknown as string);
                expect(result).toEqual({ firstName: 'Guest', lastName: 'User' });
            });

            test('should handle non-string input', () => {
                // Test non-string input by casting to the expected string type
                const result = extractNameFromEmail(123 as unknown as string);
                expect(result).toEqual({ firstName: 'Guest', lastName: 'User' });
            });

            test('should handle malformed email (no @)', () => {
                const result = extractNameFromEmail('notanemail');
                expect(result).toEqual({ firstName: 'Notanemail', lastName: 'User' });
            });

            test('should handle email with no username', () => {
                const result = extractNameFromEmail('@domain.com');
                expect(result).toEqual({ firstName: 'Guest', lastName: 'User' });
            });

            test('should handle email ending with @', () => {
                const result = extractNameFromEmail('test@');
                expect(result).toEqual({ firstName: 'Test', lastName: 'User' });
            });
        });

        describe('multiple separators', () => {
            test('should prioritize dots over underscores', () => {
                const result = extractNameFromEmail('first.middle_last@domain.com');
                expect(result).toEqual({ firstName: 'First', lastName: 'Middle_last' });
            });

            test('should handle consecutive separators', () => {
                const result = extractNameFromEmail('test..multiple@domain.com');
                expect(result).toEqual({ firstName: 'Test', lastName: 'Multiple' });
            });

            test('should filter out empty parts', () => {
                const result = extractNameFromEmail('first._last@domain.com');
                expect(result).toEqual({ firstName: 'First', lastName: '_last' });
            });
        });

        describe('real-world email patterns', () => {
            test('should handle common corporate emails', () => {
                const result = extractNameFromEmail('john.smith@company.com');
                expect(result).toEqual({ firstName: 'John', lastName: 'Smith' });
            });

            test('should handle personal emails with numbers', () => {
                const result = extractNameFromEmail('sarah.connor85@email.com');
                expect(result).toEqual({ firstName: 'Sarah', lastName: 'Connor' });
            });

            test('should handle professional emails', () => {
                const result = extractNameFromEmail('dr.watson@medical.org');
                expect(result).toEqual({ firstName: 'Dr', lastName: 'Watson' });
            });

            test('should handle modern naming patterns', () => {
                const result = extractNameFromEmail('alex-morgan@startup.io');
                expect(result).toEqual({ firstName: 'Alex', lastName: 'Morgan' });
            });

            test('should handle international naming', () => {
                const result = extractNameFromEmail('marie-claire@company.fr');
                expect(result).toEqual({ firstName: 'Marie', lastName: 'Claire' });
            });
        });
    });

    describe('register guest user', () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');

        afterAll(() => {
            fetchSpy.mockRestore();
        });

        beforeEach(() => {
            vi.clearAllMocks();
            fetchSpy.mockImplementation((url, _options) => {
                const urlString = url.toString();

                if (urlString.includes('/resource/auth/login-registered')) {
                    return Promise.resolve(
                        new Response(
                            JSON.stringify({
                                success: true,
                                data: {
                                    accessToken: 'mock-access-token',
                                    customerId: 'new-customer-123',
                                    refreshToken: 'mock-refresh-token',
                                    accessTokenExpiry: Date.now() + 3600000,
                                    userType: 'registered' as const,
                                },
                            }),
                            { status: 200, statusText: 'OK' }
                        )
                    );
                }

                // For any unmocked endpoints, return a descriptive error
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            error: `Endpoint not mocked: ${urlString}`,
                            availableEndpoints: ['/resource/auth/login-registered'],
                        }),
                        { status: 404, statusText: 'Not Found' }
                    )
                );
            });
        });

        test('should validate email format', async () => {
            // Test invalid email
            const result1 = await registerGuestUser(mockContext, 'invalid-email');
            expect(result1.success).toBe(false);
            expect(result1.error).toBe('Invalid email format');

            // Test empty email
            const result2 = await registerGuestUser(mockContext, '');
            expect(result2.success).toBe(false);
            expect(result2.error).toBe('Invalid email format');
        });

        test('should register customer and auto-login successfully', async () => {
            const mockRegisterCustomer = vi.fn().mockResolvedValue({
                customerId: 'new-customer-123',
                login: 'test@example.com',
            });

            const mockClient = {
                registerCustomer: mockRegisterCustomer,
                getCustomer: vi.fn(),
            };

            vi.mocked(createApiClients).mockReturnValue({
                shopperCustomers: mockClient,
            } as any);

            vi.mocked(getAuth).mockReturnValue({
                customerId: 'new-customer-123',
                userType: 'registered' as const,
            } as any);

            const result = await registerGuestUser(mockContext, 'test@example.com');

            expect(result.success).toBe(true);
            expect(result.customerId).toBe('new-customer-123');
            expect(result.password).toBeDefined();
            expect(result.autoLoggedIn).toBe(true);
            expect(result.error).toBeUndefined();

            // Verify registration was called
            expect(mockRegisterCustomer).toHaveBeenCalledWith({
                body: expect.objectContaining({
                    customer: expect.objectContaining({
                        login: 'test@example.com',
                        email: 'test@example.com',
                    }),
                    password: expect.any(String),
                }),
            });

            expect(result.success).toBe(true);
            expect(result.autoLoggedIn).toBe(true);
        });

        test('should handle registration success but auto-login failure', async () => {
            const mockRegisterCustomer = vi.fn().mockResolvedValue({
                customerId: 'new-customer-123',
            });

            const mockClient = {
                registerCustomer: mockRegisterCustomer,
                getCustomer: vi.fn(),
            };

            vi.mocked(createApiClients).mockReturnValue({
                shopperCustomers: mockClient,
            } as any);

            // Override fetch implementation for this specific test
            fetchSpy.mockImplementation((url, _options) => {
                const urlString = url.toString();

                if (urlString.includes('/resource/auth/login-registered')) {
                    return Promise.resolve(
                        new Response(
                            JSON.stringify({
                                success: false,
                                error: 'Login failed',
                            }),
                            { status: 401, statusText: 'Unauthorized' }
                        )
                    );
                }

                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            error: `Endpoint not mocked: ${urlString}`,
                            availableEndpoints: ['/resource/auth/login-registered'],
                        }),
                        { status: 404, statusText: 'Not Found' }
                    )
                );
            });

            const result = await registerGuestUser(mockContext, 'test@example.com');

            expect(result.success).toBe(true);
            expect(result.password).toBeDefined();
            expect(result.autoLoggedIn).toBe(false);
            expect(result.error).toBe(t('errors:customer.autoLoginAfterRegistrationFailed'));
            expect(result.customerId).toBeUndefined();
        });

        test('should handle registration failure', async () => {
            const mockRegisterCustomer = vi.fn().mockRejectedValue(new Error('Registration failed'));

            const mockClient = {
                registerCustomer: mockRegisterCustomer,
                getCustomer: vi.fn(),
            };

            vi.mocked(createApiClients).mockReturnValue({
                shopperCustomers: mockClient,
            } as any);

            const result = await registerGuestUser(mockContext, 'test@example.com');

            expect(result.success).toBe(false);
            expect(result.error).toBe(t('errors:customer.registrationFailed'));
            expect(result.customerId).toBeUndefined();
            expect(result.password).toBeUndefined();
            expect(result.autoLoggedIn).toBeUndefined();
        });
    });
});
