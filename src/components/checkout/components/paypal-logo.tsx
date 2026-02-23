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

import paypalLogo from '/images/paypal.svg';
import { useTranslation } from 'react-i18next';

/**
 * PayPal Logo SVG Component
 * Official PayPal wordmark logo matching SDK button appearance
 * Uses local PayPal SVG file from public/images
 */
export default function PayPalLogo({ className }: { className?: string }) {
    const { t } = useTranslation('checkout');
    return (
        <img
            src={paypalLogo}
            alt={t('expressPayments.payPalLabel') || 'PayPal'}
            className={`${className || ''} h-4 w-auto`}
            style={{ objectFit: 'contain' }}
        />
    );
}
