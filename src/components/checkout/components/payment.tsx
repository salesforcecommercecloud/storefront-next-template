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
import { useForm } from 'react-hook-form';
import { useState, useEffect, useMemo, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ToggleCard, ToggleCardEdit, ToggleCardSummary } from '@/components/toggle-card';
import { Typography } from '@/components/typography';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useBasket } from '@/providers/basket';
import { createPaymentSchema, getPaymentDefaultValues, type PaymentData } from '@/lib/checkout-schemas';
import { getCardTypeDisplay, getLastFourDigits } from '@/lib/payment-utils';
import { getAddressKey, isOrderBillingAddressIncomplete } from '@/lib/address-utils';
import { getCardIcon } from '@/lib/card-icon-utils';
import { useCustomerProfile } from '@/hooks/checkout/use-customer-profile';
import { getPaymentMethodsFromCustomer } from '@/lib/customer-profile-utils';
import { AddressFormFields } from '@/components/address-form-fields';
import { CreditCardInputFields } from '@/components/credit-card-input-fields';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import type { PaymentSubmissionRef } from '@/hooks/use-checkout-actions';
import type { CheckoutActionData } from '../types';
import CheckoutErrorBanner from './checkout-error-banner';
import { getCheckoutDisplayError } from './checkout-display-error';
import { useTranslation } from 'react-i18next';
import { UITarget } from '@/targets/ui-target';
import CreditCardOptionIcon from '@/components/icons/credit-card-option-icon';
import { cn } from '@/lib/utils';

interface PaymentProps {
    onSubmit: (data: PaymentData) => void;
    isLoading: boolean;
    actionData?: CheckoutActionData;
    // Step state managed by container
    isCompleted: boolean;
    isEditing: boolean;
    onEdit: () => void;
    disabled?: boolean;
    showBillingSameAsShipping?: boolean;
    paymentSubmissionRef?: PaymentSubmissionRef;
}

export default function Payment({
    onSubmit,
    isLoading,
    actionData,
    isCompleted: _isCompleted,
    isEditing,
    onEdit,
    disabled = false,
    showBillingSameAsShipping = true,
    paymentSubmissionRef,
}: PaymentProps) {
    const cart = useBasket();
    const customerProfile = useCustomerProfile();
    // 'new' or payment method ID. Use '' so we can detect "not yet initialized" and set preferred saved method once.
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
    const selectedPaymentMethodRef = useRef(selectedPaymentMethod);
    selectedPaymentMethodRef.current = selectedPaymentMethod;

    /** When false, show only first INITIAL_VISIBLE_COUNT options and "View all (n more)". See Figma NEXT Design System – Login/Checkout. */
    const [showAllPaymentOptions, setShowAllPaymentOptions] = useState(false);

    const { t } = useTranslation('checkout');

    const INITIAL_VISIBLE_COUNT = 3;
    const paymentFormError = getCheckoutDisplayError(actionData, 'payment');

    // Get customer's saved payment methods
    const savedPaymentMethods = getPaymentMethodsFromCustomer(customerProfile);

    // Set default payment method only on mount or when savedPaymentMethods change. Use a ref to read
    // current selection so we don't depend on selectedPaymentMethod and avoid an effect loop.
    useEffect(() => {
        if (savedPaymentMethods.length === 0) {
            setSelectedPaymentMethod('new');
            return;
        }

        const validIds = new Set(savedPaymentMethods.map((m) => m.id));
        const current = selectedPaymentMethodRef.current;
        const isValidSelection = current === 'new' || validIds.has(current);
        if (isValidSelection && current !== '') {
            return; // Preserve user's choice
        }

        const preferredWithId = savedPaymentMethods.find((method) => method.preferred && method.id);
        const firstWithId = savedPaymentMethods.find((method) => method.id);
        setSelectedPaymentMethod(preferredWithId?.id ?? firstWithId?.id ?? 'new');
    }, [savedPaymentMethods]);

    const shippingAddress = cart?.shipments?.[0]?.shippingAddress;
    const paymentMethod = cart?.paymentInstruments?.[0];
    const billingAddress = cart?.billingAddress;

    // Resolved value for RadioGroup so we always pass a valid option (handles '' before effect runs).
    const paymentRadioValue =
        selectedPaymentMethod ||
        (savedPaymentMethods.length > 0
            ? (savedPaymentMethods.find((m) => m.preferred)?.id ?? savedPaymentMethods[0]?.id ?? 'new')
            : 'new');

    const selectedSavedMethod =
        paymentRadioValue !== 'new' ? savedPaymentMethods.find((method) => method.id === paymentRadioValue) : undefined;

    const allPaymentOptionIds = useMemo(() => [...savedPaymentMethods.map((m) => m.id), 'new'], [savedPaymentMethods]);
    const visiblePaymentOptionIds = useMemo(() => {
        if (showAllPaymentOptions || allPaymentOptionIds.length <= INITIAL_VISIBLE_COUNT) {
            return allPaymentOptionIds;
        }
        const first = allPaymentOptionIds.slice(0, INITIAL_VISIBLE_COUNT);
        const current = paymentRadioValue;
        if (!first.includes(current)) {
            return [...first, current];
        }
        return first;
    }, [showAllPaymentOptions, allPaymentOptionIds, paymentRadioValue]);
    const hiddenPaymentCount = allPaymentOptionIds.length - visiblePaymentOptionIds.length;
    const showViewLessUnderForm =
        savedPaymentMethods.length > 0 &&
        allPaymentOptionIds.length > INITIAL_VISIBLE_COUNT &&
        hiddenPaymentCount === 0;
    const handleViewLess = () => {
        setShowAllPaymentOptions(false);
        const firstVisible = allPaymentOptionIds.slice(0, INITIAL_VISIBLE_COUNT);
        if (!firstVisible.includes(paymentRadioValue)) {
            setSelectedPaymentMethod(firstVisible[0]);
        }
    };

    // Helper function to check if billing address is same as shipping address
    const isBillingSameAsShipping = (
        billingAddr:
            | {
                  firstName?: string;
                  lastName?: string;
                  address1?: string;
                  city?: string;
                  stateCode?: string;
                  postalCode?: string;
              }
            | undefined,
        shippingAddr:
            | {
                  firstName?: string;
                  lastName?: string;
                  address1?: string;
                  city?: string;
                  stateCode?: string;
                  postalCode?: string;
              }
            | undefined
    ): boolean => {
        if (!billingAddr || !shippingAddr) return false;

        return (
            billingAddr.firstName === shippingAddr.firstName &&
            billingAddr.lastName === shippingAddr.lastName &&
            billingAddr.address1 === shippingAddr.address1 &&
            billingAddr.city === shippingAddr.city &&
            billingAddr.stateCode === shippingAddr.stateCode &&
            billingAddr.postalCode === shippingAddr.postalCode
        );
    };

    // Memoize default values to prevent infinite re-renders
    // Only use basket payment instrument holder when user has selected that saved method.
    const defaultValues = useMemo(() => {
        const baseDefaults = getPaymentDefaultValues({
            shippingAddress,
            paymentMethod:
                paymentRadioValue !== 'new' && paymentMethod?.paymentCard?.holder
                    ? { holder: paymentMethod.paymentCard.holder }
                    : undefined,
        });

        const isUsingSavedPayment = paymentRadioValue !== 'new' && savedPaymentMethods.length > 0;

        // Default "same as shipping" ON for delivery checkout, but OFF when the basket already has a complete
        // billing address that differs from shipping — avoids submitting with true and overwriting that address.
        const basketHasDistinctBilling = Boolean(
            showBillingSameAsShipping &&
                billingAddress &&
                !isOrderBillingAddressIncomplete(billingAddress) &&
                shippingAddress &&
                !isBillingSameAsShipping(billingAddress, shippingAddress)
        );
        const defaultBillingSameAsShipping = showBillingSameAsShipping ? !basketHasDistinctBilling : false;

        const computedDefaults = {
            ...baseDefaults,
            // Do not pre-fill cardholder name; user enters it when adding a new card.
            cardholderName: '',
            useSavedPaymentMethod: isUsingSavedPayment,
            selectedSavedPaymentMethod: isUsingSavedPayment ? paymentRadioValue : undefined,
            billingSameAsShipping: defaultBillingSameAsShipping,
            ...(basketHasDistinctBilling && billingAddress
                ? {
                      billingFirstName: billingAddress.firstName ?? '',
                      billingLastName: billingAddress.lastName ?? '',
                      billingAddress1: billingAddress.address1 ?? '',
                      billingAddress2: billingAddress.address2 ?? '',
                      billingCity: billingAddress.city ?? '',
                      billingStateCode: billingAddress.stateCode ?? '',
                      billingPostalCode: billingAddress.postalCode ?? '',
                      billingCountryCode: billingAddress.countryCode ?? 'US',
                  }
                : {}),
            // @sfdc-extension-block-start SFDC_EXT_BOPIS
            // For BOPIS orders, don't pre-fill billing address or cardholder name from shipping (which is the store address)
            ...(!showBillingSameAsShipping && {
                cardholderName: '',
                billingFirstName: '',
                billingLastName: '',
                billingAddress1: '',
                billingAddress2: '',
                billingCity: '',
                billingStateCode: '',
                billingPostalCode: '',
                billingCountryCode: 'US',
            }),
            // @sfdc-extension-block-end SFDC_EXT_BOPIS
        };

        return computedDefaults;
    }, [
        paymentRadioValue,
        shippingAddress,
        paymentMethod,
        savedPaymentMethods.length,
        showBillingSameAsShipping,
        billingAddress,
    ]);

    const schema = useMemo(() => createPaymentSchema(t), [t]);

    const form = useForm<PaymentData>({
        resolver: zodResolver(schema),
        defaultValues,
        mode: 'onSubmit', // Only validate on submit, not on change/blur
    });

    const shippingAddressSyncKey = useMemo(
        () => (shippingAddress ? getAddressKey(shippingAddress) : ''),
        [shippingAddress]
    );

    // Keep billing fields aligned with cart shipping while "same as shipping" is checked (e.g. after OTP / loader prefill).
    const billingSameAsShippingWatched = form.watch('billingSameAsShipping');
    useEffect(() => {
        if (!showBillingSameAsShipping || !shippingAddress || !shippingAddressSyncKey) return;
        if (!billingSameAsShippingWatched) return;
        form.setValue('billingFirstName', shippingAddress.firstName ?? '');
        form.setValue('billingLastName', shippingAddress.lastName ?? '');
        form.setValue('billingAddress1', shippingAddress.address1 ?? '');
        form.setValue('billingAddress2', shippingAddress.address2 ?? '');
        form.setValue('billingCity', shippingAddress.city ?? '');
        form.setValue('billingStateCode', shippingAddress.stateCode ?? '');
        form.setValue('billingPostalCode', shippingAddress.postalCode ?? '');
        form.setValue('billingCountryCode', shippingAddress.countryCode ?? 'US');
    }, [showBillingSameAsShipping, shippingAddress, shippingAddressSyncKey, billingSameAsShippingWatched, form]);

    // Update form values when selected payment method changes
    useEffect(() => {
        const effectiveSelection = selectedPaymentMethod || paymentRadioValue;
        const isUsingSavedPayment = effectiveSelection !== 'new' && savedPaymentMethods.length > 0;

        form.setValue('useSavedPaymentMethod', isUsingSavedPayment);
        form.setValue('selectedSavedPaymentMethod', isUsingSavedPayment ? effectiveSelection : undefined);

        if (isUsingSavedPayment) {
            void form.trigger();
        }
    }, [selectedPaymentMethod, paymentRadioValue, savedPaymentMethods.length, form]);

    const handleFormSubmit = (data: PaymentData) => {
        const effectiveSelection = selectedPaymentMethod || paymentRadioValue;
        const isUsingSaved = effectiveSelection !== 'new' && savedPaymentMethods.length > 0;
        const paymentData = {
            ...data,
            selectedSavedPaymentMethod: isUsingSaved ? effectiveSelection : undefined,
            useSavedPaymentMethod: isUsingSaved,
        };

        onSubmit(paymentData);
    };

    // Watch billingSameAsShipping for reactive UI updates
    const billingSameAsShipping = form.watch('billingSameAsShipping');

    // Watch credit card and billing fields so we can clear inline errors when the user enters values
    const cardNumber = form.watch('cardNumber');
    const cardholderName = form.watch('cardholderName');
    const expiryDate = form.watch('expiryDate');
    const cvv = form.watch('cvv');
    const billingFirstName = form.watch('billingFirstName');
    const billingLastName = form.watch('billingLastName');
    const billingAddress1 = form.watch('billingAddress1');
    const billingCity = form.watch('billingCity');
    const billingPostalCode = form.watch('billingPostalCode');
    const billingStateCode = form.watch('billingStateCode');
    const billingCountryCode = form.watch('billingCountryCode');
    // Clear inline error only for the field that changed (avoids clearing all 11 on every keystroke).
    useEffect(() => {
        if ((cardNumber ?? '').trim().length > 0) form.clearErrors('cardNumber');
    }, [cardNumber, form]);
    useEffect(() => {
        if ((cardholderName ?? '').trim().length > 0) form.clearErrors('cardholderName');
    }, [cardholderName, form]);
    useEffect(() => {
        if ((expiryDate ?? '').trim().length > 0) form.clearErrors('expiryDate');
    }, [expiryDate, form]);
    useEffect(() => {
        if ((cvv ?? '').trim().length > 0) form.clearErrors('cvv');
    }, [cvv, form]);
    useEffect(() => {
        if ((billingFirstName ?? '').trim().length > 0) form.clearErrors('billingFirstName');
    }, [billingFirstName, form]);
    useEffect(() => {
        if ((billingLastName ?? '').trim().length > 0) form.clearErrors('billingLastName');
    }, [billingLastName, form]);
    useEffect(() => {
        if ((billingAddress1 ?? '').trim().length > 0) form.clearErrors('billingAddress1');
    }, [billingAddress1, form]);
    useEffect(() => {
        if ((billingCity ?? '').trim().length > 0) form.clearErrors('billingCity');
    }, [billingCity, form]);
    useEffect(() => {
        if ((billingPostalCode ?? '').trim().length > 0) form.clearErrors('billingPostalCode');
    }, [billingPostalCode, form]);
    useEffect(() => {
        if ((billingStateCode ?? '').trim().length > 0) form.clearErrors('billingStateCode');
    }, [billingStateCode, form]);
    useEffect(() => {
        if ((billingCountryCode ?? '').trim().length > 0) form.clearErrors('billingCountryCode');
    }, [billingCountryCode, form]);

    // Expose current form data to parent (single ref avoids race with place-order flow)
    const savedPaymentMethodsRef = useRef(savedPaymentMethods);
    savedPaymentMethodsRef.current = savedPaymentMethods;
    useEffect(() => {
        if (!paymentSubmissionRef) return;
        const refCurrent = paymentSubmissionRef.current;
        refCurrent.formDataGetter = () => {
            const current = selectedPaymentMethodRef.current;
            const methods = savedPaymentMethodsRef.current;
            const effective =
                current ||
                (methods.length > 0 ? (methods.find((m) => m.preferred)?.id ?? methods[0]?.id ?? 'new') : 'new');
            const isUsingSaved = effective !== 'new' && methods.length > 0;
            return {
                ...form.getValues(),
                selectedSavedPaymentMethod: isUsingSaved ? effective : undefined,
                useSavedPaymentMethod: isUsingSaved,
            };
        };
        refCurrent.setFormErrors = (errors) => {
            for (const [field, error] of Object.entries(errors)) {
                form.setError(field as keyof PaymentData, error);
            }
        };
        return () => {
            refCurrent.formDataGetter = null;
            refCurrent.setFormErrors = null;
        };
    }, [form, paymentSubmissionRef]);

    // Sync server field errors into the form so they show inline (red border + message below each field)
    useEffect(() => {
        if (!actionData?.fieldErrors || typeof actionData.fieldErrors !== 'object') return;
        for (const [field, error] of Object.entries(actionData.fieldErrors)) {
            const message = Array.isArray(error) ? error[0] : String(error);
            if (message) form.setError(field as keyof PaymentData, { type: 'server', message });
        }
    }, [actionData?.fieldErrors, form]);

    // For single page layout, always show the component but in collapsed state when not editing
    // The ToggleCard will handle the collapsed/expanded state based on editing prop

    const stepTitle = (
        <Typography variant="h5" as="span" className="text-card-foreground">
            {t('payment.title')}
        </Typography>
    );

    return (
        <ToggleCard
            id="payment"
            title={stepTitle as React.ReactNode}
            editing={isEditing}
            disabled={disabled}
            onEdit={onEdit}
            editLabel={t('payment.changeLabel')}
            isLoading={isLoading}
            className={cn('border-border bg-card rounded-[var(--radius)] shadow-sm py-4', !disabled && 'gap-1.5')}>
            <ToggleCardEdit>
                <Form {...form}>
                    <form onSubmit={(e) => void form.handleSubmit(handleFormSubmit)(e)} className="space-y-6">
                        {paymentFormError && <CheckoutErrorBanner message={paymentFormError} />}

                        {/* Payment Method Section */}
                        <div className="space-y-4">
                            <UITarget targetId="checkout.payment.paymentMethods.before" />
                            <UITarget targetId="checkout.payment.paymentMethods">
                                {/* Saved Payment Methods + Credit Card, with View All (n more) when > 3 options */}
                                {savedPaymentMethods.length > 0 && (
                                    <div className="space-y-3">
                                        <RadioGroup
                                            value={paymentRadioValue}
                                            onValueChange={setSelectedPaymentMethod}
                                            className="space-y-3">
                                            {visiblePaymentOptionIds.map((optionId) => {
                                                if (optionId === 'new') {
                                                    return (
                                                        <div
                                                            key="new"
                                                            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                                                            <RadioGroupItem value="new" id="new-payment" />
                                                            <Label
                                                                htmlFor="new-payment"
                                                                className="flex-1 cursor-pointer flex items-center gap-3">
                                                                <span className="text-base font-medium leading-5 text-foreground">
                                                                    {t('payment.creditCardOption')}
                                                                </span>
                                                                <CreditCardOptionIcon className="w-5 h-5 flex-shrink-0 ml-auto text-muted-foreground" />
                                                            </Label>
                                                        </div>
                                                    );
                                                }
                                                const method = savedPaymentMethods.find((m) => m.id === optionId);
                                                if (!method) return null;
                                                const cardTypeIdentifier = method.cardType || 'unknown';
                                                const CardIcon = getCardIcon(cardTypeIdentifier);
                                                const cardTypeLabel = method.cardType
                                                    ? method.cardType.charAt(0).toUpperCase() +
                                                      method.cardType.slice(1).toLowerCase()
                                                    : t('payment.unknownCardType');
                                                return (
                                                    <div
                                                        key={method.id}
                                                        className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                                                        <RadioGroupItem
                                                            value={method.id}
                                                            id={method.id}
                                                            className="mt-0.5"
                                                        />
                                                        <Label
                                                            htmlFor={method.id}
                                                            className="flex-1 cursor-pointer min-w-0">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-base font-medium leading-5 text-foreground">
                                                                        {cardTypeLabel}
                                                                    </span>
                                                                    {method.preferred && (
                                                                        <span className="text-xs font-medium leading-none bg-primary text-primary-foreground px-2 py-1 rounded-full">
                                                                            {t('payment.defaultBadge')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-sm font-normal leading-5 text-muted-foreground">
                                                                    {t('payment.endingIn', {
                                                                        lastDigits: getLastFourDigits(
                                                                            method.maskedNumber
                                                                        ),
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </Label>
                                                        <CardIcon
                                                            className="w-8 h-5 flex-shrink-0 text-muted-foreground"
                                                            aria-hidden
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </RadioGroup>
                                        {hiddenPaymentCount > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowAllPaymentOptions(true)}
                                                className="text-sm font-medium text-foreground focus:outline-none">
                                                {t('payment.viewAllMore', { count: hiddenPaymentCount })}
                                            </button>
                                        ) : (
                                            allPaymentOptionIds.length > INITIAL_VISIBLE_COUNT &&
                                            paymentRadioValue !== 'new' && (
                                                <button
                                                    type="button"
                                                    onClick={handleViewLess}
                                                    className="text-sm font-medium text-muted-foreground hover:text-foreground focus:outline-none">
                                                    {t('payment.viewLess')}
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}

                                {/* Credit Card option (when no saved methods) or form when "new" selected */}
                                {(savedPaymentMethods.length === 0 || paymentRadioValue === 'new') && (
                                    <div className="space-y-3">
                                        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                                            {savedPaymentMethods.length === 0 && (
                                                <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                                                    <RadioGroup
                                                        value="new"
                                                        className="flex items-center gap-3 flex-1"
                                                        onValueChange={() => setSelectedPaymentMethod('new')}>
                                                        <RadioGroupItem value="new" id="credit-card-option" checked />
                                                        <Label
                                                            htmlFor="credit-card-option"
                                                            className="flex items-center gap-3 cursor-pointer flex-1">
                                                            <span className="text-base font-medium leading-5 text-foreground">
                                                                {t('payment.creditCardOption')}
                                                            </span>
                                                            <CreditCardOptionIcon className="w-5 h-5 flex-shrink-0 ml-auto text-muted-foreground" />
                                                        </Label>
                                                    </RadioGroup>
                                                </div>
                                            )}

                                            <CreditCardInputFields
                                                form={form}
                                                autoFocus={isEditing && paymentRadioValue === 'new'}
                                            />
                                            {customerProfile?.customer?.customerId ? (
                                                <FormField
                                                    control={form.control}
                                                    name="savePaymentToProfile"
                                                    render={({ field }) => {
                                                        return (
                                                            <FormItem className="space-y-0">
                                                                <label
                                                                    htmlFor={field.name}
                                                                    className="flex cursor-pointer items-start gap-3">
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            id={field.name}
                                                                            checked={field.value ?? false}
                                                                            onCheckedChange={(checked) => {
                                                                                field.onChange(checked === true);
                                                                            }}
                                                                            className="size-5 shrink-0 rounded border-2 border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
                                                                            aria-label={t(
                                                                                'payment.savePaymentToProfile'
                                                                            )}
                                                                        />
                                                                    </FormControl>
                                                                    <span className="text-base font-normal leading-5 text-foreground pt-0.5">
                                                                        {t('payment.savePaymentToProfile')}
                                                                    </span>
                                                                </label>
                                                            </FormItem>
                                                        );
                                                    }}
                                                />
                                            ) : null}
                                        </div>
                                        {showViewLessUnderForm && (
                                            <button
                                                type="button"
                                                onClick={handleViewLess}
                                                className="text-sm font-medium text-muted-foreground hover:text-foreground focus:outline-none">
                                                {t('payment.viewLess')}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </UITarget>
                            <UITarget targetId="checkout.payment.paymentMethods.after" />
                        </div>
                        {/* Billing Address Section */}
                        <div className="space-y-4">
                            <UITarget targetId="checkout.payment.billingAddress.before" />
                            <UITarget targetId="checkout.payment.billingAddress">
                                <div className="rounded-xl border border-border p-4 space-y-4">
                                    {showBillingSameAsShipping && (
                                        <FormField
                                            control={form.control}
                                            name="billingSameAsShipping"
                                            render={({ field }) => (
                                                <FormItem className="space-y-0">
                                                    <label
                                                        htmlFor={field.name}
                                                        className="flex cursor-pointer items-start gap-3">
                                                        <FormControl>
                                                            <Checkbox
                                                                id={field.name}
                                                                checked={field.value}
                                                                onCheckedChange={(checked) => {
                                                                    field.onChange(checked === true);
                                                                    // Clear billing address fields when unchecking "Same as shipping"
                                                                    if (checked === false) {
                                                                        form.setValue('billingFirstName', '');
                                                                        form.setValue('billingLastName', '');
                                                                        form.setValue('billingAddress1', '');
                                                                        form.setValue('billingAddress2', '');
                                                                        form.setValue('billingCity', '');
                                                                        form.setValue('billingStateCode', '');
                                                                        form.setValue('billingPostalCode', '');
                                                                        form.setValue('billingCountryCode', 'US');
                                                                    }
                                                                }}
                                                                className="size-5 shrink-0 rounded border-2 border-input data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
                                                                aria-label={t('payment.billingSameAsShipping')}
                                                            />
                                                        </FormControl>
                                                        <span className="text-base font-medium leading-5 text-foreground pt-0.5">
                                                            {t('payment.billingSameAsShipping')}
                                                        </span>
                                                    </label>
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    {!billingSameAsShipping && (
                                        <AddressFormFields
                                            form={form}
                                            fieldPrefix="billing"
                                            showPhone={false}
                                            showCountry
                                            countryCode="US"
                                            labelsAsPlaceholders
                                            autoFocus
                                            autoFocusField="firstName"
                                        />
                                    )}
                                </div>
                            </UITarget>
                            <UITarget targetId="checkout.payment.billingAddress.after" />
                        </div>
                    </form>
                </Form>
            </ToggleCardEdit>

            <ToggleCardSummary>
                {disabled ? null : (
                    <div className="flex flex-col items-start gap-6 w-full">
                        {/* Payment Method - Figma: gap 6px between title and details */}
                        <div className="space-y-1.5 w-full">
                            {paymentMethod ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-normal leading-5 text-muted-foreground">
                                        {t('payment.summaryLabel', {
                                            methodLabel: getCardTypeDisplay(paymentMethod),
                                            lastDigits: getLastFourDigits(
                                                paymentMethod.paymentCard?.numberLastDigits ||
                                                    paymentMethod.paymentCard?.maskedNumber
                                            ),
                                        })}
                                    </span>
                                    {(() => {
                                        const cardTypeDisplay = getCardTypeDisplay(paymentMethod);
                                        const SummaryCardIcon = getCardIcon(cardTypeDisplay);
                                        return (
                                            <SummaryCardIcon className="w-8 h-5 shrink-0 text-primary" aria-hidden />
                                        );
                                    })()}
                                </div>
                            ) : savedPaymentMethods.length > 0 ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-normal leading-5 text-muted-foreground">
                                        {t('payment.summarySavedLabel', {
                                            methodLabel: selectedSavedMethod
                                                ? getCardTypeDisplay({
                                                      paymentCard: {
                                                          cardType: selectedSavedMethod.cardType,
                                                      },
                                                  } as ShopperBasketsV2.schemas['OrderPaymentInstrument'])
                                                : t('payment.defaultCardLabel'),
                                            lastDigits: getLastFourDigits(selectedSavedMethod?.maskedNumber),
                                        })}
                                    </span>
                                    {selectedSavedMethod &&
                                        (() => {
                                            const cardTypeDisplay = getCardTypeDisplay({
                                                paymentCard: { cardType: selectedSavedMethod.cardType },
                                            } as ShopperBasketsV2.schemas['OrderPaymentInstrument']);
                                            const SummaryCardIcon = getCardIcon(cardTypeDisplay);
                                            return (
                                                <SummaryCardIcon
                                                    className="w-8 h-5 shrink-0 text-primary"
                                                    aria-hidden
                                                />
                                            );
                                        })()}
                                </div>
                            ) : (
                                <span className="text-sm font-normal leading-5 text-muted-foreground">
                                    {t('payment.noPaymentMethodSaved')}
                                </span>
                            )}
                        </div>

                        {/* Billing Address - Figma: gap 6px between title and content */}
                        <div className="space-y-1.5 w-full">
                            <Typography variant="h5" as="h3" className="text-card-foreground">
                                {t('payment.billingSummaryTitle')}
                            </Typography>
                            {billingAddress && !isBillingSameAsShipping(billingAddress, shippingAddress) ? (
                                <div className="space-y-2">
                                    <span className="text-sm font-normal leading-5 text-muted-foreground">
                                        {billingAddress.firstName} {billingAddress.lastName}
                                    </span>
                                    <span className="text-sm font-normal leading-5 text-muted-foreground block">
                                        {billingAddress.address1}
                                    </span>
                                    {billingAddress.address2 && (
                                        <span className="text-sm font-normal leading-5 text-muted-foreground block">
                                            {billingAddress.address2}
                                        </span>
                                    )}
                                    <span className="text-sm font-normal leading-5 text-muted-foreground block">
                                        {billingAddress.city}
                                        {billingAddress.stateCode && `, ${billingAddress.stateCode}`}{' '}
                                        {billingAddress.postalCode}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-sm font-normal leading-5 text-muted-foreground">
                                    {showBillingSameAsShipping
                                        ? t('payment.sameAsShippingAddress')
                                        : t('payment.noBillingAddressSaved')}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </ToggleCardSummary>
        </ToggleCard>
    );
}
