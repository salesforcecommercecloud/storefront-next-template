'use client';

import { useState, type ReactNode } from 'react';
import { CHECKOUT_STEPS, type CheckoutStep } from '@/stores/checkout-store';
import { CheckoutContext, type CheckoutContextValue, type CustomerProfile } from './checkout-context-types';
import { useBasket } from '@/providers/basket';
import {
    computeStepFromBasket,
    computeFinalStepForReturningCustomer,
    shouldAutoAdvanceForReturningCustomer,
} from './checkout-utils';

interface CheckoutProviderProps {
    children: ReactNode;
    customerProfile?: CustomerProfile;
}

export default function CheckoutOneClickProvider({ children, customerProfile }: CheckoutProviderProps) {
    const basket = useBasket();
    const [editingStep, setEditingStep] = useState<CheckoutStep | null>(null);
    const [hasCompletedShippingOptions, setHasCompletedShippingOptions] = useState(false);

    const markShippingOptionsCompleted = () => {
        setHasCompletedShippingOptions(true);
    };

    // Determine if this is a returning customer with auto-advance enabled
    const isReturningCustomer = !!customerProfile;
    const autoAdvanceEnabled = shouldAutoAdvanceForReturningCustomer(isReturningCustomer, customerProfile);

    // Compute the current step
    let computedStep: CheckoutStep;

    if (autoAdvanceEnabled && customerProfile) {
        // For returning customers, try to compute the final step directly
        const finalStep = computeFinalStepForReturningCustomer(basket, customerProfile);

        // If finalStep computation fails or returns a step that might get stuck,
        // force auto-advance mode in the basket computation
        const fallbackStep = computeStepFromBasket(basket, true, true);

        computedStep = finalStep || fallbackStep;
    } else {
        // Regular step computation
        computedStep = computeStepFromBasket(basket, hasCompletedShippingOptions);
    }

    // If user is editing a step, use that, otherwise use computed step
    const currentStep = editingStep || computedStep;

    const goToNextStep = () => {
        const stepOrder = [
            CHECKOUT_STEPS.CONTACT_INFO,
            CHECKOUT_STEPS.SHIPPING_ADDRESS,
            CHECKOUT_STEPS.SHIPPING_OPTIONS,
            CHECKOUT_STEPS.PAYMENT,
            CHECKOUT_STEPS.REVIEW_ORDER,
        ];

        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex < stepOrder.length - 1) {
            const nextStep = stepOrder[currentIndex + 1];
            setEditingStep(nextStep);
        }
    };

    const goToStep = (step: CheckoutStep) => {
        setEditingStep(step);
    };

    const exitEditMode = () => {
        setEditingStep(null);
    };

    const value: CheckoutContextValue = {
        step: currentStep,
        computedStep,
        editingStep,
        STEPS: CHECKOUT_STEPS,
        customerProfile,
        goToNextStep,
        goToStep,
        exitEditMode,
        markShippingOptionsCompleted,
    };

    return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}
