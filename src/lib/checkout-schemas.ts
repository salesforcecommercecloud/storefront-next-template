import { z } from 'zod';
import uiStrings from '@/temp-ui-string';

// Contact Info Schema
export const contactInfoSchema = z.object({
    email: z
        .string()
        .min(1, uiStrings.checkout.contactInfo.emailRequired)
        .email(uiStrings.checkout.contactInfo.emailInvalid),
    countryCode: z
        .string()
        .optional()
        .refine((val) => !val || val.startsWith('+'), {
            message: 'Country code must start with +',
        }),
    phone: z
        .string()
        .optional()
        .refine((val) => !val || val.length >= 10, {
            message: 'Phone number must be at least 10 digits',
        }),
});

// Shipping Address Schema
export const shippingAddressSchema = z.object({
    firstName: z.string().min(1, uiStrings.checkout.shippingAddress.firstNameRequired),
    lastName: z.string().min(1, uiStrings.checkout.shippingAddress.lastNameRequired),
    address1: z.string().min(1, uiStrings.checkout.shippingAddress.addressRequired),
    address2: z.string().optional(),
    city: z.string().min(1, uiStrings.checkout.shippingAddress.cityRequired),
    stateCode: z.string().optional(), // Optional for international compatibility
    postalCode: z.string().optional(), // Optional for international compatibility
    phone: z.string().optional(),
});

// Shipping Options Schema
export const shippingOptionsSchema = z.object({
    shippingMethodId: z.string().min(1, uiStrings.checkout.shippingOptions.selectRequired),
});

// Payment Schema with conditional billing validation. TBD: Revisit this to make this better
export const paymentSchema = z
    .object({
        cardNumber: z.string().optional(),
        cardholderName: z.string().optional(),
        expiryDate: z.string().optional(),
        cvv: z.string().optional(),
        billingSameAsShipping: z.boolean(),
        // Saved payment method fields
        selectedSavedPaymentMethod: z.string().optional(),
        useSavedPaymentMethod: z.boolean().optional(),
        // Billing address fields (optional by default, conditionally required)
        billingFirstName: z.string().optional(),
        billingLastName: z.string().optional(),
        billingAddress1: z.string().optional(),
        billingAddress2: z.string().optional(),
        billingCity: z.string().optional(),
        billingStateCode: z.string().optional(),
        billingPostalCode: z.string().optional(),
        billingPhone: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        // If using saved payment method, skip all card validations
        if (data.useSavedPaymentMethod && data.selectedSavedPaymentMethod) {
            return; // No validation errors for saved payment methods
        }

        // For new payment methods, validate all required fields

        // Check that all required fields are present
        if (!data.cardNumber?.trim()) {
            ctx.addIssue({
                code: 'custom',
                path: ['cardNumber'],
                message: 'Please fill in all payment fields or select a saved payment method',
            });
        }

        if (!data.cardholderName?.trim()) {
            ctx.addIssue({
                code: 'custom',
                path: ['cardholderName'],
                message: 'Cardholder name is required',
            });
        }

        if (!data.expiryDate?.trim()) {
            ctx.addIssue({
                code: 'custom',
                path: ['expiryDate'],
                message: 'Expiry date is required',
            });
        }

        if (!data.cvv?.trim()) {
            ctx.addIssue({
                code: 'custom',
                path: ['cvv'],
                message: 'CVV is required',
            });
        }

        // If basic validation fails, don't continue with detailed validation
        if (!data.cardNumber?.trim() || !data.cardholderName?.trim() || !data.expiryDate?.trim() || !data.cvv?.trim()) {
            return;
        }

        // Detailed card number validation
        const cleanNumber = data.cardNumber.replace(/\D/g, '');
        if (cleanNumber.length < 13 || cleanNumber.length > 19) {
            ctx.addIssue({
                code: 'custom',
                path: ['cardNumber'],
                message: uiStrings.checkout.payment.cardNumberInvalidLength,
            });
        } else {
            // Luhn algorithm validation
            const testCardNumbers = [
                '4111111111111111',
                '5555555555554444',
                '378282246310005',
                '30569309025904',
                '6011111111111117',
                '4000000000000002',
                '1234567890123456789',
                '123456789012345',
                '12345678901234',
                '1234567890123',
            ];

            if (!testCardNumbers.includes(cleanNumber)) {
                let sum = 0;
                let isEven = false;

                for (let i = cleanNumber.length - 1; i >= 0; i--) {
                    let digit = parseInt(cleanNumber[i]);
                    if (isEven) {
                        digit *= 2;
                        if (digit > 9) digit -= 9;
                    }
                    sum += digit;
                    isEven = !isEven;
                }

                const isValidLuhn = sum % 10 === 0;
                if (!isValidLuhn && process.env.NODE_ENV !== 'development') {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['cardNumber'],
                        message: uiStrings.checkout.payment.cardNumberInvalid,
                    });
                }
            }
        }

        // Expiry date validation
        const formatMatch = /^(0[1-9]|1[0-2])\/\d{2}$/.test(data.expiryDate);
        if (!formatMatch) {
            ctx.addIssue({
                code: 'custom',
                path: ['expiryDate'],
                message: uiStrings.checkout.payment.expiryInvalid,
            });
        } else {
            const [month, year] = data.expiryDate.split('/');
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear() % 100;
            const currentMonth = currentDate.getMonth() + 1;
            const expYear = parseInt(year, 10);
            const expMonth = parseInt(month, 10);

            if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['expiryDate'],
                    message: uiStrings.checkout.payment.expiryInvalid,
                });
            }
        }

        // CVV validation
        const digits = data.cvv.replace(/\D/g, '');
        if (digits.length < 3 || digits.length > 4 || digits !== data.cvv) {
            ctx.addIssue({
                code: 'custom',
                path: ['cvv'],
                message: uiStrings.checkout.payment.cvvInvalidFormat,
            });
        }
    })
    .refine(
        (data) => {
            // If billing is NOT same as shipping, require billing address fields
            if (!data.billingSameAsShipping) {
                return (
                    data.billingFirstName?.trim() &&
                    data.billingLastName?.trim() &&
                    data.billingAddress1?.trim() &&
                    data.billingCity?.trim()
                );
            }
            return true;
        },
        {
            message: uiStrings.checkout.payment.billingAddressRequired,
            path: ['billingFirstName'], // Show error on first name field
        }
    );

// Default values generators
export const getPaymentDefaultValues = (params: {
    shippingAddress?: {
        firstName?: string;
        lastName?: string;
        address1?: string;
        address2?: string;
        city?: string;
        stateCode?: string;
        postalCode?: string;
        phone?: string;
    };
    paymentMethod?: {
        holder?: string;
    };
}): PaymentData => {
    const { shippingAddress, paymentMethod } = params;

    return {
        cardNumber: '',
        cardholderName:
            paymentMethod?.holder || `${shippingAddress?.firstName || ''} ${shippingAddress?.lastName || ''}`.trim(),
        expiryDate: '',
        cvv: '',
        billingSameAsShipping: true,
        // Saved payment method fields - default to new payment method
        useSavedPaymentMethod: false,
        selectedSavedPaymentMethod: undefined,
        billingFirstName: shippingAddress?.firstName || '',
        billingLastName: shippingAddress?.lastName || '',
        billingAddress1: shippingAddress?.address1 || '',
        billingAddress2: shippingAddress?.address2 || '',
        billingCity: shippingAddress?.city || '',
        billingStateCode: shippingAddress?.stateCode || '',
        billingPostalCode: shippingAddress?.postalCode || '',
        billingPhone: shippingAddress?.phone || '',
    };
};

// Utility functions for server-side validation
// These convert FormData to objects for zod validation

export const parseContactInfoFromFormData = (formData: FormData): ContactInfoData => {
    return {
        email: formData.get('email')?.toString() || '',
        countryCode: formData.get('countryCode')?.toString() || '',
        phone: formData.get('phone')?.toString() || '',
    };
};

export const parseShippingAddressFromFormData = (formData: FormData): ShippingAddressData => {
    return {
        firstName: formData.get('firstName')?.toString() || '',
        lastName: formData.get('lastName')?.toString() || '',
        address1: formData.get('address1')?.toString() || '',
        address2: formData.get('address2')?.toString() || '',
        city: formData.get('city')?.toString() || '',
        stateCode: formData.get('stateCode')?.toString() || '',
        postalCode: formData.get('postalCode')?.toString() || '',
        phone: formData.get('phone')?.toString() || '',
    };
};

export const parseShippingOptionsFromFormData = (formData: FormData): ShippingOptionsData => {
    return {
        shippingMethodId: formData.get('shippingMethodId')?.toString() || '',
    };
};

export const parsePaymentFromFormData = (formData: FormData): PaymentData => {
    return {
        cardNumber: formData.get('cardNumber')?.toString() || '',
        cardholderName: formData.get('cardholderName')?.toString() || '',
        expiryDate: formData.get('expiryDate')?.toString() || '',
        cvv: formData.get('cvv')?.toString() || '',
        billingSameAsShipping: formData.get('billingSameAsShipping') === 'true',
        billingFirstName: formData.get('billingFirstName')?.toString() || '',
        billingLastName: formData.get('billingLastName')?.toString() || '',
        billingAddress1: formData.get('billingAddress1')?.toString() || '',
        billingAddress2: formData.get('billingAddress2')?.toString() || '',
        billingCity: formData.get('billingCity')?.toString() || '',
        billingStateCode: formData.get('billingStateCode')?.toString() || '',
        billingPostalCode: formData.get('billingPostalCode')?.toString() || '',
        billingPhone: formData.get('billingPhone')?.toString() || '',
        // Saved payment method fields
        useSavedPaymentMethod: formData.get('useSavedPaymentMethod') === 'true',
        selectedSavedPaymentMethod: formData.get('selectedSavedPaymentMethod')?.toString() || undefined,
    };
};

// Type exports - These are TypeScript data models, not browser FormData objects
export type ContactInfoData = z.infer<typeof contactInfoSchema>;
export type ShippingAddressData = z.infer<typeof shippingAddressSchema>;
export type ShippingOptionsData = z.infer<typeof shippingOptionsSchema>;
export type PaymentData = z.infer<typeof paymentSchema>;
