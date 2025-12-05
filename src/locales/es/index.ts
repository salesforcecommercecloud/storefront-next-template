import type { ResourceLanguage } from 'i18next';
import translations from '@/locales/es/translations.json';
import extensionTranslations from '@/extensions/locales/es/';

const allTranslations = {
    ...translations,
    ...extensionTranslations,
};

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export default allTranslations satisfies ResourceLanguage satisfies typeof import('@/locales/en/').default;
