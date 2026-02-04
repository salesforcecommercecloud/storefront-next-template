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
import { useFetcher } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { useCheckoutContext } from '@/hooks/use-checkout';
import { useBasket, useBasketUpdater } from '@/providers/basket';
import type { ContactInfoData, PaymentData } from '@/lib/checkout-schemas';
import type { CheckoutActionData } from '@/components/checkout/types';
import {
    CHECKOUT_STEPS,
    CHECKOUT_ACTION_INTENTS,
    type CheckoutStep,
} from '@/components/checkout/utils/checkout-context-types';

// Action route - all checkout actions go through the checkout route
const checkoutActionRoute = '/checkout';
const placeOrderActionRoute = '/action/place-order';

/**
 * Action lifecycle states for tracking form submission progress.
 */
enum ActionState {
    /** No action has been submitted yet */
    NOT_STARTED = 'notStarted',
    /** Action was submitted, waiting for response */
    SUBMITTED = 'submitted',
    /** Response received, basket updated, waiting to exit edit mode */
    BASKET_UPDATED = 'basketUpdated',
    /** Edit mode exited, action complete */
    COMPLETED = 'completed',
}

/**
 * Tracks the current action submission lifecycle.
 * We must track the step here (not rely on editingStep from context) because
 * editingStep can change before action processing completes.
 */
type ActionLifecycle = {
    /** Which checkout step's action was submitted */
    step: CheckoutStep | null;
    /** Current state in the action lifecycle */
    state: ActionState;
};

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
    const { exitEditMode, editingStep } = useCheckoutContext();
    const updateBasket = useBasketUpdater();
    const basket = useBasket();

    const contactFetcher = useFetcher<CheckoutActionData>({ key: 'contact-form' });
    const shippingAddressFetcher = useFetcher<CheckoutActionData>({ key: 'shipping-address-form' });
    const shippingOptionsFetcher = useFetcher<CheckoutActionData>({ key: 'shipping-options-form' });
    const paymentFetcher = useFetcher<CheckoutActionData>({ key: 'payment-form' });
    const placeOrderFetcher = useFetcher<{ success?: boolean; error?: string; step?: string }>({ key: 'place-order' });

    // Track action submission lifecycle.
    // We track step here because editingStep from context can change before processing completes.
    const actionRef = useRef<ActionLifecycle>({ step: null, state: ActionState.NOT_STARTED });

    // Create account state
    const [shouldCreateAccount, setShouldCreateAccount] = useState(false);
    const [savedPaymentMethods, setSavedPaymentMethods] = useState(new Set<string>());

    // Reset lifecycle when entering a new edit step
    useEffect(() => {
        if (editingStep !== null) {
            actionRef.current = { step: null, state: ActionState.NOT_STARTED };
        }
    }, [editingStep]);

    // Map checkout steps to their corresponding fetchers
    const fetcherMap: Partial<Record<CheckoutStep, typeof contactFetcher>> = {
        [CHECKOUT_STEPS.CONTACT_INFO]: contactFetcher,
        [CHECKOUT_STEPS.SHIPPING_ADDRESS]: shippingAddressFetcher,
        [CHECKOUT_STEPS.SHIPPING_OPTIONS]: shippingOptionsFetcher,
        [CHECKOUT_STEPS.PAYMENT]: paymentFetcher,
    };

    // Update basket context when action completes successfully
    // Updates client-side basket state from action responses. Root loader revalidation
    // only updates basketSnapshot, not the full basket. This ensures checkout step
    // progression (which depends on basket state) works correctly after form submissions.
    useEffect(() => {
        const { step, state } = actionRef.current;

        // Only process if we're in SUBMITTED state
        if (step === null || state !== ActionState.SUBMITTED) {
            return;
        }

        const fetcher = fetcherMap[step];
        if (!fetcher?.data?.success || !fetcher.data.basket) {
            return;
        }

        // Transition: SUBMITTED -> BASKET_UPDATED
        actionRef.current = { step, state: ActionState.BASKET_UPDATED };
        updateBasket(fetcher.data.basket);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contactFetcher.data, shippingAddressFetcher.data, shippingOptionsFetcher.data, paymentFetcher.data]);

    // Exit edit mode after basket has been updated
    // Depends on basket so it runs AFTER the basket state update has been applied
    useEffect(() => {
        const { step, state } = actionRef.current;

        // Only process if we're in BASKET_UPDATED state and in edit mode
        if (editingStep === null || step === null || state !== ActionState.BASKET_UPDATED) {
            return;
        }

        const fetcher = fetcherMap[step];
        if (!fetcher?.data?.success) {
            return;
        }

        // Transition: BASKET_UPDATED -> COMPLETED
        actionRef.current = { step, state: ActionState.COMPLETED };
        exitEditMode();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingStep, basket]);

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

        // Transition: IDLE -> SUBMITTED
        actionRef.current = { step: CHECKOUT_STEPS.CONTACT_INFO, state: ActionState.SUBMITTED };

        // Convert typed data to FormData for fetcher submission
        const formData = new FormData();
        formData.append('intent', CHECKOUT_ACTION_INTENTS.CONTACT_INFO);
        formData.append('email', data.email);

        void contactFetcher.submit(formData, {
            method: 'post',
            action: checkoutActionRoute,
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

        // Transition: IDLE -> SUBMITTED
        actionRef.current = { step: CHECKOUT_STEPS.SHIPPING_ADDRESS, state: ActionState.SUBMITTED };

        // Add intent field
        formData.append('intent', CHECKOUT_ACTION_INTENTS.SHIPPING_ADDRESS);

        void shippingAddressFetcher.submit(formData, {
            method: 'post',
            action: checkoutActionRoute,
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

        // Transition: IDLE -> SUBMITTED
        actionRef.current = { step: CHECKOUT_STEPS.SHIPPING_OPTIONS, state: ActionState.SUBMITTED };

        // Add intent field
        formData.append('intent', CHECKOUT_ACTION_INTENTS.SHIPPING_OPTIONS);

        void shippingOptionsFetcher.submit(formData, {
            method: 'post',
            action: checkoutActionRoute,
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

        // Transition: IDLE -> SUBMITTED
        actionRef.current = { step: CHECKOUT_STEPS.PAYMENT, state: ActionState.SUBMITTED };

        // Convert typed data to FormData for fetcher submission
        const formData = new FormData();
        formData.append('intent', CHECKOUT_ACTION_INTENTS.PAYMENT);
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
            action: checkoutActionRoute,
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

    /**
     * Submits the place-order action via fetcher so errors can be shown in-page.
     */
    const submitPlaceOrder = () => {
        if (placeOrderFetcher.state === 'submitting') {
            return;
        }
        const formData = new FormData();
        formData.append('shouldCreateAccount', shouldCreateAccount ? 'true' : 'false');
        void placeOrderFetcher.submit(formData, {
            method: 'post',
            action: placeOrderActionRoute,
        });
    };

    return {
        // Action functions
        submitContactInfo,
        submitShippingAddress,
        submitShippingOptions,
        submitPayment,
        submitPlaceOrder,

        // Fetcher objects
        contactFetcher,
        shippingAddressFetcher,
        shippingOptionsFetcher,
        paymentFetcher,
        placeOrderFetcher,

        // Helper functions
        isSubmitting,

        // Create account state and functions
        shouldCreateAccount,
        savedPaymentMethods,
        handlePaymentMethodSaved,
        handleCreateAccountPreferenceChange,
    };
}
