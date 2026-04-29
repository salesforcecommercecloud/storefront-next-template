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

export type CustomGlobalPreferences = Record<string, unknown>;

export const DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY = 'custom-global-preferences';
export const customGlobalPreferencesContext = createDataStoreContext<CustomGlobalPreferences>();
const DATA_STORE_UNAVAILABLE_MODE = process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;

/**
 * Read custom global preferences from router context.
 *
 * @param context - Router context provider
 * @returns Custom global preferences data stored by data-store middleware
 * @throws Error when the data-store context is not available
 */
export function getCustomGlobalPreferences(context: Readonly<RouterContextProvider>): CustomGlobalPreferences {
    const data = context.get(customGlobalPreferencesContext);
    if (!data) {
        // eslint-disable-next-line no-console
        console.warn(
            'Custom global preferences context not found. Ensure data-store middleware runs before loaders and the required env vars are set.'
        );
        return {};
    }
    return data;
}

export const customGlobalPreferencesMiddleware = createDataStoreMiddleware({
    entryKey: DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY,
    context: customGlobalPreferencesContext,
    onUnavailable: DATA_STORE_UNAVAILABLE_MODE === 'fallback' ? 'fallback' : 'throw',
    fallbackValue: {},
});
