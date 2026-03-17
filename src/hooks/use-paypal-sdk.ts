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
import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook to lazy load the PayPal SDK
 *
 * This hook dynamically loads the PayPal JavaScript SDK only when needed,
 * improving performance by avoiding loading it on every page.
 *
 * @param clientId - PayPal client ID (TODO: This should be made a config when we implement Paypal integration)
 * @param components - PayPal SDK components to load (default: 'buttons')
 * @param disableFunding - Comma-separated list of funding sources to disable (e.g., 'paylater,credit')
 * @returns Object with loading state and error state
 */
export function usePayPalSDK(
    clientId: string = 'test',
    components: string = 'buttons',
    disableFunding?: string
): {
    isLoading: boolean;
    error: Error | null;
} {
    // Initialize loading state based on whether SDK is already available
    const [isLoading, setIsLoading] = useState(() => {
        if (typeof window === 'undefined') return true;
        return !window.paypal;
    });
    const [error, setError] = useState<Error | null>(null);

    // Track if this hook instance has already initialized
    const hasInitialized = useRef(false);

    useEffect(() => {
        /**
         * Sets up a fallback timeout to handle cases where script load/error events don't fire.
         * This is a defensive measure against browser quirks, network issues, or external factors.
         *
         * @returns Cleanup function to clear the timeout
         */
        const setupLoadFallback = () => {
            const timeoutId = setTimeout(() => {
                if (window.paypal) {
                    // SDK loaded but event didn't fire - recover gracefully
                    setIsLoading(false);
                } else {
                    // Genuine timeout - show error to user
                    setError(new Error('PayPal SDK loading timeout'));
                    setIsLoading(false);
                }
            }, 5000);

            return () => clearTimeout(timeoutId);
        };

        // Skip on server-side
        if (typeof window === 'undefined') {
            return;
        }

        // Check if PayPal SDK is already loaded
        if (window.paypal) {
            setIsLoading(false);
            hasInitialized.current = true;
            return;
        }

        // Check if script is already in the DOM (being loaded or already loaded)
        const existingScript = document.querySelector('script[data-paypal-sdk]');

        if (existingScript) {
            // Check if window.paypal exists (script already executed)
            if (window.paypal) {
                setIsLoading(false);
                return;
            }

            // Script exists but hasn't executed yet, wait for load event
            const handleLoad = () => {
                setIsLoading(false);
            };

            const handleError = () => {
                setError(new Error('Failed to load PayPal SDK'));
                setIsLoading(false);
            };

            // Fallback timeout in case events don't fire
            const cleanupTimeout = setupLoadFallback();

            existingScript.addEventListener('load', handleLoad);
            existingScript.addEventListener('error', handleError);

            return () => {
                cleanupTimeout();
                existingScript.removeEventListener('load', handleLoad);
                existingScript.removeEventListener('error', handleError);
            };
        }

        // Mark as initialized before creating script to prevent race conditions
        hasInitialized.current = true;

        // Create and load the script
        const script = document.createElement('script');
        let sdkUrl = `https://www.paypal.com/sdk/js?client-id=${clientId}&components=${components}`;
        if (disableFunding) {
            sdkUrl += `&disable-funding=${disableFunding}`;
        }
        script.src = sdkUrl;
        script.setAttribute('data-paypal-sdk', 'true');
        script.setAttribute('data-sdk-integration-source', 'button-factory');
        script.async = true;

        const handleLoad = () => {
            // When load event fires, the script has executed and window.paypal should be available
            setIsLoading(false);
        };

        const handleError = () => {
            setError(new Error('Failed to load PayPal SDK'));
            setIsLoading(false);
        };

        // Fallback timeout in case events don't fire
        const cleanupTimeout = setupLoadFallback();

        script.addEventListener('load', handleLoad);
        script.addEventListener('error', handleError);

        document.body.appendChild(script);

        // Cleanup function
        return () => {
            cleanupTimeout();
            script.removeEventListener('load', handleLoad);
            script.removeEventListener('error', handleError);
            // Note: We don't remove the script from DOM as it might be needed by other components
            // and removing it could break PayPal functionality
        };
    }, [clientId, components, disableFunding]);

    return { isLoading, error };
}
