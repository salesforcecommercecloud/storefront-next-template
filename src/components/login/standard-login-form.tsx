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
import { type ReactElement, useRef } from 'react';
import { Form } from 'react-router';
import { Link } from '@/components/link';
import { Input } from '@/components/ui/input';
import { FormSubmitButton } from '@/components/buttons/form-submit-button';
import { useTranslation } from 'react-i18next';

interface StandardLoginFormProps {
    error?: string;
    isPasswordlessEnabled: boolean;
    returnUrl?: string | null;
    action?: string | null;
    actionParams?: string | null;
}

export default function StandardLoginForm({
    error,
    isPasswordlessEnabled,
    returnUrl,
    action,
    actionParams,
}: StandardLoginFormProps): ReactElement {
    const formRef = useRef<HTMLFormElement>(null);
    const { t } = useTranslation('login');

    return (
        <Form method="post" className="space-y-6" ref={formRef}>
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

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    {t('passwordLabel')}
                </label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="mt-1"
                    placeholder={t('passwordPlaceholder')}
                />
            </div>

            {/* Hidden input to track login mode */}
            <input type="hidden" name="loginMode" value="password" />

            {/* Preserve returnUrl, action, and actionParams for redirect after login */}
            {/* Always include these as hidden inputs if they exist in props - they come from URL query params */}
            {returnUrl ? <input type="hidden" name="returnUrl" value={returnUrl} /> : null}
            {action ? <input type="hidden" name="action" value={action} /> : null}
            {actionParams ? <input type="hidden" name="actionParams" value={actionParams} /> : null}

            <FormSubmitButton defaultText={t('signIn')} submittingText={t('signingIn')} />
            {isPasswordlessEnabled && (
                <div className="text-center">
                    <Link to="/login?mode=passwordless" className="text-primary hover:text-primary/80 text-sm">
                        {t('loginWithoutPassword')}
                    </Link>
                </div>
            )}

            <div className="text-center space-y-2">
                <Link to="/forgot-password" className="block text-sm text-primary hover:text-primary/80">
                    {t('forgotPassword')}
                </Link>
                <p className="text-sm text-muted-foreground">
                    {t('noAccountQuestion')}
                    <Link to="/signup" className="font-medium text-primary hover:underline">
                        {t('signUp')}
                    </Link>
                </p>
            </div>
        </Form>
    );
}
