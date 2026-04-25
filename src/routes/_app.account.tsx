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
import { useTranslation } from 'react-i18next';
import { House, User, Heart, ShoppingBag, MapPin, CreditCard, Building, LogOut } from 'lucide-react';

// Runtime SDK
import type { ShopperCustomers, ShopperConsents } from '@salesforce/storefront-next-runtime/scapi';

// Components
import { AccountNavList, type AccountNavItemData } from '@/components/account-navigation';
import { Card, CardContent } from '@/components/ui/card';

// Lib
import { getSubscriptions } from '@/lib/api/consent.server';
import { getCustomer } from '@/lib/api/customer.server';
import { buildUrlFromContext } from '@/lib/url.server';

// Logging
import { getLogger } from '@/lib/logger.server';

// middleware
import { getAuth as getAuthServer } from '@/middlewares/auth.server';

/**
 * Type definition for the account page loader data
 */
type AccountPageData = {
    customer: Promise<ShopperCustomers.schemas['Customer']>;
    subscriptions: Promise<ShopperConsents.schemas['ConsentSubscriptionResponse'] | null>;
};

/**
 * Server-side loader function for the account page.
 * Handles authentication validation and customer data retrieval on the server.
 *
 * @param args - Loader function arguments containing request context
 * @returns Promise containing customer data or redirects to login
 */
export function loader(args: LoaderFunctionArgs) {
    const logger = getLogger(args.context);
    logger.debug('Account: loader starting');

    const session = getAuthServer(args.context);
    const { accessToken, accessTokenExpiry, userType, customerId } = session;

    if (
        !accessToken ||
        typeof accessTokenExpiry !== 'number' ||
        accessTokenExpiry < Date.now() ||
        userType !== 'registered' ||
        !customerId
    ) {
        logger.warn('Account: authentication validation failed, redirecting to login');
        throw redirect(buildUrlFromContext('/login', args.context));
    }

    const customer = getCustomer(args.context, customerId);
    const subscriptions = getSubscriptions(args.context);

    return { customer, subscriptions };
}

export function shouldRevalidate({ defaultShouldRevalidate, formAction }: ShouldRevalidateFunctionArgs) {
    // Defer revalidation when a fetcher submits to our SCAPI resource route (profile/password update)
    // so AccountDetailsContent stays mounted and useScapiFetcherEffect can fire its callbacks.
    if (formAction?.includes('/resource/api/client')) {
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
    const { customer, subscriptions } = loaderData;

    // Stable context reference so child Await does not get new promise refs on every layout re-render.
    const outletContext = useMemo(() => ({ customer, subscriptions }), [customer, subscriptions]);

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
                end: true,
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
            <div className="w-full section-container py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 w-full">
                    {/* Nav column: mobile accordion + desktop sidebar (one cell so sidebar stays left of content) */}
                    <div className="w-full lg:w-fit">
                        {/* Mobile Navigation Accordion */}
                        <div className="lg:hidden">
                            <Card className="bg-muted/30 rounded-none shadow-none">
                                <CardContent className="p-4">
                                    <h2 className="text-lg font-semibold text-foreground mb-4">{t('myAccount')}</h2>
                                    <nav className="space-y-1">
                                        <AccountNavList items={navigationItems} isMobile={true} />
                                        <AccountNavList items={[logoutItem]} isMobile={true} />
                                    </nav>
                                </CardContent>
                            </Card>
                        </div>
                        {/* Desktop Sidebar Navigation */}
                        <div className="hidden lg:block">
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold text-foreground">{t('myAccount')}</h2>
                                <nav className="space-y-1">
                                    <AccountNavList items={navigationItems} />
                                    <AccountNavList items={[logoutItem]} />
                                </nav>
                            </div>
                        </div>
                    </div>

                    {/* Main Content - Child routes render here */}
                    <div className="min-w-0">
                        <Outlet context={outletContext} />
                    </div>
                </div>
            </div>
        </div>
    );
}
