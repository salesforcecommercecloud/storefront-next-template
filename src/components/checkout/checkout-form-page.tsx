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
'use client';

import { useEffect, lazy, Suspense, use, useRef, useState } from 'react';
import { useCheckoutContext } from '@/hooks/use-checkout';
import { useBasket } from '@/providers/basket';
import { useCheckoutActions } from '@/hooks/use-checkout-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Typography } from '@/components/typography';
import { useCustomerProfile } from '@/hooks/checkout/use-customer-profile';
import type { ShopperBasketsV2, ShopperProducts, ShopperPromotions } from '@salesforce/storefront-next-runtime/scapi';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from '@/hooks/use-analytics';
import { PluginComponent } from '@/plugins/plugin-component';
import CheckoutErrorBanner from './components/checkout-error-banner';
import { CHECKOUT_STEPS, type CheckoutStep } from './utils/checkout-context-types';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import { handlePickupContinueAction } from './utils/checkout-utils';
import { filterDeliveryShippingMethods } from '@/extensions/bopis/lib/basket-utils';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

// Lazy load heavy components
const ContactInfo = lazy(() => import('./components/contact-info'));
// @sfdc-extension-line SFDC_EXT_BOPIS
const CheckoutPickupWithData = lazy(() => import('@/extensions/bopis/components/checkout/checkout-pickup-with-data'));
// @sfdc-extension-block-start SFDC_EXT_MULTISHIP
const ShippingMultiAddressWithData = lazy(
    () => import('@/extensions/multiship/components/checkout/shipping-multi-address-with-data')
);
const ShippingMultiOptions = lazy(() => import('@/extensions/multiship/components/checkout/shipping-multi-options'));
// @sfdc-extension-block-end SFDC_EXT_MULTISHIP
const ShippingAddress = lazy(() => import('./components/shipping-address'));
const ShippingOptions = lazy(() => import('./components/shipping-options'));
const Payment = lazy(() => import('./components/payment'));
const RegisterCustomerSelection = lazy(() => import('./components/register-customer-selection'));
const OrderSummary = lazy(() => import('@/components/order-summary'));
const MyCart = lazy(() => import('@/components/my-cart'));
const ExpressPayments = lazy(() => import('./components/express-payments'));

interface GuestAccountCreationProps {
    cart: ShopperBasketsV2.schemas['Basket'];
    customerProfile: ReturnType<typeof useCustomerProfile>;
    onSaved: (shouldCreate: boolean) => void;
}

function GuestAccountCreation({ cart, customerProfile, onSaved }: GuestAccountCreationProps) {
    const isRegisteredUser = Boolean(customerProfile?.customer?.customerId);

    if (isRegisteredUser) {
        return null;
    }

    const customerLookupResultStr =
        typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('customerLookupResult') : null;

    let customerLookupResult = null;
    try {
        customerLookupResult = customerLookupResultStr ? JSON.parse(customerLookupResultStr) : null;
    } catch {
        // Failed to parse customer lookup result
    }

    const shouldShow =
        customerLookupResult?.recommendation === 'guest' || (!cart?.customerInfo?.customerId && !customerLookupResult);

    if (!shouldShow) {
        return null;
    }

    return <RegisterCustomerSelection onSaved={onSaved} />;
}

interface CheckoutFormPageProps {
    shippingMethodsMap: Record<string, ShopperBasketsV2.schemas['ShippingMethodResult']>;
    productMapPromise: Promise<Record<string, ShopperProducts.schemas['Product']>>;
    promotionsPromise?: Promise<Record<string, ShopperPromotions.schemas['Promotion']>>;
}

/**
 * Wrapper component that resolves productMap and promotions Promises within Suspense boundary.
 */
function MyCartWithData({
    basket,
    productMapPromise,
    promotionsPromise,
}: {
    basket: ShopperBasketsV2.schemas['Basket'];
    productMapPromise: Promise<Record<string, ShopperProducts.schemas['Product']>>;
    promotionsPromise?: Promise<Record<string, ShopperPromotions.schemas['Promotion']>>;
}) {
    const productMap = use(productMapPromise);
    const promotions = promotionsPromise ? use(promotionsPromise) : undefined;

    return <MyCart basket={basket} productMap={productMap} promotions={promotions} itemsExpanded={true} />;
}

export default function CheckoutFormPage({
    shippingMethodsMap: shippingMethodsMapFromLoader,
    productMapPromise,
    promotionsPromise,
}: CheckoutFormPageProps) {
    const { t } = useTranslation('checkout');

    // Use basket from provider (managed by middleware)
    const cart = useBasket();
    const { step, STEPS, goToStep, editingStep, shipmentDistribution } = useCheckoutContext();
    const customerProfile = useCustomerProfile();

    // Checkout actions hook with all fetchers and submission handlers
    const {
        submitContactInfo,
        submitShippingAddress,
        submitShippingOptions,
        submitPayment,
        submitPlaceOrder,
        contactFetcher,
        shippingAddressFetcher,
        shippingOptionsFetcher,
        paymentFetcher,
        placeOrderFetcher,
        isSubmitting,
        handleCreateAccountPreferenceChange,
    } = useCheckoutActions();

    let showAddressAndOptions = true;

    // Determine shipping methods: prefer action response over loader data (avoids flash when advancing to shipping step)
    const actionShippingMethods = shippingAddressFetcher.data?.data?.shippingMethodsMap as
        | Record<string, ShopperBasketsV2.schemas['ShippingMethodResult']>
        | undefined;
    let shippingMethodsMap =
        actionShippingMethods && Object.keys(actionShippingMethods).length > 0
            ? actionShippingMethods
            : shippingMethodsMapFromLoader;

    // @sfdc-extension-block-start SFDC_EXT_MULTISHIP
    let isDeliveryProductItem = (_item: ShopperBasketsV2.schemas['ProductItem']) => true;
    // @sfdc-extension-block-end SFDC_EXT_MULTISHIP

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    shippingMethodsMap = filterDeliveryShippingMethods(shippingMethodsMap);
    const hasPickupItems = shipmentDistribution.hasPickupItems;
    showAddressAndOptions = shipmentDistribution.hasDeliveryItems;
    isDeliveryProductItem = shipmentDistribution.isDeliveryProductItem;
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    // @sfdc-extension-block-start SFDC_EXT_MULTISHIP
    const enableMultiAddress = shipmentDistribution.enableMultiAddress;
    const hasMultipleDeliveryAddresses = shipmentDistribution.hasMultipleDeliveryAddresses;
    const deliveryShipments = shipmentDistribution.deliveryShipments;
    // this tracks if the user pressed the multi address mode toggle button
    const [selectedMultiAddressMode, setSelectedMultiAddressMode] = useState(hasMultipleDeliveryAddresses);
    const handleToggleShippingAddressMode = () => {
        setSelectedMultiAddressMode((prev) => !prev);
    };
    // @sfdc-extension-block-end SFDC_EXT_MULTISHIP

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const { t: tBopis } = useTranslation('extBopis');
    const { label: pickupProceedButtonLabel, onClick: onPickupContinueClick } = handlePickupContinueAction(
        hasPickupItems,
        showAddressAndOptions,
        goToStep,
        STEPS,
        tBopis as (key: string) => string
    );
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    const analytics = useAnalytics();
    const hasTrackedCheckoutStartRef = useRef(false);
    const previousStepRef = useRef<CheckoutStep | null>(null);

    useEffect(() => {
        // Only track checkout start once on mount if baseket is not empty
        if (!hasTrackedCheckoutStartRef.current && cart?.productItems && cart.productItems.length > 0) {
            void analytics.trackCheckoutStart({
                basket: cart,
            });
            hasTrackedCheckoutStartRef.current = true;
        }
    }, [analytics, cart]);

    useEffect(() => {
        if (previousStepRef.current !== step && cart?.productItems && cart.productItems.length > 0) {
            const stepName = Object.keys(STEPS).find((key) => STEPS[key as keyof typeof STEPS] === step) || '';
            void analytics.trackCheckoutStep({
                stepName,
                stepNumber: step,
                basket: cart,
            });
            previousStepRef.current = step;
        }
    }, [analytics, step, STEPS, cart]);

    const isPlacingOrder = placeOrderFetcher.state === 'submitting';
    const placeOrderErrorRef = useRef<HTMLDivElement>(null);

    // Form submission handlers - delegated to checkout actions hook
    const handleContactSubmit = submitContactInfo;
    const handleShippingAddressSubmit = submitShippingAddress;
    const handleShippingOptionsSubmit = submitShippingOptions;
    const handlePaymentSubmit = submitPayment;

    // Apple Pay Express Checkout handler
    const handleApplePayClick = () => {
        // TODO: Implement Apple Pay integration
        // For now, show an alert to demonstrate the integration point
        // eslint-disable-next-line no-alert
        alert(
            'Apple Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
        );
    };

    // Google Pay Express Checkout handler
    const handleGooglePayClick = () => {
        // TODO: Implement Google Pay integration
        // For now, show an alert to demonstrate the integration point
        // eslint-disable-next-line no-alert
        alert(
            'Google Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
        );
    };

    // Amazon Pay Express Checkout handler
    const handleAmazonPayClick = () => {
        // TODO: Implement Amazon Pay integration
        // For now, show an alert to demonstrate the integration point
        // eslint-disable-next-line no-alert
        alert(
            'Amazon Pay express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
        );
    };

    // Venmo Express Checkout handler
    const handleVenmoClick = () => {
        // TODO: Implement Venmo integration
        // For now, show an alert to demonstrate the integration point
        // eslint-disable-next-line no-alert
        alert(
            'Venmo express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
        );
    };

    // PayPal Express Checkout handler
    const handlePayPalClick = () => {
        // TODO: Implement PayPal integration
        // For now, show an alert to demonstrate the integration point
        // eslint-disable-next-line no-alert
        alert(
            'PayPal express checkout would be processed here. This would skip all form steps and go directly to payment confirmation.'
        );
    };

    // Step state logic - centralized in container for single page layout
    // For single page layout: show all steps, current step is editable, completed steps show summary
    const contactInfoState = {
        isCompleted: step > STEPS.CONTACT_INFO,
        isEditing: step === STEPS.CONTACT_INFO || editingStep === STEPS.CONTACT_INFO,
        onEdit: () => goToStep(STEPS.CONTACT_INFO),
    };

    const shippingAddressState = {
        isCompleted: step > STEPS.SHIPPING_ADDRESS,
        isEditing: step === STEPS.SHIPPING_ADDRESS || editingStep === STEPS.SHIPPING_ADDRESS,
        onEdit: () => {
            goToStep(STEPS.SHIPPING_ADDRESS);
        },
    };

    const shippingOptionsState = {
        isCompleted: step > STEPS.SHIPPING_OPTIONS,
        isEditing: step === STEPS.SHIPPING_OPTIONS || editingStep === STEPS.SHIPPING_OPTIONS,
        onEdit: () => goToStep(STEPS.SHIPPING_OPTIONS),
    };

    const paymentState = {
        isCompleted: step > STEPS.PAYMENT,
        isEditing: step === STEPS.PAYMENT || editingStep === STEPS.PAYMENT,
        onEdit: () => goToStep(STEPS.PAYMENT),
    };

    // Note: Order placement success is now handled by action route redirect
    // The place order action automatically redirects to the confirmation page
    // Session storage cleanup is also handled in the action route

    // Auto-scroll to top when reaching review step
    useEffect(() => {
        if (step === STEPS.REVIEW_ORDER) {
            window.scrollTo({ top: 0 });
        }
    }, [step, STEPS.REVIEW_ORDER]);

    useEffect(() => {
        if (
            placeOrderFetcher.state === 'idle' &&
            placeOrderFetcher.data &&
            !placeOrderFetcher.data.success &&
            placeOrderFetcher.data.error &&
            placeOrderErrorRef.current
        ) {
            placeOrderErrorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [placeOrderFetcher.state, placeOrderFetcher.data]);

    // Check if cart is empty (no items) - also handle basketId to ensure we have a valid basket
    if (!cart || !cart.basketId || !cart.productItems || cart.productItems.length === 0) {
        return (
            <div className="min-h-screen bg-muted flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <Typography variant="muted" className="text-center">
                            {t('common.emptyCart')}
                        </Typography>
                    </CardContent>
                </Card>
            </div>
        );
    }

    let shippingAddressComponent = (
        <ShippingAddress
            onSubmit={handleShippingAddressSubmit}
            isLoading={isSubmitting('shipping-address')}
            actionData={shippingAddressFetcher.data}
            // @sfdc-extension-block-start SFDC_EXT_MULTISHIP
            enableMultiAddress={enableMultiAddress}
            handleToggleShippingAddressMode={handleToggleShippingAddressMode}
            // @sfdc-extension-block-end SFDC_EXT_MULTISHIP
            {...shippingAddressState}
        />
    );
    const defaultShipmentId = 'me';
    let shippingOptionsComponent = (
        <ShippingOptions
            onSubmit={handleShippingOptionsSubmit}
            isLoading={isSubmitting('shipping-options')}
            actionData={shippingOptionsFetcher.data}
            shippingMethods={shippingMethodsMap[defaultShipmentId]}
            {...shippingOptionsState}
        />
    );

    // @sfdc-extension-block-start SFDC_EXT_MULTISHIP
    // this is true if has multiple delivery addresses or user selected multi address mode and isediting addresses
    const isMultiAddressMode = shippingAddressState.isEditing ? selectedMultiAddressMode : hasMultipleDeliveryAddresses;
    if (isMultiAddressMode) {
        shippingAddressComponent = (
            <ShippingMultiAddressWithData
                isLoading={isSubmitting('shipping-address')}
                actionData={shippingAddressFetcher.data}
                productMapPromise={productMapPromise}
                isDeliveryProductItem={isDeliveryProductItem}
                deliveryShipments={deliveryShipments}
                handleToggleShippingAddressMode={handleToggleShippingAddressMode}
                onSubmit={handleShippingAddressSubmit}
                hasMultipleDeliveryAddresses={hasMultipleDeliveryAddresses}
                {...shippingAddressState}
            />
        );
        shippingOptionsComponent = (
            <ShippingMultiOptions
                onSubmit={handleShippingOptionsSubmit}
                isLoading={isSubmitting('shipping-options')}
                actionData={shippingOptionsFetcher.data}
                shipments={deliveryShipments}
                shippingMethodsMap={shippingMethodsMap}
                {...shippingOptionsState}
            />
        );
    }
    // @sfdc-extension-block-end SFDC_EXT_MULTISHIP

    return (
        <div className="min-h-screen bg-background">
            <PluginComponent pluginId="checkout.page.before" />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Mobile Order Summary + My Cart */}
                <div className="lg:hidden mb-6">
                    <Accordion type="single" collapsible defaultValue="order-summary">
                        <AccordionItem
                            value="order-summary"
                            className="border rounded-2xl bg-card shadow-sm overflow-hidden">
                            <AccordionTrigger className="px-4 py-4 text-lg font-semibold">
                                {t('orderSummary.toggleLabel')}
                            </AccordionTrigger>
                            <AccordionContent className="px-0">
                                <div className="px-4 pb-4 space-y-6">
                                    <Card className="shadow-none border border-border">
                                        <CardContent className="p-4">
                                            <Suspense
                                                fallback={<div className="h-56 bg-muted animate-pulse rounded" />}>
                                                <OrderSummary
                                                    basket={cart}
                                                    showCartItems={false}
                                                    showHeading={false}
                                                    showPromoCodeForm={true}
                                                    productsByItemId={{}}
                                                />
                                            </Suspense>
                                        </CardContent>
                                    </Card>

                                    <Suspense fallback={<div className="h-48 bg-muted animate-pulse rounded" />}>
                                        <MyCartWithData
                                            basket={cart}
                                            productMapPromise={productMapPromise}
                                            promotionsPromise={promotionsPromise}
                                        />
                                    </Suspense>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Checkout Content - Single Page Layout */}
                    <div className="lg:col-span-2 space-y-8">
                        <PluginComponent pluginId="checkout.mainContent.before" />
                        {/* Express Payments - Apple Pay, Google Pay, Amazon Pay, PayPal & Venmo (mobile only) */}
                        <PluginComponent pluginId="checkout.expressPayments.header.before" />
                        <Suspense fallback={<div className="h-20 bg-muted animate-pulse rounded" />}>
                            <PluginComponent pluginId="checkout.expressPayments.before" />
                            <PluginComponent pluginId="checkout.expressPayments">
                                <ExpressPayments
                                    onApplePayClick={handleApplePayClick}
                                    onGooglePayClick={handleGooglePayClick}
                                    onAmazonPayClick={handleAmazonPayClick}
                                    onVenmoClick={handleVenmoClick}
                                    onPayPalClick={handlePayPalClick}
                                />
                            </PluginComponent>
                            <PluginComponent pluginId="checkout.expressPayments.after" />
                        </Suspense>

                        <PluginComponent pluginId="checkout.contactInfo.header.before" />
                        <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                            <PluginComponent pluginId="checkout.contactInfo.before" />
                            <PluginComponent pluginId="checkout.contactInfo">
                                <ContactInfo
                                    onSubmit={handleContactSubmit}
                                    isLoading={isSubmitting('contact')}
                                    actionData={contactFetcher.data}
                                    {...contactInfoState}
                                />
                            </PluginComponent>
                            <PluginComponent pluginId="checkout.contactInfo.after" />
                        </Suspense>

                        {/* @sfdc-extension-block-start SFDC_EXT_BOPIS */}
                        {/* Store Pickup Information */}
                        {hasPickupItems && (
                            <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                                <CheckoutPickupWithData
                                    cart={cart}
                                    productMapPromise={productMapPromise}
                                    isEditing={editingStep === CHECKOUT_STEPS.PICKUP}
                                    onEdit={() => goToStep(CHECKOUT_STEPS.PICKUP)}
                                    onContinue={onPickupContinueClick}
                                    continueButtonLabel={pickupProceedButtonLabel}
                                />
                            </Suspense>
                        )}

                        {/* @sfdc-extension-block-end SFDC_EXT_BOPIS */}

                        {/* Shipping Address & Options */}
                        {showAddressAndOptions && (
                            <>
                                <PluginComponent pluginId="checkout.shippingAddress.header.before" />
                                <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                                    <PluginComponent pluginId="checkout.shippingAddress.before" />
                                    <PluginComponent pluginId="checkout.shippingAddress">
                                        {shippingAddressComponent}
                                    </PluginComponent>
                                    <PluginComponent pluginId="checkout.shippingAddress.after" />
                                </Suspense>

                                <PluginComponent pluginId="checkout.shippingOptions.header.before" />
                                <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                                    <PluginComponent pluginId="checkout.shippingOptions.before" />
                                    <PluginComponent pluginId="checkout.shippingOptions">
                                        {shippingOptionsComponent}
                                    </PluginComponent>
                                    <PluginComponent pluginId="checkout.shippingOptions.after" />
                                </Suspense>
                            </>
                        )}

                        <PluginComponent pluginId="checkout.payment.header.before" />
                        <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                            <PluginComponent pluginId="checkout.payment.before" />
                            <PluginComponent pluginId="checkout.payment">
                                <Payment
                                    onSubmit={handlePaymentSubmit}
                                    isLoading={isSubmitting('payment')}
                                    actionData={paymentFetcher.data}
                                    showBillingSameAsShipping={showAddressAndOptions}
                                    {...paymentState}
                                />
                            </PluginComponent>
                            <PluginComponent pluginId="checkout.payment.after" />
                        </Suspense>

                        {/* Create Account Option - Show for guest users after payment */}
                        <PluginComponent pluginId="checkout.createAccount.before" />
                        <PluginComponent pluginId="checkout.createAccount">
                            <GuestAccountCreation
                                cart={cart}
                                customerProfile={customerProfile}
                                onSaved={handleCreateAccountPreferenceChange}
                            />
                        </PluginComponent>
                        <PluginComponent pluginId="checkout.createAccount.after" />

                        {/* Place Order Section */}
                        {step === STEPS.REVIEW_ORDER && (
                            <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
                                {placeOrderFetcher.data &&
                                    !placeOrderFetcher.data.success &&
                                    placeOrderFetcher.data.error && (
                                        <CheckoutErrorBanner
                                            ref={placeOrderErrorRef}
                                            message={placeOrderFetcher.data.error}
                                            className="w-full"
                                        />
                                    )}
                                <PluginComponent pluginId="checkout.placeOrder.before" />
                                <PluginComponent pluginId="checkout.placeOrder">
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            submitPlaceOrder();
                                        }}
                                        className="w-full lg:w-auto">
                                        <Button
                                            type="submit"
                                            disabled={isPlacingOrder}
                                            className="w-full lg:max-w-sm"
                                            size="lg">
                                            {isPlacingOrder ? t('placeOrder.processing') : t('placeOrder.button')}
                                        </Button>
                                    </form>
                                </PluginComponent>
                                <PluginComponent pluginId="checkout.placeOrder.after" />
                            </div>
                        )}
                        <PluginComponent pluginId="checkout.mainContent.after" />
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="hidden lg:block lg:col-span-1">
                        <PluginComponent pluginId="checkout.sidebar.before" />
                        <div className="sticky top-8 space-y-6">
                            {/* Order Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        <Typography variant="h4" as="h2">
                                            {t('orderSummary.title')}
                                        </Typography>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <PluginComponent pluginId="checkout.orderSummary.before" />
                                    <PluginComponent pluginId="checkout.orderSummary">
                                        <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                                            <OrderSummary
                                                basket={cart}
                                                showCartItems={false}
                                                showHeading={false}
                                                showPromoCodeForm={true}
                                                productsByItemId={{}}
                                            />
                                        </Suspense>
                                    </PluginComponent>
                                    <PluginComponent pluginId="checkout.orderSummary.after" />
                                </CardContent>
                            </Card>

                            <PluginComponent pluginId="checkout.myCart.before" />
                            <PluginComponent pluginId="checkout.myCart">
                                <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded" />}>
                                    <MyCartWithData
                                        basket={cart}
                                        productMapPromise={productMapPromise}
                                        promotionsPromise={promotionsPromise}
                                    />
                                </Suspense>
                            </PluginComponent>
                            <PluginComponent pluginId="checkout.myCart.after" />
                        </div>
                        <PluginComponent pluginId="checkout.sidebar.after" />
                    </div>
                </div>
            </div>
            <PluginComponent pluginId="checkout.page.after" />
        </div>
    );
}
