import type { ResourceLanguage } from 'i18next';
import translations from '@/locales/en/translations.json';
import extensionTranslations from '@/extensions/locales/en/';

const allTranslations = {
    ...translations,
    ...extensionTranslations,
};

export default allTranslations satisfies ResourceLanguage;
