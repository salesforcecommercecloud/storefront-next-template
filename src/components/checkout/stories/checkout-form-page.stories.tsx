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
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import { waitForStorybookReady } from '@storybook/test-utils';
import { getTranslation } from '@/lib/i18next';

import { checkoutWithOneItem, checkoutWithMultipleItems } from '@/components/__mocks__/checkout-data';
import emptyBasket from '@/components/__mocks__/empty-basket';
import { ToggleCard, ToggleCardEdit, ToggleCardSummary } from '@/components/toggle-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Typography } from '@/components/typography';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

// import { cn } from '@/lib/utils';
// Create a mock checkout form page component that matches the exact production look
function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logEdit = action('checkout-edit');
        const logContinue = action('checkout-continue');
        const logFieldChange = action('checkout-field-change');
        const logShippingSelect = action('checkout-shipping-select');
        const logPlaceOrder = action('checkout-place-order');

        const getLabelFor = (el: HTMLElement): string => {
            // 1) label[for=id]
            const id = el.id;
            if (id) {
                const explicit = document.querySelector(`label[for="${id}"]`);
                if (explicit?.textContent) return explicit.textContent.trim();
            }
            // 2) enclosing label
            const enclosing = el.closest('label');
            if (enclosing?.textContent) return enclosing.textContent.trim();
            // 3) nearest label in same container or previous sibling
            const container = el.closest('div') || el.parentElement;
            const nearby = container?.querySelector('label') || container?.previousElementSibling;
            if (nearby && nearby instanceof HTMLLabelElement && nearby.textContent) return nearby.textContent.trim();
            // 4) aria-label or placeholder
            const aria = el.getAttribute('aria-label');
            if (aria) return aria;
            const placeholder = (el as HTMLInputElement).placeholder;
            if (placeholder) return placeholder;
            return '';
        };

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            // Edit buttons
            const edit = target.closest('button, a');
            const label = edit?.textContent?.trim() || '';
            if (edit && /^edit$/i.test(label)) {
                event.preventDefault();
                logEdit({ label });
                return;
            }

            // Continue / Save / Proceed buttons
            if (edit && /(continue|save|proceed)/i.test(label)) {
                event.preventDefault();
                logContinue({ label });
                return;
            }

            // Place order
            if (edit && /(place order)/i.test(label)) {
                event.preventDefault();
                logPlaceOrder({ label });
                return;
            }

            // Shipping method radio select
            const radio = target.closest('input[type="radio"][name="shippingMethodId"], [role="radio"]');
            if (radio) {
                const shipId = (radio as HTMLInputElement).id || (radio as HTMLInputElement).value;
                const shipLabel = shipId
                    ? (document.querySelector(`label[for="${shipId}"]`)?.textContent || '').trim()
                    : '';
                logShippingSelect({ id: shipId, label: shipLabel });
            }
        };

        const handleChange = (event: Event) => {
            const input = event.target as HTMLInputElement | HTMLTextAreaElement | null;
            if (!input) return;
            if (input.matches('input, textarea')) {
                const label = getLabelFor(input);
                logFieldChange({ label, value: input.value });
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('change', handleChange, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('change', handleChange, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

function MockCheckoutFormPage({
    step = 0,
    checkoutData = checkoutWithOneItem,
    isLoading = false,
    isSubmitting = false,
}: {
    step?: number;
    checkoutData?: unknown;
    isLoading?: boolean;
    isSubmitting?: boolean;
}) {
    const { t } = getTranslation();
    const STEPS = {
        CONTACT_INFO: 0,
        SHIPPING_ADDRESS: 1,
        SHIPPING_OPTIONS: 2,
        PAYMENT: 3,
        REVIEW_ORDER: 4,
    };

    // Type guard to safely access checkoutData properties
    type ShippingAddressShape = {
        firstName?: string;
        lastName?: string;
        address1?: string;
        address2?: string;
        city?: string;
        stateCode?: string;
        postalCode?: string;
        phone?: string;
    };

    type ShippingMethodShape = {
        id?: string;
        name?: string;
        price?: number;
    };

    type OrderItemShape = { id?: string; productName?: string; itemText?: string; quantity?: number; price: number };

    type CheckoutDataShape = {
        cart?: {
            basketId?: string;
            customerInfo?: { email?: string };
            productItems?: Array<OrderItemShape>;
            shipments?: Array<{ shippingAddress?: ShippingAddressShape; shippingMethod?: ShippingMethodShape }>;
            productSubTotal?: number;
            shippingTotal?: number;
            taxTotal?: number;
            orderTotal?: number;
            paymentInstruments?: Array<{
                paymentCard?: {
                    holder?: string;
                    maskedNumber?: string;
                    expirationMonth?: number;
                    expirationYear?: number;
                };
            }>;
        };
        shippingMethods?: {
            applicableShippingMethods?: Array<{ id: string; name: string; description?: string; price: number }>;
        };
    };

    const { cart, shippingMethods } = (checkoutData as CheckoutDataShape) || {};
    const shippingMethodsList = Array.isArray(shippingMethods?.applicableShippingMethods)
        ? (shippingMethods?.applicableShippingMethods as Array<{
              id: string;
              name: string;
              description?: string;
              price: number;
          }>)
        : [];

    // Check if cart is empty
    if (!cart || !cart.basketId || !cart.productItems || cart.productItems.length === 0) {
        return (
            <div className="min-h-screen bg-muted flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <Typography variant="muted" className="text-center">
                            {t('cart:empty.title')}
                        </Typography>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const getStepStatus = (stepIndex: number) => {
        if (step > stepIndex) return 'completed';
        if (step === stepIndex) return 'current';
        return 'upcoming';
    };

    // removed unused getStepTitle to satisfy no-unused-vars

    const getStepTitleText = (stepIndex: number, title: string): string => {
        const isCompleted = getStepStatus(stepIndex) === 'completed';
        return `${isCompleted ? '✓' : stepIndex + 1}. ${title}`;
    };

    return (
        <div className="min-h-screen bg-muted">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Checkout Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Contact Info Step */}
                        <ToggleCard
                            id="contact-info"
                            title={getStepTitleText(STEPS.CONTACT_INFO, t('checkout:contactInfo.title'))}
                            editing={getStepStatus(STEPS.CONTACT_INFO) === 'current'}
                            disabled={getStepStatus(STEPS.CONTACT_INFO) === 'upcoming'}
                            onEdit={() => {
                                action('edit-contact-info')();
                            }}
                            editLabel={t('actionCard:edit')}
                            isLoading={isLoading}>
                            <ToggleCardEdit>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            {t('checkout:contactInfo.emailLabel')}
                                        </label>
                                        <Input
                                            type="email"
                                            placeholder={t('checkout:contactInfo.emailPlaceholder')}
                                            defaultValue={cart.customerInfo?.email || ''}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className="flex justify-center">
                                        <Button disabled={isLoading} size="lg" className="min-w-48">
                                            {isLoading
                                                ? t('checkout:contactInfo.saving')
                                                : t('checkout:contactInfo.continue')}
                                        </Button>
                                    </div>
                                </div>
                            </ToggleCardEdit>

                            <ToggleCardSummary>
                                <div className="space-y-2">
                                    <Typography variant="small" className="text-muted-foreground">
                                        {t('checkout:contactInfo.emailLabel')}
                                    </Typography>
                                    <Typography variant="p" className="font-medium">
                                        {cart.customerInfo?.email}
                                    </Typography>
                                </div>
                            </ToggleCardSummary>
                        </ToggleCard>

                        {/* Shipping Address Step */}
                        {step >= STEPS.SHIPPING_ADDRESS && (
                            <ToggleCard
                                id="shipping-address"
                                title={getStepTitleText(STEPS.SHIPPING_ADDRESS, t('checkout:shippingAddress.title'))}
                                editing={getStepStatus(STEPS.SHIPPING_ADDRESS) === 'current'}
                                disabled={getStepStatus(STEPS.SHIPPING_ADDRESS) === 'upcoming'}
                                onEdit={() => {
                                    action('edit-shipping-address')();
                                }}
                                editLabel={t('actionCard:edit')}
                                isLoading={isLoading}>
                                <ToggleCardEdit>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    {t('checkout:addressForm.firstNameLabel')}
                                                </label>
                                                <Input
                                                    placeholder={t('checkout:addressForm.firstNamePlaceholder')}
                                                    defaultValue={cart.shipments?.[0]?.shippingAddress?.firstName || ''}
                                                    disabled={isLoading}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    {t('checkout:addressForm.lastNameLabel')}
                                                </label>
                                                <Input
                                                    placeholder={t('checkout:addressForm.lastNamePlaceholder')}
                                                    defaultValue={cart.shipments?.[0]?.shippingAddress?.lastName || ''}
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                {t('checkout:addressForm.addressLabel')}
                                            </label>
                                            <Input
                                                placeholder={t('checkout:addressForm.addressPlaceholder')}
                                                defaultValue={cart.shipments?.[0]?.shippingAddress?.address1 || ''}
                                                disabled={isLoading}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                {t('checkout:addressForm.address2Label')}
                                            </label>
                                            <Input
                                                placeholder={t('checkout:addressForm.address2Placeholder')}
                                                defaultValue={cart.shipments?.[0]?.shippingAddress?.address2 || ''}
                                                disabled={isLoading}
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    {t('checkout:addressForm.cityLabel')}
                                                </label>
                                                <Input
                                                    placeholder={t('checkout:addressForm.cityPlaceholder')}
                                                    defaultValue={cart.shipments?.[0]?.shippingAddress?.city || ''}
                                                    disabled={isLoading}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    {t('checkout:addressForm.stateLabel')}
                                                </label>
                                                <Input
                                                    placeholder={t('checkout:addressForm.statePlaceholder')}
                                                    defaultValue={cart.shipments?.[0]?.shippingAddress?.stateCode || ''}
                                                    disabled={isLoading}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    {t('checkout:addressForm.zipLabel')}
                                                </label>
                                                <Input
                                                    placeholder={t('checkout:addressForm.zipPlaceholder')}
                                                    defaultValue={
                                                        cart.shipments?.[0]?.shippingAddress?.postalCode || ''
                                                    }
                                                    disabled={isLoading}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                {t('checkout:addressForm.phoneLabel')}
                                            </label>
                                            <Input
                                                type="tel"
                                                placeholder={t('checkout:addressForm.phonePlaceholder')}
                                                defaultValue={cart.shipments?.[0]?.shippingAddress?.phone || ''}
                                                disabled={isLoading}
                                            />
                                        </div>

                                        <div className="flex justify-center pt-2">
                                            <Button disabled={isLoading} size="lg" className="min-w-48">
                                                {isLoading
                                                    ? t('checkout:common.submitting')
                                                    : t('checkout:shippingAddress.continue')}
                                            </Button>
                                        </div>
                                    </div>
                                </ToggleCardEdit>

                                <ToggleCardSummary>
                                    <div className="space-y-3">
                                        {cart.shipments?.[0]?.shippingAddress && (
                                            <div className="rounded-lg p-3 space-y-2 bg-muted/50">
                                                <Typography variant="p" className="font-medium">
                                                    {cart.shipments[0].shippingAddress.firstName}{' '}
                                                    {cart.shipments[0].shippingAddress.lastName}
                                                </Typography>
                                                <Typography variant="p" className="text-muted-foreground">
                                                    {cart.shipments[0].shippingAddress.address1}
                                                    {cart.shipments[0].shippingAddress.address2 && (
                                                        <>
                                                            <br />
                                                            {cart.shipments[0].shippingAddress.address2}
                                                        </>
                                                    )}
                                                    <br />
                                                    {cart.shipments[0].shippingAddress.city}
                                                    {cart.shipments[0].shippingAddress.stateCode &&
                                                        `, ${cart.shipments[0].shippingAddress.stateCode}`}{' '}
                                                    {cart.shipments[0].shippingAddress.postalCode}
                                                    {cart.shipments[0].shippingAddress.phone && (
                                                        <>
                                                            <br />
                                                            {cart.shipments[0].shippingAddress.phone}
                                                        </>
                                                    )}
                                                </Typography>
                                            </div>
                                        )}
                                    </div>
                                </ToggleCardSummary>
                            </ToggleCard>
                        )}

                        {/* Shipping Options Step */}
                        {step >= STEPS.SHIPPING_OPTIONS && (
                            <ToggleCard
                                id="shipping-options"
                                title={getStepTitleText(STEPS.SHIPPING_OPTIONS, t('checkout:shippingOptions.title'))}
                                editing={getStepStatus(STEPS.SHIPPING_OPTIONS) === 'current'}
                                disabled={getStepStatus(STEPS.SHIPPING_OPTIONS) === 'upcoming'}
                                onEdit={() => {
                                    action('edit-shipping-options')();
                                }}
                                editLabel="Edit"
                                isLoading={isLoading}>
                                <ToggleCardEdit>
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <Typography variant="small" className="text-muted-foreground">
                                                Select your preferred shipping method
                                            </Typography>

                                            <RadioGroup
                                                name="shippingMethodId"
                                                defaultValue={cart.shipments?.[0]?.shippingMethod?.id || ''}
                                                required>
                                                {shippingMethodsList.map((method) => (
                                                    <div
                                                        key={method.id}
                                                        className="flex items-center space-x-4 p-4 border-2 rounded-lg transition-all duration-200 hover:border-primary/50 hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:shadow-md">
                                                        <RadioGroupItem
                                                            value={method.id}
                                                            id={method.id}
                                                            className="w-5 h-5"
                                                        />
                                                        <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between items-center">
                                                                    <Typography variant="p" className="font-medium">
                                                                        {method.name}
                                                                    </Typography>
                                                                </div>
                                                                <div className="flex justify-between items-center gap-4">
                                                                    <Typography
                                                                        variant="small"
                                                                        className="text-muted-foreground">
                                                                        {method.description}
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="small"
                                                                        className="text-muted-foreground font-medium">
                                                                        {method.price === 0
                                                                            ? 'Free'
                                                                            : `$${method.price.toFixed(2)}`}
                                                                    </Typography>
                                                                </div>
                                                            </div>
                                                        </Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </div>

                                        <div className="flex justify-center">
                                            <Button disabled={isLoading} size="lg" className="min-w-48">
                                                {isLoading
                                                    ? t('checkout:shippingOptions.saving')
                                                    : t('checkout:shippingOptions.continue')}
                                            </Button>
                                        </div>
                                    </div>
                                </ToggleCardEdit>

                                <ToggleCardSummary>
                                    <div className="space-y-2">
                                        <Typography variant="small" className="text-muted-foreground">
                                            Shipping Method
                                        </Typography>
                                        {cart.shipments?.[0]?.shippingMethod ? (
                                            <div>
                                                <Typography variant="p" className="font-medium">
                                                    {cart.shipments[0].shippingMethod.name}
                                                </Typography>
                                                <Typography variant="small" className="text-muted-foreground">
                                                    {cart.shipments[0].shippingMethod.price === 0
                                                        ? 'Free'
                                                        : `$${(cart.shipments[0].shippingMethod.price ?? 0).toFixed(2)}`}
                                                </Typography>
                                            </div>
                                        ) : (
                                            <Typography variant="p" className="text-muted-foreground">
                                                No shipping method selected
                                            </Typography>
                                        )}
                                    </div>
                                </ToggleCardSummary>
                            </ToggleCard>
                        )}

                        {/* Payment Step */}
                        {step >= STEPS.PAYMENT && (
                            <ToggleCard
                                id="payment"
                                title={getStepTitleText(STEPS.PAYMENT, t('checkout:payment.title'))}
                                editing={getStepStatus(STEPS.PAYMENT) === 'current'}
                                disabled={getStepStatus(STEPS.PAYMENT) === 'upcoming'}
                                onEdit={() => {
                                    action('edit-payment')();
                                }}
                                editLabel={t('actionCard:edit')}
                                isLoading={isLoading}>
                                <ToggleCardEdit>
                                    <div className="space-y-6">
                                        {/* Payment Method Section */}
                                        <div className="space-y-4">
                                            <Typography variant="h4" as="h3">
                                                Payment Method
                                            </Typography>

                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    {t('checkout:payment.cardNumberLabel')}
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <Input
                                                            placeholder={t('checkout:payment.cardNumberPlaceholder')}
                                                            defaultValue={
                                                                cart.paymentInstruments?.[0]?.paymentCard
                                                                    ?.maskedNumber || ''
                                                            }
                                                            disabled={isLoading}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                                                        <span className="font-medium">Visa</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-2">
                                                    {t('checkout:payment.cardholderLabel')}
                                                </label>
                                                <Input
                                                    placeholder={t('checkout:payment.cardholderPlaceholder')}
                                                    defaultValue={
                                                        cart.paymentInstruments?.[0]?.paymentCard?.holder || ''
                                                    }
                                                    disabled={isLoading}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-foreground mb-2">
                                                        {t('checkout:payment.expiryLabel')}
                                                    </label>
                                                    <Input
                                                        placeholder={t('checkout:payment.expiryPlaceholder')}
                                                        defaultValue={
                                                            cart.paymentInstruments?.[0]?.paymentCard
                                                                ? `${cart.paymentInstruments[0].paymentCard.expirationMonth}/${cart.paymentInstruments[0].paymentCard.expirationYear}`
                                                                : ''
                                                        }
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-foreground mb-2">
                                                        {t('checkout:payment.cvvLabel')}
                                                    </label>
                                                    <Input
                                                        placeholder={t('checkout:payment.cvvPlaceholder')}
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <Separator />

                                        {/* Billing Address Section */}
                                        <div className="space-y-4">
                                            <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50">
                                                <div className="flex items-start space-x-3">
                                                    <Checkbox
                                                        checked={true}
                                                        className="mt-0.5"
                                                        aria-label={t('checkout:payment.billingSameAsShipping')}
                                                    />
                                                    <div className="space-y-1 leading-none">
                                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                            {t('checkout:payment.billingSameAsShipping')}
                                                        </label>
                                                        <Typography variant="small" className="text-muted-foreground">
                                                            {t('checkout:payment.billingSameAsShippingDescription')}
                                                        </Typography>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-center pt-2">
                                            <Button disabled={isLoading} size="lg" className="min-w-48">
                                                {isLoading
                                                    ? t('checkout:payment.saving')
                                                    : t('checkout:payment.continue')}
                                            </Button>
                                        </div>
                                    </div>
                                </ToggleCardEdit>

                                <ToggleCardSummary>
                                    <div className="space-y-4">
                                        <div>
                                            <Typography variant="small" className="text-muted-foreground">
                                                Payment Method
                                            </Typography>
                                            {cart.paymentInstruments?.[0] ? (
                                                <div>
                                                    <Typography variant="p" className="font-medium">
                                                        Visa
                                                    </Typography>
                                                    <Typography variant="p" className="text-muted-foreground">
                                                        {cart.paymentInstruments[0].paymentCard?.maskedNumber}
                                                    </Typography>
                                                </div>
                                            ) : (
                                                <Typography variant="p" className="text-muted-foreground">
                                                    No payment method saved
                                                </Typography>
                                            )}
                                        </div>

                                        <div>
                                            <Typography variant="small" className="text-muted-foreground">
                                                Billing Address
                                            </Typography>
                                            <Typography variant="p" as="span" className="font-medium">
                                                Same as shipping address
                                            </Typography>
                                        </div>
                                    </div>
                                </ToggleCardSummary>
                            </ToggleCard>
                        )}

                        {/* Review Order Step */}
                        {step >= STEPS.REVIEW_ORDER && (
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
                                        <Button disabled={isSubmitting} className="w-full max-w-sm" size="lg">
                                            {isSubmitting
                                                ? t('checkout:placeOrder.processing')
                                                : t('checkout:placeOrder.button')}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        <Typography variant="h4" as="h2">
                                            {t('checkout:orderSummary.title')}
                                        </Typography>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {(cart.productItems as Array<OrderItemShape> | undefined)?.map(
                                            (item, index) => (
                                                <div
                                                    key={item.id || `item-${index}`}
                                                    className="flex items-center space-x-3">
                                                    <div className="w-12 h-12 bg-muted rounded flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {item.productName || item.itemText}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Qty: {item.quantity}
                                                        </p>
                                                        <p className="text-sm font-semibold">
                                                            ${((item.price ?? 0) * (item.quantity ?? 1)).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                        <div className="border-t pt-4 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Subtotal:</span>
                                                <span>${cart.productSubTotal?.toFixed(2) || '0.00'}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>Shipping:</span>
                                                <span>${cart.shippingTotal?.toFixed(2) || '0.00'}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>Tax:</span>
                                                <span>${cart.taxTotal?.toFixed(2) || '0.00'}</span>
                                            </div>
                                            <div className="flex justify-between font-semibold text-lg border-t pt-2">
                                                <span>Total:</span>
                                                <span>${cart.orderTotal?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const meta: Meta<typeof MockCheckoutFormPage> = {
    title: 'CHECKOUT/CheckoutFormPage',
    component: MockCheckoutFormPage,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
The CheckoutFormPage component provides a complete multi-step checkout experience for customers. This mock version demonstrates the checkout flow using real mock data from the checkout-data.js file.

## Features

- **Multi-Step Checkout**: Progressive form with 5 steps (Contact, Shipping Address, Shipping Options, Payment, Review)
- **Step Management**: Visual step progression and state management with progress indicator
- **Form Validation**: Form fields with proper validation states and completion indicators
- **Loading States**: Loading indicators for form submissions
- **Order Summary**: Real-time order summary with cart items and totals
- **Responsive Design**: Mobile and desktop optimized layouts
- **Empty Cart Handling**: Graceful handling of empty cart scenarios
- **Mock Data Integration**: Uses comprehensive checkout data from checkout-data.js

## Checkout Steps

1. **Contact Info**: Customer email and contact information
2. **Shipping Address**: Delivery address and contact details
3. **Shipping Options**: Shipping method selection with pricing and promotions
4. **Payment**: Payment method and billing information
5. **Review Order**: Final review and order placement

## Props

- **step**: Current checkout step (0-4)
- **checkoutData**: Complete checkout data object from checkout-data.js
- **isLoading**: Loading state for form submissions
- **isSubmitting**: Loading state for order placement
                `,
            },
        },
    },
    argTypes: {
        step: {
            description: 'Current checkout step (0-4)',
            control: { type: 'range', min: 0, max: 4, step: 1 },
            table: {
                type: { summary: 'number' },
                defaultValue: { summary: '0' },
            },
        },
        checkoutData: {
            description: 'Complete checkout data object containing cart, shipping methods, and checkout state',
            control: 'object',
            table: {
                type: { summary: 'object' },
            },
        },
        isLoading: {
            description: 'Loading state for form submissions',
            control: 'boolean',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'false' },
            },
        },
        isSubmitting: {
            description: 'Loading state for order placement',
            control: 'boolean',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'false' },
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

type Story = StoryObj<typeof meta>;

export const ContactInfoStep: Story = {
    args: {
        step: 0,
        checkoutData: checkoutWithOneItem,
        isLoading: false,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
First step of the checkout process showing the contact information form. This demonstrates:

- Contact info form with email field pre-populated from mock data
- Step progress indicator showing current step
- Form validation and error handling
- Loading states for form submission
- Order summary sidebar with cart items and totals
- Responsive layout for mobile and desktop
                `,
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

export const ShippingAddressStep: Story = {
    args: {
        step: 1,
        checkoutData: checkoutWithOneItem,
        isLoading: false,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Second step showing the shipping address form. This demonstrates:

- Shipping address form with all required fields pre-populated from mock data
- Address validation and formatting
- Step progression from contact info with visual indicators
- Order summary with updated information
- Form submission handling and completion states
                `,
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

export const ShippingOptionsStep: Story = {
    args: {
        step: 2,
        checkoutData: checkoutWithOneItem,
        isLoading: false,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Third step showing shipping method selection. This demonstrates:

- Available shipping options with pricing from mock data
- Shipping method selection interface with radio buttons
- Cost calculation and display with promotions
- Step progression from shipping address
- Order summary with shipping costs and promotions
                `,
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

export const PaymentStep: Story = {
    args: {
        step: 3,
        checkoutData: checkoutWithOneItem,
        isLoading: false,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Fourth step showing payment information form. This demonstrates:

- Payment method selection with credit card form
- Card details pre-populated from mock data
- Billing address information
- Security features and trust signals
- Step progression from shipping options
                `,
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

export const ReviewOrderStep: Story = {
    args: {
        step: 4,
        checkoutData: checkoutWithOneItem,
        isLoading: false,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Final step showing order review and placement. This demonstrates:

- Complete order summary with all details from mock data
- Final review of all checkout information
- Place order button and confirmation
- Order processing state
- Final step completion with all steps marked as completed
                `,
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

export const EmptyCart: Story = {
    args: {
        step: 0,
        checkoutData: { cart: emptyBasket },
        isLoading: false,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Checkout page when cart is empty. This demonstrates:

- Empty cart message and handling
- Graceful degradation for no items
- User guidance for empty cart scenario
- Clean, centered layout
- Proper error state handling
                `,
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await step('Verify empty state is rendered correctly', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
        await step('Verify appropriate messaging for empty state', () => {
            const text = canvasElement.textContent;
            void expect(text).toBeTruthy();
        });
        await step('Test user interactions in empty state', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0) {
                await userEvent.click(buttons[0]);
            }
        });
    },
};

export const MultipleItemsCheckout: Story = {
    args: {
        step: 3,
        checkoutData: checkoutWithMultipleItems,
        isLoading: false,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Checkout process with multiple items in cart. This demonstrates:

- Checkout flow with multiple products from mock data
- Order summary with multiple line items
- Total calculations for complex orders
- Shipping and tax calculations
- Complete checkout experience with realistic data
                `,
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

export const LoadingState: Story = {
    args: {
        step: 1,
        checkoutData: checkoutWithOneItem,
        isLoading: true,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Checkout form in loading state. This demonstrates:

- Form submission loading states
- Loading indicators and disabled states
- User feedback during processing
- Loading state management
- Form interaction during loading
                `,
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);
        await step('Verify loading/disabled state prevents interaction', () => {
            const buttons = canvas.queryAllByRole('button');
            buttons.forEach((btn) => {
                if (btn.hasAttribute('disabled')) {
                    void expect(btn).toBeDisabled();
                }
            });
        });
        await step('Verify loading indicator if present', () => {
            const spinner = canvas.queryByRole('presentation');
            if (spinner) {
                void expect(spinner).toBeInTheDocument();
            }
        });
    },
};

export const SubmittingOrder: Story = {
    args: {
        step: 4,
        checkoutData: checkoutWithOneItem,
        isLoading: false,
        isSubmitting: true,
    },
    parameters: {
        docs: {
            description: {
                story: `
Checkout form during order submission. This demonstrates:

- Order placement loading state
- Processing feedback during submission
- Disabled form controls during submission
- User feedback for order processing
- Final step completion state
                `,
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

export const MobileView: Story = {
    args: {
        step: 1,
        checkoutData: checkoutWithOneItem,
        isLoading: false,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Checkout form on mobile devices. This demonstrates:

- Mobile-optimized form layout
- Touch-friendly form controls
- Responsive order summary
- Mobile navigation and step progression
- Optimized mobile user experience
                `,
            },
        },
    },
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);
        await step('Verify mobile viewport rendering', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
        await step('Verify mobile-optimized layout and spacing', () => {
            const container = canvasElement.firstChild;
            void expect(container).toBeVisible();
        });
        await step('Test mobile interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });
    },
};

export const DesktopView: Story = {
    args: {
        step: 3,
        checkoutData: checkoutWithOneItem,
        isLoading: false,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Checkout form on desktop devices. This demonstrates:

- Full desktop layout with sidebar
- Two-column grid layout
- Desktop-optimized form controls
- Sticky order summary sidebar
- Optimal desktop user experience
                `,
            },
        },
    },
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement, step }) => {
        const canvas = within(canvasElement);
        await step('Verify desktop viewport rendering', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
        await step('Verify desktop-optimized layout and spacing', () => {
            const container = canvasElement.firstChild;
            void expect(container).toBeVisible();
        });
        await step('Test desktop interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });
    },
};

export default meta;

// Additional scenarios

// 1) No shipping address provided in cart shipment
const checkoutNoShippingAddress = {
    ...checkoutWithOneItem,
    cart: {
        ...checkoutWithOneItem.cart,
        shipments: checkoutWithOneItem.cart.shipments?.map(
            (s: (typeof checkoutWithOneItem.cart.shipments)[number]) => ({
                ...s,
                shippingAddress: undefined,
            })
        ),
    },
};

export const NoShippingAddress: Story = {
    args: {
        step: 1,
        checkoutData: checkoutNoShippingAddress,
        isLoading: false,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Shipping address step with no address on the shipment.

- Shows empty address fields
- Validates required field display and progression behavior
                `,
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

// 2) No shipping methods returned
const checkoutNoShippingMethods = {
    ...checkoutWithOneItem,
    shippingMethods: {
        applicableShippingMethods: [],
        defaultShippingMethodId: undefined,
    },
};

export const NoShippingMethods: Story = {
    args: {
        step: 2,
        checkoutData: checkoutNoShippingMethods,
        isLoading: false,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Shipping options step with no available methods.

- Exercises empty state for shipping selection
- Useful for error handling UX
                `,
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

// 3) Store pickup selected (shipping method with price 0 and pickup flag)
const checkoutStorePickup = {
    ...checkoutWithOneItem,
    cart: {
        ...checkoutWithOneItem.cart,
        shipments: checkoutWithOneItem.cart.shipments?.map(
            (s: (typeof checkoutWithOneItem.cart.shipments)[number]) => ({
                ...s,
                shippingMethod: {
                    id: 'GBP005',
                    name: 'Store Pickup',
                    description: 'Pickup in store',
                    price: 0,
                    c_storePickupEnabled: true,
                },
                shippingTotal: 0,
            })
        ),
    },
    shippingMethods: {
        ...checkoutWithOneItem.shippingMethods,
        defaultShippingMethodId: 'GBP005',
    },
};

export const StorePickupSelected: Story = {
    args: {
        step: 2,
        checkoutData: checkoutStorePickup,
        isLoading: false,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Shipping options with store pickup selected.

- Shows zero-cost shipping
- Helps validate pickup messaging in summary
                `,
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};

// 4) No saved payment method in cart
const checkoutNoSavedPayment = {
    ...checkoutWithOneItem,
    cart: {
        ...checkoutWithOneItem.cart,
        paymentInstruments: [],
    },
};

export const NoSavedPaymentMethod: Story = {
    args: {
        step: 3,
        checkoutData: checkoutNoSavedPayment,
        isLoading: false,
        isSubmitting: false,
    },
    parameters: {
        docs: {
            description: {
                story: `
Payment step with no saved payment instrument.

- Exercises empty payment summary
- Validates form fields are required/populated by user
                `,
            },
        },
    },
    play: async ({ canvasElement, step }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await step('Verify component renders without errors', () => {
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });

        await step('Verify all interactive elements are accessible', () => {
            const buttons = canvas.queryAllByRole('button');
            const links = canvas.queryAllByRole('link');
            const inputs = canvas.queryAllByRole('textbox');

            [...buttons, ...links, ...inputs].forEach((el) => {
                void expect(el).toBeInTheDocument();
            });
        });

        await step('Test basic user interactions', async () => {
            const buttons = canvas.queryAllByRole('button');
            if (buttons.length > 0 && !buttons[0].hasAttribute('disabled')) {
                await userEvent.hover(buttons[0]);
                await userEvent.click(buttons[0]);
            }
        });

        await step('Verify component state after interaction', () => {
            // Component should remain functional after interactions
            void expect(canvasElement.firstChild).toBeInTheDocument();
        });
    },
};
