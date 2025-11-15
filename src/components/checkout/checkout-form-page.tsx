'use client';

import { useEffect, lazy, Suspense, use } from 'react';
import { Form, useNavigation } from 'react-router';
import { useCheckoutContext } from '@/hooks/use-checkout';
import { useBasket } from '@/providers/basket';
import { useCheckoutActions } from '@/hooks/use-checkout-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Typography } from '@/components/typography';
import { useCustomerProfile } from '@/hooks/checkout/use-customer-profile';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import uiStrings from '@/temp-ui-string';

// Lazy load heavy components
const ContactInfo = lazy(() => import('./partials/contact-info'));
const ShippingAddress = lazy(() => import('./partials/shipping-address'));
const ShippingOptions = lazy(() => import('./partials/shipping-options'));
const Payment = lazy(() => import('./partials/payment'));
const RegisterCustomerSelection = lazy(() => import('./partials/register-customer-selection'));
const OrderSummary = lazy(() => import('@/components/order-summary'));
const MyCart = lazy(() => import('@/components/my-cart'));
const ExpressPayments = lazy(() => import('./partials/express-payments'));

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
}

/**
 * Wrapper component that resolves productMap Promise within Suspense boundary.
 *
 * This pattern enables streaming: the rest of the checkout form can render
 * and be interactive immediately, while MyCart streams in independently
 * once product data is available.
 */
function MyCartWithData({
    basket,
    productMapPromise,
}: {
    basket: ShopperBasketsV2.schemas['Basket'];
    productMapPromise: Promise<Record<string, ShopperProducts.schemas['Product']>>;
}) {
    // Resolve promise within Suspense boundary - allows component to suspend independently
    const productMap = use(productMapPromise);

    return <MyCart basket={basket} productMap={productMap} itemsExpanded={true} />;
}

export default function CheckoutFormPage({ shippingMethods, productMapPromise }: CheckoutFormPageProps) {
    // Use basket from provider (managed by middleware)
    const cart = useBasket();
    const { step, STEPS, goToStep, editingStep } = useCheckoutContext();
    const customerProfile = useCustomerProfile();

    // Get navigation state
    const navigation = useNavigation();

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
                            {uiStrings.checkout.common.emptyCart}
                        </Typography>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        <Typography variant="h4" as="h2">
                                            Review & Place Order
                                        </Typography>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-center">
                                        <Form method="post" action="/action/place-order">
                                            {/* Hidden field to pass create account preference to server */}
                                            <input
                                                type="hidden"
                                                name="shouldCreateAccount"
                                                value={shouldCreateAccount ? 'true' : 'false'}
                                            />
                                            <Button
                                                type="submit"
                                                disabled={isPlacingOrder}
                                                className="w-full max-w-sm"
                                                size="lg">
                                                {isPlacingOrder
                                                    ? uiStrings.checkout.placeOrder.processing
                                                    : uiStrings.checkout.placeOrder.button}
                                            </Button>
                                        </Form>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8 space-y-6">
                            {/* Order Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        <Typography variant="h4" as="h2">
                                            {uiStrings.checkout.orderSummary.title}
                                        </Typography>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                                        <OrderSummary
                                            basket={cart}
                                            showCartItems={false}
                                            showHeading={false}
                                            productMap={{}} // Not used when showCartItems=false
                                        />
                                    </Suspense>
                                </CardContent>
                            </Card>

                            {/* My Cart - Streams independently from rest of checkout */}
                            <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded" />}>
                                <MyCartWithData basket={cart} productMapPromise={productMapPromise} />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
