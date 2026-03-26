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
import { type ReactElement } from 'react';
import { type LoaderFunctionArgs } from 'react-router';
import StorePreferences from '@/components/store-preferences';
import { SeoMeta } from '@/components/seo-meta';
import { useTranslation } from 'react-i18next';
import { getTranslation } from '@/lib/i18next';
// @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR
import { createApiClients } from '@/lib/api-clients';
import { selectedStoreContext } from '@/extensions/store-locator/middlewares/selected-store.server';
// @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR
import { getLogger } from '@/lib/logger';

/**
 * Loader function to fetch preferred store details from cookie.
 *
 * When the store-locator extension is installed, this loader reads the
 * selectedStoreInfo cookie and fetches full store details from SCAPI.
 */
// eslint-disable-next-line react-refresh/only-export-components -- Loader exports are required by React Router
export async function loader({ context }: LoaderFunctionArgs) {
    const logger = getLogger(context);
    const { t } = getTranslation(context);

    // @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR
    const selectedStoreInfo = context.get(selectedStoreContext);

    if (selectedStoreInfo?.id) {
        try {
            const clients = createApiClients(context);
            const { data: storesData } = await clients.shopperStores.getStores({
                params: {
                    query: {
                        ids: selectedStoreInfo.id,
                    },
                },
            });

            const preferredStore = storesData?.data?.[0] || null;
            return { preferredStore, error: null };
        } catch (error) {
            logger.error('Failed to fetch preferred store', { error: error instanceof Error ? error : String(error) });
            return {
                preferredStore: null,
                error: t('storePreferences.preferredStore.error'),
            };
        }
    }
    // @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR

    return { preferredStore: null, error: null };
}

/**
 * Store Preferences route – renders at /account/store-preferences.
 */
export default function AccountStorePreferencesRoute(): ReactElement {
    const { t } = useTranslation('account');
    return (
        <>
            <SeoMeta title={t('meta.storePreferencesTitle', { defaultValue: 'Store Preferences' })} noIndex />
            <StorePreferences />
        </>
    );
}
