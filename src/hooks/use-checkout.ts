import { useContext } from 'react';
import { CheckoutContext, type CheckoutContextValue } from '@/components/checkout/utils/checkout-context-types';

/**
 * A hook for managing checkout state and actions
 * @returns {CheckoutContextValue} Checkout data and actions
 */
export function useCheckoutContext(): CheckoutContextValue {
    const context = useContext(CheckoutContext);
    if (!context) {
        throw new Error('useCheckoutContext must be used within a CheckoutProvider');
    }
    return context;
}
