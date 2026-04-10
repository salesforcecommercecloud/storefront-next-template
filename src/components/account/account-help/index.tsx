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
import { type ReactElement } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '@/components/icons';
import { openShopperAgent } from '@/components/shopper-agent';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { validateShopperAgentConfig } from '@/components/shopper-agent/shopper-agent.utils';

/**
 * Account Help component
 *
 * Provides quick access to customer support through the shopper agent.
 * Displays three action buttons:
 * - Ask a question: Opens the shopper agent chat window
 * - Contact Info: Label only (non-functional in 262 release)
 * - Browse FAQ: Label only (non-functional in 262 release)
 */
export function AccountHelp(): ReactElement | null {
    const { t } = useTranslation('account');
    const config = useConfig<AppConfig>();

    // Check if shopper agent is enabled and configured
    const isShopperAgentEnabled =
        (config.commerceAgent?.enabled === 'true' || config.commerceAgent?.enabled === true) &&
        validateShopperAgentConfig(config.commerceAgent);

    if (!isShopperAgentEnabled) {
        return null;
    }

    const handleAskQuestion = () => {
        openShopperAgent();
    };

    return (
        <Card className="py-0">
            <CardContent className="p-6">
                <h2 className="text-[length:var(--account-section-header)] font-semibold text-foreground mb-2">
                    {t('shopperAgentEntry.title')}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">{t('shopperAgentEntry.description')}</p>
                <div className="flex flex-wrap gap-3">
                    <Button
                        onClick={handleAskQuestion}
                        variant="default"
                        className="flex items-center gap-2 cursor-pointer">
                        <SparklesIcon className="h-4 w-4" />
                        {t('shopperAgentEntry.askQuestion')}
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2 cursor-pointer">
                        {t('shopperAgentEntry.contactInfo')}
                    </Button>
                    <Button variant="outline" className="flex items-center gap-2 cursor-pointer">
                        {t('shopperAgentEntry.browseFaq')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default AccountHelp;
