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
import { type ReactElement, useId, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NativeSelect } from '@/components/ui/native-select';

type ThemeFamily = 'market-street';
type ThemeMode = 'light' | 'dark';

export default function ThemeSwitcher(): ReactElement {
    const modeId = useId();
    const familyId = useId();
    const { t } = useTranslation('themeSwitcher');

    const [themeFamily, setThemeFamily] = useState<ThemeFamily>('market-street');
    const [themeMode, setThemeMode] = useState<ThemeMode>('light');

    // Apply theme whenever it changes
    useEffect(() => {
        const html = document.documentElement;

        // Handle dark mode class
        html.classList.toggle('dark', themeMode === 'dark');

        // Market Street doesn't use data-theme attribute
        html.removeAttribute('data-theme');
    }, [themeFamily, themeMode]);

    const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setThemeMode(e.target.value as ThemeMode);
    };

    const handleFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setThemeFamily(e.target.value as ThemeFamily);
    };

    return (
        <div className="space-y-2">
            <div>
                <label htmlFor={familyId} className="block text-sm font-medium mb-1">
                    {t('themeFamily')}
                </label>
                <NativeSelect
                    id={familyId}
                    value={themeFamily}
                    onChange={handleFamilyChange}
                    aria-label={t('themeFamilyAriaLabel')}>
                    <option value="market-street">{t('marketStreet')}</option>
                </NativeSelect>
            </div>
            <div>
                <label htmlFor={modeId} className="block text-sm font-medium mb-1">
                    {t('themeMode')}
                </label>
                <NativeSelect id={modeId} value={themeMode} onChange={handleModeChange} aria-label={t('ariaLabel')}>
                    <option value="light">{t('lightTheme')}</option>
                    <option value="dark">{t('darkTheme')}</option>
                </NativeSelect>
            </div>
        </div>
    );
}
