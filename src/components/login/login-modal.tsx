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

import { type ReactElement, useState, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import StandardLoginForm from '@/components/login/standard-login-form';
import PasswordlessLoginForm from '@/components/login/passwordless-login-form';
import OtpModal from '@/components/login/otp-modal';
import { SocialLoginButtons } from '@/components/buttons/social-login-buttons';

type LoginActionResponse = {
    success: boolean;
    error?: string;
    redirectUrl?: string;
    showOTPForm?: boolean;
    email?: string;
};

interface LoginModalProps {
    /** Controls modal visibility */
    isOpen: boolean;
    /** Callback when modal should close */
    onOpenChange: (open: boolean) => void;
    /** Initial login mode: 'password' or 'passwordless' */
    mode?: 'password' | 'passwordless';
    /** Whether passwordless login is enabled */
    isPasswordlessEnabled?: boolean;
    /** Whether social login is enabled */
    isSocialLoginEnabled?: boolean;
    /** URL to redirect to after successful login */
    returnUrl?: string;
    /** Pending action to preserve after login */
    action?: string;
    /** Action parameters to preserve after login */
    actionParams?: string;
    /** OTP length for passwordless login */
    otpLength?: number;
    /** Callback when login succeeds */
    onSuccess?: () => void;
    /** Callback when user chooses to continue as guest (checkout context only) */
    onCheckoutAsGuest?: () => void;
    initialEmail?: string;
}

export default function LoginModal({
    isOpen,
    onOpenChange,
    mode = 'password',
    isPasswordlessEnabled = false,
    isSocialLoginEnabled = false,
    returnUrl,
    action: pendingActionName,
    actionParams,
    otpLength = 8,
    onSuccess,
    onCheckoutAsGuest,
    initialEmail,
}: LoginModalProps): ReactElement {
    const { t } = useTranslation('login');
    const fetcher = useFetcher<LoginActionResponse>();
    const [currentMode, setCurrentMode] = useState<'password' | 'passwordless'>(mode);
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [otpEmail, setOtpEmail] = useState<string>('');
    const [error, setError] = useState<string | undefined>();

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentMode(mode);
            setShowOTPModal(false);
            setOtpEmail('');
            setError(undefined);
        }
    }, [isOpen, mode]);

    // Handle action responses
    useEffect(() => {
        if (fetcher.state === 'idle' && fetcher.data) {
            const data = fetcher.data;

            if (data.success && data.redirectUrl) {
                // Login successful - redirect or call onSuccess
                if (onSuccess) {
                    onSuccess();
                } else {
                    window.location.href = data.redirectUrl;
                }
            } else if (data.showOTPForm && data.email) {
                // Show OTP modal for passwordless verification
                setOtpEmail(data.email);
                setShowOTPModal(true);
                setError(undefined);
            } else if (data.error) {
                // Show error
                setError(data.error);
            }
        }
    }, [fetcher.state, fetcher.data, onSuccess]);

    const handleOtpSuccess = () => {
        setShowOTPModal(false);
        if (onSuccess) {
            onSuccess();
        } else {
            window.location.href = returnUrl || '/';
        }
    };

    const handleResendCode = async () => {
        if (!otpEmail) return;

        const formData = new FormData();
        formData.append('email', otpEmail);
        formData.append('loginMode', 'passwordless');
        if (returnUrl) {
            formData.append('redirectPath', returnUrl);
        }

        await fetch('/login', {
            method: 'POST',
            body: formData,
        });
    };

    // Decide which form to render based on mode
    const renderForm = () => {
        if (currentMode === 'passwordless') {
            return (
                <PasswordlessLoginForm
                    error={error}
                    isPasswordlessEnabled={isPasswordlessEnabled}
                    redirectPath={returnUrl}
                />
            );
        }
        return (
            <StandardLoginForm
                error={error}
                isPasswordlessEnabled={isPasswordlessEnabled}
                returnUrl={returnUrl}
                action={pendingActionName}
                actionParams={actionParams}
                onCheckoutAsGuest={onCheckoutAsGuest}
                initialEmail={initialEmail}
            />
        );
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md [&>button]:cursor-pointer">
                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl font-bold">{t('title')}</DialogTitle>
                        <DialogDescription className="text-center">{t('subtitle')}</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {renderForm()}
                        {isSocialLoginEnabled ? <SocialLoginButtons /> : null}
                    </div>
                </DialogContent>
            </Dialog>

            {/* OTP Modal - appears over the login modal */}
            <OtpModal
                isOpen={showOTPModal}
                otpLength={otpLength}
                onClose={() => setShowOTPModal(false)}
                email={otpEmail}
                onSuccess={handleOtpSuccess}
                onResendCode={handleResendCode}
            />
        </>
    );
}
