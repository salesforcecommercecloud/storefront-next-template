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
import type { ResourceLanguage } from 'i18next';
import translations from '@/locales/it-IT/translations.json';
import product from '@/locales/it-IT/product.json';
import extensionTranslations from '@/extensions/locales/it-IT/';

const allTranslations = {
    ...translations,
    product,
    ...extensionTranslations,
};
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export default allTranslations satisfies ResourceLanguage satisfies typeof import('@/locales/en-US/').default;
