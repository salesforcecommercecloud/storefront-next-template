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

/* c8 ignore start */
/* istanbul ignore file */
// This file is excluded from coverage as it primarily handles React Hook Form integration,
// React Router fetcher coordination, and API submission logic. These aspects require complex
// mocking of hooks, context providers, and network requests that are better tested through
// integration tests. The core validation logic is thoroughly tested in index.test.tsx.
/* c8 ignore end */

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// components
import { Form } from '@/components/ui/form';
import { CustomerProfileFields } from './customer-profile-fields';

//hooks
import { useScapiFetcherEffect } from '@/hooks/use-scapi-fetcher-effect';

//types
import { createCustomerProfileFormSchema, type CustomerProfileFormData } from './index';
import { type CustomerProfileFormProps } from './types';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

/**
 * CustomerProfileForm component that provides a form interface for editing customer profile information.
 *
 * This component renders a form for editing first name, last name, email, and phone number.
 * It handles form validation, submission, and displays appropriate success/error feedback through toasts.
 * The form automatically resets on successful submission. Success and error handling is managed
 * through the useFetch hook's onSuccess/onError callbacks.
 *
 * @param initialData - Optional initial data to populate the form fields
 * @param onSuccess - Optional callback function called when profile is successfully updated (receives form data)
 * @param onError - Optional callback function called when profile update fails (receives error)
 * @param onCancel - Optional callback function called when user cancels the form
 *
 * @returns JSX element containing the customer profile form
 *
 * @example
 * ```tsx
 * // Basic usage with initial data and callbacks
 * <CustomerProfileForm
 *   initialData={{ firstName: 'John', lastName: 'Doe', email: 'john@example.com' }}
 *   onSuccess={(formData) => console.log('Profile updated!', formData)}
 *   onError={(error) => console.error('Update failed:', error)}
 *   onCancel={() => setEditing(false)}
 * />
 *
 * // Usage without initial data
 * <CustomerProfileForm />
 * ```
 */
export const CustomerProfileForm = ({
    initialData,
    updateFetcher,
    onSuccess,
    onError,
    onCancel,
}: CustomerProfileFormProps) => {
    const { t } = useTranslation('account');
    // Cast t to generic TFunction since schema uses full namespace:key format (account:profile.validation.*)
    const schema = useMemo(() => createCustomerProfileFormSchema(t as unknown as TFunction), [t]);

    const form = useForm<CustomerProfileFormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            firstName: initialData?.firstName || '',
            lastName: initialData?.lastName || '',
            email: initialData?.email || '',
            phone: initialData?.phone || '',
            gender: initialData?.gender || '',
            birthday: initialData?.birthday || '',
        },
    });

    // Use useScapiFetcherEffect to handle fetcher state changes
    // This handles form-specific concerns (reset, error state) and calls parent callbacks
    // Note: data is the unwrapped customer object from the API response
    useScapiFetcherEffect(updateFetcher, {
        onSuccess: (data) => {
            if (data) {
                // data is already the customer object (unwrapped by ScapiFetcher)
                const customer = data;

                const formData: CustomerProfileFormData = {
                    firstName: (customer.firstName as string) || '',
                    lastName: (customer.lastName as string) || '',
                    email: (customer.email as string) || (customer.login as string) || '',
                    phone: (customer.phoneHome as string) || (customer.phoneMobile as string) || '',
                    gender: customer.gender !== undefined ? String(customer.gender) : '',
                    birthday: (customer.birthday as string) || '',
                };

                // Reset form on success
                form.reset();
                // Call parent callback - parent will handle toasts and other UI feedback
                onSuccess?.(formData);
            }
        },
        onError: (errors) => {
            const errorMessage = errors && errors.length > 0 ? errors.join(', ') : t('profile.errorMessage');
            // Set form error state
            form.setError('root', {
                type: 'manual',
                message: errorMessage,
            });
            // Call parent callback - parent will handle toasts
            onError?.(errorMessage);
        },
    });

    /**
     * Handles form submission for updating customer profile.
     *
     * This function is called when the form is submitted and performs the following:
     * 1. Validates the form data using the Zod schema
     * 2. Calls the updateFetcher.submit with the validated data
     * 3. The API response is handled by the parent component's fetcher effect handlers
     *
     * @param data - The validated form data containing profile information
     * @param data.firstName - The customer's first name
     * @param data.lastName - The customer's last name
     * @param data.email - The customer's email address
     * @param data.phone - The customer's phone number
     * @param data.gender - The customer's gender (1=Male, 2=Female)
     * @param data.birthday - The customer's date of birth
     */
    const handleSubmit = form.handleSubmit((data) => {
        // Prepare customer data in the format expected by Commerce SDK
        // Only include fields that have values to avoid sending empty strings
        const customerUpdateData: Record<string, string | number> = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
        };

        customerUpdateData.phoneHome = data.phone ?? '';
        customerUpdateData.gender = data.gender ?? '';
        customerUpdateData.birthday = data.birthday ?? '';

        // Submit the update request - response will be handled by parent component's fetcher effect
        void updateFetcher.submit(customerUpdateData);
    });

    /**
     * Handles cancel action.
     * Resets the form and calls the onCancel callback if provided.
     */
    const handleCancel = () => {
        form.reset();
        onCancel?.();
    };

    return (
        <div className="w-full">
            <Form {...form}>
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="customer-profile-form">
                    <CustomerProfileFields
                        form={form}
                        updateFetcher={updateFetcher}
                        onCancel={onCancel ? handleCancel : undefined}
                    />
                </form>
            </Form>
        </div>
    );
};
