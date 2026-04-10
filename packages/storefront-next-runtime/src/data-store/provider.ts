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

import { DataStore } from '@salesforce/mrt-utilities/middleware';
import { hasMrtEnvironment, isDevelopmentEnvironment, tryImportLocalProvider } from './utils';

export type DataStoreEntry = {
    value?: unknown;
};

export type DataStoreProvider = {
    kind: 'mrt' | 'local';
    getEntry: (key: string) => Promise<DataStoreEntry | null>;
};

let providerPromise: Promise<DataStoreProvider> | null = null;

/**
 * Reset the cached provider promise.
 *
 * Intended for tests to ensure isolated provider resolution.
 */
export function resetDataStoreProviderCache(): void {
    providerPromise = null;
}

/**
 * Resolve the default data-store provider based on MRT environment variables.
 *
 * Environment variables:
 * - `AWS_REGION` (required for MRT): AWS region for the data store table (e.g., "us-east-1")
 * - `MOBIFY_PROPERTY_ID` (required for MRT): MRT property identifier (e.g., "abcd1234")
 * - `DEPLOY_TARGET` (required for MRT): MRT deploy target (e.g., "production")
 * - `SFNEXT_DATA_STORE_ALLOW_LOCAL` (optional): allow local provider outside development ("true")
 * - `CI` (optional): allow local provider when set to "true"
 *
 * @returns Provider promise resolved for the current environment.
 * @example
 * const provider = await getDefaultDataStoreProvider();
 * const entry = await provider.getEntry('custom-global-preferences');
 */
export function getDefaultDataStoreProvider(): Promise<DataStoreProvider> {
    if (providerPromise) {
        return providerPromise;
    }

    providerPromise = hasMrtEnvironment() ? Promise.resolve(createMrtDataStoreProvider()) : resolveNonMrtProvider();

    return providerPromise;
}

/**
 * Create the MRT data-store provider.
 *
 * @returns MRT provider backed by `@salesforce/mrt-utilities`.
 * @example
 * const provider = createMrtDataStoreProvider();
 * await provider.getEntry('custom-global-preferences');
 */
function createMrtDataStoreProvider(): DataStoreProvider {
    return {
        kind: 'mrt',
        getEntry: async (key) => (await DataStore.getDataStore().getEntry(key)) as DataStoreEntry | null,
    };
}

/**
 * Load the local data-store provider for development.
 *
 * @returns Local provider loaded via dynamic import.
 * @example
 * const provider = await loadLocalDataStoreProvider();
 * await provider.getEntry('custom-global-preferences');
 */
async function loadLocalDataStoreProvider(): Promise<DataStoreProvider> {
    const module = await tryImportLocalProvider();
    if (typeof module.createLocalDataStoreProvider !== 'function') {
        throw new Error('Missing createLocalDataStoreProvider export.');
    }
    return module.createLocalDataStoreProvider();
}

/**
 * Resolve the non-MRT provider based on environment.
 *
 * Environment variables:
 * - `SFNEXT_DATA_STORE_ALLOW_LOCAL` (optional): allow local provider outside development ("true")
 * - `CI` (optional): allow local provider when set to "true"
 *
 * @returns Local provider in development, otherwise throws.
 * @example
 * const provider = await resolveNonMrtProvider();
 */
async function resolveNonMrtProvider(): Promise<DataStoreProvider> {
    const allowLocalProvider =
        isDevelopmentEnvironment() || process.env.SFNEXT_DATA_STORE_ALLOW_LOCAL === 'true' || process.env.CI === 'true';

    if (allowLocalProvider) {
        return loadLocalDataStoreProvider();
    }

    throw new Error('Data store is unavailable. Ensure AWS_REGION, MOBIFY_PROPERTY_ID, and DEPLOY_TARGET are set.');
}
