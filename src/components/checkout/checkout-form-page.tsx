'use client';

import { useEffect, lazy, Suspense, use, useRef } from 'react';
import { Form, useNavigation } from 'react-router';
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
import type { CheckoutStep } from './utils/checkout-context-types';
// @sfdc-extension-line SFDC_EXT_BOPIS
import { isStorePickup } from '@/extensions/bopis/lib/basket-utils';

// Lazy load heavy components
const ContactInfo = lazy(() => import('./components/contact-info'));
// @sfdc-extension-line SFDC_EXT_BOPIS
const StorePickup = lazy(() => import('@/extensions/bopis/components/checkout/store-pickup'));
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
    shippingMethods?: ShopperBasketsV2.schemas['ShippingMethodResult'];
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
    shippingMethods,
    productMapPromise,
    promotionsPromise,
}: CheckoutFormPageProps) {
    const { t } = useTranslation('checkout');

    // Use basket from provider (managed by middleware)
    const cart = useBasket();
    const { step, STEPS, goToStep, editingStep } = useCheckoutContext();
    const customerProfile = useCustomerProfile();

    // Get navigation state
    const navigation = useNavigation();
    let showAddressAndOptions = true;
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const isPickup = isStorePickup(cart);
    showAddressAndOptions = !isPickup;
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
        if (!previousStepRef.current && cart?.productItems && cart.productItems.length > 0) {
            const stepName = Object.keys(STEPS).find((key) => STEPS[key as keyof typeof STEPS] === step) || '';
            void analytics.trackCheckoutStep({
                stepName,
                stepNumber: step,
                basket: cart,
            });
            previousStepRef.current = step;
        }
    }, [analytics, step, STEPS, cart]);

    // Checkout actions hook with all fetchers and submission handlers
    const {
        submitContactInfo,
        submitShippingAddress,
        submitShippingOptions,
        submitPayment,
        contactFetcher,
        shippingAddressFetcher,
        shippingOptionsFetcher,
        paymentFetcher,
        isSubmitting,
        handleCreateAccountPreferenceChange,
        shouldCreateAccount,
    } = useCheckoutActions();

    const isPlacingOrder = navigation.state === 'submitting' && navigation.formAction === '/action/place-order';

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

    return (
        <div className="min-h-screen bg-background">
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
                        {/* Express Payments - Apple Pay, Google Pay, Amazon Pay, PayPal & Venmo (mobile only) */}
                        <Suspense fallback={<div className="h-20 bg-muted animate-pulse rounded" />}>
                            <ExpressPayments
                                onApplePayClick={handleApplePayClick}
                                onGooglePayClick={handleGooglePayClick}
                                onAmazonPayClick={handleAmazonPayClick}
                                onVenmoClick={handleVenmoClick}
                                onPayPalClick={handlePayPalClick}
                            />
                        </Suspense>

                        <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                            <ContactInfo
                                onSubmit={handleContactSubmit}
                                isLoading={isSubmitting('contact')}
                                actionData={contactFetcher.data}
                                {...contactInfoState}
                            />
                        </Suspense>

                        {/* @sfdc-extension-block-start SFDC_EXT_BOPIS */}
                        {/* Store Pickup Information - Only show if this is a BOPIS order */}
                        {isPickup && (
                            <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                                <StorePickup />
                            </Suspense>
                        )}
                        {/* @sfdc-extension-block-end SFDC_EXT_BOPIS */}

                        {/* Shipping Address & Options */}
                        {showAddressAndOptions && (
                            <>
                                <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                                    <ShippingAddress
                                        onSubmit={handleShippingAddressSubmit}
                                        isLoading={isSubmitting('shipping-address')}
                                        actionData={shippingAddressFetcher.data}
                                        {...shippingAddressState}
                                    />
                                </Suspense>

                                <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                                    <ShippingOptions
                                        onSubmit={handleShippingOptionsSubmit}
                                        isLoading={isSubmitting('shipping-options')}
                                        actionData={shippingOptionsFetcher.data}
                                        shippingMethods={shippingMethods}
                                        {...shippingOptionsState}
                                    />
                                </Suspense>
                            </>
                        )}

                        <Suspense fallback={<div className="h-32 bg-muted animate-pulse rounded" />}>
                            <Payment
                                onSubmit={handlePaymentSubmit}
                                isLoading={isSubmitting('payment')}
                                actionData={paymentFetcher.data}
                                {...paymentState}
                            />
                        </Suspense>

                        {/* Create Account Option - Show for guest users after payment */}
                        <GuestAccountCreation
                            cart={cart}
                            customerProfile={customerProfile}
                            onSaved={handleCreateAccountPreferenceChange}
                        />

                        {/* Place Order Section */}
                        {step === STEPS.REVIEW_ORDER && (
                            <div className="flex justify-end">
                                <Form method="post" action="/action/place-order" className="w-full lg:w-auto">
                                    {/* Hidden field to pass create account preference to server */}
                                    <input
                                        type="hidden"
                                        name="shouldCreateAccount"
                                        value={shouldCreateAccount ? 'true' : 'false'}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={isPlacingOrder}
                                        className="w-full lg:max-w-sm"
                                        size="lg">
                                        {isPlacingOrder ? t('placeOrder.processing') : t('placeOrder.button')}
                                    </Button>
                                </Form>
                            </div>
                        )}
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="hidden lg:block lg:col-span-1">
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
                                    <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
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

                            <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded" />}>
                                <MyCartWithData
                                    basket={cart}
                                    productMapPromise={productMapPromise}
                                    promotionsPromise={promotionsPromise}
                                />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
