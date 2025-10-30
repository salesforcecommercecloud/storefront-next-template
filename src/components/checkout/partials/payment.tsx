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
import { paymentSchema, getPaymentDefaultValues, type PaymentData } from '@/lib/checkout-schemas';
import { formatCardNumber, formatExpiryDate } from '@/lib/form-utils';
import { getFormattedMaskedCardNumber, getCardTypeDisplay, detectCardType } from '@/lib/payment-utils';
import { getCardIcon } from '@/lib/card-icon-utils';
import { useCustomerProfile } from '@/hooks/checkout/use-customer-profile';
import { getPaymentMethodsFromCustomer } from '@/lib/customer-profile-utils';
import uiStrings from '@/temp-ui-string';
import type { CheckoutActionData } from '../types';

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

    // Get customer's saved payment methods
    const savedPaymentMethods = getPaymentMethodsFromCustomer(customerProfile);

    // Set default payment method selection - prefer the customer's preferred payment method
    useEffect(() => {
        if (savedPaymentMethods.length > 0) {
            const preferredMethod = savedPaymentMethods.find((method) => method.preferred);
            if (preferredMethod) {
                setSelectedPaymentMethod(preferredMethod.id);
            } else {
                setSelectedPaymentMethod(savedPaymentMethods[0].id);
            }
        }
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
        };

        return computedDefaults;
    }, [selectedPaymentMethod, shippingAddress, paymentMethod, savedPaymentMethods.length]);

    const form = useForm<PaymentData>({
        resolver: zodResolver(paymentSchema),
        defaultValues,
        mode: 'onSubmit', // Only validate on submit, not on change/blur
    });

    // Update form values when selectedPaymentMethod changes
    useEffect(() => {
        const isUsingSavedPayment = selectedPaymentMethod !== 'new';

        // Update form values directly
        form.setValue('useSavedPaymentMethod', isUsingSavedPayment);
        form.setValue('selectedSavedPaymentMethod', isUsingSavedPayment ? selectedPaymentMethod : undefined);

        // Only trigger validation if using saved payment method
        // For new payment methods, let validation happen on submit
        if (isUsingSavedPayment) {
            setTimeout(() => {
                void form.trigger();
            }, 0);
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

    const stepTitle = <span className="text-lg font-semibold text-foreground">{uiStrings.checkout.payment.title}</span>;

    return (
        <ToggleCard
            id="payment"
            title={stepTitle as React.ReactNode}
            editing={isEditing}
            onEdit={onEdit}
            editLabel={uiStrings.checkout.common.edit}
            isLoading={isLoading}>
            <ToggleCardEdit>
                <Form {...form}>
                    <form onSubmit={(e) => void form.handleSubmit(handleFormSubmit)(e)} className="space-y-6">
                        {actionData?.fieldErrors && (
                            <div className="space-y-2">
                                {Object.entries(actionData.fieldErrors).map(([field, error]) => (
                                    <div
                                        key={field}
                                        className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
                                        {error}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Payment Method Section */}
                        <div className="space-y-4">
                            <Typography variant="h4" as="h3">
                                Payment Method
                            </Typography>

                            {/* Saved Payment Methods */}
                            {savedPaymentMethods.length > 0 && (
                                <div className="space-y-4">
                                    <Typography variant="p" className="text-muted-foreground">
                                        Choose a saved payment method or add a new one
                                    </Typography>
                                    <RadioGroup
                                        value={selectedPaymentMethod}
                                        onValueChange={setSelectedPaymentMethod}
                                        className="space-y-3">
                                        {savedPaymentMethods.map((method) => {
                                            const CardIcon = getCardIcon(method.cardType || 'Unknown');
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
                                                                        {method.cardType || 'Unknown'}
                                                                    </span>
                                                                    <span className="text-muted-foreground">
                                                                        •••• {method.maskedNumber?.slice(-4) || '****'}
                                                                    </span>
                                                                    {method.preferred && (
                                                                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                                                            Preferred
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {method.cardholderName}
                                                                    {method.expirationMonth &&
                                                                        method.expirationYear && (
                                                                            <span className="ml-2">
                                                                                Expires{' '}
                                                                                {String(
                                                                                    method.expirationMonth
                                                                                ).padStart(2, '0')}
                                                                                /
                                                                                {String(method.expirationYear).slice(
                                                                                    -2
                                                                                )}
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
                                                    <span className="font-medium">Add new payment method</span>
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
                                            New Payment Method
                                        </Typography>
                                    )}

                                    <FormField
                                        control={form.control}
                                        name="cardNumber"
                                        render={({ field }) => {
                                            const CardIcon = getCardIcon(detectedCardType);
                                            return (
                                                <FormItem>
                                                    <FormLabel>{uiStrings.checkout.payment.cardNumberLabel}</FormLabel>
                                                    <FormControl>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1">
                                                                <Input
                                                                    placeholder={
                                                                        uiStrings.checkout.payment.cardNumberPlaceholder
                                                                    }
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
                                                            {detectedCardType && detectedCardType !== 'Unknown' && (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                                                                    <CardIcon className="w-8 h-5 flex-shrink-0" />
                                                                    <span className="font-medium">
                                                                        {detectedCardType}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            );
                                        }}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="cardholderName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{uiStrings.checkout.payment.cardholderLabel}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={uiStrings.checkout.payment.cardholderPlaceholder}
                                                        autoComplete="cc-name"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="expiryDate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{uiStrings.checkout.payment.expiryLabel}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={uiStrings.checkout.payment.expiryPlaceholder}
                                                            autoComplete="cc-exp"
                                                            maxLength={5} // MM/YY
                                                            {...field}
                                                            onChange={(e) => {
                                                                const formatted = formatExpiryDate(e.target.value);
                                                                field.onChange(formatted);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="cvv"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{uiStrings.checkout.payment.cvvLabel}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={uiStrings.checkout.payment.cvvPlaceholder}
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
                                                    <FormMessage />
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
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                        {uiStrings.checkout.payment.billingSameAsShipping}
                                                    </FormLabel>
                                                    <Typography variant="small" className="text-muted-foreground">
                                                        {uiStrings.checkout.payment.billingSameAsShippingDescription}
                                                    </Typography>
                                                </div>
                                            </div>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            {!billingSameAsShipping && (
                                <div className="space-y-4">
                                    <Typography variant="h4" as="h3">
                                        Billing Address
                                    </Typography>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="billingFirstName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        {uiStrings.checkout.shippingAddress.firstNameLabel}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={
                                                                uiStrings.checkout.shippingAddress.firstNamePlaceholder
                                                            }
                                                            autoComplete="billing given-name"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="billingLastName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        {uiStrings.checkout.shippingAddress.lastNameLabel}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={
                                                                uiStrings.checkout.shippingAddress.lastNamePlaceholder
                                                            }
                                                            autoComplete="billing family-name"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="billingAddress1"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{uiStrings.checkout.shippingAddress.addressLabel}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={
                                                            uiStrings.checkout.shippingAddress.addressPlaceholder
                                                        }
                                                        autoComplete="billing address-line1"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="billingAddress2"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {uiStrings.checkout.shippingAddress.address2Label}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={
                                                            uiStrings.checkout.shippingAddress.address2Placeholder
                                                        }
                                                        autoComplete="billing address-line2"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="billingCity"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        {uiStrings.checkout.shippingAddress.cityLabel}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={
                                                                uiStrings.checkout.shippingAddress.cityPlaceholder
                                                            }
                                                            autoComplete="billing address-level2"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="billingStateCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        {uiStrings.checkout.shippingAddress.stateLabel}
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={
                                                                uiStrings.checkout.shippingAddress.statePlaceholder
                                                            }
                                                            autoComplete="billing address-level1"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="billingPostalCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{uiStrings.checkout.shippingAddress.zipLabel}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder={
                                                                uiStrings.checkout.shippingAddress.zipPlaceholder
                                                            }
                                                            autoComplete="billing postal-code"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
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
                                {isLoading ? uiStrings.checkout.payment.saving : uiStrings.checkout.payment.continue}
                            </Button>
                        </div>
                    </form>
                </Form>
            </ToggleCardEdit>

            <ToggleCardSummary>
                <div className="space-y-4">
                    <div>
                        <Typography variant="small" className="text-muted-foreground">
                            Payment Method
                        </Typography>
                        {paymentMethod ? (
                            <div>
                                <Typography variant="p" className="font-medium">
                                    {getCardTypeDisplay(paymentMethod)}
                                </Typography>
                                <Typography variant="p" className="text-muted-foreground">
                                    {getFormattedMaskedCardNumber(paymentMethod)}
                                </Typography>
                            </div>
                        ) : savedPaymentMethods.length > 0 ? (
                            <div>
                                <Typography variant="p" className="font-medium">
                                    {savedPaymentMethods.find((method) => method.id === selectedPaymentMethod)
                                        ?.maskedNumber || savedPaymentMethods[0]?.maskedNumber}
                                </Typography>
                                <Typography variant="p" className="text-muted-foreground text-sm">
                                    Saved payment method
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
                        {billingAddress && !isBillingSameAsShipping(billingAddress, shippingAddress) ? (
                            <div className="space-y-1">
                                <div>
                                    <Typography variant="p" as="span" className="font-medium">
                                        {billingAddress.firstName} {billingAddress.lastName}
                                    </Typography>
                                </div>
                                <div>
                                    <Typography variant="p" as="span" className="text-muted-foreground">
                                        {billingAddress.address1}
                                    </Typography>
                                    {billingAddress.address2 && (
                                        <div>
                                            <Typography variant="p" as="span" className="text-muted-foreground">
                                                {billingAddress.address2}
                                            </Typography>
                                        </div>
                                    )}
                                    <div>
                                        <Typography variant="p" as="span" className="text-muted-foreground">
                                            {billingAddress.city}
                                            {billingAddress.stateCode && `, ${billingAddress.stateCode}`}{' '}
                                            {billingAddress.postalCode}
                                        </Typography>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Typography variant="p" as="span" className="font-medium">
                                Same as shipping address
                            </Typography>
                        )}
                    </div>
                </div>
            </ToggleCardSummary>
        </ToggleCard>
    );
}
