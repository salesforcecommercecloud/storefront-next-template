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
import { use } from 'react';
import type { ActionFunctionArgs } from 'react-router';
import { loader, type CheckoutPageData } from '@/lib/checkout-loaders';
import { createPage, type RouteComponentProps } from '@/components/create-page';
import CheckoutFormPage from '@/components/checkout/checkout-form-page';
import CheckoutProvider from '@/components/checkout/utils/checkout-context';
import { CheckoutErrorBoundary } from '@/components/checkout-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
// @sfdc-extension-line SFDC_EXT_BOPIS
import PickupProvider from '@/extensions/bopis/context/pickup-context';
import GoogleCloudApiProvider from '@/providers/google-cloud-api';
import { CHECKOUT_ACTION_INTENTS } from '@/components/checkout/utils/checkout-context-types';
import { action as submitContactInfo } from '@/lib/actions/action.submit-contact-info.server';
import { action as submitShippingAddress } from '@/lib/actions/action.submit-shipping-address.server';
import { action as submitShippingOptions } from '@/lib/actions/action.submit-shipping-options.server';
import { action as submitPayment } from '@/lib/actions/action.submit-payment.server';

// Re-export the comprehensive loader from checkout-loaders
// It handles: basket loading, product map, promotions, customer profile prefill, shipping methods
// eslint-disable-next-line react-refresh/only-export-components
export { loader };

/**
 * Unified action handler for all checkout form submissions.
 * Routes to the appropriate server action based on the 'intent' field.
 */
// eslint-disable-next-line react-refresh/only-export-components
export async function action({ request, context }: ActionFunctionArgs) {
    const formData = await request.formData();
    const intent = formData.get('intent')?.toString();

    switch (intent) {
        case CHECKOUT_ACTION_INTENTS.CONTACT_INFO:
            return submitContactInfo(formData, context);
        case CHECKOUT_ACTION_INTENTS.SHIPPING_ADDRESS:
            return submitShippingAddress(formData, context);
        case CHECKOUT_ACTION_INTENTS.SHIPPING_OPTIONS:
            return submitShippingOptions(formData, context);
        case CHECKOUT_ACTION_INTENTS.PAYMENT:
            return submitPayment(formData, context);
        default:
            return Response.json({ success: false, error: 'Invalid action intent' }, { status: 400 });
    }
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
 * Checkout view component that handles parallel data loading with clean error boundaries.
 *
 * Streaming strategy:
 * - customerProfile & shippingMethodsMap: Resolved here (needed for form setup)
 * - productMap: Passed as Promise to allow MyCart to stream independently
 */
function CheckoutView({
    loaderData: {
        customerProfile,
        shippingMethodsMap,
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
    const shippingMethodsMapData = shippingMethodsMap ? use(shippingMethodsMap) : {};

    const content = (
        <CheckoutProvider
            customerProfile={customerProfileData ?? undefined}
            shippingDefaultSet={shippingDefaultSet ?? Promise.resolve(undefined)}>
            <CheckoutFormPage
                shippingMethodsMap={shippingMethodsMapData}
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
