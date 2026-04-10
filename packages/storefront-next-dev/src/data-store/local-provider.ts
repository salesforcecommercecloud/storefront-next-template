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

type DataStoreEntry = {
    value?: unknown;
};

export type LocalDataStoreProvider = {
    kind: 'local';
    getEntry: (key: string) => Promise<DataStoreEntry | null>;
};

type LocalDataStoreProviderOptions = {
    defaults?: Record<string, Record<string, unknown>>;
    warnOnMissing?: boolean;
};

/**
 * Create a local data-store provider for development environments.
 *
 * Environment variables:
 * - `SFNEXT_DATA_STORE_DEFAULTS` (optional): JSON map of keys to preference objects.
 *   Example: {"custom-global-preferences":{"featureFlag":true}}
 * - `SFNEXT_DATA_STORE_WARN_ON_MISSING` (optional): Set to "false" to silence warnings.
 *
 * @param options - Optional defaults and warning controls for local entries.
 * @returns Local provider that supplies preferences from defaults or empty values.
 */
export function createLocalDataStoreProvider(options: LocalDataStoreProviderOptions = {}): LocalDataStoreProvider {
    const defaults = options.defaults ?? readDefaultsFromEnv();
    const warnOnMissing = options.warnOnMissing ?? readWarnOnMissingFromEnv();
    const warnedKeys = new Set<string>();

    return {
        kind: 'local',
        getEntry(key: string) {
            const value = defaults[key];
            if (value && typeof value === 'object') {
                return Promise.resolve({ value });
            }

            if (warnOnMissing && !warnedKeys.has(key)) {
                warnedKeys.add(key);
                // eslint-disable-next-line no-console
                console.warn(
                    `Local data-store provider did not find '${key}'. Returning an empty object for development.`
                );
            }

            return Promise.resolve({ value: {} });
        },
    };
}

/**
 * Read default data-store entries from the environment.
 *
 * Environment variables:
 * - `SFNEXT_DATA_STORE_DEFAULTS` (optional): JSON map of keys to preference objects.
 *   Example: {"custom-global-preferences":{"featureFlag":true}}
 *
 * @returns Parsed defaults map or an empty object.
 */
function readDefaultsFromEnv(): Record<string, Record<string, unknown>> {
    const raw = process.env.SFNEXT_DATA_STORE_DEFAULTS;
    if (!raw) {
        return {};
    }

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return parsed as Record<string, Record<string, unknown>>;
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to parse SFNEXT_DATA_STORE_DEFAULTS JSON.', error);
    }

    return {};
}

/**
 * Read warn-on-missing behavior from the environment.
 *
 * Environment variables:
 * - `SFNEXT_DATA_STORE_WARN_ON_MISSING` (optional): Set to "false" to silence warnings.
 *
 * @returns True when warnings should be emitted for missing entries.
 */
function readWarnOnMissingFromEnv(): boolean {
    const raw = process.env.SFNEXT_DATA_STORE_WARN_ON_MISSING;
    if (!raw) {
        return true;
    }
    return raw.toLowerCase() !== 'false';
}
