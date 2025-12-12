import type { ResourceLanguage } from 'i18next';
import translations from '@/locales/en-US/translations.json';
import extensionTranslations from '@/extensions/locales/en-US/';

const allTranslations = {
    ...translations,
    ...extensionTranslations,
};

export default allTranslations satisfies ResourceLanguage;
