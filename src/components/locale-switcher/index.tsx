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
'use client';

import { type ReactElement, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetcher, useLocation } from 'react-router';

import { NativeSelect } from '@/components/ui/native-select';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { buildUrl, resolvePrefix, sanitizePrefix, useSite } from '@salesforce/storefront-next-runtime/multi-site';
import { useCurrentSiteAndLocaleRef } from '@/hooks/use-current-site-and-locale-ref';

export default function LocaleSwitcher(): ReactElement {
    const id = useId();
    const { t, i18n } = useTranslation('localeSwitcher');
    const fetcher = useFetcher();
    const config = useConfig<AppConfig>();
    const site = useSite();

    // Show only languages the app has translations for AND the current site supports.
    // This ensures each site's locale-switcher only shows relevant options.
    const siteLocaleIds = site ? new Set(site.supportedLocales.map((l) => l.id)) : null;
    const supportedLngs = siteLocaleIds
        ? config.i18n.supportedLngs.filter((lng) => siteLocaleIds.has(lng))
        : config.i18n.supportedLngs;

    const location = useLocation();
    const { siteRef, localeRef } = useCurrentSiteAndLocaleRef();

    const handleLocaleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLocale = e.target.value;
        const newLocaleRef = config.localeAliasMap?.[newLocale] ?? newLocale;

        // Strip the current prefix (e.g. /global/en-GB) to get the bare path,
        // then rebuild with the new locale to avoid double-prefixing.
        const currentPrefix = config.url?.prefix
            ? resolvePrefix(config.url.prefix, { siteId: siteRef, localeId: localeRef })
            : '';
        const barePath = sanitizePrefix(location.pathname, currentPrefix) || '/';

        const pathname = buildUrl({
            to: barePath,
            urlConfig: config.url,
            params: { siteId: siteRef, localeId: newLocaleRef },
        });

        const formData = new FormData();
        formData.append('locale', newLocale);
        formData.append('pathname', pathname);

        // Update i18next client-side so the selector reflects the new value immediately
        await i18n.changeLanguage(newLocale);

        // Set the cookie server-side, then do a full page reload so all
        // server-rendered content (loaders, Suspense boundaries, i18n) re-runs
        // with the new locale.
        await fetcher.submit(formData, {
            method: 'POST',
            action: '/action/set-locale',
        });
        window.location.href = pathname;
    };

    return (
        <div className="*:not-first:mt-2">
            <NativeSelect
                id={id}
                onChange={(e) => void handleLocaleChange(e)}
                aria-label={t('ariaLabel')}
                value={i18n.language}>
                {supportedLngs.map((locale) => {
                    return (
                        <option key={locale} value={locale}>
                            {t(`locales.${locale}`, { defaultValue: locale })}
                        </option>
                    );
                })}
            </NativeSelect>
        </div>
    );
}
