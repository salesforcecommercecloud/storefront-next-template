import { type ReactElement, use } from 'react';
import { type ClientLoaderFunctionArgs, Link, type LoaderFunctionArgs } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/typography';
import { createApiClients } from '@/lib/api-clients';
import createPage, { type RouteComponentProps } from '@/components/create-page';
import type {
    ShopperOrders,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    ShopperStores,
} from '@salesforce/storefront-next-runtime/scapi';
import AddressDisplay from '@/components/address-display';
import { getConfig } from '@/config';
import { getCardTypeDisplay, getFormattedMaskedCardNumber } from '@/lib/payment-utils';
import OrderSkeleton from '@/components/order-skeleton';
import { useTranslation } from 'react-i18next';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { fetchStoresForOrder } from '@/extensions/bopis/lib/api/stores';
import { getOrderPickupShipment } from '@/extensions/bopis/lib/order-utils';
import { getPickupStoreFromMap } from '@/extensions/bopis/lib/store-utils';
import StoreDetails from '@/extensions/store-locator/components/store-locator/details';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

type CheckoutConfirmationLoaderData = {
    order: Promise<ShopperOrders.schemas['Order']>;
    // @sfdc-extension-line SFDC_EXT_BOPIS
    storesByStoreId: Promise<Map<string, ShopperStores.schemas['Store']>>;
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

    // @sfdc-extension-line SFDC_EXT_BOPIS
    const storesByStoreIdPromise = orderPromise.then((order) => fetchStoresForOrder(context, order));

    return {
        order: orderPromise,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        storesByStoreId: storesByStoreIdPromise,
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
    const { t } = useTranslation('checkout');
    // NOTE: We are making the decision to use custom error messages. If you want to use the default messages
    // from the API, you can use the `useRouteError` hook to get the error message.
    const errorMessage: string = t('confirmation.orderNotFoundDescription');

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-center">{t('confirmation.orderNotFound')}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <Typography variant="p" className="text-muted-foreground">
                            {errorMessage}
                        </Typography>
                        <Button asChild>
                            <Link to="/">{t('confirmation.actions.continueShopping')}</Link>
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
    loaderData: {
        order: orderPromise,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        storesByStoreId: storesByStoreIdPromise,
    },
}: RouteComponentProps<CheckoutConfirmationLoaderData>): ReactElement {
    const order = use(orderPromise);
    const { t } = useTranslation('checkout');
    // @sfdc-extension-line SFDC_EXT_BOPIS
    const { t: tBopis } = useTranslation('extBopis');

    let showShippingDetails = true;
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const storesByStoreId = use(storesByStoreIdPromise);
    const store = getPickupStoreFromMap(
        getOrderPickupShipment(order)?.c_fromStoreId as string | undefined,
        storesByStoreId
    );
    if (store) {
        showShippingDetails = false;
    }
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

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
                        {t('confirmation.title')}
                    </Typography>

                    <Typography variant="p" className="text-muted-foreground">
                        {t('confirmation.fields.orderNumber')}{' '}
                        <span className="font-mono font-medium">{order.orderNo}</span>
                    </Typography>

                    <Typography variant="p" className="text-muted-foreground mt-2">
                        {t('confirmation.confirmationEmailSent', {
                            email: order.customerInfo?.email || '',
                        })}
                    </Typography>
                </div>

                {/* Order Summary */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>{t('confirmation.sections.orderSummary')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>{t('confirmation.fields.orderNumber')}</span>
                                <span className="font-mono">{order.orderNo}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>{t('confirmation.fields.status')}</span>
                                <span>{order.status}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>{t('confirmation.fields.total')}</span>
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

                {/* @sfdc-extension-block-start SFDC_EXT_BOPIS */}
                {/* Pickup Details */}
                {store && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>{tBopis('storePickup.title')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <StoreDetails
                                store={store}
                                showDistance={true}
                                showEmail={true}
                                showStoreHours={true}
                                showPhone={true}
                                mobileLayout={true} // Always show vertical layout
                                compactAddress={true} // Use compact address format with store name inline
                            />
                        </CardContent>
                    </Card>
                )}
                {/* @sfdc-extension-block-end SFDC_EXT_BOPIS */}

                {/* Shipping Details */}
                {showShippingDetails && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle>{t('confirmation.sections.shippingDetails')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <Typography variant="h5" as="h3" className="mb-2">
                                        {t('confirmation.fields.shippingAddress')}
                                    </Typography>
                                    {order.shipments?.[0]?.shippingAddress && (
                                        <AddressDisplay address={order.shipments[0].shippingAddress} />
                                    )}
                                </div>
                                <div>
                                    <Typography variant="h5" as="h3" className="mb-2">
                                        {t('confirmation.fields.shippingMethod')}
                                    </Typography>
                                    <Typography variant="p" className="text-muted-foreground">
                                        {order.shipments?.[0]?.shippingMethod?.name ||
                                            t('confirmation.fields.defaultShippingMethod')}
                                    </Typography>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Payment Details */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>{t('confirmation.sections.paymentDetails')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <Typography variant="h5" as="h3" className="mb-2">
                                    {t('confirmation.fields.billingAddress')}
                                </Typography>
                                {order.billingAddress && <AddressDisplay address={order.billingAddress} />}
                            </div>
                            <div>
                                <Typography variant="h5" as="h3" className="mb-2">
                                    {t('confirmation.fields.paymentMethod')}
                                </Typography>
                                {order.paymentInstruments?.[0] && (
                                    <div>
                                        <Typography variant="p" className="text-muted-foreground">
                                            {getCardTypeDisplay(
                                                order.paymentInstruments[0],
                                                t('confirmation.fields.defaultPaymentMethod')
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
                        <Link to="/">{t('confirmation.actions.continueShopping')}</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link to="/account">{t('confirmation.actions.viewAccount')}</Link>
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
