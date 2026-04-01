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
import type { ReactElement } from 'react';

// React Router
import { Link } from '@/components/link';

// UI Components
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/typography';

import { useTranslation } from 'react-i18next';

interface EmptyCartProps {
    isRegistered?: boolean;
}

/**
 * EmptyCart component that displays when the cart has no items
 *
 * This component provides:
 * - Empty cart state display with icon and messaging
 * - Different messages for registered vs guest users
 * - Start Shopping action button
 * - Responsive design with proper spacing
 *
 * Used by cart-content components to display empty cart state.
 *
 * @param props - Component props
 * @returns JSX element with empty cart display
 *
 * @see {@link CartContent} - Cart component that uses this for empty state
 */
export default function EmptyCart({ isRegistered = false }: EmptyCartProps): ReactElement {
    const { t } = useTranslation('cart');

    return (
        <div className="bg-muted flex-1 min-w-full w-full" data-testid="sf-cart-empty">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14">
                <div className="bg-background rounded-lg shadow-md p-8 md:p-16 text-center">
                    {/* Empty Cart Icon */}
                    <svg
                        className="w-24 h-24 text-muted-foreground/30 mx-auto mb-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                    </svg>

                    {/* Empty Cart Message */}
                    <Typography variant="h2" as="h2" className="text-xl text-center font-semibold text-foreground mb-2">
                        {t('empty.title')}
                    </Typography>
                    <p className="text-sm text-muted-foreground mb-8">
                        {isRegistered ? t('empty.registeredMessage') : t('empty.guestMessage')}
                    </p>

                    {/* Action Button */}
                    <Button asChild>
                        <Link to="/">{t('empty.continueShopping')}</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
