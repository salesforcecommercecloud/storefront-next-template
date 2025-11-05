import { type UseFormReturn } from 'react-hook-form';
import type { FetcherWithComponents } from 'react-router';

// Type for the form data (inferred from schema in index.tsx)
export type PasswordUpdateFormData = {
    currentPassword: string;
    password: string;
    confirmPassword: string;
    email?: string;
};

// Type for the fetcher data response
export type PasswordUpdateFetcherData = {
    success: boolean;
    error?: string;
};

// Props interface for PasswordUpdateForm component
export interface PasswordUpdateFormProps {
    initialData?: Partial<PasswordUpdateFormData>;
    onSuccess?: (formData: PasswordUpdateFormData) => void;
    onError?: (error: string) => void;
    onCancel?: () => void;
}

// Props interface for PasswordUpdateFields component
export interface PasswordUpdateFieldsProps {
    form: UseFormReturn<PasswordUpdateFormData>;
    updateFetcher: FetcherWithComponents<PasswordUpdateFetcherData>;
    onCancel?: () => void;
}
