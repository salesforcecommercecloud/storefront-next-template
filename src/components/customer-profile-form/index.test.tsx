import { describe, expect, it } from 'vitest';
import { customerProfileFormSchema } from './index';

describe('customerProfileFormSchema', () => {
    describe('valid data', () => {
        it('should validate when all required fields are provided with valid email', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '1234567890',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should validate without phone field', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should validate with empty phone field', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('firstName validation', () => {
        it('should reject when firstName is empty', () => {
            const invalidData = {
                firstName: '',
                lastName: 'Doe',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('firstName'))).toBe(true);
            }
        });

        it('should reject when firstName is missing', () => {
            const invalidData = {
                lastName: 'Doe',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should accept single character firstName', () => {
            const validData = {
                firstName: 'J',
                lastName: 'Doe',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('lastName validation', () => {
        it('should reject when lastName is empty', () => {
            const invalidData = {
                firstName: 'John',
                lastName: '',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('lastName'))).toBe(true);
            }
        });

        it('should reject when lastName is missing', () => {
            const invalidData = {
                firstName: 'John',
                email: 'john.doe@example.com',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });

    describe('email validation', () => {
        it('should reject when email is empty', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                email: '',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('email'))).toBe(true);
            }
        });

        it('should reject when email is missing', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject invalid email format', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'not-an-email',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('email'))).toBe(true);
            }
        });

        it('should reject email without @ symbol', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'johndoeexample.com',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject email without domain', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should accept valid email formats', () => {
            const validEmails = [
                'john.doe@example.com',
                'johndoe@example.co.uk',
                'john+doe@example.com',
                'john_doe@example.com',
                'j.doe@example.com',
            ];

            validEmails.forEach((email) => {
                const validData = {
                    firstName: 'John',
                    lastName: 'Doe',
                    email,
                };

                const result = customerProfileFormSchema.safeParse(validData);
                expect(result.success).toBe(true);
            });
        });
    });

    describe('phone validation', () => {
        it('should accept valid phone number with digits only', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '1234567890',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept valid phone number with international prefix', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1234567890',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept phone number with formatting characters', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '(123) 456-7890', // Will be cleaned by the regex
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject invalid phone format with letters', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '123-ABC-7890',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues.some((issue) => issue.path.includes('phone'))).toBe(true);
            }
        });

        it('should reject phone number starting with 0', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '0123456789',
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject phone number that is too long', () => {
            const invalidData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '123456789012345678', // Too long
            };

            const result = customerProfileFormSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should accept empty phone as valid', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept phone with spaces and formatting that gets cleaned', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '+1 (555) 123-4567',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle names with special characters', () => {
            const validData = {
                firstName: 'Jean-Pierre',
                lastName: "O'Brien",
                email: 'j.p@example.com',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle names with unicode characters', () => {
            const validData = {
                firstName: 'José',
                lastName: 'García',
                email: 'jose@example.com',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle email with subdomain', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@mail.example.com',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should handle all minimum required fields', () => {
            const validData = {
                firstName: 'A',
                lastName: 'B',
                email: 'a@b.co',
            };

            const result = customerProfileFormSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });
    });
});
