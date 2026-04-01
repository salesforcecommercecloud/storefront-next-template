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
import type { ReactElement } from 'react';
import { Form } from 'react-router';
import { Button } from '@/components/ui/button';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { useTranslation } from 'react-i18next';

interface SocialLoginButtonsProps {
    redirectPath?: string;
}

export function SocialLoginButtons({ redirectPath }: SocialLoginButtonsProps = {}): ReactElement | null {
    const config = useConfig<AppConfig>();
    const { t } = useTranslation('login');
    const socialIDPs: string[] = config.features.socialLogin.providers;

    const getProviderIcon = (provider: string) => {
        switch (provider.toLowerCase()) {
            case 'apple':
                return '🍎';
            case 'google':
                return '🔍';
            default:
                return '🔑';
        }
    };

    // text template moved to uiStrings.login.continueWithProvider

    if (socialIDPs.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">{t('socialOrContinueWith')}</span>
                </div>
            </div>

            <div className="grid gap-2">
                {socialIDPs.map((provider) => {
                    return (
                        <Form method="post" key={provider}>
                            <input type="hidden" name="loginMode" value="social" />
                            <input type="hidden" name="provider" value={provider} />
                            {redirectPath && <input type="hidden" name="redirectPath" value={redirectPath} />}
                            <Button type="submit" variant="outline" className="w-full">
                                <span className="mr-2 text-lg">{getProviderIcon(provider)}</span>
                                {t('continueWithProvider', { provider })}
                            </Button>
                        </Form>
                    );
                })}
            </div>
        </div>
    );
}
