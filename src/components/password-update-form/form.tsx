/* c8 ignore start */
/* istanbul ignore file */
// This file is excluded from coverage as it primarily handles React Hook Form integration,
// React Router fetcher coordination, and API submission logic. These aspects require complex
// mocking of hooks, context providers, and network requests that are better tested through
// integration tests. The core validation logic is thoroughly tested in index.test.tsx.
/* c8 ignore end */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// components
import { Form } from '@/components/ui/form';
import { PasswordUpdateFields } from './password-update-fields';

//hooks
import { useToast } from '@/components/toast';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useScapiFetcherEffect } from '@/hooks/use-scapi-fetcher-effect';
import { useAuth } from '@/providers/auth';

//types
import { passwordUpdateFormSchema } from './index';
import { type PasswordUpdateFormData, type PasswordUpdateFormProps, type PasswordUpdateFetcherData } from './types';
import type { FetcherWithComponents } from 'react-router';

import uiStrings from '@/temp-ui-string';

/**
 * PasswordUpdateForm component that provides a form interface for changing user password.
 *
 * This component renders a form for entering current password, new password, and confirmation.
 * It handles form validation, submission, and displays appropriate success/error feedback through toasts.
 * The form automatically resets on successful submission.
 *
 * @param initialData - Optional initial data to populate the form fields (e.g., customer email)
 * @param onSuccess - Optional callback function called when password is successfully updated (receives form data)
 * @param onError - Optional callback function called when password update fails (receives error)
 * @param onCancel - Optional callback function called when user cancels the form
 *
 * @returns JSX element containing the password update form
 *
 * @example
 * ```tsx
 * // Basic usage with initial data and callbacks
 * <PasswordUpdateForm
 *   initialData={{ email: 'user@example.com' }}
 *   onSuccess={(formData) => console.log('Password updated!', formData)}
 *   onError={(error) => console.error('Update failed:', error)}
 *   onCancel={() => setEditing(false)}
 * />
 *
 * // Usage without initial data
 * <PasswordUpdateForm />
 * ```
 */
export const PasswordUpdateForm = ({ initialData, onSuccess, onError, onCancel }: PasswordUpdateFormProps) => {
    const auth = useAuth();
    const customerId = auth?.customer_id;

    const form = useForm<PasswordUpdateFormData>({
        resolver: zodResolver(passwordUpdateFormSchema),
        defaultValues: {
            currentPassword: '',
            password: '',
            confirmPassword: '',
            email: initialData?.email || '',
        },
    });

    const { addToast } = useToast();

    /**
     * Handles successful password update.
     * Resets the form, shows success toast, and calls the onSuccess callback with form data.
     *
     * @param data - The response data from the successful update
     */
    const handleOnSuccess = (_data: unknown) => {
        // Update was successful

        // Get form data before resetting the form
        const currentFormData = form.getValues();

        // Reset the form to clear the input fields
        form.reset();

        // Show success toast
        addToast(uiStrings.account.password.successMessage, 'success');

        // Call the onSuccess callback with form data
        onSuccess?.(currentFormData);
    };

    /**
     * Handles failed password update.
     * Sets form error state, shows error toast, and calls the onError callback.
     *
     * @param error - The error response from the failed update
     */
    const handleOnError = (error: string) => {
        // Update failed
        const errorMessage = error || uiStrings.account.password.errorMessage;

        form.setError('root', {
            type: 'manual',
            message: errorMessage,
        });

        addToast(errorMessage, 'error');
        onError?.(error);
    };

    // Initialize useScapiFetcher for ShopperCustomers.updateCustomerPassword
    const updatePasswordFetcher = useScapiFetcher('ShopperCustomers', 'updateCustomerPassword', {
        parameters: { customerId: customerId || '' },
        body: { currentPassword: '', password: '' }, // Will be populated when submitting
    });

    // Handle success/error callbacks using useScapiFetcherEffect
    useScapiFetcherEffect(updatePasswordFetcher, {
        onSuccess: (data) => {
            handleOnSuccess(data);
        },
        onError: (error) => {
            handleOnError(typeof error === 'string' ? error : error.message || 'Unknown error');
        },
    });

    /**
     * Handles form submission for changing password.
     *
     * This function is called when the form is submitted and performs the following:
     * 1. Validates the form data using the Zod schema
     * 2. Calls the updatePasswordFetcher.submit with the validated data
     * 3. The API response is handled by the handleOnSuccess/handleOnError callbacks in useScapiFetcherEffect
     *
     * @param data - The validated form data containing password information
     * @param data.currentPassword - The user's current password
     * @param data.password - The new password to set
     * @param data.confirmPassword - The confirmation of the new password (used for validation only)
     */
    const handleSubmit = form.handleSubmit((data) => {
        // Check if customer ID is available
        if (!customerId) {
            form.setError('root', {
                type: 'manual',
                message: 'Customer ID not found. Please log in again.',
            });
            addToast('Customer ID not found. Please log in again.', 'error');
            return;
        }

        // Prepare password data in the format expected by Commerce SDK
        const passwordUpdateData = {
            currentPassword: data.currentPassword,
            password: data.password,
        };

        // Submit the update request - response will be handled by useScapiFetcherEffect
        void updatePasswordFetcher.submit(passwordUpdateData);
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
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="password-update-form">
                    <PasswordUpdateFields
                        form={form}
                        updateFetcher={updatePasswordFetcher as FetcherWithComponents<PasswordUpdateFetcherData>}
                        onCancel={onCancel ? handleCancel : undefined}
                    />
                </form>
            </Form>
        </div>
    );
};
