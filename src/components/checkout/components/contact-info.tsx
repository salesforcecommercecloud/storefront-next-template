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
import { useMemo, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ToggleCard, ToggleCardEdit, ToggleCardSummary } from '@/components/toggle-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Typography } from '@/components/typography';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useBasket } from '@/providers/basket';
import { createContactInfoSchema, type ContactInfoData } from '@/lib/checkout-schemas';
import { useLoginSuggestion } from '@/hooks/use-customer-lookup';
import { useCustomerProfile } from '@/hooks/checkout/use-customer-profile';
import { getContactInfoFromCustomer } from '@/lib/customer-profile-utils';
import { getCommonPhoneCountryCodes } from '@/lib/country-codes';
import type { CheckoutActionData } from '../types';
import CheckoutErrorBanner from './checkout-error-banner';
import { getCheckoutDisplayError } from './checkout-display-error';
import { useTranslation } from 'react-i18next';
import { useCheckoutContext } from '@/hooks/use-checkout';

const formatPhoneInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 10);

    if (limited.length >= 7) {
        return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
    } else if (limited.length >= 4) {
        return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
    } else if (limited.length > 0) {
        return `(${limited}`;
    }
    return limited;
};

const formatPhoneDisplay = (phone: string, countryCode = '+1'): string => {
    const digits = phone.replace(/\D/g, '');
    const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits.slice(0, 10);

    if (local.length === 10) {
        return `${countryCode} (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
    }
    return phone;
};

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
    const { shipmentDistribution } = useCheckoutContext();
    const { t } = useTranslation('checkout');

    const customerContactInfo = getContactInfoFromCustomer(customerProfile);
    const summaryPhone = String(
        customerContactInfo.phone || cart?.billingAddress?.phone || cart?.customerInfo?.phone || ''
    );

    const schema = useMemo(() => createContactInfoSchema(t), [t]);
    const contactFormError = getCheckoutDisplayError(actionData, 'contactInfo');

    const form = useForm<ContactInfoData, void, ContactInfoData>({
        resolver: zodResolver(schema),
        defaultValues: {
            email: cart?.customerInfo?.email || customerContactInfo.email || '',
            countryCode: '+1',
            phone: String(cart?.billingAddress?.phone || cart?.customerInfo?.phone || customerContactInfo.phone || ''),
        },
    });

    const countryCodeOptions = useMemo(
        () =>
            getCommonPhoneCountryCodes()
                .filter((c, i, arr) => arr.findIndex((x) => x.dialingCode === c.dialingCode) === i)
                .map((c) => (
                    <option key={c.dialingCode} value={c.dialingCode}>
                        {c.dialingCode}
                    </option>
                )),
        []
    );

    const handleFormSubmit = (data: ContactInfoData) => {
        onSubmit(data);
    };

    let nextStepButtonLabel = isLoading ? t('contactInfo.saving') : t('contactInfo.continue');

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const hasPickupItems = shipmentDistribution.hasPickupItems;

    const { t: tBopis } = useTranslation('extBopis');
    if (!isLoading && hasPickupItems) {
        nextStepButtonLabel = tBopis('checkout.contactInfo.continueToPickup');
    }
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    const stepTitle = (
        <span className="text-2xl font-bold tracking-[-0.6px] text-card-foreground">{t('contactInfo.title')}</span>
    );

    return (
        <ToggleCard
            id="contact-info"
            title={stepTitle as ReactNode}
            editing={isEditing}
            onEdit={onEdit}
            editLabel={t('common.edit')}
            disableEdit={!!customerProfile}
            showHeaderSeparator
            isLoading={isLoading}>
            <ToggleCardEdit>
                <Form {...form}>
                    <form
                        onSubmit={(e) => void form.handleSubmit(handleFormSubmit)(e)}
                        className="flex flex-col gap-4 pt-2"
                        noValidate>
                        {contactFormError && <CheckoutErrorBanner message={contactFormError} />}

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('contactInfo.emailLabel')}*</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder={t('contactInfo.emailPlaceholder')}
                                            autoComplete="email"
                                            autoFocus={isEditing}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex items-start gap-2">
                            <FormField
                                control={form.control}
                                name="countryCode"
                                render={({ field }) => (
                                    <FormItem className="w-20">
                                        <FormLabel>{t('contactInfo.countryCodeLabel')}</FormLabel>
                                        <FormControl>
                                            <NativeSelect
                                                aria-label={t('contactInfo.countryCodeLabel')}
                                                value={field.value}
                                                onChange={(e) => field.onChange(e.target.value)}>
                                                {countryCodeOptions}
                                            </NativeSelect>
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
                                        <FormLabel>{t('contactInfo.phoneLabel')}*</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="tel"
                                                inputMode="numeric"
                                                placeholder={t('contactInfo.phonePlaceholder')}
                                                autoComplete="tel-national"
                                                maxLength={14}
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(formatPhoneInput(e.target.value));
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Button type="submit" disabled={isLoading} className="w-full">
                            {nextStepButtonLabel}
                        </Button>
                    </form>
                </Form>
            </ToggleCardEdit>

            <ToggleCardSummary>
                <div className="text-sm font-normal leading-5 text-foreground">
                    <p>
                        {customerContactInfo.email ||
                            cart?.customerInfo?.email ||
                            (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('checkoutEmail')) ||
                            t('contactInfo.notProvided')}
                    </p>
                    {summaryPhone && <p>{formatPhoneDisplay(summaryPhone)}</p>}

                    {!customerProfile && loginSuggestion.shouldSuggestLogin && (
                        <Typography variant="small" className="text-accent-foreground">
                            {t('contactInfo.loginSuggestion')}
                            <a href="/login" className="underline hover:no-underline">
                                {t('contactInfo.loginSuggestionLink')}
                            </a>
                        </Typography>
                    )}
                </div>
            </ToggleCardSummary>
        </ToggleCard>
    );
}
