import { z } from 'zod';

import uiStrings from '@/temp-ui-string';

// Password update form validation schema
// Note: confirmPassword is a "virtual" field used only for validation, not included in submission
// eslint-disable-next-line react-refresh/only-export-components
export const passwordUpdateFormSchema = z
    .object({
        currentPassword: z.string().min(1, {
            message: uiStrings.account.password.validation.currentPasswordRequired,
        }),
        password: z.string().min(8, {
            message: uiStrings.account.password.validation.passwordTooShort,
        }),
        confirmPassword: z.string().min(1, {
            message: uiStrings.account.password.validation.confirmPasswordRequired,
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: uiStrings.account.password.validation.passwordsDoNotMatch,
        path: ['confirmPassword'],
    });

// Export main component
export { PasswordUpdateForm } from './form';

// Export sub-components
export { PasswordUpdateFields } from './password-update-fields';

// Export types
export {
    type PasswordUpdateFormData,
    type PasswordUpdateSubmissionData,
    type PasswordUpdateFormProps,
    type PasswordUpdateFieldsProps,
    type PasswordUpdateFetcherData,
} from './types';

// Default export for backward compatibility
export { PasswordUpdateForm as default } from './form';
