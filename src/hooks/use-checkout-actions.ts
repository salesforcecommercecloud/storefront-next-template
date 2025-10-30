import { useFetcher } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { useCheckoutContext } from '@/hooks/use-checkout';
import type { ContactInfoData, PaymentData } from '@/lib/checkout-schemas';
import type { CheckoutActionData } from '@/components/checkout/types';

// Action route constants
const contactInfoActionRoute = '/action/submit-contact-info';
const shippingAddressActionRoute = '/action/submit-shipping-address';
const shippingOptionsActionRoute = '/action/submit-shipping-options';
const paymentActionRoute = '/action/submit-payment';

/**
 * Custom hook for managing checkout form actions using React Router fetchers.
 *
 * This hook provides functionality to submit checkout form data for each step
 * using React Router's useFetcher for handling form submissions without navigation.
 * Each fetcher is keyed to maintain separate state for each checkout step.
 *
 * @returns Object containing checkout action functions and fetcher states
 * @returns submitContactInfo - Function to submit contact information
 * @returns submitShippingAddress - Function to submit shipping address
 * @returns submitShippingOptions - Function to submit shipping options
 * @returns submitPayment - Function to submit payment information
 * @returns contactFetcher - React Router fetcher for contact info requests
 * @returns shippingAddressFetcher - React Router fetcher for shipping address requests
 * @returns shippingOptionsFetcher - React Router fetcher for shipping options requests
 * @returns paymentFetcher - React Router fetcher for payment requests
 * @returns isSubmitting - Function to check if a specific step is submitting
 */
export function useCheckoutActions() {
    const { exitEditMode, editingStep, markShippingOptionsCompleted } = useCheckoutContext();

    const contactFetcher = useFetcher<CheckoutActionData>({ key: 'contact-form' });
    const shippingAddressFetcher = useFetcher<CheckoutActionData>({ key: 'shipping-address-form' });
    const shippingOptionsFetcher = useFetcher<CheckoutActionData>({ key: 'shipping-options-form' });
    const paymentFetcher = useFetcher<CheckoutActionData>({ key: 'payment-form' });

    // Track if we've already exited edit mode for this action to prevent multiple exits
    const hasExitedEditModeRef = useRef<Record<string, boolean>>({});
    // Track which fetchers have been submitted during the current edit session
    const submittedInEditSessionRef = useRef<Record<string, boolean>>({});

    // Create account state
    const [shouldCreateAccount, setShouldCreateAccount] = useState(false);
    const [savedPaymentMethods, setSavedPaymentMethods] = useState(new Set<string>());

    // Reset exit tracking when entering edit mode
    useEffect(() => {
        if (editingStep !== null) {
            hasExitedEditModeRef.current = {};
            submittedInEditSessionRef.current = {};
        }
    }, [editingStep]);

    // Exit edit mode when any action completes successfully
    // Step progression is now computed from basket state, so we just need to exit edit mode
    useEffect(() => {
        const fetchersToCheck = [
            { name: 'contact', fetcher: contactFetcher },
            { name: 'shippingAddress', fetcher: shippingAddressFetcher },
            { name: 'shippingOptions', fetcher: shippingOptionsFetcher },
            { name: 'payment', fetcher: paymentFetcher },
        ];

        // Only exit edit mode if we're currently in edit mode
        if (editingStep !== null) {
            // Check for fetchers that just transitioned from submitting/loading to idle with success
            for (const { name, fetcher } of fetchersToCheck) {
                const hasSuccess = fetcher.data?.success;
                const hasAlreadyExited = hasExitedEditModeRef.current[name];
                const wasSubmitted = submittedInEditSessionRef.current[name];

                // Skip if we've already exited edit mode for this fetcher
                if (hasAlreadyExited) {
                    continue;
                }

                // Exit edit mode if fetcher has success data AND was submitted during current edit session
                if (hasSuccess && wasSubmitted) {
                    hasExitedEditModeRef.current[name] = true;
                    exitEditMode();
                    break; // Exit after first successful completion
                }
            }
        }
        // Following project pattern: only include fetcher.data as dependencies
        // The fetcher objects and stable functions like exitEditMode don't need to be dependencies
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        contactFetcher.data,
        shippingAddressFetcher.data,
        shippingOptionsFetcher.data,
        paymentFetcher.data,
        editingStep,
    ]);

    /**
     * Submits contact information to the contact info action.
     *
     * @param data - Contact form data containing email
     */
    const submitContactInfo = (data: ContactInfoData) => {
        // Prevent concurrent submissions
        if (contactFetcher.state === 'submitting') {
            return;
        }

        // Track that this fetcher was submitted during the current edit session
        submittedInEditSessionRef.current.contact = true;

        // Convert typed data to FormData for fetcher submission
        const formData = new FormData();
        formData.append('email', data.email);

        void contactFetcher.submit(formData, {
            method: 'post',
            action: contactInfoActionRoute,
        });
    };

    /**
     * Submits shipping address information to the shipping address action.
     *
     * @param formData - FormData containing shipping address fields
     */
    const submitShippingAddress = (formData: FormData) => {
        // Prevent concurrent submissions
        if (shippingAddressFetcher.state === 'submitting') {
            return;
        }

        // Track that this fetcher was submitted during the current edit session
        submittedInEditSessionRef.current.shippingAddress = true;

        void shippingAddressFetcher.submit(formData, {
            method: 'post',
            action: shippingAddressActionRoute,
        });
    };

    /**
     * Submits shipping options to the shipping options action.
     *
     * @param formData - FormData containing selected shipping method
     */
    const submitShippingOptions = (formData: FormData) => {
        // Prevent concurrent submissions
        if (shippingOptionsFetcher.state === 'submitting') {
            return;
        }

        // Track that this fetcher was submitted during the current edit session
        submittedInEditSessionRef.current.shippingOptions = true;

        // Mark shipping options as completed by user action (prevents auto-advancement)
        markShippingOptionsCompleted();

        void shippingOptionsFetcher.submit(formData, {
            method: 'post',
            action: shippingOptionsActionRoute,
        });
    };

    /**
     * Submits payment information to the payment action.
     *
     * @param data - Payment form data containing card details and billing info
     */
    const submitPayment = (data: PaymentData) => {
        // Prevent concurrent submissions
        if (paymentFetcher.state === 'submitting') {
            return;
        }
        // Track that this fetcher was submitted during the current edit session
        submittedInEditSessionRef.current.payment = true;

        // Convert typed data to FormData for fetcher submission
        const formData = new FormData();
        formData.append('cardNumber', data.cardNumber || '');
        formData.append('cardholderName', data.cardholderName || '');
        formData.append('expiryDate', data.expiryDate || '');
        formData.append('cvv', data.cvv || '');
        formData.append('billingSameAsShipping', data.billingSameAsShipping.toString());

        // Include saved payment method fields
        formData.append('useSavedPaymentMethod', data.useSavedPaymentMethod?.toString() || 'false');
        if (data.selectedSavedPaymentMethod) {
            formData.append('selectedSavedPaymentMethod', data.selectedSavedPaymentMethod);
        }

        if (!data.billingSameAsShipping) {
            formData.append('billingFirstName', data.billingFirstName || '');
            formData.append('billingLastName', data.billingLastName || '');
            formData.append('billingAddress1', data.billingAddress1 || '');
            formData.append('billingAddress2', data.billingAddress2 || '');
            formData.append('billingCity', data.billingCity || '');
            formData.append('billingStateCode', data.billingStateCode || '');
            formData.append('billingPostalCode', data.billingPostalCode || '');
            formData.append('billingPhone', data.billingPhone || '');
        }

        // Submit payment form data
        void paymentFetcher.submit(formData, {
            method: 'post',
            action: paymentActionRoute,
        });
    };

    /**
     * Helper function to check if a specific checkout step is currently submitting.
     *
     * @param step - The checkout step to check ('contact' | 'shipping-address' | 'shipping-options' | 'payment')
     * @returns true if the step is currently submitting, false otherwise
     */
    const isSubmitting = (step: 'contact' | 'shipping-address' | 'shipping-options' | 'payment'): boolean => {
        switch (step) {
            case 'contact':
                return contactFetcher.state === 'submitting';
            case 'shipping-address':
                return shippingAddressFetcher.state === 'submitting';
            case 'shipping-options':
                return shippingOptionsFetcher.state === 'submitting';
            case 'payment':
                return paymentFetcher.state === 'submitting';
            default:
                return false;
        }
    };

    /**
     * Callback for when payment methods are saved
     *
     * @param paymentId - The ID of the payment method that was saved
     */
    const handlePaymentMethodSaved = (paymentId: string) => {
        setSavedPaymentMethods((prev) => new Set([...prev, paymentId]));
    };

    /**
     * Callback for when create account preference changes
     *
     * @param shouldCreate - Whether the user wants to create an account
     */
    const handleCreateAccountPreferenceChange = (shouldCreate: boolean) => {
        setShouldCreateAccount(shouldCreate);

        // Store preference in session storage for use during order placement
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('shouldCreateAccount', shouldCreate.toString());
        }
    };

    return {
        // Action functions
        submitContactInfo,
        submitShippingAddress,
        submitShippingOptions,
        submitPayment,

        // Fetcher objects
        contactFetcher,
        shippingAddressFetcher,
        shippingOptionsFetcher,
        paymentFetcher,

        // Helper functions
        isSubmitting,

        // Create account state and functions
        shouldCreateAccount,
        savedPaymentMethods,
        handlePaymentMethodSaved,
        handleCreateAccountPreferenceChange,
    };
}
