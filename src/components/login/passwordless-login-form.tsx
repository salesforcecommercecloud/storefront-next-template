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
import { type ReactElement, useMemo, useState, useCallback } from 'react';
import { Form, useLocation } from 'react-router';
import { Link } from '@/components/link';
import { Input } from '@/components/ui/input';
import { FormSubmitButton } from '@/components/buttons/form-submit-button';
import { useTranslation } from 'react-i18next';
import { getLoginModeHref } from './get-login-mode-href';
import { TurnstileWidget } from '@/components/security/turnstile-widget';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { getTurnstileSiteKey, isTurnstileEnabled } from '@/lib/turnstile-utils';

interface PasswordlessLoginFormProps {
    error?: string;
    isPasswordlessEnabled: boolean;
    redirectPath?: string;
}

export default function PasswordlessLoginForm({
    error,
    isPasswordlessEnabled,
    redirectPath,
}: PasswordlessLoginFormProps): ReactElement {
    const location = useLocation();
    const { t } = useTranslation('login');
    const config = useConfig<AppConfig>();

    // Turnstile bot protection - gracefully degrades if token generation fails
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

    const turnstileEnabled = config ? isTurnstileEnabled(config) : false;
    const turnstileSiteKey = useMemo(() => {
        if (!config || !turnstileEnabled) return null;
        // Get base URL from window location (client-side)
        if (typeof window !== 'undefined') {
            const baseUrl = `${window.location.protocol}//${window.location.host}`;
            return getTurnstileSiteKey(config, baseUrl);
        }
        return null;
    }, [config, turnstileEnabled]);

    const handleTurnstileSuccess = useCallback((token: string) => {
        setTurnstileToken(token);
    }, []);

    const handleTurnstileError = useCallback(() => {
        // Widget no longer calls this (graceful degradation), but keep for API compatibility
        setTurnstileToken(null);
    }, []);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken(null);
    }, []);

    const passwordModeHref = useMemo(() => {
        return getLoginModeHref(location.search, 'password');
    }, [location.search]);

    return (
        <Form method="post" className="space-y-6">
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    {t('emailLabel')}
                </label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="mt-1"
                    placeholder={t('emailPlaceholder')}
                />
            </div>

            {/* Turnstile bot protection - gracefully degrades if load fails */}
            {turnstileEnabled && turnstileSiteKey && (
                <TurnstileWidget
                    siteKey={turnstileSiteKey}
                    onSuccess={handleTurnstileSuccess}
                    onError={handleTurnstileError}
                    onExpire={handleTurnstileExpire}
                    enabled={turnstileEnabled}
                />
            )}

            {/* Hidden input to track login mode */}
            <input type="hidden" name="loginMode" value="passwordless" />

            {/* Hidden input to pass redirect URL */}
            {redirectPath && <input type="hidden" name="redirectPath" value={redirectPath} />}

            {/* Hidden input for Turnstile token */}
            {turnstileToken && <input type="hidden" name="turnstileToken" value={turnstileToken} />}

            <FormSubmitButton defaultText={t('sendLoginLink')} submittingText={t('sendingLoginLink')} />

            {/* Toggle to password login if enabled */}
            {isPasswordlessEnabled && (
                <div className="text-center">
                    <Link to={passwordModeHref} className="text-primary hover:text-primary/80 text-sm">
                        {t('loginWithPassword')}
                    </Link>
                </div>
            )}

            <div className="text-center">
                <Link to="/forgot-password" className="text-sm text-primary hover:text-primary/80">
                    {t('forgotPassword')}
                </Link>
            </div>
        </Form>
    );
}
