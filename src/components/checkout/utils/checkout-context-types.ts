import { createContext } from 'react';
import type { ShopperCustomersTypes } from 'commerce-sdk-isomorphic';

export const CHECKOUT_STEPS = {
    CONTACT_INFO: 0,
    SHIPPING_ADDRESS: 1,
    SHIPPING_OPTIONS: 2,
    PAYMENT: 3,
    REVIEW_ORDER: 4,
} as const;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[keyof typeof CHECKOUT_STEPS];

export interface CustomerProfile {
    customer?: ShopperCustomersTypes.Customer;
    addresses: ShopperCustomersTypes.CustomerAddress[];
    paymentInstruments: ShopperCustomersTypes.CustomerPaymentInstrument[];
    preferredShippingAddress?: ShopperCustomersTypes.CustomerAddress;
    preferredBillingAddress?: ShopperCustomersTypes.CustomerAddress;
}

export interface CheckoutContextValue {
    step: CheckoutStep;
    computedStep: CheckoutStep;
    editingStep: CheckoutStep | null;
    STEPS: typeof CHECKOUT_STEPS;
    customerProfile?: CustomerProfile;
    goToNextStep: () => void;
    goToStep: (step: CheckoutStep) => void;
    exitEditMode: () => void;
    markShippingOptionsCompleted: () => void;
}

export const CheckoutContext = createContext<CheckoutContextValue | null>(null);
