'use client';

import PayPalSDKButton from './paypal-sdk-button';

interface VenmoButtonProps {
    onApprove: () => void | Promise<void>;
    disabled?: boolean;
}

/**
 * Venmo Button Component
 * Uses the official PayPal JavaScript SDK to render an authentic Venmo button
 * Venmo is a funding source provided by the PayPal SDK
 * @see https://developer.paypal.com/sdk/js/reference/#buttons
 * @see https://developer.paypal.com/sdk/js/reference/#funding
 */
export default function VenmoButton({ onApprove, disabled = false }: VenmoButtonProps) {
    return (
        <PayPalSDKButton
            config={{
                fundingSource: typeof window !== 'undefined' && window.paypal?.FUNDING.VENMO,
                style: {
                    layout: 'horizontal',
                    height: 48,
                },
                errorPrefix: 'Venmo error:',
            }}
            onApprove={onApprove}
            disabled={disabled}
        />
    );
}
