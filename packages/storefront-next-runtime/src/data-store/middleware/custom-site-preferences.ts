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

import type { RouterContextProvider } from 'react-router';
import { createDataStoreContext, createDataStoreMiddleware } from '../utils';
import { siteContext } from '../../site-context';

export type SitePreferences = Record<string, unknown>;

export const DEFAULT_SITE_PREFERENCES_KEY = 'site-preferences';
export const sitePreferencesContext = createDataStoreContext<SitePreferences>();

/**
 * Read site preferences from router context.
 *
 * @param context - Router context provider
 * @returns Site preferences data stored by data-store middleware
 * @throws Error when the data-store context is not available
 */
export function getSitePreferences(context: Readonly<RouterContextProvider>): SitePreferences {
    const data = context.get(sitePreferencesContext);
    if (!data) {
        // eslint-disable-next-line no-console
        console.warn(
            'Data store context not found. Ensure data-store middleware runs before loaders and the required env vars are set.'
        );
        return {};
    }
    return data;
}

export const customSitePreferencesMiddleware = createDataStoreMiddleware({
    entryKey: (context) => {
        const siteCtx = context.get(siteContext);
        const siteId = siteCtx?.site?.id;
        if (!siteId) {
            throw new Error('Site id not found. Ensure site context middleware runs before data-store middleware.');
        }
        return `${siteId}-custom-site-preferences`;
    },
    context: sitePreferencesContext,
});
