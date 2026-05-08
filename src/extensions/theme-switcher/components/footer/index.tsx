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
import { useTranslation } from 'react-i18next';
import ThemeSwitcher from '@/extensions/theme-switcher/components/theme-switcher';

export default function ThemeSwitcherFooter(): ReactElement {
    const { t } = useTranslation('extThemeSwitcher');
    return (
        <li>
            <h3 className="text-sm font-semibold my-4">{t('footer.sections.switchThemes')}</h3>
            <div className="flex items-center gap-2">
                <ThemeSwitcher />
            </div>
        </li>
    );
}
