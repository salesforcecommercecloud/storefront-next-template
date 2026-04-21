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
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const CHECKOUT_ERROR_BANNER_CLASSES =
    'bg-status-critical-bg border border-status-critical-border text-status-critical-foreground px-4 py-3 rounded text-xl font-bold' as const;

export interface CheckoutErrorBannerProps {
    message: React.ReactNode;
    className?: string;
}

/**
 * Banner for checkout errors (form-level, API, or place-order).
 * Use for all blocking error messages in the checkout flow.
 */
const CheckoutErrorBanner = forwardRef<HTMLDivElement, CheckoutErrorBannerProps>(function CheckoutErrorBanner(
    { message, className },
    ref
) {
    return (
        <div ref={ref} role="alert" className={cn(CHECKOUT_ERROR_BANNER_CLASSES, className)} aria-live="polite">
            {message}
        </div>
    );
});

export default CheckoutErrorBanner;
