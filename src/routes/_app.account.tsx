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
import { useMemo, type ReactElement } from 'react';
import { Outlet, type LoaderFunctionArgs, redirect, type ShouldRevalidateFunctionArgs } from 'react-router';
import { House, User, Heart, ShoppingBag, MapPin, CreditCard, Building, LogOut } from 'lucide-react';
import { getAuth as getAuthServer } from '@/middlewares/auth.server';
import { getCustomer } from '@/lib/api/customer';
import { Card, CardContent } from '@/components/ui/card';
import { AccountNavList, type AccountNavItemData } from '@/components/account-navigation';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { useTranslation } from 'react-i18next';

/**
 * Type definition for the account page loader data
 */
type AccountPageData = {
    customer: Promise<ShopperCustomers.schemas['Customer']>;
};

/**
 * Server-side loader function for the account page.
 * Handles authentication validation and customer data retrieval on the server.
 *
 * @param args - Loader function arguments containing request context
 * @returns Promise containing customer data or redirects to login
 */
// eslint-disable-next-line react-refresh/only-export-components
export function loader(args: LoaderFunctionArgs) {
    const session = getAuthServer(args.context);
    const { accessToken, accessTokenExpiry, userType, customerId } = session;

    if (
        !accessToken ||
        typeof accessTokenExpiry !== 'number' ||
        accessTokenExpiry < Date.now() ||
        userType !== 'registered' ||
        !customerId
    ) {
        throw redirect('/login');
    }

    const customer = getCustomer(args.context, customerId);

    return { customer };
}

// eslint-disable-next-line react-refresh/only-export-components
export function shouldRevalidate({ defaultShouldRevalidate, formData }: ShouldRevalidateFunctionArgs) {
    // Defer revalidation if the password has just been updated allowing the re-login process to complete.
    if (Object.fromEntries(formData || [])?.currentPassword) {
        return false;
    }

    return defaultShouldRevalidate;
}

/**
 * Account page component that renders the account navigation and child routes.
 * This component receives the loader data as props and renders the account interface.
 *
 * @param props - Component props containing loader data
 * @returns JSX element representing the account layout
 */
export default function AccountPage({ loaderData }: { loaderData: AccountPageData }): ReactElement {
    const { t } = useTranslation('account');
    const { customer } = loaderData;

    const navigationItems: AccountNavItemData[] = useMemo(
        () => [
            {
                path: '/account/overview',
                icon: House,
                label: t('navigation.overview'),
            },
            {
                path: '/account',
                icon: User,
                label: t('navigation.accountDetails'),
            },
            {
                path: '/account/wishlist',
                icon: Heart,
                label: t('navigation.wishlist'),
            },
            {
                path: '/account/orders',
                icon: ShoppingBag,
                label: t('navigation.orderHistory'),
            },
            {
                path: '/account/addresses',
                icon: MapPin,
                label: t('navigation.addresses'),
            },
            {
                path: '/account/payment-methods',
                icon: CreditCard,
                label: t('navigation.paymentMethods'),
            },
            {
                path: '/account/store-preferences',
                icon: Building,
                label: t('navigation.storePreferences'),
            },
        ],
        [t]
    );

    const logoutItem: AccountNavItemData = useMemo(
        () => ({
            path: '',
            icon: LogOut,
            label: t('navigation.logOut'),
            action: '/logout',
            method: 'post',
        }),
        [t]
    );

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Mobile Navigation Accordion */}
                    <div className="lg:hidden">
                        <Card className="bg-muted/30">
                            <CardContent className="p-4">
                                <h2 className="text-lg font-semibold text-foreground mb-4">{t('myAccount')}</h2>
                                <nav className="space-y-1">
                                    <AccountNavList items={navigationItems} isMobile={true} />
                                    <div className="mt-4 pt-4 border-t border-border">
                                        <AccountNavList items={[logoutItem]} isMobile={true} />
                                    </div>
                                </nav>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Desktop Sidebar Navigation */}
                    <div className="hidden lg:block lg:col-span-1">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-foreground">{t('myAccount')}</h2>
                            <nav className="space-y-1">
                                <AccountNavList items={navigationItems} />
                                <div className="mt-4 pt-4 border-t border-border">
                                    <AccountNavList items={[logoutItem]} />
                                </div>
                            </nav>
                        </div>
                    </div>

                    {/* Main Content - Child routes render here */}
                    <div className="lg:col-span-3">
                        <Outlet context={{ customer }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
