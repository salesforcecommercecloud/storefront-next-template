import { n as createDataStoreMiddleware, t as createDataStoreContext } from "./utils.js";

//#region src/data-store/middleware/gcp-preferences.ts
const DEFAULT_GCP_PREFERENCES_KEY = "gcp";
const DATA_STORE_UNAVAILABLE_MODE = process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;
/**
* Map keys inside the `gcp` data store entry. The ECOM MRT sync job writes
* to these exact keys; keep in sync with the sync job contract.
*/
const API_KEY_MAP_KEY = "api-key";
const gcpPreferencesContext = createDataStoreContext();
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
function getGcpPreferences(context) {
	const data = context.get(gcpPreferencesContext);
	if (data === null) {
		console.warn("GCP preferences context not found. Ensure gcpPreferencesMiddleware runs before loaders, or expect empty values in environments without the MRT data store entry.");
		return { apiKey: "" };
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
function getGcpApiKey(context) {
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
const gcpPreferencesMiddleware = createDataStoreMiddleware({
	entryKey: DEFAULT_GCP_PREFERENCES_KEY,
	context: gcpPreferencesContext,
	onUnavailable: DATA_STORE_UNAVAILABLE_MODE === "fallback" ? "fallback" : "throw",
	fallbackValue: { apiKey: "" },
	transform: (value) => {
		const rawKey = value[API_KEY_MAP_KEY];
		return { apiKey: typeof rawKey === "string" ? rawKey : "" };
	}
});

//#endregion
export { getGcpPreferences as a, getGcpApiKey as i, gcpPreferencesContext as n, gcpPreferencesMiddleware as r, DEFAULT_GCP_PREFERENCES_KEY as t };
//# sourceMappingURL=gcp-preferences.js.map