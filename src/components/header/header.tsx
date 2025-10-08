import type { ReactElement, PropsWithChildren } from 'react';
import { Link } from 'react-router';
import Search from './search';
import CartBadge from './cart-badge';
import UserActions from './user-actions';
import uiStrings from '@/temp-ui-string';
// @sfdc-extension-line SFDC_EXT_STORE_LOCATOR
import StoreLocatorBadge from '@/extensions/store-locator/components/header/store-locator-badge';
import logo from '/images/logo.svg';

export default function Header({ children }: PropsWithChildren): ReactElement {
    return (
        <header className="bg-background shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-4">
                        <img className="w-10 h-10 text-primary" src={logo} alt={uiStrings.header.logoAlt} />
                        <div className="text-xl font-bold text-primary-600">{uiStrings.header.brand}</div>
                    </Link>

                    {/* Mega Menu */}
                    {children}

                    {/* Search, User Actions, Cart */}
                    <div className="flex items-center space-x-4">
                        <Search />
                        <UserActions />
                        {/*  @sfdc-extension-line SFDC_EXT_STORE_LOCATOR */}
                        <StoreLocatorBadge />
                        <CartBadge />
                    </div>
                </div>
            </div>
        </header>
    );
}
