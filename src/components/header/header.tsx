import type { ReactElement, PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router';
import Search from './search';
import CartBadge from './cart-badge';
import UserActions from './user-actions';
import { useTranslation } from 'react-i18next';
import logo from '/images/market-logo.svg';
import { PluginComponent } from '@/plugins/plugin-components';

export default function Header({ children }: PropsWithChildren): ReactElement {
    const { t } = useTranslation('header');
    const location = useLocation();

    return (
        <header className="bg-background shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-4">
                        <img className="w-10 h-10 text-primary" src={logo} alt={t('logoAlt')} />
                        <div className="text-xl font-bold text-primary-600 whitespace-pre-line leading-tight">
                            {t('brand')}
                        </div>
                    </Link>

                    {/* Mega Menu */}
                    {children}

                    {/* Search, User Actions, Cart */}
                    <div className="flex items-center space-x-4">
                        <Search key={`${location.pathname}${location.search}`} />
                        <UserActions />
                        <PluginComponent pluginId="header.before.cart" />
                        <CartBadge />
                    </div>
                </div>
            </div>
        </header>
    );
}
