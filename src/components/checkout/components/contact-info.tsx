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
import { useTranslation } from 'react-i18next';
import { useCheckoutContext } from '@/hooks/use-checkout';
import {
    formatPhoneInput,
    stripNonDigits,
    stripCountryCode,
    formatPhoneDisplay,
    extractCountryCode,
} from '@/lib/phone-utils';
import type { OtpFlowActiveRef } from '@/hooks/use-checkout-actions';
import { Spinner } from '@/components/spinner';
import { ConfigContext } from '@salesforce/storefront-next-runtime/config';
import { TurnstileWidget } from '@/components/security/turnstile-widget';
import type { AppConfig } from '@/types/config';
import { getTurnstileSiteKey, isTurnstileEnabled } from '@/lib/turnstile-utils';

const OtpModal = lazy(() => import('@/components/login/otp-modal'));
const LoginModal = lazy(() => import('@/components/login/login-modal'));

interface ContactInfoProps {
    onSubmit: (data: ContactInfoData) => void;
    isLoading: boolean;
    actionData?: CheckoutActionData;
    onRegisteredUserChoseGuest?: (isGuest: boolean) => void;
    /** Called when shopper completes passwordless OTP at contact (sign-in). Resets UI that was applied for "checkout as guest" skip. */
    onPasswordlessOtpVerified?: () => void;
    /** When true, hide login hints in summary (used after "Checkout as guest" on passwordless OTP — treat as plain guest UX). */
    suppressRegisteredEmailLoginHints?: boolean;
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
    actionData: _actionData,
    onRegisteredUserChoseGuest,
    onPasswordlessOtpVerified,
    suppressRegisteredEmailLoginHints = false,
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
    const authorizePasswordlessEmailPath = useResolvedPath('/action/authorize-passwordless-email').pathname;
    const revalidator = useRevalidator();
    const passwordlessEmailFetcher = useFetcher<AuthorizePasswordlessEmailResponse>({
        key: 'contact-authorize-passwordless-email',
    });
    const lastEmailSentRef = useRef<string | null>(null);
    const otpSuccessRevalidatingRef = useRef(false);
    const [isOtpOpen, setIsOtpOpen] = useState(false);
    const [otpModalEmail, setOtpModalEmail] = useState('');
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const turnstileResetRef = useRef<(() => void) | null>(null);
    const turnstileExecuteRef = useRef<(() => void) | null>(null);
    const tokenConsumedRef = useRef(false);

    const turnstileEnabled = appConfig ? isTurnstileEnabled(appConfig as AppConfig) : false;
    const turnstileSiteKey = useMemo(() => {
        if (!appConfig || !turnstileEnabled) return null;
        if (typeof window !== 'undefined') {
            const baseUrl = `${window.location.protocol}//${window.location.host}`;
            return getTurnstileSiteKey(appConfig as AppConfig, baseUrl);
        }
        return null;
    }, [appConfig, turnstileEnabled]);

    const [showTurnstile, setShowTurnstile] = useState(false);

    const turnstilePending = !!(turnstileEnabled && turnstileSiteKey && !turnstileToken);

    const resetTurnstile = useCallback(() => {
        setTurnstileToken(null);
        turnstileResetRef.current?.();
    }, []);

    const handleTurnstileSuccess = useCallback((token: string) => {
        tokenConsumedRef.current = false;
        setTurnstileToken(token);
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('turnstileVerified', '1');
        }
    }, []);

    const handleTurnstileError = useCallback(() => {
        setTurnstileToken(null);
    }, []);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken(null);
    }, []);

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

    const formPhone = form.watch('phone');
    const formCountryCode = form.watch('countryCode');
    // Logged-in shoppers: always prefer the saved profile phone over any persisted cart value.
    // Guest shoppers: prefer what they entered in the form, falling back to cart data.
    const summaryPhone = customerProfile
        ? String(
              customerContactInfo.phone || cart?.billingAddress?.phone || cart?.customerInfo?.phone || formPhone || ''
          )
        : String(formPhone || cart?.billingAddress?.phone || cart?.customerInfo?.phone || '');
    const summaryCountryCode = formCountryCode || '+1';

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
        onSubmit({ ...data, phone: stripNonDigits(data.phone) });
    };

    const pendingEmailRef = useRef<string | null>(null);

    const handleEmailFocus = useCallback(() => {
        if (turnstileEnabled && !showTurnstile) {
            setShowTurnstile(true);
        }
    }, [turnstileEnabled, showTurnstile]);

    const handleEmailBlur = useCallback(
        (e: React.FocusEvent<HTMLInputElement>, fieldOnBlur: (e: React.FocusEvent<HTMLInputElement>) => void) => {
            fieldOnBlur(e);
            const raw = (e?.target?.value ?? form.getValues('email'))?.trim() ?? '';
            if (!raw) return;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return;
            const normalized = raw.toLowerCase();

            if (turnstileEnabled && !showTurnstile) {
                setShowTurnstile(true);
            }

            if (lastEmailSentRef.current === normalized) return;
            if (passwordlessEmailFetcher.state === 'submitting' || passwordlessEmailFetcher.state === 'loading') return;

            if (turnstileEnabled && (!turnstileToken || tokenConsumedRef.current)) {
                pendingEmailRef.current = raw;
                if (tokenConsumedRef.current) {
                    resetTurnstile();
                } else {
                    turnstileExecuteRef.current?.();
                }
                return;
            }

            lastEmailSentRef.current = normalized;
            const formData = new FormData();
            formData.append('email', raw);
            if (turnstileToken) {
                formData.append('turnstileToken', turnstileToken);
                tokenConsumedRef.current = true;
            }
            void passwordlessEmailFetcher.submit(formData, {
                method: 'POST',
                action: authorizePasswordlessEmailPath,
            });
            // Set immediately so "Continue" submit that follows blur does not advance to shipping before OTP modal
            if (otpFlowActiveRef) otpFlowActiveRef.current = true;
        },
        // Ref is stable; .current is mutated intentionally — omit from deps
        // eslint-disable-next-line react-hooks/exhaustive-deps -- otpFlowActiveRef
        [
            form,
            passwordlessEmailFetcher,
            authorizePasswordlessEmailPath,
            turnstileToken,
            turnstileEnabled,
            showTurnstile,
            resetTurnstile,
        ]
    );

    useEffect(() => {
        if (turnstileToken === null && pendingEmailRef.current && turnstileEnabled) {
            turnstileExecuteRef.current?.();
        }
    }, [turnstileToken, turnstileEnabled]);

    useEffect(() => {
        if (!turnstileToken || !pendingEmailRef.current || tokenConsumedRef.current) return;
        const raw = pendingEmailRef.current;
        const normalized = raw.toLowerCase();
        if (lastEmailSentRef.current === normalized) return;
        lastEmailSentRef.current = normalized;
        pendingEmailRef.current = null;

        const formData = new FormData();
        formData.append('email', raw);
        formData.append('turnstileToken', turnstileToken);
        tokenConsumedRef.current = true;
        void passwordlessEmailFetcher.submit(formData, {
            method: 'POST',
            action: authorizePasswordlessEmailPath,
        });
        if (otpFlowActiveRef) otpFlowActiveRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- otpFlowActiveRef is a ref
    }, [turnstileToken, passwordlessEmailFetcher, authorizePasswordlessEmailPath]);

    // When authorize (blur) succeeds, open OTP modal so user can enter the code
    useEffect(() => {
        const { state, data } = passwordlessEmailFetcher;
        if (state === 'idle' && data?.success === true && data?.email) {
            setOtpModalEmail(data.email);
            setIsOtpOpen(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only open modal when state/data from last submit
    }, [passwordlessEmailFetcher.state, passwordlessEmailFetcher.data?.success, passwordlessEmailFetcher.data?.email]);

    useEffect(() => {
        const { state, data } = passwordlessEmailFetcher;
        if (state === 'idle' && data?.requiresLogin === true) {
            setIsLoginModalOpen(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to requiresLogin flag
    }, [passwordlessEmailFetcher.state, passwordlessEmailFetcher.data?.requiresLogin]);

    const handleOtpSuccess = useCallback(
        () => {
            onPasswordlessOtpVerified?.();
            otpSuccessRevalidatingRef.current = true;
            void revalidator.revalidate();
            // Clear immediately so useCheckoutActions can exit contact step (ref sync effect runs next render)
            if (otpFlowActiveRef) otpFlowActiveRef.current = false;
            setIsOtpOpen(false);
        },
        // Ref is stable; .current is mutated intentionally — omit from deps
        // eslint-disable-next-line react-hooks/exhaustive-deps -- otpFlowActiveRef
        [onPasswordlessOtpVerified, revalidator]
    );

    const handleLoginModalSuccess = useCallback(
        () => {
            onPasswordlessOtpVerified?.();
            otpSuccessRevalidatingRef.current = true;
            void revalidator.revalidate();
            if (otpFlowActiveRef) otpFlowActiveRef.current = false;
            setIsLoginModalOpen(false);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps -- otpFlowActiveRef
        [onPasswordlessOtpVerified, revalidator]
    );

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
        if (turnstileToken) {
            fd.append('turnstileToken', turnstileToken);
        }
        void passwordlessEmailFetcher.submit(fd, { method: 'POST', action: authorizePasswordlessEmailPath });
        if (turnstileEnabled) resetTurnstile();
        return Promise.resolve();
    }, [
        form,
        otpModalEmail,
        passwordlessEmailFetcher,
        authorizePasswordlessEmailPath,
        turnstileToken,
        turnstileEnabled,
        resetTurnstile,
    ]);

    /**
     * Checkout only: close OTP without calling verify-otp — shopper stays a guest (no SLAS session from OTP).
     * Parent unblocks contact step and hides place-order create-account checkbox for this session.
     */
    const handleCheckoutAsGuestFromOtp = useCallback(() => {
        lastEmailSentRef.current = null;
        onRegisteredUserChoseGuest?.(true);
    }, [onRegisteredUserChoseGuest]);

    let nextStepButtonLabel = isLoading ? t('contactInfo.saving') : t('contactInfo.continue');

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const hasPickupItems = shipmentDistribution.hasPickupItems;

    const { t: tBopis } = useTranslation('extBopis');
    if (!isLoading && hasPickupItems) {
        nextStepButtonLabel = tBopis('checkout.contactInfo.continueToPickup');
    }
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    const stepTitle = (
        <span className="text-xl font-bold tracking-tight text-card-foreground">{t('contactInfo.title')}</span>
    );

    const isSendingOtp =
        passwordlessEmailFetcher.state === 'submitting' || passwordlessEmailFetcher.state === 'loading';

    // Keep parent ref in sync so checkout does not advance to shipping while OTP/login modal is open or authorize in flight
    useEffect(
        () => {
            if (otpFlowActiveRef) {
                otpFlowActiveRef.current = isSendingOtp || isOtpOpen || isLoginModalOpen;
            }
        },
        // Ref is stable; .current is mutated intentionally — omit from deps
        // eslint-disable-next-line react-hooks/exhaustive-deps -- otpFlowActiveRef
        [isSendingOtp, isOtpOpen, isLoginModalOpen]
    );

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
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('contactInfo.emailLabel')}*</FormLabel>
                                        <div className="relative">
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder={t('contactInfo.emailPlaceholder')}
                                                    autoComplete="email"
                                                    autoFocus={isEditing}
                                                    disabled={isSendingOtp}
                                                    className="pr-12"
                                                    {...field}
                                                    onFocus={handleEmailFocus}
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
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {turnstileEnabled && turnstileSiteKey && showTurnstile && (
                                <TurnstileWidget
                                    siteKey={turnstileSiteKey}
                                    onSuccess={handleTurnstileSuccess}
                                    onError={handleTurnstileError}
                                    onExpire={handleTurnstileExpire}
                                    enabled={turnstileEnabled}
                                    mode="non-interactive"
                                    resetRef={turnstileResetRef}
                                    executeRef={turnstileExecuteRef}
                                />
                            )}

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
                                                        field.onChange(stripNonDigits(e.target.value).slice(0, 10));
                                                    }}
                                                    onBlur={(e) => {
                                                        field.onBlur();
                                                        field.onChange(formatPhoneInput(e.target.value));
                                                    }}
                                                    onFocus={(e) => {
                                                        const digits = stripNonDigits(e.target.value);
                                                        if (digits !== e.target.value) field.onChange(digits);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Button type="submit" disabled={isLoading || turnstilePending} className="w-full">
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
                        {summaryPhone && <p>{formatPhoneDisplay(summaryPhone, summaryCountryCode)}</p>}

                        {!customerProfile &&
                            loginSuggestion.shouldSuggestLogin &&
                            !suppressRegisteredEmailLoginHints && (
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
                        onCheckoutAsGuest={onRegisteredUserChoseGuest ? handleCheckoutAsGuestFromOtp : undefined}
                        onResendCode={handleResendOtp}
                        otpLength={otpLength}
                    />
                </Suspense>
            )}

            {isLoginModalOpen && (
                <Suspense fallback={null}>
                    <LoginModal
                        isOpen={isLoginModalOpen}
                        onOpenChange={(open) => {
                            setIsLoginModalOpen(open);
                            if (!open) {
                                lastEmailSentRef.current = null;
                                if (otpFlowActiveRef) otpFlowActiveRef.current = false;
                            }
                        }}
                        mode="password"
                        isPasswordlessEnabled={false}
                        returnUrl="/checkout"
                        initialEmail={passwordlessEmailFetcher.data?.email || form.getValues('email')}
                        onSuccess={handleLoginModalSuccess}
                        onCheckoutAsGuest={
                            onRegisteredUserChoseGuest
                                ? () => {
                                      setIsLoginModalOpen(false);
                                      lastEmailSentRef.current = null;
                                      if (otpFlowActiveRef) otpFlowActiveRef.current = false;
                                      onRegisteredUserChoseGuest(true);
                                  }
                                : undefined
                        }
                    />
                </Suspense>
            )}
        </>
    );
}
