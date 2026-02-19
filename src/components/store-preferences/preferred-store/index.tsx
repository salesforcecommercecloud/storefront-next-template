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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

/**
 * Preferred Store for Pickup section. Displays the selected store and a Change store action.
 */
export default function PreferredStore(): ReactElement {
    const { t } = useTranslation('account');

    return (
        <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <CardTitle className="text-lg">{t('storePreferences.preferredStore.heading')}</CardTitle>
                    <CardDescription className="mt-1">
                        {t('storePreferences.preferredStore.description')}
                    </CardDescription>
                </div>
                <CardAction>
                    <Button type="button" variant="outline">
                        {t('storePreferences.preferredStore.changeStore')}
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Card className="bg-muted border border-muted-foreground/40 shadow-none gap-0 py-0">
                    <CardContent className="px-4 py-3">
                        <p className="font-medium text-foreground">Salesforce Foundations - San Francisco</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            415 Mission Street, San Francisco, CA 94105
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Open today: 10:00 AM - 8:00 PM</p>
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    );
}
