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

import amazonPayLogo from '/images/amazon-pay-logo.png';
import { useTranslation } from 'react-i18next';

/**
 * Amazon Pay Logo Component
 */
export default function AmazonPayLogo({
    className,
    decorative = false,
}: {
    className?: string;
    /** When true, image is hidden from the accessibility tree (use inside a button that has aria-label). */
    decorative?: boolean;
}) {
    const { t } = useTranslation('checkout');
    const label = t('expressPayments.amazonPayLabel') || 'Amazon Pay';
    return (
        <img
            src={amazonPayLogo}
            alt={decorative ? '' : label}
            width="99"
            height="19"
            {...(decorative ? { 'aria-hidden': true } : {})}
            className={`${className || ''} h-[19px] w-auto object-contain`}
        />
    );
}
