'use client';

import { type ReactNode, useEffect, useState } from 'react';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import {
    CHECKOUT_STEPS,
    CheckoutContext,
    type CheckoutContextValue,
    type CheckoutStep,
    type CustomerProfile,
} from './checkout-context-types';
import { useBasket } from '@/providers/basket';
import { computeFinalStepForReturningCustomer, computeStepFromBasket } from './checkout-utils';
// @sfdc-extension-line SFDC_EXT_BOPIS
import { isStorePickup } from '@/extensions/bopis/lib/basket-utils';

interface CheckoutProviderProps {
    children: ReactNode;
    customerProfile?: CustomerProfile;
    shippingDefaultSet?: Promise<ShopperBasketsV2.schemas['Basket']>;
}

export default function CheckoutProvider({ children, customerProfile, shippingDefaultSet }: CheckoutProviderProps) {
    const basket = useBasket();
    const [editingStep, setEditingStep] = useState<CheckoutStep | null>(null);
    const [hasCompletedShippingOptions, setHasCompletedShippingOptions] = useState(false);
    const [currentStep, setCurrentStep] = useState<CheckoutStep>(CHECKOUT_STEPS.CONTACT_INFO);
    const [isActiveCheckoutFlow, setIsActiveCheckoutFlow] = useState(false);
    let showAddressAndOptions = true;
    // @sfdc-extension-line SFDC_EXT_BOPIS
    showAddressAndOptions = !isStorePickup(basket);

    // Get checkout step order based on whether address and options are needed
    const getCheckoutStepOrder = (): CheckoutStep[] => {
        return showAddressAndOptions
            ? [
                  CHECKOUT_STEPS.CONTACT_INFO,
                  CHECKOUT_STEPS.SHIPPING_ADDRESS,
                  CHECKOUT_STEPS.SHIPPING_OPTIONS,
                  CHECKOUT_STEPS.PAYMENT,
                  CHECKOUT_STEPS.REVIEW_ORDER,
              ]
            : [CHECKOUT_STEPS.CONTACT_INFO, CHECKOUT_STEPS.PAYMENT, CHECKOUT_STEPS.REVIEW_ORDER];
    };

    const markShippingOptionsCompleted = () => {
        setHasCompletedShippingOptions(true);
    };

    // Compute the initial step from basket or customer profile
    const computedStep = customerProfile
        ? computeFinalStepForReturningCustomer(basket, customerProfile) ||
          computeStepFromBasket(basket, hasCompletedShippingOptions)
        : computeStepFromBasket(basket, hasCompletedShippingOptions);

    // Update current step when basket changes, but only if not actively editing
    // For active checkout flow, only ignore basket-based step computation for guest users
    // Returning customers should still benefit from auto-population
    useEffect(() => {
        if (editingStep === null) {
            // If we have a customer profile (returning customer), always use basket-based computation
            // If no customer profile (guest user) and active checkout flow, use sequential progression
            if (customerProfile || !isActiveCheckoutFlow) {
                setCurrentStep(computedStep);
            }
        }
    }, [computedStep, editingStep, isActiveCheckoutFlow, customerProfile]);

    const goToNextStep = () => {
        const stepOrder = getCheckoutStepOrder();
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
        // Only mark checkout flow as active for guest users (no customer profile)
        // Returning customers should continue to benefit from auto-population
        if (!customerProfile) {
            setIsActiveCheckoutFlow(true);
        }
        const stepOrder = getCheckoutStepOrder();
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex < stepOrder.length - 1) {
            const nextStep = stepOrder[currentIndex + 1];
            setCurrentStep(nextStep);
        }

        setEditingStep(null);
    };

    const value: CheckoutContextValue = {
        step: currentStep,
        computedStep,
        editingStep,
        STEPS: CHECKOUT_STEPS,
        customerProfile,
        shippingDefaultSet,
        goToNextStep,
        goToStep,
        exitEditMode,
        markShippingOptionsCompleted,
    };

    return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}
