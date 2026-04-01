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
'use client';

import { useState, useEffect, useRef, useMemo, type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFetcher } from 'react-router';
import type { ShopperLogin } from '@salesforce/storefront-next-runtime/scapi';
import { getPasswordlessErrorMessageKey, extractErrorMessage } from '@/lib/auth-error-handler';

type VerifyOtpResponse = {
    success: boolean;
    error?: string;
    message?: string;
    tokenResponse?: ShopperLogin.schemas['TokenResponse'];
};
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Typography } from '@/components/typography';
import { useTranslation } from 'react-i18next';
import { useOtpVerification } from '@/hooks/use-otp-verification';

interface OtpModalProps {
    isOpen: boolean;
    onClose: () => void;
    email: string;
    onSuccess: (tokenResponse?: VerifyOtpResponse['tokenResponse']) => void;
    onCheckoutAsGuest?: () => void;
    onResendCode?: () => Promise<void>;
    otpLength?: number;
    initialError?: string;
}

const createOtpSchema = (t: (key: string, options?: object) => string, otpLength: number) => {
    return z.object({
        otpCode: z
            .string()
            .min(otpLength, {
                message: t('login:otpRequired'),
            })
            .max(otpLength, {
                message: t('login:otpInvalidFormat', { otpLength }),
            })
            .regex(new RegExp(`^\\d{${otpLength}}$`), {
                message: t('login:otpInvalidFormat', { otpLength }),
            }),
    });
};

export default function OtpModal({
    isOpen,
    onClose,
    email,
    onSuccess,
    onCheckoutAsGuest,
    onResendCode,
    otpLength = 8,
    initialError,
}: OtpModalProps): ReactElement {
    // Track if we've already called onSuccess to prevent infinite loops
    const hasCalledOnSuccessRef = useRef(false);
    const { t } = useTranslation('login');
    const fetcher = useFetcher<VerifyOtpResponse>({ key: 'otp-verification' });
    const [error, setError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const [resendTimer, setResendTimer] = useState(0);
    const schema = useMemo(() => createOtpSchema(t, otpLength), [t, otpLength]);
    const form = useForm<z.infer<ReturnType<typeof createOtpSchema>>>({
        resolver: zodResolver(schema),
        defaultValues: {
            otpCode: '',
        },
    });

    const isLoading = fetcher.state === 'submitting' || fetcher.state === 'loading';

    const handleVerify = (code: string) => {
        setIsVerifying(true);
        setError(null);

        // Update form value for consistency
        form.setValue('otpCode', code);

        // Submit OTP for verification
        const formData = new FormData();
        formData.append('otpCode', code);
        formData.append('email', email);
        void fetcher.submit(formData, {
            method: 'POST',
            action: '/action/verify-otp',
        });
    };

    const { otpInputs, otpInputsRef, refCallbacks } = useOtpVerification({
        otpLength,
        onVerify: handleVerify,
    });
    // Resend countdown (same behavior as avinash branch)
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [resendTimer]);

    // Reset form and OTP inputs when modal opens
    useEffect(() => {
        if (isOpen) {
            otpInputsRef.current.clear();
            setError(initialError ?? null);
            form.setValue('otpCode', '');
            setIsVerifying(false);
            setResendTimer(0);

            requestAnimationFrame(() => {
                otpInputsRef.current.inputRefs.current[0]?.focus();
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialError]);

    // Reset success guard when closing or submitting
    useEffect(() => {
        if (!isOpen || fetcher.state === 'submitting') {
            hasCalledOnSuccessRef.current = false;
        }
    }, [isOpen, fetcher.state]);

    useEffect(() => {
        // Only proceed when fetcher is idle (server action has completed)
        // AND we haven't already called onSuccess for this verification
        // AND we have success data
        if (fetcher.state === 'idle' && fetcher.data?.success === true && !hasCalledOnSuccessRef.current) {
            // Mark that we've called onSuccess IMMEDIATELY to prevent duplicate calls
            hasCalledOnSuccessRef.current = true;
            form.reset();
            setError(null);
            setIsVerifying(false);
            onSuccess(fetcher.data.tokenResponse);
        }
        // Failure
        else if (fetcher.state === 'idle' && fetcher.data?.success === false && fetcher.data?.error) {
            const rawError = fetcher.data.error;
            const errorMessageKey = getPasswordlessErrorMessageKey(extractErrorMessage(rawError));
            const userFriendlyError = t(errorMessageKey);
            setError(userFriendlyError);
            setIsVerifying(false);
            // Clear OTP inputs so user can retry
            otpInputsRef.current.clear();
            form.setValue('otpCode', '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetcher.state, fetcher.data, onSuccess]);

    const handleResend = async () => {
        if (!onResendCode || resendTimer > 0) return;

        setResendTimer(5);
        try {
            await onResendCode();
        } catch {
            setError(t('resendCodeError'));
            setResendTimer(0);
        }
    };

    const handleCheckoutAsGuest = () => {
        if (onCheckoutAsGuest) {
            onCheckoutAsGuest();
        }
        onClose();
    };

    const handleInputChange = (index: number, value: string) => {
        const code = otpInputs.setValue(index, value);
        setError(null);
        if (typeof code === 'string') {
            form.setValue('otpCode', code);
            // onComplete from useOtpInputs already calls handleVerifyRef when full;
            // no need to call handleVerify again here.
        }
    };

    const isResendDisabled = resendTimer > 0 || isVerifying || isLoading;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent data-testid="otp-modal" className="sm:max-w-lg [&>button]:cursor-pointer">
                <DialogHeader>
                    <DialogTitle>{t('otpModalTitle')}</DialogTitle>
                    <DialogDescription>{t('otpModalDescription', { email, otpLength })}</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 flex flex-col items-center w-full">
                    <div
                        className="grid gap-3 w-full justify-center"
                        style={{ gridTemplateColumns: `repeat(${otpLength}, minmax(0, 1fr))` }}>
                        {Array.from({ length: otpLength }, (_, index) => `otp-input-${index}`).map((inputId, index) => (
                            <Input
                                key={inputId}
                                ref={refCallbacks[index]}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={otpInputs.values[index] || ''}
                                onChange={(e) => handleInputChange(index, e.target.value)}
                                onKeyDown={(e) => otpInputs.handleKeyDown(index, e)}
                                onPaste={otpInputs.handlePaste}
                                disabled={isVerifying || isLoading}
                                autoFocus={index === 0}
                                className="w-12 h-14 text-center text-lg font-bold border-2"
                                aria-label={`${t('otpCodeLabel')} ${index + 1} of ${otpLength}`}
                            />
                        ))}
                    </div>
                    {error && error.trim() !== '' && (
                        <p className="text-destructive text-sm text-left w-full">{error}</p>
                    )}
                    {isVerifying && (
                        <Typography variant="small" className="text-primary text-center">
                            {t('verifying')}
                        </Typography>
                    )}
                    <div className="flex gap-4 w-full justify-center">
                        {onCheckoutAsGuest && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCheckoutAsGuest}
                                disabled={isVerifying || isLoading}
                                size="lg"
                                className="min-w-[160px] bg-muted hover:bg-muted/80 text-foreground font-semibold">
                                {t('checkoutAsGuest')}
                            </Button>
                        )}
                        {onResendCode && (
                            <Button
                                type="button"
                                onClick={() => {
                                    void handleResend();
                                }}
                                disabled={isResendDisabled}
                                size="lg"
                                className="min-w-[160px]"
                                variant={isResendDisabled ? 'secondary' : 'default'}>
                                {resendTimer > 0 ? t('resendCodeTimer', { timer: resendTimer }) : t('resendCode')}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
