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
import { CustomerProfileFields } from './customer-profile-fields';

//hooks
import { useScapiFetcherEffect } from '@/hooks/use-scapi-fetcher-effect';

//types
import { customerProfileFormSchema } from './index';
import { type CustomerProfileFormData, type CustomerProfileFormProps } from './types';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';

import uiStrings from '@/temp-ui-string';

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
    const form = useForm<CustomerProfileFormData>({
        resolver: zodResolver(customerProfileFormSchema),
        defaultValues: {
            firstName: initialData?.firstName || '',
            lastName: initialData?.lastName || '',
            email: initialData?.email || '',
            phone: initialData?.phone || '',
        },
    });

    // Use useScapiFetcherEffect to handle fetcher state changes
    // This handles form-specific concerns (reset, error state) and calls parent callbacks
    // Note: data is the unwrapped customer object from the API response
    useScapiFetcherEffect(updateFetcher, {
        onSuccess: (data) => {
            if (data) {
                // data is already the customer object (unwrapped by ScapiFetcher)
                const customer = data as ShopperCustomers.schemas['Customer'];

                const formData: CustomerProfileFormData = {
                    firstName: (customer.firstName as string) || '',
                    lastName: (customer.lastName as string) || '',
                    email: (customer.email as string) || (customer.login as string) || '',
                    phone: (customer.phoneHome as string) || (customer.phoneMobile as string) || '',
                };

                // Reset form on success
                form.reset();
                // Call parent callback - parent will handle toasts and other UI feedback
                onSuccess?.(formData);
            }
        },
        onError: (errors) => {
            const errorMessage =
                errors && errors.length > 0 ? errors.join(', ') : uiStrings.account.profile.errorMessage;
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
     */
    const handleSubmit = form.handleSubmit((data) => {
        // Prepare customer data in the format expected by Commerce SDK
        const customerUpdateData = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phoneHome: data.phone || undefined,
        };

        // Submit the update request - response will be handled by parent component's fetcher effect
        void updateFetcher.submit({
            ...customerUpdateData,
            phoneHome: customerUpdateData.phoneHome || '',
        });
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
