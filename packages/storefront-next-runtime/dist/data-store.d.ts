import { a as sitePreferencesContext, i as getSitePreferences, n as SitePreferences, t as DEFAULT_SITE_PREFERENCES_KEY } from "./custom-site-preferences.js";
import { a as getCustomGlobalPreferences, n as DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY, r as customGlobalPreferencesContext, t as CustomGlobalPreferences } from "./custom-global-preferences.js";
import { a as getGcpApiKey, n as GcpPreferences, o as getGcpPreferences, r as gcpPreferencesContext, t as DEFAULT_GCP_PREFERENCES_KEY } from "./gcp-preferences.js";
import * as react_router12 from "react-router";
import { MiddlewareFunction, RouterContextProvider, createContext } from "react-router";
import { DataStore, DataStoreNotFoundError, DataStoreServiceError, DataStoreUnavailableError } from "@salesforce/mrt-utilities/data-store";

//#region src/data-store/utils.d.ts

type DataStoreContextKey<T> = ReturnType<typeof createContext<T | null>>;
type DataStoreEntryKey = string | ((context: Readonly<RouterContextProvider>) => string);
type DataStoreEntry<TValue = unknown> = {
  value?: TValue;
};
type DataStoreMiddlewareOptions<T> = {
  entryKey: DataStoreEntryKey;
  context: DataStoreContextKey<T>;
  transform?: (value: Record<string, unknown>) => T;
  onUnavailable?: 'throw' | 'fallback';
  fallbackValue?: T | ((context: Readonly<RouterContextProvider>) => T);
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
/**
 * Lazy variant of {@link createDataStoreMiddleware}. Instead of fetching the
 * entry up-front during middleware execution, this stores a memoized loader
 * in the router context. Consumers call {@link readLazyDataStoreEntry} to
 * trigger the fetch on demand — pages that never read the value never pay
 * for the data-store call.
 *
 * Repeated reads within the same request share the in-flight promise so
 * the entry is fetched at most once per request.
 *
 * Use this for entries that only a subset of routes consume (e.g. config
 * read by a single feature) rather than entries needed on every request.
 */
declare function createLazyDataStoreMiddleware<T>(options: DataStoreMiddlewareOptions<T>): MiddlewareFunction<Response>;
/**
 * Reads a value populated by {@link createLazyDataStoreMiddleware}. Triggers
 * the underlying data-store fetch on first call and reuses the cached
 * promise on subsequent calls within the same request.
 *
 * Returns `null` when the lazy middleware did not run (no loader in
 * context) or when the entry is missing/invalid.
 */
declare function readLazyDataStoreEntry<T>(context: Readonly<RouterContextProvider>, contextKey: DataStoreContextKey<T>): Promise<T | null>;
/**
 * Read a data-store entry through the singleton MRT utilities API.
 * The underlying implementation (production DynamoDB vs development pseudo store)
 * is resolved by `@salesforce/mrt-utilities/data-store` export conditions.
 *
 * @param key - Data-store entry key
 * @returns Data-store entry or null when missing/invalid shape
 */
declare function getDataStoreEntry<TValue = unknown>(key: string): Promise<DataStoreEntry<TValue> | null>;
//#endregion
//#region src/data-store/middleware/login-preferences.d.ts
type LoginPreferences = {
  emailVerificationEnabled?: boolean;
};
declare const loginPreferencesContext: react_router12.RouterContext<LoginPreferences | null>;
/**
 * Read login preferences from router context.
 *
 * @param context - Router context provider
 * @returns Login preferences data stored by data-store middleware
 */
declare function getLoginPreferences(context: Readonly<RouterContextProvider>): LoginPreferences;
//#endregion
//#region src/data-store/index.d.ts
declare const dataStoreMiddleware: react_router12.MiddlewareFunction<Response>[];
//#endregion
export { type CustomGlobalPreferences, DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY, DEFAULT_GCP_PREFERENCES_KEY, DEFAULT_SITE_PREFERENCES_KEY, DataStore, type DataStoreContextKey, type DataStoreEntry, type DataStoreEntryKey, type DataStoreMiddlewareOptions, DataStoreNotFoundError, DataStoreServiceError, DataStoreUnavailableError, type GcpPreferences, type LoginPreferences, type SitePreferences, createDataStoreContext, createDataStoreMiddleware, createLazyDataStoreMiddleware, customGlobalPreferencesContext, dataStoreMiddleware, gcpPreferencesContext, getCustomGlobalPreferences, getDataStoreEntry, getGcpApiKey, getGcpPreferences, getLoginPreferences, getSitePreferences, loginPreferencesContext, readLazyDataStoreEntry, sitePreferencesContext };
//# sourceMappingURL=data-store.d.ts.map