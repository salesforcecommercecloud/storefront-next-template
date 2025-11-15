import type { ShopperBasketsV2, ShopperOrders } from '@salesforce/storefront-next-runtime/scapi';

/**
 * Safely extracts and formats a masked credit card number from various payment instrument structures
 * @param paymentInstrument - Payment instrument from basket or order
 * @returns Formatted masked card number (e.g., "**** **** **** 1234")
 */
export function getFormattedMaskedCardNumber(
    paymentInstrument:
        | ShopperBasketsV2.schemas['OrderPaymentInstrument']
        | ShopperOrders.schemas['OrderPaymentInstrument']
        | undefined
): string {
    if (!paymentInstrument) {
        return '**** **** **** ****';
    }

    // Try different possible sources for the masked card number
    // SFCC may store this in different properties depending on the API version and configuration
    const maskedNumber =
        paymentInstrument.maskedCreditCardNumber ||
        paymentInstrument.paymentCard?.maskedCreditCardNumber ||
        paymentInstrument.paymentCard?.maskedNumber;

    if (maskedNumber) {
        // If it's already in masked format (contains asterisks), use it as-is
        if (maskedNumber.includes('*')) {
            return maskedNumber;
        }
        // If it's a full number (shouldn't happen in production), mask all but last 4
        return `**** **** **** ${maskedNumber.slice(-4)}`;
    }

    // Fallback if no masked number is found
    return '**** **** **** ****';
}

/**
 * Extracts the last 4 digits from a masked credit card number
 * @param maskedNumber - Masked card number string
 * @returns Last 4 digits or '****' if not found
 */
export function getLastFourDigits(maskedNumber: string | undefined): string {
    if (!maskedNumber) {
        return '****';
    }

    // Extract the last 4 characters, assuming they are digits
    const lastFour = maskedNumber.slice(-4);

    // Verify they are actually digits
    if (/^\d{4}$/.test(lastFour)) {
        return lastFour;
    }

    // If not digits, try to find digits in the string
    const digits = maskedNumber.replace(/\D/g, '');
    if (digits.length >= 4) {
        return digits.slice(-4);
    }

    return '****';
}

/**
 * Gets a display-friendly card type from the payment instrument
 * @param paymentInstrument - Payment instrument from basket or order
 * @returns Card type (e.g., "Visa", "Mastercard") or default fallback
 */
export function getCardTypeDisplay(
    paymentInstrument:
        | ShopperBasketsV2.schemas['OrderPaymentInstrument']
        | ShopperOrders.schemas['OrderPaymentInstrument']
        | undefined,
    fallback: string = 'Credit Card'
): string {
    if (!paymentInstrument) {
        return fallback;
    }

    // Try different possible sources for the card type
    const cardType = paymentInstrument.paymentCard?.cardType || paymentInstrument.paymentMethodId;

    if (cardType) {
        // Normalize common card type values
        const normalizedType = cardType.toLowerCase();

        if (normalizedType.includes('visa')) return 'Visa';
        if (normalizedType.includes('mastercard') || normalizedType.includes('master')) return 'Mastercard';
        if (normalizedType.includes('amex') || normalizedType.includes('american')) return 'American Express';
        if (normalizedType.includes('discover')) return 'Discover';
        if (normalizedType.includes('diners')) return 'Diners Club';
        if (normalizedType.includes('jcb')) return 'JCB';

        // Return the original if no normalization applied
        return cardType;
    }

    return fallback;
}

/**
 * Detects the card type from a card number using standard BIN (Bank Identification Number) ranges
 * @param cardNumber - Card number (with or without spaces/dashes)
 * @returns Detected card type
 */
export function detectCardType(cardNumber: string): string {
    if (!cardNumber) {
        return 'Unknown';
    }

    // Remove all non-digit characters
    const cleanNumber = cardNumber.replace(/\D/g, '');

    // Visa: starts with 4, length 13, 16, or 19
    if (/^4/.test(cleanNumber) && [13, 16, 19].includes(cleanNumber.length)) {
        return 'Visa';
    }

    // Mastercard: starts with 5[1-5] or 2[2-7], length 16
    if ((/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) && cleanNumber.length === 16) {
        return 'Mastercard';
    }

    // American Express: starts with 34 or 37, length 15
    if (/^3[47]/.test(cleanNumber) && cleanNumber.length === 15) {
        return 'American Express';
    }

    // Discover: starts with 6, length 16
    if (/^6/.test(cleanNumber) && cleanNumber.length === 16) {
        return 'Discover';
    }

    // Diners Club: starts with 30[0-5], 36, or 38, length 14
    if ((/^30[0-5]/.test(cleanNumber) || /^3[68]/.test(cleanNumber)) && cleanNumber.length === 14) {
        return 'Diners Club';
    }

    // JCB: starts with 35, length 16
    if (/^35/.test(cleanNumber) && cleanNumber.length === 16) {
        return 'JCB';
    }

    // If no pattern matches, return generic
    return 'Credit Card';
}

/**
 * Checks if a payment instrument has valid card information
 * @param paymentInstrument - Payment instrument to validate
 * @returns True if payment instrument has valid card data
 */
export function hasValidPaymentCard(
    paymentInstrument: ShopperBasketsV2.schemas['OrderPaymentInstrument'] | undefined
): boolean {
    if (!paymentInstrument) {
        return false;
    }

    // For saved payment methods (when using customerPaymentInstrumentId),
    // Commerce Cloud may not return masked card numbers but will have paymentInstrumentId
    const isSavedPaymentMethod = !!paymentInstrument.paymentInstrumentId;

    if (isSavedPaymentMethod) {
        // For saved payment methods, verify we have basic card info
        return !!(paymentInstrument.paymentMethodId === 'CREDIT_CARD' && paymentInstrument.paymentCard?.cardType);
    }

    // For new payment methods, check if any form of masked card number exists
    const hasCardNumber = !!(
        paymentInstrument.maskedCreditCardNumber ||
        paymentInstrument.paymentCard?.maskedCreditCardNumber ||
        paymentInstrument.paymentCard?.maskedNumber
    );

    return hasCardNumber;
}
