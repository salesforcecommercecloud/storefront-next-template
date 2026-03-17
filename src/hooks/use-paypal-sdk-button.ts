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
import { useEffect, useRef, type RefObject } from 'react';

/**
 * Configuration for PayPal SDK button styling and behavior
 */
export interface PayPalSDKButtonConfig {
    /**
     * Optional funding source to specify which payment method to render
     * (e.g., 'venmo' for Venmo button)
     */
    fundingSource?: string;
    /**
     * Button styling configuration
     */
    style: {
        layout?: 'vertical' | 'horizontal';
        color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
        shape?: 'rect' | 'pill' | 'sharp';
        label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'venmo';
        height?: number;
        tagline?: boolean; // Show/hide "the safer, easier way to pay" tagline
    };
    /**
     * Error message prefix for logging (e.g., "PayPal error:" or "Venmo error:")
     */
    errorPrefix: string;
}

/**
 * Custom hook for initializing and rendering PayPal SDK buttons
 *
 * This hook encapsulates the common logic for rendering PayPal SDK payment buttons,
 * including initialization, SDK availability checks, and callback handling.
 *
 * @param config - Button configuration (styling, funding source, etc.)
 * @param onApprove - Callback invoked when payment is approved
 * @param containerRef - React ref to the DOM element where button should render
 * @param onRenderComplete - Optional callback invoked when button finishes rendering
 */
export function usePayPalSDKButton(
    config: PayPalSDKButtonConfig,
    onApprove: () => void | Promise<void>,
    containerRef: RefObject<HTMLDivElement>,
    onRenderComplete?: () => void
) {
    const isInitialized = useRef(false);

    useEffect(() => {
        // Only initialize once and ensure container exists
        if (isInitialized.current || !containerRef.current) return;

        // This hook should only be called when window.paypal is guaranteed to be available
        // (after usePayPalSDK returns isLoading: false)
        if (typeof window !== 'undefined' && window.paypal) {
            isInitialized.current = true;

            const buttonOptions: PayPalButtonsOptions = {
                style: config.style,
                // Create order callback (placeholder for now)
                createOrder: () => {
                    // TODO: Implement actual order creation via backend API
                    // For now, return a promise that resolves with a dummy order ID
                    return Promise.resolve('DUMMY_ORDER_ID');
                },
                // Approval callback - properly syncs with custom callback
                onApprove: () => {
                    return Promise.resolve(onApprove()).then(() => void 0);
                },
                // Error callback
                onError: (err: Error) => {
                    // eslint-disable-next-line no-console
                    console.error(config.errorPrefix, err);
                },
            };

            // Add funding source if specified (e.g., for Venmo)
            if (config.fundingSource) {
                buttonOptions.fundingSource = config.fundingSource;
            }

            // Render button and notify when complete
            void window.paypal
                .Buttons(buttonOptions)
                .render(containerRef.current)
                .then(() => {
                    onRenderComplete?.();
                })
                .catch((err: Error) => {
                    // eslint-disable-next-line no-console
                    console.error(config.errorPrefix, 'Render failed:', err);
                });
        } else {
            // This shouldn't happen if usePayPalSDK is working correctly
            // eslint-disable-next-line no-console
            console.error('[PayPal Button] SDK not available - this indicates a timing issue');
        }
    }, [config, onApprove, containerRef, onRenderComplete]);
}

// TypeScript type definitions for PayPal SDK

declare global {
    interface Window {
        paypal?: {
            Buttons: (options: PayPalButtonsOptions) => PayPalButtonsInstance;
            FUNDING: {
                VENMO: string;
                PAYPAL: string;
                CARD: string;
                CREDIT: string;
            };
        };
    }
}

interface PayPalButtonsOptions {
    fundingSource?: string;
    style?: {
        layout?: 'vertical' | 'horizontal';
        color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
        shape?: 'rect' | 'pill' | 'sharp';
        label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'venmo';
        height?: number;
        tagline?: boolean;
    };
    createOrder?: () => Promise<string>;
    onApprove?: () => Promise<void>;
    onError?: (err: Error) => void;
}

interface PayPalButtonsInstance {
    render: (container: HTMLElement) => Promise<void>;
}
