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
