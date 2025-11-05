import { z } from 'zod';

import uiStrings from '@/temp-ui-string';

// Customer profile form validation schema
// eslint-disable-next-line react-refresh/only-export-components
export const customerProfileFormSchema = z.object({
    firstName: z.string().min(1, {
        message: uiStrings.account.profile.validation.firstNameRequired,
    }),
    lastName: z.string().min(1, {
        message: uiStrings.account.profile.validation.lastNameRequired,
    }),
    email: z
        .string()
        .min(1, {
            message: uiStrings.account.profile.validation.emailRequired,
        })
        .email({
            message: uiStrings.account.profile.validation.emailInvalid,
        }),
    phone: z
        .string()
        .optional()
        .refine(
            (value) => {
                if (!value || value.trim() === '') return true; // Allow empty phone
                // Basic phone validation - can be enhanced
                const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
                return phoneRegex.test(value.replace(/[\s\-()]/g, ''));
            },
            {
                message: uiStrings.account.profile.validation.phoneInvalid,
            }
        ),
});

// Export main component
export { CustomerProfileForm } from './form';

// Export sub-components
export { CustomerProfileFields } from './customer-profile-fields';

// Export types
export {
    type CustomerProfileFormData,
    type CustomerProfileFormProps,
    type CustomerProfileFieldsProps,
    type CustomerProfileFetcherData,
} from './types';

// Default export for backward compatibility
export { CustomerProfileForm as default } from './form';
