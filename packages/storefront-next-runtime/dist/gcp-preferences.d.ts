import * as react_router4 from "react-router";
import { RouterContextProvider } from "react-router";

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
declare const DEFAULT_GCP_PREFERENCES_KEY = "gcp";
declare const gcpPreferencesContext: react_router4.RouterContext<GcpPreferences | null>;
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
/**
 * Middleware that reads the OOTB GCP preferences from the MRT data store and
 * stores them in the router context. The entry shape is `{ "api-key": string, ... }`
 * under data store key `gcp`. Missing/invalid fields coerce to empty/default values.
 *
 * Only available for storefronts connecting to production ECOM instances.
 * Must run before any loader/middleware that reads `getGcpPreferences(context)`
 * or `getGcpApiKey(context)`.
 */
declare const gcpPreferencesMiddleware: react_router4.MiddlewareFunction<Response>;
//#endregion
export { getGcpApiKey as a, gcpPreferencesMiddleware as i, GcpPreferences as n, getGcpPreferences as o, gcpPreferencesContext as r, DEFAULT_GCP_PREFERENCES_KEY as t };
//# sourceMappingURL=gcp-preferences.d.ts.map