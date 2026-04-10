import { a as sitePreferencesContext, i as getSitePreferences, n as SitePreferences, r as customSitePreferencesMiddleware, t as DEFAULT_SITE_PREFERENCES_KEY } from "./custom-site-preferences.js";
import { a as getCustomGlobalPreferences, i as customGlobalPreferencesMiddleware, n as DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY, r as customGlobalPreferencesContext, t as CustomGlobalPreferences } from "./custom-global-preferences.js";
import { MiddlewareFunction, RouterContextProvider, createContext } from "react-router";

//#region src/data-store/provider.d.ts

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
type DataStoreProvider = {
  kind: 'mrt' | 'local';
  getEntry: (key: string) => Promise<DataStoreEntry | null>;
};
//#endregion
//#region src/data-store/utils.d.ts

type DataStoreContextKey<T> = ReturnType<typeof createContext<T | null>>;
type DataStoreEntryKey = string | ((context: Readonly<RouterContextProvider>) => string);
type DataStoreMiddlewareOptions<T> = {
  entryKey: DataStoreEntryKey;
  context: DataStoreContextKey<T>;
  transform?: (value: Record<string, unknown>) => T;
  provider?: DataStoreProvider | Promise<DataStoreProvider>;
};
/**
 * Creates a typed React Router context for data store entries.
 *
 * Initializes the context with `null` so middleware can populate it during requests.
 *
 * @returns React Router context key for data store values
 */
declare function createDataStoreContext<T>(): DataStoreContextKey<T>;
/**
 * Creates a data-store middleware that fetches site preferences from MRT data access layer
 * and stores them in the router context.
 *
 * Environment variables:
 * - `AWS_REGION` (required): AWS region for the data store table (e.g., "us-east-1")
 * - `MOBIFY_PROPERTY_ID` (required): MRT property identifier (e.g., "abcd1234")
 * - `DEPLOY_TARGET` (required): MRT deploy target (e.g., "production")
 *
 * @param options - Middleware options for data store entry and context
 * @returns React Router middleware for server requests
 */
declare function createDataStoreMiddleware<T>(options: DataStoreMiddlewareOptions<T>): MiddlewareFunction<Response>;
//#endregion
export { type CustomGlobalPreferences, DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY, DEFAULT_SITE_PREFERENCES_KEY, type DataStoreContextKey, type DataStoreEntry, type DataStoreEntryKey, type DataStoreMiddlewareOptions, type DataStoreProvider, type SitePreferences, createDataStoreContext, createDataStoreMiddleware, customGlobalPreferencesContext, customGlobalPreferencesMiddleware, customSitePreferencesMiddleware, getCustomGlobalPreferences, getSitePreferences, sitePreferencesContext };
//# sourceMappingURL=data-store.d.ts.map