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
import logo from '/images/market-logo.svg';
import { UITarget } from '@/targets/ui-target';

export default function Header({ children }: PropsWithChildren): ReactElement {
    const { t } = useTranslation('header');
    const location = useLocation();

    return (
        <header className="bg-background shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-4">
                        <img src={logo} alt={t('logoAlt')} />
                    </Link>

                    {/* Mega Menu */}
                    {children}

                    {/* Search, Account Icon, Cart */}
                    <div className="flex items-center space-x-4">
                        <Search key={`${location.pathname}${location.search}`} />
                        <UITarget targetId="header.before.cart" />
                        <UserActions />
                        <CartBadge />
                    </div>
                </div>
            </div>
        </header>
    );
}
