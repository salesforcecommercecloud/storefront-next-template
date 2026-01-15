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
import { type ClientLoaderFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { use } from 'react';
import { getAuth as getAuthServer } from '@/middlewares/auth.server';
import {
    getServerCustomerProfileData,
    getServerShippingMethodsData,
    clientLoader as getClientLoaderData,
    type CheckoutPageData,
} from '@/lib/checkout-loaders';
import { createPage, type RouteComponentProps } from '@/components/create-page';
import CheckoutFormPage from '@/components/checkout/checkout-form-page';
import CheckoutProvider from '@/components/checkout/utils/checkout-context';
import { CheckoutErrorBoundary } from '@/components/checkout-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import Loading from '@/components/loading';
// @sfdc-extension-line SFDC_EXT_BOPIS
import PickupProvider from '@/extensions/bopis/context/pickup-context';
import GoogleCloudApiProvider from '@/providers/google-cloud-api';

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

        return {
            customerProfile: customerProfilePromise,
            shippingMethods: shippingMethodsPromise,
            productMap: Promise.resolve({}),
            promotions: Promise.resolve({}),
            isRegisteredCustomer: isRegistered,
        };
    } catch {
        // Fallback to minimal data
        return {
            customerProfile: Promise.resolve(null),
            shippingMethods: Promise.resolve(null),
            productMap: Promise.resolve({}),
            promotions: Promise.resolve({}),
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
// eslint-disable-next-line react-refresh/only-export-components,custom/no-client-loaders
export function clientLoader(args: ClientLoaderFunctionArgs): CheckoutPageData {
    return getClientLoaderData(args);
}

/**
 * Force client loader to run on every page load. Basket + shipping data live only
 * in client middleware (localStorage), so SSR can’t hydrate them. Without hydrate=true
 * we reuse empty server data, leading to stale prices/NaN totals and missing shipping
 * methods on hard page refresh. The small perf cost ensures checkout always has fresh basket state.
 */
clientLoader.hydrate = true as const;

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
 *
 * Streaming strategy:
 * - customerProfile & shippingMethods: Resolved here (needed for form setup)
 * - productMap: Passed as Promise to allow MyCart to stream independently
 */
function CheckoutView({
    loaderData: {
        customerProfile,
        shippingMethods,
        productMap,
        promotions,
        shippingDefaultSet,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        storesByStoreId,
    },
}: RouteComponentProps<CheckoutPageData>) {
    // Handle each promise individually, only calling use() if the promise exists
    // React automatically parallelizes multiple use() calls in the same component
    const customerProfileData = customerProfile ? use(customerProfile) : null;
    const shippingMethodsData = shippingMethods ? use(shippingMethods) : null;

    const content = (
        <CheckoutProvider
            customerProfile={customerProfileData ?? undefined}
            shippingDefaultSet={shippingDefaultSet ?? Promise.resolve(undefined)}>
            <CheckoutFormPage
                shippingMethods={shippingMethodsData ?? undefined}
                productMapPromise={productMap}
                promotionsPromise={promotions}
            />
        </CheckoutProvider>
    );

    let finalContent = content;
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    /// Initialize PickupProvider with stores by store id
    finalContent = <PickupProvider initialPickupStores={storesByStoreId}>{content}</PickupProvider>;
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    // Wrap with GoogleCloudApiProvider for access to Google Cloud Platform APIs
    finalContent = <GoogleCloudApiProvider>{finalContent}</GoogleCloudApiProvider>;

    return finalContent;
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
