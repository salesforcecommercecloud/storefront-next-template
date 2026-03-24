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
import { useMemo, useRef, useCallback, useEffect, useState, useContext, lazy, Suspense, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFetcher, useResolvedPath, useRevalidator } from 'react-router';
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
import type { AuthorizePasswordlessEmailResponse } from '@/routes/action.authorize-passwordless-email';
import CheckoutErrorBanner from './checkout-error-banner';
import { getCheckoutDisplayError } from './checkout-display-error';
import { useTranslation } from 'react-i18next';
import { useCheckoutContext } from '@/hooks/use-checkout';
import { formatPhoneInput, stripCountryCode, formatPhoneDisplay, extractCountryCode } from '@/lib/phone-utils';
import type { OtpFlowActiveRef } from '@/hooks/use-checkout-actions';
import { Spinner } from '@/components/spinner';
import { ConfigContext } from '@salesforce/storefront-next-runtime/config';

const OtpModal = lazy(() => import('@/components/login/otp-modal'));

interface ContactInfoProps {
    onSubmit: (data: ContactInfoData) => void;
    isLoading: boolean;
    actionData?: CheckoutActionData;
    onRegisteredUserChoseGuest?: (isGuest: boolean) => void;
    /** When set, kept in sync so checkout does not advance from contact while OTP modal is open or authorize in flight. */
    otpFlowActiveRef?: OtpFlowActiveRef;
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
    otpFlowActiveRef,
    isCompleted: _isCompleted,
    isEditing,
    onEdit,
}: ContactInfoProps) {
    const cart = useBasket();
    const loginSuggestion = useLoginSuggestion();
    const customerProfile = useCustomerProfile();
    const { shipmentDistribution, exitEditMode } = useCheckoutContext();
    const { t } = useTranslation('checkout');
    const appConfig = useContext(ConfigContext);

    const customerContactInfo = getContactInfoFromCustomer(customerProfile);

    const schema = useMemo(() => createContactInfoSchema(t), [t]);
    const contactFormError = getCheckoutDisplayError(actionData, 'contactInfo');

    const authorizePasswordlessEmailPath = useResolvedPath('/action/authorize-passwordless-email').pathname;
    const revalidator = useRevalidator();
    const passwordlessEmailFetcher = useFetcher<AuthorizePasswordlessEmailResponse>({
        key: 'contact-authorize-passwordless-email',
    });
    const lastEmailSentRef = useRef<string | null>(null);
    const otpSuccessRevalidatingRef = useRef(false);
    const [isOtpOpen, setIsOtpOpen] = useState(false);
    const [otpModalEmail, setOtpModalEmail] = useState('');

    const form = useForm<ContactInfoData, void, ContactInfoData>({
        resolver: zodResolver(schema),
        defaultValues: {
            email: cart?.customerInfo?.email || customerContactInfo.email || '',
            countryCode: extractCountryCode(
                String(cart?.billingAddress?.phone || cart?.customerInfo?.phone || customerContactInfo.phone || '')
            ),
            phone: stripCountryCode(
                String(cart?.billingAddress?.phone || cart?.customerInfo?.phone || customerContactInfo.phone || '')
            ),
        },
    });

    const handleFormSubmit = (data: ContactInfoData) => {
        onSubmit(data);
    };

    const handleEmailBlur = useCallback(
        (e: React.FocusEvent<HTMLInputElement>, fieldOnBlur: (e: React.FocusEvent<HTMLInputElement>) => void) => {
            fieldOnBlur(e);
            const raw = (e?.target?.value ?? form.getValues('email'))?.trim() ?? '';
            if (!raw) return;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return;
            const normalized = raw.toLowerCase();
            if (lastEmailSentRef.current === normalized) return;
            if (passwordlessEmailFetcher.state === 'submitting' || passwordlessEmailFetcher.state === 'loading') return;
            lastEmailSentRef.current = normalized;
            const formData = new FormData();
            formData.append('email', raw);
            void passwordlessEmailFetcher.submit(formData, {
                method: 'POST',
                action: authorizePasswordlessEmailPath,
            });
            // Set immediately so "Continue" submit that follows blur does not advance to shipping before OTP modal
            if (otpFlowActiveRef) otpFlowActiveRef.current = true;
        },
        [form, passwordlessEmailFetcher, authorizePasswordlessEmailPath, otpFlowActiveRef]
    );

    // When authorize (blur) succeeds, open OTP modal so user can enter the code
    useEffect(() => {
        const { state, data } = passwordlessEmailFetcher;
        if (state === 'idle' && data?.success === true && data?.email) {
            setOtpModalEmail(data.email);
            setIsOtpOpen(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only open modal when state/data from last submit
    }, [passwordlessEmailFetcher.state, passwordlessEmailFetcher.data?.success, passwordlessEmailFetcher.data?.email]);

    const handleOtpSuccess = useCallback(() => {
        otpSuccessRevalidatingRef.current = true;
        void revalidator.revalidate();
        // Clear immediately so useCheckoutActions can exit contact step (ref sync effect runs next render)
        if (otpFlowActiveRef) otpFlowActiveRef.current = false;
        setIsOtpOpen(false);
    }, [revalidator, otpFlowActiveRef]);

    // After OTP login, revalidate runs the checkout loader (prefill). When it finishes, clear edit
    // mode so the step advances to computedStep (e.g. REVIEW_ORDER) and summary view shows.
    useEffect(() => {
        if (otpSuccessRevalidatingRef.current && revalidator.state === 'idle') {
            otpSuccessRevalidatingRef.current = false;
            exitEditMode();
        }
    }, [revalidator.state, exitEditMode]);

    const handleResendOtp = useCallback(() => {
        const email = form.getValues('email')?.trim() || otpModalEmail;
        if (!email) return Promise.resolve();
        lastEmailSentRef.current = null;
        const fd = new FormData();
        fd.append('email', email);
        void passwordlessEmailFetcher.submit(fd, { method: 'POST', action: authorizePasswordlessEmailPath });
        return Promise.resolve();
    }, [form, otpModalEmail, passwordlessEmailFetcher, authorizePasswordlessEmailPath]);

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

    const isSendingOtp =
        passwordlessEmailFetcher.state === 'submitting' || passwordlessEmailFetcher.state === 'loading';

    // Keep parent ref in sync so checkout does not advance to shipping while OTP modal is open or authorize in flight
    useEffect(() => {
        if (otpFlowActiveRef) {
            otpFlowActiveRef.current = isSendingOtp || isOtpOpen;
        }
    }, [otpFlowActiveRef, isSendingOtp, isOtpOpen]);

    const otpLength = (appConfig?.auth as { otpLength?: number } | undefined)?.otpLength ?? 6;

    return (
        <>
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
                                        <FormLabel className="text-base font-medium text-foreground data-[error=true]:text-xl data-[error=true]:font-bold">
                                            {t('contactInfo.emailLabel')}
                                        </FormLabel>
                                        <div className="relative">
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder={t('contactInfo.emailPlaceholder')}
                                                    autoComplete="email"
                                                    autoFocus={isEditing}
                                                    disabled={isSendingOtp}
                                                    className="h-12 text-base border-2 border-[#9ca3af] dark:border-input focus:border-primary transition-colors text-foreground bg-background pr-12"
                                                    {...field}
                                                    onBlur={(e) => handleEmailBlur(e, field.onBlur)}
                                                />
                                            </FormControl>
                                            {isSendingOtp && (
                                                <div
                                                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                                                    aria-hidden>
                                                    <Spinner size="sm" className="text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <FormMessage className="text-xl font-bold" />
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
                                                    <NativeSelect
                                                        aria-label={t('contactInfo.countryCodeLabel')}
                                                        value={field.value}
                                                        onChange={(e) => field.onChange(e.target.value)}
                                                        className="h-12 text-base border-2 border-[#9ca3af] dark:border-input focus:border-primary transition-colors text-foreground bg-background">
                                                        <option value="" disabled>
                                                            +1
                                                        </option>
                                                        {getCommonPhoneCountryCodes()
                                                            .filter(
                                                                (c, i, arr) =>
                                                                    arr.findIndex(
                                                                        (x) => x.dialingCode === c.dialingCode
                                                                    ) === i
                                                            )
                                                            .map((phoneCountry) => (
                                                                <option
                                                                    key={`${phoneCountry.dialingCode}-${phoneCountry.countryName}`}
                                                                    value={phoneCountry.dialingCode}>
                                                                    {phoneCountry.dialingCode}
                                                                </option>
                                                            ))}
                                                    </NativeSelect>
                                                </FormControl>
                                                <FormMessage className="text-xl font-bold" />
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
                                                        aria-label={t('contactInfo.phoneLabel')}
                                                        placeholder={t('contactInfo.phonePlaceholder')}
                                                        autoComplete="tel-national"
                                                        className="h-12 text-base border-2 border-[#9ca3af] dark:border-input focus:border-primary transition-colors text-foreground bg-background"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) =>
                                                            field.onChange(formatPhoneInput(e.target.value))
                                                        }
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xl font-bold" />
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
                                    {nextStepButtonLabel}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </ToggleCardEdit>

                <ToggleCardSummary>
                    <div className="space-y-2">
                        <Typography variant="small" className="text-muted-foreground">
                            {cart?.customerInfo?.email ||
                                (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('checkoutEmail')) ||
                                t('contactInfo.notProvided')}
                        </Typography>

                        {/* Show phone number for guest users only */}
                        {!customerProfile && cart?.customerInfo?.phone && (
                            <Typography variant="p" className="font-medium">
                                {formatPhoneDisplay(
                                    String(cart.customerInfo.phone ?? ''),
                                    form.getValues('countryCode') || '+1'
                                )}
                            </Typography>
                        )}

                        {loginSuggestion.shouldSuggestLogin && (
                            <Typography variant="small" className="text-accent-foreground">
                                {t('contactInfo.loginSuggestion')}
                                <a href="/login" className="underline hover:no-underline">
                                    {t('contactInfo.loginSuggestionLink')}
                                </a>
                            </Typography>
                        )}
                        {loginSuggestion.isCurrentUser && (
                            <Typography variant="small" className="text-success-foreground">
                                {t('contactInfo.usingRegisteredAccount')}
                            </Typography>
                        )}
                    </div>
                </ToggleCardSummary>
            </ToggleCard>

            {isOtpOpen && (
                <Suspense fallback={null}>
                    <OtpModal
                        isOpen={isOtpOpen}
                        onClose={() => setIsOtpOpen(false)}
                        email={otpModalEmail}
                        onSuccess={handleOtpSuccess}
                        onResendCode={handleResendOtp}
                        otpLength={otpLength}
                    />
                </Suspense>
            )}
        </>
    );
}
