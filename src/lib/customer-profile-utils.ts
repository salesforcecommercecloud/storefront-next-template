import type { CustomerProfile } from '@/components/checkout/utils/checkout-context-types';

/**
 * Prefill contact info form with customer data
 */
export function getContactInfoFromCustomer(customerProfile?: CustomerProfile) {
    if (!customerProfile?.customer) {
        return {};
    }

    const customer = customerProfile.customer;
    return {
        email: customer.email || '',
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        phone: customer.phoneHome || customer.phoneBusiness || customer.phoneMobile || '',
    };
}

/**
 * Prefill shipping address form with customer's preferred address
 * Prioritizes shipping address first, then billing address, then any available address
 */
export function getShippingAddressFromCustomer(customerProfile?: CustomerProfile) {
    if (!customerProfile?.addresses || customerProfile.addresses.length === 0) {
        return {};
    }

    // First priority: preferred shipping address
    let address = customerProfile.preferredShippingAddress;

    // Second priority: billing address (as fallback)
    if (!address) {
        address = customerProfile.preferredBillingAddress;
    }

    // Third priority: any address with billing in the ID
    if (!address) {
        address = customerProfile.addresses.find((addr) => addr.addressId?.toLowerCase().includes('billing'));
    }

    // Fourth priority: first available address
    if (!address) {
        address = customerProfile.addresses[0];
    }

    // If still no address, return empty
    if (!address) {
        return {};
    }

    return {
        firstName: address.firstName || '',
        lastName: address.lastName || '',
        address1: address.address1 || '',
        address2: address.address2 || '',
        city: address.city || '',
        stateCode: address.stateCode || '',
        postalCode: address.postalCode || '',
        countryCode: address.countryCode || 'US',
        phone: address.phone || '',
    };
}

/**
 * Prefill billing address form with customer's preferred billing address
 */
export function getBillingAddressFromCustomer(customerProfile?: CustomerProfile) {
    if (!customerProfile?.preferredBillingAddress) {
        // Fall back to shipping address if no separate billing address
        return getShippingAddressFromCustomer(customerProfile);
    }

    const address = customerProfile.preferredBillingAddress;
    return {
        firstName: address.firstName || '',
        lastName: address.lastName || '',
        address1: address.address1 || '',
        address2: address.address2 || '',
        city: address.city || '',
        stateCode: address.stateCode || '',
        postalCode: address.postalCode || '',
        countryCode: address.countryCode || 'US',
        phone: address.phone || '',
    };
}

/**
 * Get customer's saved payment methods for selection
 */
export function getPaymentMethodsFromCustomer(customerProfile?: CustomerProfile): Array<{
    id: string;
    type: string;
    cardType?: string;
    maskedNumber?: string;
    expirationMonth?: number;
    expirationYear?: number;
    cardholderName?: string;
    preferred?: boolean;
}> {
    if (!customerProfile?.paymentInstruments || customerProfile.paymentInstruments.length === 0) {
        return [];
    }

    return customerProfile.paymentInstruments.map((instrument, index) => {
        // Generate a clean display string using card type and expiration
        const cardType = instrument.paymentCard?.cardType || 'Card';
        const expirationMonth = instrument.paymentCard?.expirationMonth;
        const expirationYear = instrument.paymentCard?.expirationYear;

        // Create a display identifier like "Visa •••• (exp 11/34)"
        let displayNumber = `${cardType} ••••`;
        if (expirationMonth && expirationYear) {
            const expMonth = expirationMonth.toString().padStart(2, '0');
            const expYear = expirationYear.toString().slice(-2);
            displayNumber += ` (exp ${expMonth}/${expYear})`;
        }

        return {
            id: instrument.paymentInstrumentId || `payment_${index}`,
            type: instrument.paymentMethodId || 'CREDIT_CARD',
            cardType: instrument.paymentCard?.cardType || 'unknown',
            maskedNumber: displayNumber, // Use our clean display format
            expirationMonth: instrument.paymentCard?.expirationMonth,
            expirationYear: instrument.paymentCard?.expirationYear,
            cardholderName: instrument.paymentCard?.holder || '',
            preferred: index === 0, // First payment method as preferred by default
        };
    });
}

/**
 * Get default shipping method from available methods
 * Prioritizes Commerce Cloud's configured default, then falls back to first method
 */
export function getDefaultShippingMethod(
    availableShippingMethods?: Array<{
        id: string;
        name: string;
        price?: number;
        description?: string;
        default?: boolean; // Commerce Cloud default indicator
        preferred?: boolean; // Alternative property name
    }>,
    currentlySelected?: { id?: string }
): string | undefined {
    // If already has a selection, keep it
    if (currentlySelected?.id) {
        return currentlySelected.id;
    }

    // If no methods available, return undefined
    if (!availableShippingMethods || availableShippingMethods.length === 0) {
        return undefined;
    }

    // First priority: Commerce Cloud's configured default shipping method
    const defaultMethod = availableShippingMethods.find((method) => method.default || method.preferred);
    if (defaultMethod) {
        return defaultMethod.id;
    }

    // Fallback: Select the first available method
    // This maintains backward compatibility and follows common e-commerce UX patterns
    return availableShippingMethods[0].id;
}

/**
 * Get customer's address book for selection
 */
export function getAddressBookFromCustomer(customerProfile?: CustomerProfile): Array<{
    id: string;
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    stateCode: string;
    postalCode: string;
    countryCode: string;
    phone?: string;
    preferred?: boolean;
    type?: 'shipping' | 'billing';
}> {
    if (!customerProfile?.addresses || customerProfile.addresses.length === 0) {
        return [];
    }

    return customerProfile.addresses.map((address) => ({
        id: address.addressId || '',
        firstName: address.firstName || '',
        lastName: address.lastName || '',
        address1: address.address1 || '',
        address2: address.address2 || '',
        city: address.city || '',
        stateCode: address.stateCode || '',
        postalCode: address.postalCode || '',
        countryCode: address.countryCode || 'US',
        phone: address.phone || '',
        preferred: address.preferred || false,
        type: address.addressId?.includes('billing') ? 'billing' : 'shipping',
    }));
}

/**
 * Check if customer has any saved data that can be prefilled
 */
export function hasCustomerDataForPrefill(customerProfile?: CustomerProfile): {
    hasContactInfo: boolean;
    hasAddresses: boolean;
    hasPaymentMethods: boolean;
    hasAnyData: boolean;
} {
    const hasContactInfo = !!(customerProfile?.customer?.email || customerProfile?.customer?.firstName);
    const hasAddresses = !!(customerProfile?.addresses && customerProfile.addresses.length > 0);
    const hasPaymentMethods = !!(customerProfile?.paymentInstruments && customerProfile.paymentInstruments.length > 0);

    return {
        hasContactInfo,
        hasAddresses,
        hasPaymentMethods,
        hasAnyData: hasContactInfo || hasAddresses || hasPaymentMethods,
    };
}
