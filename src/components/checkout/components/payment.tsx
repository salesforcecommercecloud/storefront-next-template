import { useForm } from 'react-hook-form';
import { useState, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ToggleCard, ToggleCardEdit, ToggleCardSummary } from '@/components/toggle-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Typography } from '@/components/typography';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useBasket } from '@/providers/basket';
import { createPaymentSchema, getPaymentDefaultValues, type PaymentData } from '@/lib/checkout-schemas';
import { formatCardNumber, formatExpiryDate } from '@/lib/form-utils';
import { getCardTypeDisplay, detectCardType, getLastFourDigits } from '@/lib/payment-utils';
import { getCardIcon } from '@/lib/card-icon-utils';
import { useCustomerProfile } from '@/hooks/checkout/use-customer-profile';
import { getPaymentMethodsFromCustomer } from '@/lib/customer-profile-utils';
import type { CheckoutActionData } from '../types';
import { useTranslation } from 'react-i18next';
// @sfdc-extension-line SFDC_EXT_BOPIS
import { isStorePickup } from '@/extensions/bopis/lib/basket-utils';

interface PaymentProps {
    onSubmit: (data: PaymentData) => void;
    isLoading: boolean;
    actionData?: CheckoutActionData;
    // Step state managed by container
    isCompleted: boolean;
    isEditing: boolean;
    onEdit: () => void;
}

export default function Payment({
    onSubmit,
    isLoading,
    actionData,
    isCompleted: _isCompleted,
    isEditing,
    onEdit,
}: PaymentProps) {
    const cart = useBasket();
    const customerProfile = useCustomerProfile();
    const [detectedCardType, setDetectedCardType] = useState<string>('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('new'); // 'new' or payment method ID
    let showBillingSameAsShipping = true;
    // @sfdc-extension-line SFDC_EXT_BOPIS
    showBillingSameAsShipping = !isStorePickup(cart);
    const { t } = useTranslation('checkout');

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
                        {actionData?.fieldErrors && (
                            <div className="space-y-2">
                                {Object.entries(actionData.fieldErrors).map(([field, error]) => (
                                    <div
                                        key={field}
                                        className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-xl font-bold">
                                        {error}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Payment Method Section */}
                        <div className="space-y-4">
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
                                                                        •••• {getLastFourDigits(method.maskedNumber)}
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

                                    <FormField
                                        control={form.control}
                                        name="cardNumber"
                                        render={({ field }) => {
                                            const CardIcon = getCardIcon(
                                                detectedCardType || t('payment.unknownCardType')
                                            );
                                            return (
                                                <FormItem>
                                                    <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                                        {t('payment.cardNumberLabel')}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1">
                                                                <Input
                                                                    placeholder={t('payment.cardNumberPlaceholder')}
                                                                    autoComplete="cc-number"
                                                                    maxLength={23} // 19 digits + 4 spaces
                                                                    autoFocus={
                                                                        isEditing && selectedPaymentMethod === 'new'
                                                                    }
                                                                    {...field}
                                                                    onChange={(e) => {
                                                                        const formatted = formatCardNumber(
                                                                            e.target.value
                                                                        );
                                                                        field.onChange(formatted);
                                                                        // Detect card type in real-time
                                                                        const cardType = detectCardType(e.target.value);
                                                                        setDetectedCardType(cardType);
                                                                    }}
                                                                />
                                                            </div>
                                                            {detectedCardType &&
                                                                detectedCardType !== t('payment.unknownCardType') && (
                                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                                                                        <CardIcon className="w-8 h-5 flex-shrink-0" />
                                                                        <span className="font-medium">
                                                                            {detectedCardType}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="text-xl font-bold" />
                                                </FormItem>
                                            );
                                        }}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="cardholderName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                                    {t('payment.cardholderLabel')}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t('payment.cardholderPlaceholder')}
                                                        autoComplete="cc-name"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xl font-bold" />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="expiryDate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                                        {t('payment.expiryLabel')}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={t('payment.expiryPlaceholder')}
                                                            autoComplete="cc-exp"
                                                            maxLength={5} // MM/YY
                                                            {...field}
                                                            onChange={(e) => {
                                                                const formatted = formatExpiryDate(e.target.value);
                                                                field.onChange(formatted);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xl font-bold" />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="cvv"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                                        {t('payment.cvvLabel')}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={t('payment.cvvPlaceholder')}
                                                            autoComplete="cc-csc"
                                                            maxLength={4} // Max 4 digits for CVV
                                                            {...field}
                                                            onChange={(e) => {
                                                                // Only allow digits
                                                                const digits = e.target.value.replace(/\D/g, '');
                                                                field.onChange(digits);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xl font-bold" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Billing Address Section */}
                        <div className="space-y-4">
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
                                                        <Typography variant="small" className="text-muted-foreground">
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="billingFirstName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                                        {t('shippingAddress.firstNameLabel')}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={t('shippingAddress.firstNamePlaceholder')}
                                                            autoComplete="billing given-name"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xl font-bold" />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="billingLastName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                                        {t('shippingAddress.lastNameLabel')}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={t('shippingAddress.lastNamePlaceholder')}
                                                            autoComplete="billing family-name"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xl font-bold" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="billingAddress1"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                                    {t('shippingAddress.addressLabel')}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t('shippingAddress.addressPlaceholder')}
                                                        autoComplete="billing address-line1"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xl font-bold" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="billingAddress2"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                                    {t('shippingAddress.address2Label')}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t('shippingAddress.address2Placeholder')}
                                                        autoComplete="billing address-line2"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xl font-bold" />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="billingCity"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                                        {t('shippingAddress.cityLabel')}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={t('shippingAddress.cityPlaceholder')}
                                                            autoComplete="billing address-level2"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xl font-bold" />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="billingStateCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                                        {t('shippingAddress.stateLabel')}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={t('shippingAddress.statePlaceholder')}
                                                            autoComplete="billing address-level1"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xl font-bold" />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="billingPostalCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="data-[error=true]:text-xl data-[error=true]:font-bold">
                                                        {t('shippingAddress.zipLabel')}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={t('shippingAddress.zipPlaceholder')}
                                                            autoComplete="billing postal-code"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xl font-bold" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}
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
