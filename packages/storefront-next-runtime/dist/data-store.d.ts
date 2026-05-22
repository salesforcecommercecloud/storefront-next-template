import * as react_router0 from "react-router";
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
//#region src/data-store/middleware/custom-site-preferences.d.ts
type SitePreferences = Record<string, unknown>;
/**
 * Read site preferences from router context.
 *
 * @param context - Router context provider
 * @returns Site preferences data stored by data-store middleware
 * @throws Error when the data-store context is not available
 */
declare function getSitePreferences(context: Readonly<RouterContextProvider>): SitePreferences;
//#endregion
//#region src/data-store/middleware/custom-global-preferences.d.ts
type CustomGlobalPreferences = Record<string, unknown>;
/**
 * Read custom global preferences from router context.
 *
 * @param context - Router context provider
 * @returns Custom global preferences data stored by data-store middleware
 * @throws Error when the data-store context is not available
 */
declare function getCustomGlobalPreferences(context: Readonly<RouterContextProvider>): CustomGlobalPreferences;
//#endregion
//#region src/data-store/middleware/gcp-preferences.d.ts
/**
 * OOTB Google Cloud Platform preferences sourced from the MRT data store.
 *
 * Additional fields (e.g. `projectId`, `region`) may be added here as the
 * ECOM MRT sync job expands the `gcp` entry. Consumers should read the
 * object as a whole via `getGcpPreferences`, or use a specific convenience
 * getter like `getGcpApiKey` for a single field.
 */
type GcpPreferences = {
  apiKey: string;
};
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
declare function getGcpPreferences(context: Readonly<RouterContextProvider>): GcpPreferences;
/**
 * Convenience getter for the Google Cloud API key alone.
 *
 * Equivalent to `getGcpPreferences(context).apiKey`.
 *
 * @param context - Router context provider
 * @returns The GCP API key, or an empty string when unavailable
 */
declare function getGcpApiKey(context: Readonly<RouterContextProvider>): string;
//#endregion
//#region src/data-store/middleware/login-preferences.d.ts
type LoginPreferences = {
  emailVerificationEnabled?: boolean;
};
/**
 * Read login preferences from router context.
 *
 * @param context - Router context provider
 * @returns Login preferences data stored by data-store middleware
 */
declare function getLoginPreferences(context: Readonly<RouterContextProvider>): LoginPreferences;
//#endregion
//#region src/data-store/index.d.ts
declare const dataStoreMiddleware: react_router0.MiddlewareFunction<Response>[];
//#endregion
export { type CustomGlobalPreferences, DataStore, type DataStoreContextKey, type DataStoreEntry, type DataStoreEntryKey, type DataStoreMiddlewareOptions, DataStoreNotFoundError, DataStoreServiceError, DataStoreUnavailableError, type GcpPreferences, type LoginPreferences, type SitePreferences, createDataStoreContext, createDataStoreMiddleware, createLazyDataStoreMiddleware, dataStoreMiddleware, getCustomGlobalPreferences, getDataStoreEntry, getGcpApiKey, getGcpPreferences, getLoginPreferences, getSitePreferences, readLazyDataStoreEntry };
//# sourceMappingURL=data-store.d.ts.map