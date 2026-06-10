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
import { getDataStoreLogger } from '../logger-context';
import { createDataStoreContext, createDataStoreMiddleware } from '../utils';

export type CustomGlobalPreferences = Record<string, unknown>;

export const DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY = 'custom-global-preferences';
export const customGlobalPreferencesContext = createDataStoreContext<CustomGlobalPreferences>();

/**
 * Read custom global preferences from router context.
 *
 * @param context - Router context provider
 * @returns Custom global preferences data stored by data-store middleware
 */
export function getCustomGlobalPreferences(context: Readonly<RouterContextProvider>): CustomGlobalPreferences {
    const data = context.get(customGlobalPreferencesContext);
    if (!data) {
        getDataStoreLogger(context).debug(
            'Custom global preferences context not found. Ensure data-store middleware runs before loaders and the required env vars are set.'
        );
        return {};
    }
    return data;
}

/**
 * Middleware that reads the global `custom-global-preferences` entry from the MRT data
 * store and stores it in {@link customGlobalPreferencesContext}.
 *
 * Defaults to graceful degradation: if the data store is unavailable or returns a service
 * error, the request continues with `{}` as the preferences value rather than crashing.
 * Set `SFNEXT_DATA_STORE_UNAVAILABLE_MODE=throw` in the environment to opt back into
 * fail-fast behavior. The env var is read once at module load.
 */
export const customGlobalPreferencesMiddleware = createDataStoreMiddleware({
    entryKey: DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY,
    context: customGlobalPreferencesContext,
    onUnavailable: process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE === 'throw' ? 'throw' : 'fallback',
    fallbackValue: {},
});
