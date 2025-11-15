import { type ReactElement, use } from 'react';
import { type ClientLoaderFunctionArgs, Link, type LoaderFunctionArgs } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/typography';
import { createApiClients } from '@/lib/api-clients';
import createPage, { type RouteComponentProps } from '@/components/create-page';
import type { ShopperOrders } from '@salesforce/storefront-next-runtime/scapi';
import AddressDisplay from '@/components/address-display';
import { getConfig } from '@/config';
import { getCardTypeDisplay, getFormattedMaskedCardNumber } from '@/lib/payment-utils';
import uiStrings from '@/temp-ui-string';
import OrderSkeleton from '@/components/order-skeleton';

type CheckoutConfirmationLoaderData = {
    order: Promise<ShopperOrders.schemas['Order']>;
};

/**
 * Internal helper function that fetches order data for the confirmation page.
 * This function handles the actual data fetching logic shared between server and client loaders.
 * @param context - The request context containing authentication and configuration
 * @param params - Route parameters containing the order number
 * @returns Promise that resolves to an object containing the order data promise
 */
function getPageData({ context, params }: LoaderFunctionArgs): CheckoutConfirmationLoaderData {
    const { orderNo } = params;
    const config = getConfig(context);
    const clients = createApiClients(context);

    const orderPromise = clients.shopperOrders
        .getOrder({
            params: {
                path: {
                    organizationId: config.commerce.api.organizationId,
                    orderNo: orderNo as string,
                },
                query: {
                    siteId: config.commerce.api.siteId,
                },
            },
        })
        .then(({ data }) => data);

    return {
        order: orderPromise,
    };
}

/**
 * Server-side loader function that fetches order data for the confirmation page.
 * This function runs on the server during SSR and prepares data for the order confirmation page.
 * @param args - Loader function arguments containing context and parameters
 * @returns Promise that resolves to an object containing the order data promise
 */
// eslint-disable-next-line react-refresh/only-export-components
export function loader(args: LoaderFunctionArgs) {
    return getPageData(args);
}

/**
 * Client-side loader function that handles data loading for client-side navigation.
 * This function ensures React Router doesn't block navigation by returning promises
 * directly instead of wrapped in a data object.
 * @param args - Client loader function arguments containing context and parameters
 * @returns Promise that resolves to an object containing the order data promise
 */
// eslint-disable-next-line react-refresh/only-export-components
export function clientLoader(args: ClientLoaderFunctionArgs) {
    return getPageData(args);
}

/**
 * Hydrate fallback component displayed during client-side hydration.
 * This component is shown while the order data is being loaded and hydrated on the client.
 * @returns JSX element representing the order skeleton loading state
 */
export function HydrateFallback() {
    return <OrderSkeleton />;
}

/**
 * Error boundary component for handling order not found and other errors.
 * This component catches errors thrown in the loader and displays an appropriate error message
 * to the user with options to continue shopping or view their account.
 * @returns JSX element representing the error state with user-friendly messaging
 */
export function ErrorBoundary() {
    // NOTE: We are making the decision to use custom error messages. If you want to use the default messages
    // from the API, you can use the `useRouteError` hook to get the error message.
    const errorMessage: string = uiStrings.checkout.confirmation.orderNotFoundDescription;

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-center">{uiStrings.checkout.confirmation.orderNotFound}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <Typography variant="p" className="text-muted-foreground">
                            {errorMessage}
                        </Typography>
                        <Button asChild>
                            <Link to="/">{uiStrings.checkout.confirmation.actions.continueShopping}</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

/**
 * Order confirmation component that displays the order details and confirmation information.
 * This component receives loader data and renders the complete order confirmation page including
 * success header, order summary, shipping details, payment details, and action buttons.
 * @param loaderData - The loader data containing the order promise
 * @returns JSX element representing the order confirmation page layout
 */
function CheckoutConfirmation({
    loaderData: { order: orderPromise },
}: RouteComponentProps<CheckoutConfirmationLoaderData>): ReactElement {
    const order = use(orderPromise);

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Success Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <Typography variant="h1" as="h1" className="mb-4 text-accent">
                        {uiStrings.checkout.confirmation.title}
                    </Typography>

                    <Typography variant="p" className="text-muted-foreground">
                        {uiStrings.checkout.confirmation.fields.orderNumber}{' '}
                        <span className="font-mono font-medium">{order.orderNo}</span>
                    </Typography>

                    <Typography variant="p" className="text-muted-foreground mt-2">
                        {uiStrings.checkout.confirmation.confirmationEmailSent.replace(
                            '{email}',
                            order.customerInfo?.email || ''
                        )}
                    </Typography>
                </div>

                {/* Order Summary */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>{uiStrings.checkout.confirmation.sections.orderSummary}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>{uiStrings.checkout.confirmation.fields.orderNumber}</span>
                                <span className="font-mono">{order.orderNo}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>{uiStrings.checkout.confirmation.fields.status}</span>
                                <span>{order.status}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>{uiStrings.checkout.confirmation.fields.total}</span>
                                <span className="font-medium">
                                    {new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: order.currency || 'USD',
                                    }).format(order.orderTotal || 0)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Shipping Details */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>{uiStrings.checkout.confirmation.sections.shippingDetails}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <Typography variant="h5" as="h3" className="mb-2">
                                    {uiStrings.checkout.confirmation.fields.shippingAddress}
                                </Typography>
                                {order.shipments?.[0]?.shippingAddress && (
                                    <AddressDisplay address={order.shipments[0].shippingAddress} />
                                )}
                            </div>
                            <div>
                                <Typography variant="h5" as="h3" className="mb-2">
                                    {uiStrings.checkout.confirmation.fields.shippingMethod}
                                </Typography>
                                <Typography variant="p" className="text-muted-foreground">
                                    {order.shipments?.[0]?.shippingMethod?.name ||
                                        uiStrings.checkout.confirmation.fields.defaultShippingMethod}
                                </Typography>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Details */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>{uiStrings.checkout.confirmation.sections.paymentDetails}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <Typography variant="h5" as="h3" className="mb-2">
                                    {uiStrings.checkout.confirmation.fields.billingAddress}
                                </Typography>
                                {order.billingAddress && <AddressDisplay address={order.billingAddress} />}
                            </div>
                            <div>
                                <Typography variant="h5" as="h3" className="mb-2">
                                    {uiStrings.checkout.confirmation.fields.paymentMethod}
                                </Typography>
                                {order.paymentInstruments?.[0] && (
                                    <div>
                                        <Typography variant="p" className="text-muted-foreground">
                                            {getCardTypeDisplay(
                                                order.paymentInstruments[0],
                                                uiStrings.checkout.confirmation.fields.defaultPaymentMethod
                                            )}
                                        </Typography>
                                        <Typography variant="p" className="text-muted-foreground">
                                            {getFormattedMaskedCardNumber(order.paymentInstruments[0])}
                                        </Typography>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild size="lg">
                        <Link to="/">{uiStrings.checkout.confirmation.actions.continueShopping}</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link to="/account">{uiStrings.checkout.confirmation.actions.viewAccount}</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

const OrderConfirmationPage = createPage({
    component: CheckoutConfirmation,
    fallback: <OrderSkeleton />,
});

export default OrderConfirmationPage;
