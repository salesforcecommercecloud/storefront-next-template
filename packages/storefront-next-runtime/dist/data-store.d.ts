import { a as sitePreferencesContext, i as getSitePreferences, n as SitePreferences, t as DEFAULT_SITE_PREFERENCES_KEY } from "./custom-site-preferences.js";
import { a as getCustomGlobalPreferences, n as DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY, r as customGlobalPreferencesContext, t as CustomGlobalPreferences } from "./custom-global-preferences.js";
import { a as getGcpApiKey, n as GcpPreferences, o as getGcpPreferences, r as gcpPreferencesContext, t as DEFAULT_GCP_PREFERENCES_KEY } from "./gcp-preferences.js";
import * as react_router6 from "react-router";
import { MiddlewareFunction, RouterContextProvider, createContext } from "react-router";
import { DataStoreNotFoundError, DataStoreServiceError, DataStoreUnavailableError } from "@salesforce/mrt-utilities";

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
type DataStoreEntry<TValue = unknown> = {
  value?: TValue;
};
type DataStoreProvider = {
  kind: 'mrt' | 'local';
  getEntry: <TValue = unknown>(key: string) => Promise<DataStoreEntry<TValue> | null>;
};
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
declare function getDefaultDataStoreProvider(): Promise<DataStoreProvider>;
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
//#region src/data-store/middleware/login-preferences.d.ts
type LoginPreferences = {
  emailVerificationEnabled?: boolean;
};
declare const loginPreferencesContext: react_router6.RouterContext<LoginPreferences | null>;
/**
 * Read login preferences from router context.
 *
 * @param context - Router context provider
 * @returns Login preferences data stored by data-store middleware
 */
declare function getLoginPreferences(context: Readonly<RouterContextProvider>): LoginPreferences;
//#endregion
//#region src/data-store/index.d.ts
declare const dataStoreMiddleware: react_router6.MiddlewareFunction<Response>[];
//#endregion
export { type CustomGlobalPreferences, DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY, DEFAULT_GCP_PREFERENCES_KEY, DEFAULT_SITE_PREFERENCES_KEY, type DataStoreContextKey, type DataStoreEntry, type DataStoreEntryKey, type DataStoreMiddlewareOptions, DataStoreNotFoundError, type DataStoreProvider, DataStoreServiceError, DataStoreUnavailableError, type GcpPreferences, type LoginPreferences, type SitePreferences, createDataStoreContext, createDataStoreMiddleware, customGlobalPreferencesContext, dataStoreMiddleware, gcpPreferencesContext, getCustomGlobalPreferences, getDefaultDataStoreProvider, getGcpApiKey, getGcpPreferences, getLoginPreferences, getSitePreferences, loginPreferencesContext, sitePreferencesContext };
//# sourceMappingURL=data-store.d.ts.map