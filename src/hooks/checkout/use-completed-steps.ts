/**
 * Custom hook to get completed steps for the timeline
 */

import { useContext } from 'react';
import { CheckoutContext } from '@/components/checkout/utils/checkout-context-types';
import { useBasket } from '@/providers/basket';
import { getCompletedSteps } from '@/components/checkout/utils/checkout-utils';

export function useCompletedSteps() {
    const context = useContext(CheckoutContext);
    const basket = useBasket();

    if (!context) {
        throw new Error('useCompletedSteps must be used within a CheckoutProvider');
    }

    return getCompletedSteps(basket, context.step);
}
