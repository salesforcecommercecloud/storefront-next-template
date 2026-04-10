//#region src/data-store/local-provider.d.ts
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
type LocalDataStoreProvider = {
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
declare function createLocalDataStoreProvider(options?: LocalDataStoreProviderOptions): LocalDataStoreProvider;
//#endregion
export { LocalDataStoreProvider, createLocalDataStoreProvider };
//# sourceMappingURL=local-provider.d.ts.map