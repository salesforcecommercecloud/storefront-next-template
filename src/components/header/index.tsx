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
import type { ReactElement, PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router';
import Search from './search';
import CartBadge from './cart-badge';
import UserActions from './user-actions/user-actions';
import { useTranslation } from 'react-i18next';
import logo from '/images/foundations/foundations-logo.svg';
import { UITarget } from '@/targets/ui-target';

export default function Header({ children }: PropsWithChildren): ReactElement {
    const { t } = useTranslation('header');
    const location = useLocation();

    return (
        <header className="bg-header-background text-header-foreground border-b border-border sticky top-0 z-50 relative [--header-height:theme(spacing.16)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/*
                 * Responsive flex layout with explicit ordering:
                 * Mobile (< lg): Logo → Icons → Hamburger (far right) | Search (new row)
                 * Desktop (≥ lg): Logo → Mega Menu → Search → Icons
                 */}
                <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-4">
                    {/* Logo - always first */}
                    <Link to="/" className="flex-shrink-0 flex items-center gap-2 h-16 order-1">
                        <img src={logo} alt={t('logoAlt')} className="h-10 w-auto" />
                    </Link>

                    {/* Icons group - order: 2 on mobile, 4 on desktop */}
                    <div className="flex items-center space-x-2 h-16 order-2 lg:order-4">
                        <UITarget targetId="header.before.cart" />
                        <UserActions />
                        <CartBadge />
                    </div>

                    {/* Navigation Menu - order: 3 on mobile (far right), 2 on desktop */}
                    <div className="flex items-center order-3 lg:order-2">{children}</div>

                    {/* Search - wraps to new row on mobile (order: 4), inline on desktop (order: 3) */}
                    <div className="w-full lg:w-auto order-4 lg:order-3 pb-4 lg:pb-0">
                        <Search key={`${location.pathname}${location.search}`} />
                    </div>
                </div>
            </div>
        </header>
    );
}
