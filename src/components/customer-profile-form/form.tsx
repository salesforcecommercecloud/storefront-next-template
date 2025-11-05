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
import { useToast } from '@/components/toast';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useScapiFetcherEffect } from '@/hooks/use-scapi-fetcher-effect';
import { useAuth } from '@/providers/auth';

//types
import { customerProfileFormSchema } from './index';
import { type CustomerProfileFormData, type CustomerProfileFormProps, type CustomerProfileFetcherData } from './types';
import type { FetcherWithComponents } from 'react-router';

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
export const CustomerProfileForm = ({ initialData, onSuccess, onError, onCancel }: CustomerProfileFormProps) => {
    const auth = useAuth();
    const customerId = auth?.customer_id;

    const form = useForm<CustomerProfileFormData>({
        resolver: zodResolver(customerProfileFormSchema),
        defaultValues: {
            firstName: initialData?.firstName || '',
            lastName: initialData?.lastName || '',
            email: initialData?.email || '',
            phone: initialData?.phone || '',
        },
    });

    const { addToast } = useToast();

    /**
     * Handles successful customer profile update.
     * Resets the form, shows success toast, and calls the onSuccess callback with form data.
     *
     * @param data - The response data from the successful update containing the updated customer
     */
    const handleOnSuccess = (data: unknown) => {
        // Update was successful
        form.reset();
        addToast(uiStrings.account.profile.successMessage, 'success');

        // Extract form data from API response
        const response = data as { success: boolean; customer?: Record<string, unknown> };
        const customer = response.customer;

        if (customer) {
            const formData: CustomerProfileFormData = {
                firstName: (customer.firstName as string) || '',
                lastName: (customer.lastName as string) || '',
                email: (customer.email as string) || (customer.login as string) || '',
                phone: (customer.phoneHome as string) || (customer.phoneMobile as string) || '',
            };
            onSuccess?.(formData);
        } else {
            // Fallback to empty form data if API response doesn't contain customer
            onSuccess?.({} as CustomerProfileFormData);
        }
    };

    /**
     * Handles failed customer profile update.
     * Sets form error state, shows error toast, and calls the onError callback.
     *
     * @param error - The error response from the failed update
     */
    const handleOnError = (error: string) => {
        // Update failed
        const errorMessage = error || uiStrings.account.profile.errorMessage;

        form.setError('root', {
            type: 'manual',
            message: errorMessage,
        });

        addToast(errorMessage, 'error');
        onError?.(error);
    };

    // Initialize useScapiFetcher for ShopperCustomers.updateCustomer
    const updateCustomerFetcher = useScapiFetcher('ShopperCustomers', 'updateCustomer', {
        parameters: { customerId: customerId || '' },
        body: {}, // Will be populated when submitting
    });

    // Handle success/error callbacks using useScapiFetcherEffect
    useScapiFetcherEffect(updateCustomerFetcher, {
        onSuccess: handleOnSuccess,
        onError: handleOnError,
    });

    /**
     * Handles form submission for updating customer profile.
     *
     * This function is called when the form is submitted and performs the following:
     * 1. Validates the form data using the Zod schema
     * 2. Calls the updateCustomerFetcher.submit with the validated data
     * 3. The API response is handled by the handleOnSuccess/handleOnError callbacks in useFetch
     *
     * @param data - The validated form data containing profile information
     * @param data.firstName - The customer's first name
     * @param data.lastName - The customer's last name
     * @param data.email - The customer's email address
     * @param data.phone - The customer's phone number
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

        // Prepare customer data in the format expected by Commerce SDK
        const customerUpdateData = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phoneHome: data.phone || undefined,
        };

        // Submit the update request - response will be handled by useEffect
        void updateCustomerFetcher.submit({
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
                        profileFetcher={updateCustomerFetcher as FetcherWithComponents<CustomerProfileFetcherData>}
                        onCancel={onCancel ? handleCancel : undefined}
                    />
                </form>
            </Form>
        </div>
    );
};
