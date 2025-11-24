'use client';

import { useRef, useState, useCallback } from 'react';
import { usePayPalSDKButton, type PayPalSDKButtonConfig } from '@/hooks/use-paypal-sdk-button';

interface PayPalSDKButtonProps {
    /**
     * Configuration for the PayPal SDK button
     * Includes styling and funding source (e.g., PayPal, Venmo)
     */
    config: PayPalSDKButtonConfig;
    /**
     * Callback invoked when payment is approved
     */
    onApprove: () => void | Promise<void>;
    /**
     * Whether the button should be disabled
     */
    disabled?: boolean;
}

/**
 * Generic PayPal SDK Button Component
 *
 * This component serves as a base for all PayPal SDK-based payment buttons
 * (PayPal, Venmo, etc.). It uses the PayPal SDK to render authentic payment buttons
 * with proper branding and functionality.
 *
 * Different payment methods are created by passing different configurations
 * (primarily the fundingSource property).
 *
 * @see https://developer.paypal.com/sdk/js/reference/#buttons
 * @see https://developer.paypal.com/sdk/js/reference/#funding
 */
export default function PayPalSDKButton({ config, onApprove, disabled = false }: PayPalSDKButtonProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isRendering, setIsRendering] = useState(true);

    const handleRenderComplete = useCallback(() => {
        setIsRendering(false);
    }, []);

    // Initialize PayPal SDK button with provided configuration
    usePayPalSDKButton(config, onApprove, containerRef, handleRenderComplete);

    return (
        <div className="w-full relative isolate" style={{ zIndex: 1 }}>
            {/* Show skeleton while button is rendering */}
            {isRendering && <div className="absolute inset-0 w-full h-12 bg-muted animate-pulse rounded" />}
            <div
                ref={containerRef}
                className={disabled ? 'pointer-events-none opacity-50' : ''}
                style={{
                    minHeight: '48px',
                    position: 'relative',
                    zIndex: 1,
                    opacity: isRendering ? 0 : 1,
                    transition: 'opacity 0.2s ease-in',
                }}
            />
        </div>
    );
}
