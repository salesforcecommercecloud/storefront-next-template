import { type UseFormReturn } from 'react-hook-form';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';

// Type for the form data (inferred from schema in index.tsx)
export type CustomerProfileFormData = {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
};

// Type for the fetcher data response
export type CustomerProfileFetcherData = {
    success: boolean;
    customer?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        login?: string;
        phoneHome?: string;
        phoneMobile?: string;
    };
    error?: string;
};

// Props interface for CustomerProfileForm component
export interface CustomerProfileFormProps {
    initialData?: Partial<CustomerProfileFormData>;
    updateFetcher: ScapiFetcher<CustomerProfileFetcherData>;
    onSuccess?: (formData: CustomerProfileFormData) => void;
    onError?: (error: string) => void;
    onCancel?: () => void;
}

// Props interface for CustomerProfileFields component
export interface CustomerProfileFieldsProps {
    form: UseFormReturn<CustomerProfileFormData>;
    updateFetcher: ScapiFetcher<CustomerProfileFetcherData>;
    onCancel?: () => void;
}
