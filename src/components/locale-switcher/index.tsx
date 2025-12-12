/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
'use client';

import { type ReactElement, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetcher } from 'react-router';

import { SelectNative } from '@/components/ui/select-native';
import { useConfig } from '@/config';

export default function LocaleSwitcher(): ReactElement {
    const id = useId();
    const { t, i18n } = useTranslation('localeSwitcher');
    const fetcher = useFetcher();
    const config = useConfig();

    const handleLocaleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLocale = e.target.value;
        const formData = new FormData();
        formData.append('locale', newLocale);

        // Change the language in i18next client-side for immediate UX
        await i18n.changeLanguage(newLocale);

        // Set the cookie server-side so it persists across page reloads
        void fetcher.submit(formData, {
            method: 'POST',
            action: '/action/set-locale',
        });
    };

    return (
        <div className="*:not-first:mt-2">
            <SelectNative
                id={id}
                onChange={(e) => void handleLocaleChange(e)}
                aria-label={t('ariaLabel')}
                value={i18n.language}>
                {config.i18n.supportedLngs.map((locale) => (
                    <option key={locale} value={locale}>
                        {t(`locales.${locale}`)}
                    </option>
                ))}
            </SelectNative>
        </div>
    );
}
