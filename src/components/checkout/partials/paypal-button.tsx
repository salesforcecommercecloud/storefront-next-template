'use client';

import PayPalSDKButton from './paypal-sdk-button';

interface PayPalButtonProps {
    onApprove: () => void | Promise<void>;
    disabled?: boolean;
}

/**
 * PayPal Button Component
 * Uses the official PayPal JavaScript SDK to render an authentic PayPal button
 * @see https://developer.paypal.com/sdk/js/reference/#buttons
 */
export default function PayPalButton({ onApprove, disabled = false }: PayPalButtonProps) {
    return (
        <PayPalSDKButton
            config={{
                style: {
                    layout: 'horizontal',
                    color: 'gold',
                    shape: 'rect',
                    label: 'paypal',
                    height: 48,
                    tagline: false, // Disable "the safer, easier way to pay" tagline
                },
                errorPrefix: 'PayPal error:',
            }}
            onApprove={onApprove}
            disabled={disabled}
        />
    );
}
