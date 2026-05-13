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
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useCheckoutContext } from '@/hooks/use-checkout';
import { useBasket, useBasketUpdater } from '@/providers/basket';
import type { ContactInfoData, PaymentData } from '@/lib/checkout/schemas';
import type { CheckoutActionData } from '@/components/checkout/types';
import {
    PAYMENT_FRAMEWORK_FIELDS,
    type PaymentFlowType,
    type PaymentSubmitResult,
    type PaymentReturnResult,
} from '@/lib/payment-gateway.types';
import {
    CHECKOUT_STEPS,
    CHECKOUT_ACTION_INTENTS,
    type CheckoutStep,
} from '@/components/checkout/utils/checkout-context-types';

// Place order uses a dedicated action route (excluded from site context prefix via /action/**)
const placeOrderActionRoute = '/action/place-order';

/** Persists create-account intent across reloads (mirrors handleCreateAccountPreferenceChange). */
const SESSION_SHOULD_CREATE_ACCOUNT = 'shouldCreateAccount';
/** Persists formatted contact phone when basket merge (e.g. OTP) drops it from the basket. */
const SESSION_CHECKOUT_CONTACT_PHONE = 'checkoutContactPhone';
/** Set by register-customer-selection while checkout registration OTP flow is active. */
const SESSION_REGISTERED_VIA_CHECKOUT = 'registeredViaCheckout';

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

/** Options passed when placing order (e.g. from payment form at time of Place Order click) */
export type PlaceOrderOptionsRef = MutableRefObject<{
    savePaymentToProfile?: boolean;
    useDifferentBilling?: boolean;
} | null>;

/** Single ref coordinating payment submission and place-order flow to avoid race conditions */
export type PaymentSubmissionRef = MutableRefObject<{
    formDataGetter: (() => PaymentData) | null;
    /**
     * Synchronous re-entrancy guard. Set to true the moment the click handler enters and
     * cleared on completion (success path) or on error toast. Prevents a second click
     * during the async window between handler entry and `placeOrderFetcher.state ===
     * 'submitting'` from triggering a second `onPaymentSubmit`.
     */
    isSubmitting: boolean;
    /**
     * Called when the user clicks Place Order, before default payment validation/sync.
     * When set by a payment extension, the extension fully owns the payment-to-order flow
     * (validation, tokenization, 3DS, calling submitPlaceOrder). Default logic is skipped.
     *
     * Always returns a Promise — sync paths can use `Promise.resolve({ status: 'ready', ... })`
     * or call `ctx.submitPlaceOrder()` directly and return `Promise.resolve(undefined)`.
     *
     * For inline flows: call `ctx.submitPlaceOrder(extraFormData)` when ready, then
     * resolve with `undefined` (or `{ status: 'ready' }` if you want symmetric handling).
     * For redirect flows: resolve with `{ status: 'redirect', redirectUrl, stateToken }`
     * — the framework will serialize state to a cookie and redirect the shopper.
     */
    onPaymentSubmit:
        | ((ctx: {
              submitPlaceOrder: (extra?: Record<string, string>) => void;
          }) => Promise<PaymentSubmitResult | undefined>)
        | null;
    /**
     * Called when payment submission succeeds (paymentFetcher returns success).
     * When set, the extension controls what happens after payment syncs to the basket
     * (e.g. run 3DS, then call submitPlaceOrder). When null, no post-payment action is taken.
     *
     * `bindToken` is a monotonic identifier set when this callback was registered. The
     * framework's effect compares this token against `paymentSubmissionToken` on each
     * paymentFetcher transition; only when they match does it fire the callback. This
     * prevents a stale callback from a prior submission firing on an unrelated fetcher
     * state change (e.g. user re-edits payment, fetcher cleared, then a delayed transition).
     */
    onPaymentSuccess: { bindToken: number; callback: () => void } | null;
    /**
     * Monotonic counter incremented each time a new submission begins. Compared against
     * `onPaymentSuccess.bindToken` to invalidate stale callbacks.
     */
    paymentSubmissionToken: number;
    /**
     * For redirect flows: called by the framework on the return route to let the
     * extension finalize the payment after the shopper returns from the provider.
     */
    onPaymentReturn: ((params: URLSearchParams) => Promise<PaymentReturnResult>) | null;
    options: { savePaymentToProfile?: boolean; useDifferentBilling?: boolean } | null;
    setFormErrors: ((errors: Record<string, { type: string; message: string }>) => void) | null;
    /**
     * Declares the payment orchestration pattern this extension implements.
     * Default: null (treated as 'inline' for backwards compatibility).
     */
    flowType: PaymentFlowType | null;
    /**
     * Idempotency key for this checkout session's payment. Generated by the
     * framework on checkout mount. Extensions forward it to the provider to
     * prevent double charges on retries.
     */
    idempotencyKey: string | null;
    /**
     * The URL that external providers should redirect the shopper back to after payment.
     * Available at render time so gateway SDKs can use it immediately when mounting
     * their payment UI. Set by the extension on mount - points to the extension's own
     * return route (e.g., '/action/stripe-redirect-return'). Since redirect state is
     * stored in an HMAC-signed cookie, this value does not need to encode checkout state.
     */
    returnUrl: string | null;
}>;

/**
 * Custom hook for managing checkout form actions using React Router fetchers.
 *
 * This hook provides functionality to submit checkout form data for each step
 * using React Router's useFetcher for handling form submissions without navigation.
 * Each fetcher is keyed to maintain separate state for each checkout step.
 *
 * @param options.paymentSubmissionRef - Ref holding form data getter, place-order-after-payment flag, and options (preferred over placeOrderOptionsRef)
 * @param options.placeOrderOptionsRef - Optional ref for place-order options (legacy; use paymentSubmissionRef for new code)
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
/** When true, contact step should not advance (e.g. OTP modal is open or authorize in flight). */
export type OtpFlowActiveRef = MutableRefObject<boolean>;

/** When true, shipping address step should not advance (no valid shipping methods for address). */
export type NoShippingMethodsRef = MutableRefObject<boolean>;

export function useCheckoutActions(options?: {
    paymentSubmissionRef?: PaymentSubmissionRef;
    placeOrderOptionsRef?: PlaceOrderOptionsRef;
    /** When .current is true, do not advance from contact step after submit (OTP modal flow). */
    otpFlowActiveRef?: OtpFlowActiveRef;
    /** When .current is true, do not advance from shipping address step (no valid methods available). */
    noShippingMethodsRef?: NoShippingMethodsRef;
}) {
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

    // Restore create-account only when registration OTP flow is active — avoids stale shouldCreateAccount for returning shoppers
    const [shouldCreateAccount, setShouldCreateAccount] = useState(() => {
        if (typeof sessionStorage === 'undefined') {
            return false;
        }
        if (sessionStorage.getItem(SESSION_REGISTERED_VIA_CHECKOUT) !== 'true') {
            return false;
        }
        return sessionStorage.getItem(SESSION_SHOULD_CREATE_ACCOUNT) === 'true';
    });
    const [savedPaymentMethods, setSavedPaymentMethods] = useState(new Set<string>());

    // Stores the contact phone across basket mutations
    const contactPhoneRef = useRef<string | null>(null);

    // Restore phone from session when basket no longer has it after OTP / merge
    useEffect(() => {
        if (typeof sessionStorage === 'undefined') {
            return;
        }
        const stored = sessionStorage.getItem(SESSION_CHECKOUT_CONTACT_PHONE);
        if (stored && !contactPhoneRef.current) {
            contactPhoneRef.current = stored;
        }
    }, []);

    // If billing/shipping gains a phone later (e.g. payment step) and we have no ref/session yet, capture it for place order
    useEffect(() => {
        if (contactPhoneRef.current) {
            return;
        }
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_CHECKOUT_CONTACT_PHONE)) {
            return;
        }
        const fromBasket = basket?.billingAddress?.phone || basket?.shipments?.[0]?.shippingAddress?.phone;
        if (fromBasket) {
            contactPhoneRef.current = fromBasket;
        }
    }, [basket]);

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

        // Do not advance from contact step when OTP modal is open or authorize is in flight
        if (step === CHECKOUT_STEPS.CONTACT_INFO && options?.otpFlowActiveRef?.current) {
            return;
        }

        // Do not advance from shipping address step when no valid shipping methods are available
        if (step === CHECKOUT_STEPS.SHIPPING_ADDRESS && options?.noShippingMethodsRef?.current) {
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
     * @param data - Contact form data containing email and phone
     */
    const submitContactInfo = (data: ContactInfoData) => {
        // Prevent concurrent submissions
        if (contactFetcher.state === 'submitting') {
            return;
        }

        // Transition: IDLE -> SUBMITTED
        actionRef.current = { step: CHECKOUT_STEPS.CONTACT_INFO, state: ActionState.SUBMITTED };

        // Persist the full phone (with country code) for place-order and OTP/basket merges
        if (data.phone) {
            const fullPhone = `${data.countryCode || '+1'} ${data.phone}`;
            contactPhoneRef.current = fullPhone;
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(SESSION_CHECKOUT_CONTACT_PHONE, fullPhone);
            }
        }

        // Convert typed data to FormData for fetcher submission
        const formData = new FormData();
        formData.append('intent', CHECKOUT_ACTION_INTENTS.CONTACT_INFO);
        formData.append('email', data.email);
        if (data.phone) formData.append('phone', data.phone);
        if (data.countryCode) formData.append('countryCode', data.countryCode);

        void contactFetcher.submit(formData, {
            method: 'post',
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
        formData.append('useDifferentBilling', data.useDifferentBilling.toString());

        // Include saved payment method fields
        formData.append('useSavedPaymentMethod', data.useSavedPaymentMethod?.toString() || 'false');
        if (data.selectedSavedPaymentMethod) {
            formData.append('selectedSavedPaymentMethod', data.selectedSavedPaymentMethod);
        }

        if (data.useDifferentBilling) {
            formData.append('billingFirstName', data.billingFirstName || '');
            formData.append('billingLastName', data.billingLastName || '');
            formData.append('billingAddress1', data.billingAddress1 || '');
            formData.append('billingAddress2', data.billingAddress2 || '');
            formData.append('billingCity', data.billingCity || '');
            formData.append('billingStateCode', data.billingStateCode || '');
            formData.append('billingPostalCode', data.billingPostalCode || '');
            formData.append('billingPhone', data.billingPhone || '');
            formData.append('billingCountryCode', data.billingCountryCode || 'US');
        }

        // Submit payment form data
        void paymentFetcher.submit(formData, {
            method: 'post',
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
     * Callback for when create account preference changes.
     * Memoized so consumers (e.g. useEffect deps in checkout-form-page) don't fire on every render.
     */
    const handleCreateAccountPreferenceChange = useCallback((shouldCreate: boolean) => {
        setShouldCreateAccount(shouldCreate);

        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(SESSION_SHOULD_CREATE_ACCOUNT, shouldCreate.toString());
        }
    }, []);

    /**
     * Submits the place-order action via fetcher so errors can be shown in-page.
     *
     * @param extraFormData - Optional key/value pairs appended to the submission (e.g. payment
     *   nonces, fraud tokens, or 3DS transaction IDs injected by payment extensions).
     */
    const submitPlaceOrder = (extraFormData?: Record<string, string>) => {
        if (placeOrderFetcher.state === 'submitting') {
            return;
        }
        const formData = new FormData();
        formData.append('shouldCreateAccount', shouldCreateAccount ? 'true' : 'false');
        const registrationFlowActive =
            typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_REGISTERED_VIA_CHECKOUT) === 'true';
        formData.append('checkoutRegistrationIntent', registrationFlowActive ? 'true' : 'false');
        const placeOrderOpts =
            options?.paymentSubmissionRef?.current?.options ?? options?.placeOrderOptionsRef?.current;
        if (placeOrderOpts?.savePaymentToProfile) {
            formData.append('savePaymentToProfile', 'true');
        }
        if (typeof placeOrderOpts?.useDifferentBilling === 'boolean') {
            formData.append('useDifferentBilling', String(placeOrderOpts.useDifferentBilling));
        }
        // Pass the contact phone captured at submission time (session + ref survive basket merge / reload)
        const storedPhone =
            typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_CHECKOUT_CONTACT_PHONE) : null;
        const contactPhone =
            contactPhoneRef.current ||
            storedPhone ||
            basket?.billingAddress?.phone ||
            basket?.shipments?.[0]?.shippingAddress?.phone;
        if (contactPhone) {
            formData.append('contactPhone', contactPhone);
        }
        // Auto-append payment gateway metadata when an extension is active. Order matters:
        // we apply the mount-time defaults first, then let extraFormData last-write-win.
        // This is how a multi-pattern extension (e.g. cards via authorize-before-order +
        // iDEAL via order-before-payment) overrides framework_paymentFlowType per
        // submission — by passing the new value in extraFormData, which overwrites the
        // mount-time default below.
        const paymentRef = options?.paymentSubmissionRef?.current;
        if (paymentRef?.flowType) {
            formData.set(PAYMENT_FRAMEWORK_FIELDS.PAYMENT_FLOW_TYPE, paymentRef.flowType);
        }
        if (paymentRef?.idempotencyKey) {
            formData.set(PAYMENT_FRAMEWORK_FIELDS.IDEMPOTENCY_KEY, paymentRef.idempotencyKey);
        }
        if (extraFormData) {
            for (const [key, value] of Object.entries(extraFormData)) {
                formData.set(key, value);
            }
        }
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
