import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ToggleCard, ToggleCardEdit, ToggleCardSummary } from '@/components/toggle-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectNative } from '@/components/ui/select-native';
import { Typography } from '@/components/typography';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useBasket } from '@/providers/basket';
import { contactInfoSchema, type ContactInfoData } from '@/lib/checkout-schemas';
import { useLoginSuggestion } from '@/hooks/use-customer-lookup';
import { useCustomerProfile } from '@/hooks/checkout/use-customer-profile';
import { getContactInfoFromCustomer } from '@/lib/customer-profile-utils';
import { getCommonPhoneCountryCodes } from '@/lib/country-codes';
import uiStrings from '@/temp-ui-string';
import type { CheckoutActionData } from '../types';
import type { ReactNode } from 'react';

interface ContactInfoProps {
    onSubmit: (data: ContactInfoData) => void;
    isLoading: boolean;
    actionData?: CheckoutActionData;
    onRegisteredUserChoseGuest?: (isGuest: boolean) => void;
    // Step state managed by container
    isCompleted: boolean;
    isEditing: boolean;
    onEdit: () => void;
}

export default function ContactInfo({
    onSubmit,
    isLoading,
    actionData,
    onRegisteredUserChoseGuest: _onRegisteredUserChoseGuest,
    isCompleted: _isCompleted,
    isEditing,
    onEdit,
}: ContactInfoProps) {
    const cart = useBasket();
    const loginSuggestion = useLoginSuggestion();
    const customerProfile = useCustomerProfile();

    // Get auto-populated contact info from customer profile
    const customerContactInfo = getContactInfoFromCustomer(customerProfile);

    const form = useForm<ContactInfoData>({
        resolver: zodResolver(contactInfoSchema),
        defaultValues: {
            email: cart?.customerInfo?.email || customerContactInfo.email || '',
            countryCode: '',
            phone: customerContactInfo.phone || '',
        },
    });

    const handleFormSubmit = (data: ContactInfoData) => {
        onSubmit(data);
    };

    const stepTitle: ReactNode = (
        <span className="text-lg font-semibold text-foreground">{uiStrings.checkout.contactInfo.title}</span>
    );

    return (
        <ToggleCard
            id="contact-info"
            title={stepTitle}
            editing={isEditing}
            onEdit={onEdit}
            editLabel={uiStrings.checkout.common.edit}
            isLoading={isLoading}>
            <ToggleCardEdit>
                <Form {...form}>
                    <form onSubmit={(e) => void form.handleSubmit(handleFormSubmit)(e)} className="space-y-6">
                        {actionData?.formError && actionData.step === 'contactInfo' && (
                            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
                                {actionData.formError}
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder={uiStrings.checkout.contactInfo.emailPlaceholder}
                                            autoComplete="email"
                                            autoFocus={isEditing}
                                            className="h-12 text-base border-2 focus:border-primary transition-colors"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Phone field - only show for guest users */}
                        {!customerProfile && (
                            <div className="flex gap-2">
                                <FormField
                                    control={form.control}
                                    name="countryCode"
                                    render={({ field }) => (
                                        <FormItem className="w-24">
                                            <FormControl>
                                                <SelectNative
                                                    aria-label={uiStrings.checkout.contactInfo.countryCodeLabel}
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(e.target.value)}
                                                    className="h-12 text-base border-2 focus:border-primary transition-colors">
                                                    <option value="" disabled>
                                                        +1
                                                    </option>
                                                    {getCommonPhoneCountryCodes().map((phoneCountry) => (
                                                        <option
                                                            key={`${phoneCountry.dialingCode}-${phoneCountry.countryName}`}
                                                            value={phoneCountry.dialingCode}>
                                                            {phoneCountry.dialingCode}
                                                        </option>
                                                    ))}
                                                </SelectNative>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl>
                                                <Input
                                                    type="tel"
                                                    placeholder={uiStrings.checkout.contactInfo.phonePlaceholder}
                                                    autoComplete="tel-national"
                                                    className="h-12 text-base border-2 focus:border-primary transition-colors"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <Button
                                type="submit"
                                disabled={isLoading || !form.formState.isValid}
                                size="lg"
                                className="min-w-56 h-12 text-base font-semibold">
                                {isLoading
                                    ? uiStrings.checkout.contactInfo.saving
                                    : uiStrings.checkout.contactInfo.continue}
                            </Button>
                        </div>
                    </form>
                </Form>
            </ToggleCardEdit>

            <ToggleCardSummary>
                <div className="space-y-2">
                    <Typography variant="p" className="font-medium">
                        {cart?.customerInfo?.email ||
                            (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('checkoutEmail')) ||
                            uiStrings.checkout.contactInfo.notProvided}
                    </Typography>

                    {/* Show phone number for guest users only */}
                    {!customerProfile && cart?.customerInfo?.phone && (
                        <Typography variant="p" className="font-medium">
                            {cart.customerInfo.phone}
                        </Typography>
                    )}

                    {loginSuggestion.shouldSuggestLogin && (
                        <Typography variant="small" className="text-accent-foreground">
                            {uiStrings.checkout.contactInfo.loginSuggestion}
                            <a href="/login" className="underline hover:no-underline">
                                {uiStrings.checkout.contactInfo.loginSuggestionLink}
                            </a>
                        </Typography>
                    )}
                    {loginSuggestion.isCurrentUser && (
                        <Typography variant="small" className="text-success-foreground">
                            {uiStrings.checkout.contactInfo.usingRegisteredAccount}
                        </Typography>
                    )}
                </div>
            </ToggleCardSummary>
        </ToggleCard>
    );
}
