import { useMemo, type ReactElement } from 'react';
import {
    Outlet,
    type ClientLoaderFunctionArgs,
    type LoaderFunctionArgs,
    redirect,
    type ShouldRevalidateFunctionArgs,
} from 'react-router';
import { User, Heart, Receipt, MapPin } from 'lucide-react';
import { getAuth as getAuthClient, refreshAuthFromCookie } from '@/middlewares/auth.client';
import { getAuth as getAuthServer } from '@/middlewares/auth.server';
import { getCustomer } from '@/lib/api/customer';
import { Card, CardContent } from '@/components/ui/card';
import { AccountNavList, type AccountNavItemData } from '@/components/account-navigation';
import { createPage, type RouteComponentProps } from '@/components/create-page';
import { AccountSkeleton } from '@/components/account-skeleton';
import uiStrings from '@/temp-ui-string';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import type { SessionData } from '@/lib/api/types';

/**
 * Type definition for the account page data including page key
 */
type AccountPageData = {
    customer: Promise<ShopperCustomers.schemas['Customer']>;
    pageKey: string;
};

/**
 * Type definition for the shared session data used in authentication checks
 */
type AuthSession = Pick<SessionData, 'access_token' | 'access_token_expiry' | 'userType' | 'customer_id'>;

/**
 * Shared function to get page data for both server and client loaders.
 * This function contains the common logic for authentication validation and customer data retrieval.
 *
 * @param session - The authenticated session data containing access token, expiry, user type, and customer ID
 * @param context - The router context for making API calls
 * @param pageKey - The page key for navigation transitions
 * @returns Promise containing the customer data and page key
 * @throws Redirects to login page if authentication is invalid
 */
function getPageData(
    session: AuthSession,
    context: LoaderFunctionArgs['context'],
    pageKey: string
): { customer: Promise<ShopperCustomers.schemas['Customer']>; pageKey: string } {
    const { access_token, access_token_expiry, userType, customer_id } = session;

    if (
        !access_token ||
        typeof access_token_expiry !== 'number' ||
        access_token_expiry < Date.now() ||
        userType !== 'registered' ||
        !customer_id
    ) {
        // Use throw redirect on the server for better performance
        throw redirect('/login');
    }

    const customer = getCustomer(context, customer_id);
    return { customer, pageKey };
}

/**
 * Server-side loader function for the account page.
 * Handles authentication validation and customer data retrieval on the server.
 *
 * @param args - Loader function arguments containing request context
 * @returns Promise containing customer data and page key or redirects to login
 */
// eslint-disable-next-line react-refresh/only-export-components
export function loader(args: LoaderFunctionArgs) {
    // SERVER LOADER: Only uses server-side auth
    const session = getAuthServer(args.context);
    const pageKey = `account-${args.params.customerId || 'default'}`;
    return getPageData(session, args.context, pageKey);
}

/**
 * Client-side loader function for the account page.
 * Handles authentication validation and customer data retrieval on the client.
 *
 * @param args - Client loader function arguments containing request context
 * @returns Promise containing customer data and page key or redirects to login
 */
// eslint-disable-next-line react-refresh/only-export-components
export function clientLoader(args: ClientLoaderFunctionArgs) {
    // Check if the session in the cookie is different from what's in the cache
    // This handles the edge case where the user changed their password and was re-logged in via a server action
    // The server action updates the cookie with a new access token, but the client auth middleware might not have picked it up yet
    refreshAuthFromCookie(args.context);

    // CLIENT LOADER: Only uses client-side auth
    const session = getAuthClient(args.context);
    const pageKey = `account-${args.params.customerId || 'default'}`;
    return getPageData(session, args.context, pageKey);
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
 * Account layout view component that renders the account navigation and child routes.
 * This component receives the loader data as props and renders the account interface.
 *
 * @param props - Component props containing loader data
 * @returns JSX element representing the account layout
 */
function AccountLayoutView({ loaderData }: RouteComponentProps<AccountPageData>): ReactElement {
    const navigationItems: AccountNavItemData[] = useMemo(
        () => [
            {
                path: '/account',
                icon: User,
                label: uiStrings.account.navigation.accountDetails,
            },
            {
                path: '/account/wishlist',
                icon: Heart,
                label: uiStrings.account.navigation.wishlist,
            },
            {
                path: '/account/orders',
                icon: Receipt,
                label: uiStrings.account.navigation.orderHistory,
            },
            {
                path: '/account/addresses',
                icon: MapPin,
                label: uiStrings.account.navigation.addresses,
            },
        ],
        []
    );

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Mobile Navigation Accordion */}
                    <div className="lg:hidden">
                        <Card className="bg-muted/30">
                            <CardContent className="p-4">
                                <h2 className="text-lg font-semibold text-foreground mb-4">
                                    {uiStrings.account.myAccount}
                                </h2>
                                <nav className="space-y-1">
                                    <AccountNavList items={navigationItems} isMobile={true} />
                                </nav>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Desktop Sidebar Navigation */}
                    <div className="hidden lg:block lg:col-span-1">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-foreground">{uiStrings.account.myAccount}</h2>
                            <nav className="space-y-1">
                                <AccountNavList items={navigationItems} />
                            </nav>
                        </div>
                    </div>

                    {/* Main Content - Child routes render here */}
                    <div className="lg:col-span-3">
                        <Outlet context={loaderData} />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Account page component created using the createPage HOC.
 * This provides Suspense handling and page key management for the account layout.
 */
const AccountPage = createPage<AccountPageData>({
    component: AccountLayoutView,
    getPageKey: (data) => data.pageKey,
    fallback: <AccountSkeleton />,
});

export default AccountPage;
