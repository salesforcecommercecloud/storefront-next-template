/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use client';

import { Button } from '@/components/ui/button';
import StaticPayPalButton from './static-paypal-button';
import StaticVenmoButton from './static-venmo-button';
import ApplePayLogo from './apple-pay-logo';
import GooglePayLogo from './google-pay-logo';

interface ExpressPaymentsProps {
    disabled?: boolean;
    /**
     * Layout orientation for the payment buttons
     * - 'horizontal': Responsive grid layout (1 col mobile, 2 cols tablet, 4 cols desktop)
     * - 'vertical': Stacked vertical layout (all buttons in single column)
     * @default 'horizontal'
     */
    layout?: 'horizontal' | 'vertical';
    /**
     * Position of the separator divider
     * - 'top': Displays separator above the payment buttons
     * - 'bottom': Displays separator below the payment buttons
     * @default 'bottom'
     */
    separatorPosition?: 'top' | 'bottom';
    /**
     * Custom text for the separator divider
     * @default 'Or'
     */
    separatorText?: string;
}

/**
 * Express Payments Component (Placeholder Implementation)
 *
 * This is a PLACEHOLDER component that provides visual representations of express payment buttons
 * (Apple Pay, Google Pay, Amazon Pay, PayPal, and Venmo) with alert messages instead of real
 * payment processing. It serves as a UI demonstration and should be replaced with actual payment
 * provider integrations in production.
 *
 * IMPORTANT: This component uses translation keys that should be REMOVED if this component is replaced.
 *
 * ## Translation Keys Used:
 *
 * ### Checkout Page (checkout namespace):
 * - `checkout.expressPayments.separator` - "Or" text between buttons and form
 * - `checkout.expressPayments.venmoUnavailable` - Venmo unavailable message (currently unused)
 *
 * ### Product Page (product namespace):
 * - `product.expressPayments.separatorBuyWith` - "Or buy with" text on PDP
 * - `product.expressPayments.venmoUnavailable` - Venmo unavailable message (currently unused)
 *
 * ## Where It's Used:
 * - Checkout page: `src/components/checkout/checkout-form-page.tsx` (line ~382)
 * - Product page: `src/components/product-cart-actions/index.tsx` (line ~170)
 *
 * ## Files to Update When Removing This Component:
 *
 * ### 1. Translation Files (Remove the `expressPayments` objects):
 * - `src/locales/en-US/translations.json` (lines 281-284, 580-583)
 * - `src/locales/it-IT/translations.json` (lines 281-284, 580-583)
 * - Any additional locale files in `src/locales/`
 *
 * ### 2. Parent Components (Remove ExpressPayments usage):
 * - `src/components/checkout/checkout-form-page.tsx`
 * - `src/components/product-cart-actions/index.tsx`
 *
 * ### 3. Test Files:
 * - `src/components/checkout/components/express-payments.test.tsx`
 * - Update any tests in parent components that reference express payments
 *
 * ### 4. Related Component Files:
 * - `src/components/checkout/components/static-paypal-button.tsx`
 * - `src/components/checkout/components/static-venmo-button.tsx`
 * - `src/components/checkout/components/apple-pay-logo.tsx`
 * - `src/components/checkout/components/google-pay-logo.tsx`
 * - `src/components/checkout/components/paypal-logo.tsx`
 * - `src/components/checkout/components/venmo-logo.tsx`
 *
 * ## Example: Removing Translation Keys
 *
 * In `src/locales/en-US/translations.json`, remove these blocks:
 *
 * ```json
 * // Remove from "product" namespace (lines ~281-284)
 * "expressPayments": {
 *     "separatorBuyWith": "Or buy with",
 *     "venmoUnavailable": "Venmo is not available on this device."
 * },
 *
 * // Remove from "checkout" namespace (lines ~580-583)
 * "expressPayments": {
 *     "separator": "Or",
 *     "venmoUnavailable": "Venmo is not available on this device."
 * },
 * ```
 *
 * ## Replacement Guidelines:
 * When implementing real payment providers (Stripe, Adyen, etc.), create new components that:
 * 1. Load actual payment SDKs
 * 2. Handle real payment processing
 * 3. Use provider-specific translation keys (e.g., `payment.stripe.*`, `payment.adyen.*`)
 * 4. Implement proper error handling and security
 *
 * All express payment handlers are self-contained within this component to avoid duplication
 * across PDP and checkout pages.
 */
export default function ExpressPayments({
    disabled = false,
    layout = 'horizontal',
    separatorPosition = 'bottom',
    separatorText = 'Or',
}: ExpressPaymentsProps) {
    const handleApplePayClick = () => {
        if (!disabled) {
            // eslint-disable-next-line no-alert
            alert(
                'Apple Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );
        }
    };

    const handleGooglePayClick = () => {
        if (!disabled) {
            // eslint-disable-next-line no-alert
            alert(
                'Google Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );
        }
    };

    const handleAmazonPayClick = () => {
        if (!disabled) {
            // eslint-disable-next-line no-alert
            alert(
                'Amazon Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );
        }
    };

    const handleVenmoClick = () => {
        if (!disabled) {
            // eslint-disable-next-line no-alert
            alert(
                'Venmo express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );
        }
    };

    const handlePayPalClick = () => {
        if (!disabled) {
            // eslint-disable-next-line no-alert
            alert(
                'PayPal express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
            );
        }
    };

    // Determine grid layout classes based on layout prop
    const gridClasses =
        layout === 'vertical'
            ? 'grid grid-cols-1 gap-3' // Vertical: Single column, tighter spacing
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'; // Horizontal: Responsive grid

    // Separator component (reusable for top or bottom placement)
    const separator = (
        <div className="relative flex items-center py-2">
            {/* Left line */}
            <div className="flex-1 h-[2px] bg-separator" />
            {/* Text */}
            <span className="px-4 text-separator-foreground font-medium uppercase text-sm whitespace-nowrap">
                {separatorText}
            </span>
            {/* Right line */}
            <div className="flex-1 h-[2px] bg-separator" />
        </div>
    );

    return (
        <div className="space-y-2" data-testid="express-payments">
            {/* Separator at top (if configured) */}
            {separatorPosition === 'top' && separator}

            {/* Express Payment Buttons - Horizontal: 4 buttons on desktop (Venmo hidden), 5 on mobile (Venmo visible) | Vertical: All buttons stacked */}
            <div className={gridClasses}>
                {/* Apple Pay Button */}
                <Button
                    onClick={handleApplePayClick}
                    disabled={disabled}
                    className="w-full h-12 bg-foreground hover:bg-foreground/90 text-background border-0 rounded-lg flex items-center justify-center transition-colors"
                    size="lg"
                    aria-label="Apple Pay">
                    <ApplePayLogo className="flex-shrink-0" />
                </Button>

                {/* Google Pay Button */}
                <Button
                    onClick={handleGooglePayClick}
                    disabled={disabled}
                    className="w-full h-12 bg-background hover:bg-muted text-foreground border-2 border-border hover:border-primary transition-colors rounded-lg flex items-center justify-center"
                    size="lg"
                    aria-label="Google Pay">
                    <GooglePayLogo className="flex-shrink-0" />
                </Button>

                {/* Amazon Pay Button - Official Amazon Pay styling per iOS documentation */}
                <Button
                    onClick={handleAmazonPayClick}
                    disabled={disabled}
                    className="w-full h-12 bg-[#FFD814] hover:bg-[#F7CA00] border-[#FFD814] border-[1.5px] rounded-lg flex items-center justify-center transition-colors"
                    size="lg"
                    aria-label="Amazon Pay">
                    {/* Amazon Pay Official Logo from https://m.media-amazon.com/images/G/01/AmazonPay/ux/squid_ink_pwa.svg */}
                    <img
                        src="https://m.media-amazon.com/images/G/01/AmazonPay/ux/squid_ink_pwa.svg"
                        alt="Amazon Pay"
                        className="h-5 w-auto"
                        style={{ objectFit: 'contain' }}
                    />
                </Button>

                {/* PayPal & Venmo Static Buttons - Always visible, never replaced */}
                {/* SDK loads in background on click to customize Venmo message if needed */}
                <StaticPayPalButton onClick={handlePayPalClick} disabled={disabled} />
                <StaticVenmoButton onClick={handleVenmoClick} disabled={disabled} />
            </div>

            {/* Separator at bottom (if configured) */}
            {separatorPosition === 'bottom' && separator}
        </div>
    );
}
