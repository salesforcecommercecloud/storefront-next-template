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

/**
 * OOTB Google Cloud Platform preferences sourced from the MRT data store.
 *
 * Additional fields (e.g. `projectId`, `region`) may be added here as the
 * ECOM MRT sync job expands the `gcp` entry. Consumers should read the
 * object as a whole via `getGcpPreferences`, or use a specific convenience
 * getter like `getGcpApiKey` for a single field.
 */
export type GcpPreferences = {
    apiKey: string;
};

export const DEFAULT_GCP_PREFERENCES_KEY = 'gcp';
const DATA_STORE_UNAVAILABLE_MODE = process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;

/**
 * Map keys inside the `gcp` data store entry. The ECOM MRT sync job writes
 * to these exact keys; keep in sync with the sync job contract.
 */
const API_KEY_MAP_KEY = 'api-key';

export const gcpPreferencesContext = createDataStoreContext<GcpPreferences>();

/**
 * Read the GCP (Google Cloud Platform) preferences object from router context.
 *
 * The preferences are sourced from the MRT data store entry `gcp`, which is
 * populated only for storefronts connecting to production ECOM instances.
 * In non-production environments, or when the entry is missing, returns an
 * object whose fields are all empty/default.
 *
 * @param context - Router context provider
 * @returns GCP preferences object; fields are empty/default when the entry is unavailable
 */
export function getGcpPreferences(context: Readonly<RouterContextProvider>): GcpPreferences {
    const data = context.get(gcpPreferencesContext);
    if (data === null) {
        // eslint-disable-next-line no-console
        console.warn(
            'GCP preferences context not found. Ensure gcpPreferencesMiddleware runs before loaders, or expect empty values in environments without the MRT data store entry.'
        );
        return { apiKey: '' };
    }
    return data;
}

/**
 * Convenience getter for the Google Cloud API key alone.
 *
 * Equivalent to `getGcpPreferences(context).apiKey`.
 *
 * @param context - Router context provider
 * @returns The GCP API key, or an empty string when unavailable
 */
export function getGcpApiKey(context: Readonly<RouterContextProvider>): string {
    return getGcpPreferences(context).apiKey;
}

/**
 * Middleware that reads the OOTB GCP preferences from the MRT data store and
 * stores them in the router context. The entry shape is `{ "api-key": string, ... }`
 * under data store key `gcp`. Missing/invalid fields coerce to empty/default values.
 *
 * Only available for storefronts connecting to production ECOM instances.
 * Must run before any loader/middleware that reads `getGcpPreferences(context)`
 * or `getGcpApiKey(context)`.
 */
export const gcpPreferencesMiddleware = createDataStoreMiddleware<GcpPreferences>({
    entryKey: DEFAULT_GCP_PREFERENCES_KEY,
    context: gcpPreferencesContext,
    onUnavailable: DATA_STORE_UNAVAILABLE_MODE === 'fallback' ? 'fallback' : 'throw',
    fallbackValue: { apiKey: '' },
    transform: (value) => {
        const rawKey = value[API_KEY_MAP_KEY];
        return { apiKey: typeof rawKey === 'string' ? rawKey : '' };
    },
});
