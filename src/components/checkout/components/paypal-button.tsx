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
