import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import ThemeSwitcher from '@/extensions/theme-switcher/components/theme-switcher';

export default function ThemeSwitcherFooter(): ReactElement {
    const { t } = useTranslation('extThemeSwitcher');
    return (
        <li>
            <h3 className="text-lg font-semibold my-4">{t('footer.sections.switchThemes')}</h3>
            <div className="flex items-center gap-2">
                <ThemeSwitcher />
            </div>
        </li>
    );
}
