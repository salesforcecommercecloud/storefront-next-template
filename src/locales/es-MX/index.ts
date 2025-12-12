import type { ResourceLanguage } from 'i18next';
import translations from '@/locales/es-MX/translations.json';
import extensionTranslations from '@/extensions/locales/es-MX/';

const allTranslations = {
    ...translations,
    ...extensionTranslations,
};

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export default allTranslations satisfies ResourceLanguage satisfies typeof import('@/locales/en-US/').default;
