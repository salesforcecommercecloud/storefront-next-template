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
import { type ReactElement, Suspense, useEffect } from 'react';
import AddressDisplay from '@/components/address-display';
import { Await, Link, type LoaderFunctionArgs } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Typography } from '@/components/typography';
import ProductImage from '@/components/product-image/product-image';
import { createApiClients } from '@/lib/api-clients';
import { formatCurrency, currencyContext } from '@/lib/currency';
import { useCurrency } from '@/providers/currency';
import { useBasketReset } from '@/providers/basket';
import type {
    ShopperOrders,
    ShopperProducts,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    ShopperStores,
} from '@salesforce/storefront-next-runtime/scapi';
import { getCardTypeDisplay } from '@/lib/payment-utils';
import { getDisplayVariationValues } from '@/lib/product-utils';
import OrderSkeleton from '@/components/order-skeleton';
import { useTranslation } from 'react-i18next';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { fetchStoresForOrder } from '@/extensions/bopis/lib/api/stores';
import { getOrderDeliveryShipments, getOrderPickupShipment } from '@/extensions/bopis/lib/order-utils';
import { getPickupStoreFromMap } from '@/extensions/bopis/lib/store-utils';
import StoreDetails from '@/extensions/store-locator/components/store-locator/details';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

type ProductDataById = Record<string, ShopperProducts.schemas['Product'] | undefined>;

type OrderConfirmationData = {
    order: ShopperOrders.schemas['Order'];
    productsById: ProductDataById;
    // @sfdc-extension-line SFDC_EXT_BOPIS
    storesByStoreId: Map<string, ShopperStores.schemas['Store']>;
};

type CheckoutConfirmationLoaderData = {
    orderData: Promise<OrderConfirmationData>;
};

type ImageSource = {
    disBaseLink?: string;
    link?: string;
};

const resolveImageUrl = (source?: ImageSource) => source?.disBaseLink || source?.link;

const getPrimaryImageFromProduct = (product: ShopperProducts.schemas['Product'] | undefined) => {
    const directImage = resolveImageUrl(product?.image as ImageSource);
    if (directImage) {
        return directImage;
    }

    const imageGroups = product?.imageGroups ?? [];
    for (const group of imageGroups) {
        const groupImage = resolveImageUrl(group.images?.[0] as ImageSource);
        if (groupImage) {
            return groupImage;
        }
    }

    const additionalImages = (product?.images as ImageSource[]) ?? [];
    for (const image of additionalImages) {
        const url = resolveImageUrl(image);
        if (url) {
            return url;
        }
    }

    return undefined;
};

/**
 * Server-side loader function that fetches order data for the confirmation page.
 * This function runs on the server during SSR and prepares data for the order confirmation page.
 * @param args - Loader function arguments containing context and parameters
 * @returns Promise that resolves to an object containing the order data promise
 */
// eslint-disable-next-line react-refresh/only-export-components
export function loader({ context, params }: LoaderFunctionArgs): CheckoutConfirmationLoaderData {
    const { orderNo } = params;
    const clients = createApiClients(context);
    const currency = context.get(currencyContext) as string;

    const orderPromise = clients.shopperOrders
        .getOrder({
            params: {
                path: {
                    orderNo: orderNo as string,
                },
            },
        })
        .then(({ data }) => data);

    // @sfdc-extension-line SFDC_EXT_BOPIS
    const storesByStoreIdPromise = orderPromise.then((order) => fetchStoresForOrder(context, order));

    const productsByIdPromise: Promise<ProductDataById> = orderPromise.then(async (order) => {
        const productIds = Array.from(
            // prevents duplicate product IDs
            new Set(
                (order.productItems ?? [])
                    .map((item) => item.productId)
                    .filter((id): id is string => typeof id === 'string' && id.length > 0)
            )
        );

        if (!productIds.length) {
            return {};
        }

        try {
            const { data } = await clients.shopperProducts.getProducts({
                params: {
                    query: {
                        ids: productIds,
                        expand: ['images', 'variations'],
                        currency,
                    },
                },
            });

            const productsById: ProductDataById = {};
            (data?.data ?? []).forEach((product) => {
                productsById[product.id] = product;
            });
            return productsById;
        } catch {
            // Return empty object on error - allows the page to render without product details
            return {};
        }
    });

    // Combine all promises into a single promise that resolves to an object
    const combinedPromise = Promise.all([
        orderPromise,
        productsByIdPromise,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        storesByStoreIdPromise,
    ]).then(
        ([
            order,
            productsById,
            // @sfdc-extension-line SFDC_EXT_BOPIS
            storesByStoreId,
        ]) => ({
            order,
            productsById,
            // @sfdc-extension-line SFDC_EXT_BOPIS
            storesByStoreId,
        })
    );

    return {
        orderData: combinedPromise,
    };
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
 * Order confirmation content component that displays the order details and confirmation information.
 * This component receives resolved order data and renders the complete order confirmation page including
 * success header, order summary, shipping details, payment details, and action buttons.
 * @param order - The resolved order data
 * @param productsById - The resolved products data indexed by product ID
 * @param storesByStoreId - The resolved stores data for BOPIS
 * @returns JSX element representing the order confirmation page layout
 */
function OrderConfirmationContent({
    order,
    productsById,
    // @sfdc-extension-line SFDC_EXT_BOPIS
    storesByStoreId,
}: OrderConfirmationData): ReactElement {
    const { t, i18n } = useTranslation('checkout');
    const currency = useCurrency();
    const resetBasket = useBasketReset();
    let deliveryShipments = order.shipments;

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    // note: this BOPIS implementation assumes at mose 1 pickup store is used for the order
    const { t: tBopis } = useTranslation('extBopis');
    deliveryShipments = getOrderDeliveryShipments(order);
    const store = getPickupStoreFromMap(
        getOrderPickupShipment(order)?.c_fromStoreId as string | undefined,
        storesByStoreId
    );
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    const customerName =
        order.customerInfo?.firstName || order.billingAddress?.firstName || t('confirmation.hero.defaultName');
    const customerEmail = order.customerInfo?.email || t('confirmation.hero.emailFallback');

    // NOTE/TODO: Integrators should replace placeholder URLs with actual FAQ, contact, and return policy links once available.
    const helpActions = [
        { label: t('confirmation.helpLinks.faq'), href: '#' },
        { label: t('confirmation.helpLinks.contact'), href: '#' },
        { label: t('confirmation.helpLinks.returns'), href: '#' },
    ];

    const productItems = order.productItems ?? [];
    const promotionsTotal = (order.orderPriceAdjustments ?? []).reduce(
        (sum, adjustment) => sum + (adjustment.price ?? 0),
        0
    );
    const totals = {
        subtotal: order.productTotal ?? order.productSubTotal ?? 0,
        promotions: promotionsTotal,
        shipping: order.shippingTotal ?? 0,
        tax: order.taxTotal ?? 0,
        total: order.orderTotal ?? 0,
    };

    const paymentInstrument = order.paymentInstruments?.[0];
    const paymentMethodDisplay = paymentInstrument
        ? getCardTypeDisplay(paymentInstrument, t('confirmation.fields.defaultPaymentMethod'))
        : t('confirmation.fields.defaultPaymentMethod');
    const paymentSummary = paymentInstrument
        ? t('confirmation.payment.methodSummary', {
              method: paymentMethodDisplay,
              lastDigits: paymentInstrument.paymentCard?.numberLastDigits ?? '',
          })
        : paymentMethodDisplay;

    const summaryRows = [
        { key: 'subtotal', label: t('confirmation.totals.subtotal'), value: totals.subtotal },
        { key: 'promotions', label: t('confirmation.totals.promotions'), value: totals.promotions },
        { key: 'shipping', label: t('confirmation.totals.shipping'), value: totals.shipping },
        { key: 'tax', label: t('confirmation.totals.tax'), value: totals.tax },
        { key: 'total', label: t('confirmation.totals.total'), value: totals.total, bold: true },
    ];

    // Clear the basket context after an order is confirmed.
    useEffect(() => {
        resetBasket();
    }, [resetBasket]);

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
                {/* Thank You and Order Confirmation section */}
                <Card className="border border-border/70 shadow-sm">
                    <CardContent className="p-8 space-y-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                                <Typography variant="h2" as="h1" className="text-foreground">
                                    {t('confirmation.hero.thankYou', { name: customerName })}
                                </Typography>
                                <Typography variant="p" className="text-muted-foreground">
                                    {t('confirmation.hero.orderConfirmed')}
                                </Typography>
                                <Typography variant="p" className="text-foreground font-medium">
                                    {t('confirmation.hero.emailConfirmation', { email: customerEmail })}
                                </Typography>
                            </div>
                            <div className="text-left md:text-right space-y-1">
                                <p className="text-lg font-semibold text-foreground">
                                    {t('confirmation.orderNumber')}
                                    <span className="text-primary"> {order.orderNo}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <Typography variant="p" className="text-foreground font-medium">
                                {t('confirmation.hero.needHelp')}
                            </Typography>
                            <div className="flex flex-wrap gap-3">
                                {helpActions.map(({ label, href }) =>
                                    href ? (
                                        <Button key={label} variant="outline" size="sm" asChild>
                                            <Link to={href}>{label}</Link>
                                        </Button>
                                    ) : (
                                        <Button key={label} variant="outline" size="sm">
                                            {label}
                                        </Button>
                                    )
                                )}
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

                {/* Shipping Details section - supports multiple shipments if present */}
                {deliveryShipments.map((shipment) => {
                    const shippingAddress = shipment.shippingAddress;
                    const shippingMethodName =
                        shipment.shippingMethod?.name || t('confirmation.fields.defaultShippingMethod');
                    const estimatedDeliveryTime =
                        shipment.shippingMethod?.description ||
                        t('confirmation.summaryLabels.estimatedDatePlaceholder');
                    return (
                        <Card key={shipment.shipmentId} className="border border-border/70 shadow-sm">
                            <CardContent className="grid gap-6 p-6 md:grid-cols-3">
                                <div>
                                    <p className="text-md font-semibold tracking-wide text-foreground">
                                        {t('confirmation.summaryLabels.arriving')}
                                    </p>
                                    <p className="mt-3 text-sm font-medium text-muted-foreground">
                                        {estimatedDeliveryTime}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-md font-semibold tracking-wide text-foreground">
                                        {t('confirmation.summaryLabels.shippingAddress')}
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {shippingAddress ? (
                                            <AddressDisplay address={shippingAddress} />
                                        ) : (
                                            <p className="text-sm font-medium text-muted-foreground">
                                                {t('confirmation.summaryLabels.noAddress')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-md font-semibold tracking-wide text-foreground">
                                        {t('confirmation.summaryLabels.shippingMethod')}
                                    </p>
                                    <p className="mt-3 text-sm font-medium text-muted-foreground">
                                        {shippingMethodName}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {/* Product Items Summary section */}
                <Card className="border border-border/70 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-xl font-medium">{t('confirmation.summaryTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            {productItems.length === 0 ? (
                                <Typography variant="p" className="text-muted-foreground">
                                    {t('confirmation.emptyItemsFallback')}
                                </Typography>
                            ) : (
                                productItems.map((item, index) => {
                                    const finalPrice =
                                        item.priceAfterOrderDiscount ??
                                        item.priceAfterItemDiscount ??
                                        item.price ??
                                        item.basePrice ??
                                        0;
                                    const originalPrice =
                                        item.basePrice && item.basePrice > finalPrice ? item.basePrice : undefined;

                                    const productData = item.productId ? productsById[item.productId] : undefined;
                                    const productKey = item.itemId ?? `${item.productId}-${index}`;
                                    const productName = item.productName ?? t('confirmation.productPlaceholderInitial');

                                    const imageSrc = getPrimaryImageFromProduct(productData);
                                    const variationValues =
                                        productData && productData.variationAttributes
                                            ? Object.entries(
                                                  getDisplayVariationValues(
                                                      productData.variationAttributes,
                                                      (productData.variationValues ?? {}) as Record<string, string>
                                                  )
                                              )
                                            : [];
                                    return (
                                        <div
                                            key={productKey}
                                            className="rounded-2xl border border-border/70 bg-card shadow-sm p-4 sm:p-7 flex flex-col gap-4 sm:flex-row sm:items-center">
                                            <div className="flex items-center justify-center">
                                                <div className="h-24 w-24 rounded-xl bg-muted overflow-hidden flex items-center justify-center text-muted-foreground text-lg font-semibold">
                                                    {imageSrc ? (
                                                        <ProductImage
                                                            src={imageSrc}
                                                            alt={productName}
                                                            className="h-full w-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        (productName?.[0] ??
                                                        t('confirmation.productPlaceholderInitial'))
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="font-semibold text-foreground leading-tight">
                                                    {productName}
                                                </p>
                                                {variationValues.length > 0 &&
                                                    variationValues.map(([label, value]) => (
                                                        <p
                                                            key={`${productKey}-${label}`}
                                                            className="text-sm text-muted-foreground">
                                                            {label}: {value}
                                                        </p>
                                                    ))}
                                                <p className="text-sm text-muted-foreground">
                                                    {t('confirmation.summaryLabels.quantity', {
                                                        count: item.quantity ?? 1,
                                                    })}
                                                </p>
                                            </div>
                                            <div className="text-right space-y-1 sm:self-start">
                                                {originalPrice && (
                                                    <p className="text-sm text-muted-foreground line-through">
                                                        {formatCurrency(originalPrice, i18n.language, currency)}
                                                    </p>
                                                )}
                                                <p className="text-lg font-semibold text-foreground">
                                                    {formatCurrency(finalPrice, i18n.language, currency)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="space-y-2 border-t pt-4">
                            {summaryRows.map((row) => {
                                const isPromotion = row.key === 'promotions' && row.value !== 0;
                                return (
                                    <div key={row.key} className="flex items-center justify-between text-sm">
                                        <span
                                            className={
                                                row.bold ? 'font-semibold text-foreground' : 'text-muted-foreground'
                                            }>
                                            {row.label}
                                        </span>
                                        <span
                                            className={
                                                row.bold
                                                    ? 'font-semibold text-foreground'
                                                    : isPromotion
                                                      ? 'text-sm text-green-600 font-semibold'
                                                      : 'text-foreground'
                                            }>
                                            {row.key === 'shipping' && row.value === 0
                                                ? t('confirmation.summaryLabels.freeShipping')
                                                : formatCurrency(row.value, i18n.language, currency)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Credit Card Details section */}
                <Card className="border border-border/70 shadow-sm">
                    <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                                {paymentInstrument?.paymentCard?.cardType ||
                                    paymentInstrument?.paymentMethodId ||
                                    t('payment.defaultCardLabel')}
                            </span>
                            <div>
                                <p className="font-medium text-foreground">{paymentSummary}</p>
                            </div>
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                            {formatCurrency(totals.total, i18n.language, currency)}
                        </p>
                    </CardContent>
                </Card>

                {/* Newsletter subscription section */}
                <Card className="border border-border/70 shadow-sm">
                    <CardContent className="space-y-4 p-6">
                        <div>
                            <p className="font-medium text-foreground">{t('confirmation.newsletter.title')}</p>
                            <p className="text-sm text-muted-foreground">{t('confirmation.newsletter.subtitle')}</p>
                        </div>
                        {/* NOTE/TODO: This is a static placeholder form. Integrators should handle submit events here
                           (e.g., call their marketing/newsletter API or hook into an existing newsletter service). */}
                        <form className="flex flex-col gap-3 sm:flex-row">
                            <Input
                                type="email"
                                placeholder={t('confirmation.newsletter.placeholder')}
                                className="h-12 flex-1"
                            />
                            <Button type="button" className="h-12 sm:w-auto">
                                {t('confirmation.newsletter.cta')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="flex flex-col justify-center gap-4 pt-2 sm:flex-row">
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

/**
 * Order confirmation page component that wraps the content with Suspense and Await.
 * This component follows the React Router v7 pattern for handling deferred data with Suspense.
 * @param loaderData - The loader data containing the combined order data promise
 * @returns JSX element representing the order confirmation page with Suspense boundary
 */
export default function OrderConfirmationPage({
    loaderData,
}: {
    loaderData: CheckoutConfirmationLoaderData;
}): ReactElement {
    return (
        <Suspense fallback={<OrderSkeleton />}>
            <Await resolve={loaderData.orderData}>{(data) => <OrderConfirmationContent {...data} />}</Await>
        </Suspense>
    );
}
