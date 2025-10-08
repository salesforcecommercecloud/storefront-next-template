import { type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { use, useMemo } from 'react';
import { getAuth as getAuthServer } from '@/middlewares/auth.server';
import {
    getServerCustomerProfileData,
    getServerShippingMethodsData,
    clientLoader as getClientLoaderData,
    type CheckoutPageData,
} from '@/lib/checkout-loaders';
import { createPage, type RouteComponentProps } from '@/components/create-page';
import CheckoutFormPage from '@/components/checkout-one-click/checkout-form-page';
import CheckoutOneClickProvider from '@/components/checkout-one-click/utils/checkout-context';
import { CheckoutErrorBoundary } from '@/components/checkout-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import Loading from '@/components/loading';

/**
 * Server-side loader function for checkout route
 *
 * This function runs on the server during SSR and prepares checkout data:
 * - Uses server middleware for authenticated data access
 * - Handles errors gracefully with fallback to empty data
 *
 * @returns Object containing checkout data promises
 */
// eslint-disable-next-line react-refresh/only-export-components
export function loader(args: LoaderFunctionArgs): CheckoutPageData {
    const { context } = args;

    try {
        const authSession = getAuthServer(context);
        const isRegistered = authSession?.userType === 'registered';

        // Fetch customer profile for registered users
        // TODO: Right now basket middleware is client-side only. Revisit this after the server side basket is available
        const customerProfilePromise = isRegistered
            ? getServerCustomerProfileData(context, authSession)
            : Promise.resolve(null);

        const shippingMethodsPromise = getServerShippingMethodsData(context, authSession);

        // Return promises for streaming
        return {
            customerProfile: customerProfilePromise,
            shippingMethods: shippingMethodsPromise,
            isRegisteredCustomer: isRegistered,
        };
    } catch {
        // Fallback to minimal data
        return {
            customerProfile: Promise.resolve(null),
            shippingMethods: Promise.resolve(null),
            isRegisteredCustomer: false,
        };
    }
}

/**
 * Client-side loader function for checkout route
 *
 * This function handles data loading for client-side navigation:
 * - Uses client middleware for basket and auth data
 * - Initializes basket for returning customers
 * - Handles errors gracefully with fallback to empty data
 * @returns Object containing checkout data promises
 */
// eslint-disable-next-line react-refresh/only-export-components
export function clientLoader(args: ClientLoaderFunctionArgs): CheckoutPageData {
    return getClientLoaderData(args);
}

/**
 * Skeleton loader for checkout sections
 * Uses the project's standardized Skeleton component for consistent styling
 */
function CheckoutSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header skeleton */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-96" />
            </div>

            {/* Progress indicator skeleton */}
            <div className="flex space-x-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <div key={`progress-item-${index}`} className="flex items-center space-x-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
            </div>

            {/* Form sections skeleton */}
            <div className="space-y-6">
                {Array.from({ length: 3 }, (_, index) => (
                    <div key={`form-section-item-${index}`} className="rounded-lg border p-6">
                        <Skeleton className="h-6 w-32 mb-4" />
                        <div className="space-y-3">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-2/3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Hydrate fallback component displayed during client-side hydration
 *
 * This component is shown when the checkout route gets called/rendered directly on the server
 * during the hydration process, providing a loading state while the client-side data loads.
 *
 * @returns JSX element representing the checkout loading state
 */
export function HydrateFallback() {
    return <Loading />;
}

/**
 * Checkout view component that handles parallel data loading with clean error boundaries.
 * Uses Promise.all for parallel loading - errors bubble up to ErrorBoundary for proper handling.
 */
function CheckoutView({ loaderData: { customerProfile, shippingMethods } }: RouteComponentProps<CheckoutPageData>) {
    // Stabilize promises to prevent "uncached promise" errors, with fallbacks for optional promises
    const stablePromises = useMemo(
        () => Promise.all([customerProfile ?? Promise.resolve(null), shippingMethods ?? Promise.resolve(null)]),
        [customerProfile, shippingMethods]
    );

    // Clean parallel loading - let errors bubble up to ErrorBoundary
    const [customerProfileData, shippingMethodsData] = use(stablePromises);

    return (
        <CheckoutOneClickProvider customerProfile={customerProfileData ?? undefined}>
            <CheckoutFormPage shippingMethods={shippingMethodsData ?? undefined} />
        </CheckoutOneClickProvider>
    );
}

/**
 * Checkout page component that displays the checkout form with customer profile, shipping methods, and basket data.
 * Uses createPage HOC for consistency with other pages and optimal streaming performance.
 * Wrapped with ErrorBoundary for graceful error handling.
 */
const CheckoutPageWithErrorBoundary = createPage({
    component: CheckoutView,
    fallback: <CheckoutSkeleton />,
});

function CheckoutPage(props: RouteComponentProps<CheckoutPageData>) {
    return (
        <CheckoutErrorBoundary>
            <CheckoutPageWithErrorBoundary {...props} />
        </CheckoutErrorBoundary>
    );
}

export default CheckoutPage;
