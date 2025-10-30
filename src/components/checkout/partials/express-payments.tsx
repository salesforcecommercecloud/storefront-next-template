'use client';

import { Button } from '@/components/ui/button';
import { usePayPalSDK } from '@/hooks/use-paypal-sdk';
import PayPalButton from './paypal-button';
import VenmoButton from './venmo-button';

interface ExpressPaymentsProps {
    onApplePayClick: () => void;
    onGooglePayClick: () => void;
    onAmazonPayClick: () => void;
    onVenmoClick: () => void;
    onPayPalClick: () => void;
    disabled?: boolean;
}

/**
 * Express Payments Component
 * Provides Apple Pay, Google Pay, Amazon Pay, PayPal, and Venmo express checkout options
 * Note: Venmo only appears on mobile devices in US markets (PayPal SDK eligibility)
 * Based on Figma design system
 *
 * PayPal SDK is lazy-loaded only when this component is rendered (checkout page only)
 */
export default function ExpressPayments({
    onApplePayClick,
    onGooglePayClick,
    onAmazonPayClick,
    onVenmoClick,
    onPayPalClick,
    disabled = false,
}: ExpressPaymentsProps) {
    // Lazy load PayPal SDK - only loads when checkout page is accessed
    // Disable Pay Later and Credit to show only PayPal and Venmo buttons
    const { isLoading: isPayPalSDKLoading, error: paypalSDKError } = usePayPalSDK('test', 'buttons', 'paylater,credit');
    const handleApplePayClick = () => {
        if (!disabled) {
            onApplePayClick();
        }
    };

    const handleGooglePayClick = () => {
        if (!disabled) {
            onGooglePayClick();
        }
    };

    const handleAmazonPayClick = () => {
        if (!disabled) {
            onAmazonPayClick();
        }
    };

    const handleVenmoClick = () => {
        if (!disabled) {
            onVenmoClick();
        }
    };

    const handlePayPalClick = () => {
        if (!disabled) {
            onPayPalClick();
        }
    };

    return (
        <div className="space-y-2">
            {/* Express Payment Buttons - 4 buttons on desktop (Venmo hidden), 5 on mobile (Venmo visible) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Apple Pay Button */}
                <Button
                    onClick={handleApplePayClick}
                    disabled={disabled}
                    className="w-full h-12 bg-foreground hover:bg-foreground/90 text-background border-0 rounded-lg flex items-center justify-center gap-3 transition-colors"
                    size="lg">
                    {/* Apple Pay Icon */}
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="flex-shrink-0">
                        <path
                            d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"
                            fill="currentColor"
                        />
                    </svg>

                    {/* Apple Pay Text */}
                    <span className="text-sm font-medium">Pay</span>
                </Button>

                {/* Google Pay Button */}
                <Button
                    onClick={handleGooglePayClick}
                    disabled={disabled}
                    className="w-full h-12 bg-background hover:bg-muted text-foreground border-2 border-border hover:border-primary transition-colors rounded-lg flex items-center justify-center gap-3"
                    size="lg">
                    {/* Google Pay Icon */}
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="flex-shrink-0">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>

                    {/* Google Pay Text */}
                    <span className="text-sm font-medium">Pay</span>
                </Button>

                {/* Amazon Pay Button - Official Amazon Pay styling per iOS documentation */}
                <Button
                    onClick={handleAmazonPayClick}
                    disabled={disabled}
                    className="w-full h-12 bg-[#FFD814] hover:bg-[#F7CA00] border-[#FFD814] border-[1.5px] rounded-[4px] flex items-center justify-center transition-colors"
                    size="lg">
                    {/* Amazon Pay Official Logo from https://m.media-amazon.com/images/G/01/AmazonPay/ux/squid_ink_pwa.svg */}
                    <img
                        src="https://m.media-amazon.com/images/G/01/AmazonPay/ux/squid_ink_pwa.svg"
                        alt="Amazon Pay"
                        className="h-6"
                    />
                </Button>

                {/* PayPal Button - Official PayPal SDK Button */}
                {paypalSDKError ? (
                    <div className="w-full h-12 bg-destructive/10 border border-destructive/20 rounded flex items-center justify-center text-sm text-destructive">
                        PayPal unavailable
                    </div>
                ) : isPayPalSDKLoading ? (
                    <div className="w-full h-12 bg-muted animate-pulse rounded" />
                ) : (
                    <PayPalButton onApprove={handlePayPalClick} disabled={disabled} />
                )}

                {/* Venmo Button - Official PayPal SDK Button (Mobile only, US markets) */}
                {paypalSDKError ? (
                    <div className="w-full h-12 bg-destructive/10 border border-destructive/20 rounded flex items-center justify-center text-sm text-destructive">
                        Venmo unavailable
                    </div>
                ) : isPayPalSDKLoading ? (
                    <div className="w-full h-12 bg-muted animate-pulse rounded" />
                ) : (
                    <VenmoButton onApprove={handleVenmoClick} disabled={disabled} />
                )}
            </div>

            {/* Seamless "Or" Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-background text-muted-foreground font-medium">Or</span>
                </div>
            </div>
        </div>
    );
}
