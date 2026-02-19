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
import { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ToggleCard, ToggleCardEdit, ToggleCardSummary } from '@/components/toggle-card';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/typography';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useBasket } from '@/providers/basket';
import { createPaymentSchema, getPaymentDefaultValues, type PaymentData } from '@/lib/checkout-schemas';
import { getCardTypeDisplay, getLastFourDigits } from '@/lib/payment-utils';
import { getCardIcon } from '@/lib/card-icon-utils';
import { useCustomerProfile } from '@/hooks/checkout/use-customer-profile';
import { getPaymentMethodsFromCustomer } from '@/lib/customer-profile-utils';
import { AddressFormFields } from '@/components/address-form-fields';
import { CreditCardInputFields } from '@/components/credit-card-input-fields';
import type { CheckoutActionData } from '../types';
import CheckoutErrorBanner from './checkout-error-banner';
import { getCheckoutDisplayError } from './checkout-display-error';
import { useTranslation } from 'react-i18next';
import { UITarget } from '@/targets/ui-target';

interface PaymentProps {
    onSubmit: (data: PaymentData) => void;
    isLoading: boolean;
    actionData?: CheckoutActionData;
    // Step state managed by container
    isCompleted: boolean;
    isEditing: boolean;
    onEdit: () => void;
    showBillingSameAsShipping?: boolean;
}

export default function Payment({
    onSubmit,
    isLoading,
    actionData,
    isCompleted: _isCompleted,
    isEditing,
    onEdit,
    showBillingSameAsShipping = true,
}: PaymentProps) {
    const cart = useBasket();
    const customerProfile = useCustomerProfile();
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('new'); // 'new' or payment method ID
    const { t } = useTranslation('checkout');
    const paymentFormError = getCheckoutDisplayError(actionData, 'payment');

    // Get customer's saved payment methods
    const savedPaymentMethods = getPaymentMethodsFromCustomer(customerProfile);
    const selectedSavedMethod = savedPaymentMethods.find((method) => method.id === selectedPaymentMethod);

    // Set default payment method selection - prefer the customer's preferred payment method
    useEffect(() => {
        // No saved payment methods, default to new payment method
        if (savedPaymentMethods.length === 0) {
            setSelectedPaymentMethod('new');
            return;
        }

        const preferredWithId = savedPaymentMethods.find((method) => method.preferred && method.id);
        const firstWithId = savedPaymentMethods.find((method) => method.id);

        setSelectedPaymentMethod(preferredWithId?.id ?? firstWithId?.id ?? 'new');
    }, [savedPaymentMethods]);

    const shippingAddress = cart?.shipments?.[0]?.shippingAddress;
    const paymentMethod = cart?.paymentInstruments?.[0];
    const billingAddress = cart?.billingAddress;

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
    const defaultValues = useMemo(() => {
        const baseDefaults = getPaymentDefaultValues({
            shippingAddress,
            paymentMethod: paymentMethod
                ? {
                      holder: paymentMethod.paymentCard?.holder || '',
                  }
                : undefined,
        });

        const isUsingSavedPayment = selectedPaymentMethod !== 'new' && savedPaymentMethods.length > 0;
        const computedDefaults = {
            ...baseDefaults,
            useSavedPaymentMethod: isUsingSavedPayment,
            selectedSavedPaymentMethod: isUsingSavedPayment ? selectedPaymentMethod : undefined,
            billingSameAsShipping: showBillingSameAsShipping ? baseDefaults.billingSameAsShipping : false,
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
                billingPhone: '',
            }),
            // @sfdc-extension-block-end SFDC_EXT_BOPIS
        };

        return computedDefaults;
    }, [selectedPaymentMethod, shippingAddress, paymentMethod, savedPaymentMethods.length, showBillingSameAsShipping]);

    const schema = useMemo(() => createPaymentSchema(t), [t]);

    const form = useForm<PaymentData>({
        resolver: zodResolver(schema),
        defaultValues,
        mode: 'onSubmit', // Only validate on submit, not on change/blur
    });

    // Update form values when selectedPaymentMethod changes
    useEffect(() => {
        const isUsingSavedPayment = selectedPaymentMethod !== 'new';

        // Update form values directly
        form.setValue('useSavedPaymentMethod', isUsingSavedPayment);
        form.setValue('selectedSavedPaymentMethod', isUsingSavedPayment ? selectedPaymentMethod : undefined);

        // Trigger validation for saved payment methods
        if (isUsingSavedPayment) {
            void form.trigger();
        }
    }, [selectedPaymentMethod, form]);

    const handleFormSubmit = (data: PaymentData) => {
        // If a saved payment method is selected, include its information
        const isUsingSaved = selectedPaymentMethod !== 'new' && savedPaymentMethods.length > 0;
        const paymentData = {
            ...data,
            selectedSavedPaymentMethod: isUsingSaved ? selectedPaymentMethod : undefined,
            useSavedPaymentMethod: isUsingSaved,
        };

        onSubmit(paymentData);
    };

    // Watch billingSameAsShipping for reactive UI updates
    const billingSameAsShipping = form.watch('billingSameAsShipping');

    // For single page layout, always show the component but in collapsed state when not editing
    // The ToggleCard will handle the collapsed/expanded state based on editing prop

    const stepTitle = <span className="text-lg font-semibold text-foreground">{t('payment.title')}</span>;

    return (
        <ToggleCard
            id="payment"
            title={stepTitle as React.ReactNode}
            editing={isEditing}
            onEdit={onEdit}
            editLabel={t('common.edit')}
            isLoading={isLoading}>
            <ToggleCardEdit>
                <Form {...form}>
                    <form onSubmit={(e) => void form.handleSubmit(handleFormSubmit)(e)} className="space-y-6">
                        {paymentFormError && <CheckoutErrorBanner message={paymentFormError} />}
                        {actionData?.fieldErrors && (
                            <div className="space-y-2">
                                {Object.entries(actionData.fieldErrors).map(([field, error]) => (
                                    <CheckoutErrorBanner key={field} message={error} />
                                ))}
                            </div>
                        )}

                        {/* Payment Method Section */}
                        <div className="space-y-4">
                            <UITarget targetId="checkout.payment.paymentMethods.before" />
                            <UITarget targetId="checkout.payment.paymentMethods">
                                <Typography variant="h4" as="h3">
                                    {t('confirmation.fields.paymentMethod')}
                                </Typography>

                                {/* Saved Payment Methods */}
                                {savedPaymentMethods.length > 0 && (
                                    <div className="space-y-4">
                                        <Typography variant="p" className="text-muted-foreground">
                                            {t('confirmation.fields.savedMethodDescription')}
                                        </Typography>
                                        <RadioGroup
                                            value={selectedPaymentMethod}
                                            onValueChange={setSelectedPaymentMethod}
                                            className="space-y-3">
                                            {savedPaymentMethods.map((method) => {
                                                const CardIcon = getCardIcon(
                                                    method.cardType || t('payment.unknownCardType')
                                                );
                                                return (
                                                    <div
                                                        key={method.id}
                                                        className="flex items-center space-x-3 p-3 border rounded-md hover:bg-accent">
                                                        <RadioGroupItem value={method.id} id={method.id} />
                                                        <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                                                            <div className="flex items-center gap-3">
                                                                <CardIcon className="w-8 h-5 flex-shrink-0" />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium">
                                                                            {method.cardType ||
                                                                                t('payment.unknownCardType')}
                                                                        </span>
                                                                        <span className="text-muted-foreground">
                                                                            ••••{' '}
                                                                            {getLastFourDigits(method.maskedNumber)}
                                                                        </span>
                                                                        {method.preferred && (
                                                                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                                                                {t('payment.preferredBadge')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-sm text-muted-foreground">
                                                                        {method.cardholderName}
                                                                        {method.expirationMonth &&
                                                                            method.expirationYear && (
                                                                                <span className="ml-2">
                                                                                    {t('payment.expiresLabel', {
                                                                                        expiry: `${String(
                                                                                            method.expirationMonth
                                                                                        ).padStart(2, '0')}/${String(
                                                                                            method.expirationYear
                                                                                        ).slice(-2)}`,
                                                                                    })}
                                                                                </span>
                                                                            )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                            <div className="flex items-center space-x-3 p-3 border rounded-md hover:bg-accent">
                                                <RadioGroupItem value="new" id="new-payment" />
                                                <Label htmlFor="new-payment" className="cursor-pointer">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-5 bg-muted rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                                                            <span className="text-xs font-bold text-muted-foreground">
                                                                +
                                                            </span>
                                                        </div>
                                                        <span className="font-medium">
                                                            {t('payment.addNewPaymentMethod')}
                                                        </span>
                                                    </div>
                                                </Label>
                                            </div>
                                        </RadioGroup>
                                        <Separator />
                                    </div>
                                )}

                                {/* New Payment Method Form - Show when no saved methods or "new" is selected */}
                                {(savedPaymentMethods.length === 0 || selectedPaymentMethod === 'new') && (
                                    <div className="space-y-4">
                                        {savedPaymentMethods.length > 0 && (
                                            <Typography variant="h5" as="h4">
                                                {t('payment.newPaymentMethodTitle')}
                                            </Typography>
                                        )}

                                        <CreditCardInputFields
                                            form={form}
                                            autoFocus={isEditing && selectedPaymentMethod === 'new'}
                                        />
                                    </div>
                                )}
                            </UITarget>
                            <UITarget targetId="checkout.payment.paymentMethods.after" />
                        </div>

                        <Separator />

                        {/* Billing Address Section */}
                        <div className="space-y-4">
                            <UITarget targetId="checkout.payment.billingAddress.before" />
                            <UITarget targetId="checkout.payment.billingAddress">
                                {showBillingSameAsShipping && (
                                    <FormField
                                        control={form.control}
                                        name="billingSameAsShipping"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50">
                                                    <div className="flex items-start space-x-3">
                                                        <FormControl>
                                                            <Checkbox
                                                                checked={field.value}
                                                                onCheckedChange={(checked) => {
                                                                    field.onChange(checked === true);
                                                                }}
                                                                className="mt-0.5"
                                                                aria-label={t('payment.billingSameAsShipping')}
                                                            />
                                                        </FormControl>
                                                        <div className="space-y-1 leading-none">
                                                            <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 data-[error=true]:text-xl data-[error=true]:font-bold">
                                                                {t('payment.billingSameAsShipping')}
                                                            </FormLabel>
                                                            <Typography
                                                                variant="small"
                                                                className="text-muted-foreground">
                                                                {t('payment.billingSameAsShippingDescription')}
                                                            </Typography>
                                                        </div>
                                                    </div>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {!billingSameAsShipping && (
                                    <div className="space-y-4">
                                        <Typography variant="h4" as="h3">
                                            {t('confirmation.fields.billingAddress')}
                                        </Typography>

                                        <AddressFormFields
                                            form={form}
                                            fieldPrefix="billing"
                                            showPhone={false}
                                            countryCode="US"
                                        />
                                    </div>
                                )}
                            </UITarget>
                            <UITarget targetId="checkout.payment.billingAddress.after" />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                type="submit"
                                disabled={isLoading || (form.formState.isSubmitted && !form.formState.isValid)}
                                size="lg"
                                className="min-w-48"
                                onClick={() => {
                                    if (!form.formState.isValid) {
                                        // Trigger validation manually to update error state
                                        void form.trigger();
                                    }
                                }}>
                                {isLoading ? t('payment.saving') : t('payment.continue')}
                            </Button>
                        </div>
                    </form>
                </Form>
            </ToggleCardEdit>

            <ToggleCardSummary>
                <div className="space-y-4">
                    {/* Payment Method */}
                    <div className="space-y-2">
                        {paymentMethod ? (
                            <Typography variant="small" className="text-muted-foreground">
                                {t('payment.summaryLabel', {
                                    methodLabel: getCardTypeDisplay(paymentMethod),
                                    lastDigits: getLastFourDigits(
                                        paymentMethod.paymentCard?.numberLastDigits ||
                                            paymentMethod.paymentCard?.maskedNumber
                                    ),
                                })}
                            </Typography>
                        ) : savedPaymentMethods.length > 0 ? (
                            <Typography variant="small" className="text-muted-foreground">
                                {t('payment.summarySavedLabel', {
                                    methodLabel: selectedSavedMethod?.cardType || t('payment.defaultCardLabel'),
                                    lastDigits: getLastFourDigits(selectedSavedMethod?.maskedNumber),
                                })}
                            </Typography>
                        ) : (
                            <Typography variant="small" className="text-muted-foreground">
                                {t('payment.noPaymentMethodSaved')}
                            </Typography>
                        )}
                    </div>

                    {/* Billing Address */}
                    <div className="space-y-2">
                        <Typography variant="h6" className="text-foreground font-semibold">
                            {t('payment.billingSummaryTitle')}
                        </Typography>
                        {billingAddress && !isBillingSameAsShipping(billingAddress, shippingAddress) ? (
                            <div className="space-y-2">
                                <Typography variant="small" className="text-muted-foreground">
                                    {billingAddress.firstName} {billingAddress.lastName}
                                </Typography>
                                <Typography variant="small" className="text-muted-foreground">
                                    {billingAddress.address1}
                                </Typography>
                                {billingAddress.address2 && (
                                    <Typography variant="small" className="text-muted-foreground">
                                        {billingAddress.address2}
                                    </Typography>
                                )}
                                <Typography variant="small" className="text-muted-foreground">
                                    {billingAddress.city}
                                    {billingAddress.stateCode && `, ${billingAddress.stateCode}`}{' '}
                                    {billingAddress.postalCode}
                                </Typography>
                            </div>
                        ) : (
                            <Typography variant="small" className="text-muted-foreground">
                                {showBillingSameAsShipping
                                    ? t('payment.sameAsShippingAddress')
                                    : t('payment.noBillingAddressSaved')}
                            </Typography>
                        )}
                    </div>
                </div>
            </ToggleCardSummary>
        </ToggleCard>
    );
}
