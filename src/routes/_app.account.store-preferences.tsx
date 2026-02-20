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
import { getTranslation } from '@/lib/i18next';
// @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR
import { createApiClients } from '@/lib/api-clients';
import { getCookieFromRequestAs, getSelectedStoreInfoCookieName } from '@/extensions/store-locator/utils';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';
// @sfdc-extension-block-end SFDC_EXT_STORE_LOCATOR

/**
 * Loader function to fetch preferred store details from cookie.
 *
 * When the store-locator extension is installed, this loader reads the
 * selectedStoreInfo cookie and fetches full store details from SCAPI.
 */
// eslint-disable-next-line react-refresh/only-export-components -- Loader exports are required by React Router
export async function loader({ request, context }: LoaderFunctionArgs) {
    const { t } = getTranslation(context);

    // @sfdc-extension-block-start SFDC_EXT_STORE_LOCATOR
    const cookieName = getSelectedStoreInfoCookieName();
    const selectedStoreInfo = getCookieFromRequestAs<SelectedStoreInfo>(request, cookieName);

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
            // eslint-disable-next-line no-console
            console.error('Failed to fetch preferred store:', error);
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
    return <StorePreferences />;
}
