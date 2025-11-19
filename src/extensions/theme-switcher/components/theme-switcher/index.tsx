/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
'use client';

import { type ReactElement, useId } from 'react';

import { SelectNative } from '@/components/ui/select-native';
import uiStrings from '@/temp-ui-string';

export default function ThemeSwitcher(): ReactElement {
    const id = useId();
    const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTheme = e.target.value;
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };
    return (
        <div className="*:not-first:mt-2">
            <SelectNative id={id} onChange={handleStyleChange} aria-label={uiStrings.themeSwitcher.ariaLabel}>
                <option value="light">{uiStrings.themeSwitcher.lightTheme}</option>
                <option value="dark">{uiStrings.themeSwitcher.darkTheme}</option>
            </SelectNative>
        </div>
    );
}
