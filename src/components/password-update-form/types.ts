import { type UseFormReturn } from 'react-hook-form';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';

// Type for the form data (inferred from schema in index.tsx)
export type PasswordUpdateFormData = {
    currentPassword: string;
    password: string;
    confirmPassword: string; // Virtual field for validation only, not included in submission
};

// Type for the submission payload (excludes virtual fields)
export type PasswordUpdateSubmissionData = {
    currentPassword: string;
    password: string;
};

// Type for the fetcher data response
export type PasswordUpdateFetcherData = {
    success: boolean;
    error?: string;
};

// Props interface for PasswordUpdateForm component
export interface PasswordUpdateFormProps {
    initialData?: Partial<PasswordUpdateFormData>;
    updateFetcher: ScapiFetcher<PasswordUpdateFetcherData>;
    onSuccess?: (formData: PasswordUpdateFormData) => void;
    onError?: (error: string) => void;
    onCancel?: () => void;
}

// Props interface for PasswordUpdateFields component
export interface PasswordUpdateFieldsProps {
    form: UseFormReturn<PasswordUpdateFormData>;
    updateFetcher: ScapiFetcher<PasswordUpdateFetcherData>;
    onCancel?: () => void;
}
