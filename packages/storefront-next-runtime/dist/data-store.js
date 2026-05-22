import { i as siteContext } from "./site-context2.js";
import "./apply-url-config.js";
import { createContext } from "react-router";
import { DataStore, DataStore as DataStore$1, DataStoreNotFoundError, DataStoreNotFoundError as DataStoreNotFoundError$1, DataStoreServiceError, DataStoreServiceError as DataStoreServiceError$1, DataStoreUnavailableError, DataStoreUnavailableError as DataStoreUnavailableError$1 } from "@salesforce/mrt-utilities/data-store";

//#region src/data-store/utils.ts
/**
* Creates a typed React Router context for data store entries.
*
* Initializes the context with `null` so middleware can populate it during requests.
*
* @returns React Router context key for data store values
*/
function createDataStoreContext() {
	return createContext(null);
}
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
function createDataStoreMiddleware(options) {
	const { entryKey, context: contextKey, onUnavailable = "throw", fallbackValue } = options;
	const transform = options.transform ?? ((value) => value);
	const dataStoreMiddleware$1 = async ({ context }, next) => {
		const result = await loadDataStoreEntry({
			entryKey: typeof entryKey === "function" ? entryKey(context) : entryKey,
			context,
			transform,
			onUnavailable,
			fallbackValue
		});
		if (result.state === "value" || result.state === "fallback") context.set(contextKey, result.value);
		return next();
	};
	return dataStoreMiddleware$1;
}
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
function createLazyDataStoreMiddleware(options) {
	const { entryKey, context: contextKey, onUnavailable = "throw", fallbackValue } = options;
	const transform = options.transform ?? ((value) => value);
	const lazyMiddleware = async ({ context }, next) => {
		let pending;
		const loader = () => {
			if (!pending) pending = loadDataStoreEntry({
				entryKey: typeof entryKey === "function" ? entryKey(context) : entryKey,
				context,
				transform,
				onUnavailable,
				fallbackValue
			}).then((result) => result.state === "missing" ? null : result.value);
			return pending;
		};
		context.set(contextKey, loader);
		return next();
	};
	return lazyMiddleware;
}
/**
* Reads a value populated by {@link createLazyDataStoreMiddleware}. Triggers
* the underlying data-store fetch on first call and reuses the cached
* promise on subsequent calls within the same request.
*
* Returns `null` when the lazy middleware did not run (no loader in
* context) or when the entry is missing/invalid.
*/
async function readLazyDataStoreEntry(context, contextKey) {
	const loader = context.get(contextKey);
	if (typeof loader !== "function") return null;
	return loader();
}
/**
* Internal helper shared by the eager and lazy middleware factories.
* Performs the fetch + transform pipeline and resolves all three error
* paths (unavailable / not-found / service-error) consistently. Returns a
* tagged result so callers can decide whether to populate the context
* synchronously (eager middleware) or hand the value back to a lazy reader.
*/
async function loadDataStoreEntry(args) {
	const { entryKey, context, transform, onUnavailable, fallbackValue } = args;
	try {
		const entry = await getDataStoreEntry(entryKey);
		if (!entry?.value || typeof entry.value !== "object") {
			console.warn(`Data store entry '${entryKey}' not found or invalid.`);
			return { state: "missing" };
		}
		return {
			state: "value",
			value: transform(entry.value)
		};
	} catch (error) {
		if (error instanceof DataStoreUnavailableError$1) {
			if (onUnavailable === "fallback" && typeof fallbackValue !== "undefined") {
				const resolvedFallbackValue = typeof fallbackValue === "function" ? fallbackValue(context) : fallbackValue;
				console.warn(`Data store unavailable for '${entryKey}'. Using configured fallback value.`);
				return {
					state: "fallback",
					value: resolvedFallbackValue
				};
			}
			throw new Error("Data store is unavailable. Ensure AWS_REGION, MOBIFY_PROPERTY_ID, and DEPLOY_TARGET are set.");
		}
		if (error instanceof DataStoreNotFoundError$1) {
			console.warn(`Data store entry '${entryKey}' not found.`);
			return { state: "missing" };
		}
		if (error instanceof DataStoreServiceError$1) throw new Error(`Data store request failed for '${entryKey}'.`);
		throw error;
	}
}
/**
* Read a data-store entry through the singleton MRT utilities API.
* The underlying implementation (production DynamoDB vs development pseudo store)
* is resolved by `@salesforce/mrt-utilities/data-store` export conditions.
*
* @param key - Data-store entry key
* @returns Data-store entry or null when missing/invalid shape
*/
async function getDataStoreEntry(key) {
	const entry = await DataStore$1.getDataStore().getEntry(key);
	if (!entry || typeof entry !== "object") return null;
	return entry;
}
/**
* Creates an entryKey function that prefixes the given suffix with the current site ID.
*
* @param suffix - The entry key suffix (e.g., "custom-site-preferences")
* @returns A function compatible with `DataStoreMiddlewareOptions.entryKey`
*/
function prefixWithSiteId(suffix) {
	return (context) => {
		const siteId = context.get(siteContext)?.site?.id;
		if (!siteId) throw new Error("Site id not found. Ensure site context middleware runs before data-store middleware.");
		return `${siteId}-${suffix}`;
	};
}

//#endregion
//#region src/data-store/middleware/custom-site-preferences.ts
const sitePreferencesContext = createDataStoreContext();
const DATA_STORE_UNAVAILABLE_MODE$3 = process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;
/**
* Read site preferences from router context.
*
* @param context - Router context provider
* @returns Site preferences data stored by data-store middleware
* @throws Error when the data-store context is not available
*/
function getSitePreferences(context) {
	const data = context.get(sitePreferencesContext);
	if (!data) {
		console.warn("Data store context not found. Ensure data-store middleware runs before loaders and the required env vars are set.");
		return {};
	}
	return data;
}
const customSitePreferencesMiddleware = createDataStoreMiddleware({
	entryKey: prefixWithSiteId("custom-site-preferences"),
	context: sitePreferencesContext,
	onUnavailable: DATA_STORE_UNAVAILABLE_MODE$3 === "fallback" ? "fallback" : "throw",
	fallbackValue: {}
});

//#endregion
//#region src/data-store/middleware/custom-global-preferences.ts
const DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY = "custom-global-preferences";
const customGlobalPreferencesContext = createDataStoreContext();
const DATA_STORE_UNAVAILABLE_MODE$2 = process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;
/**
* Read custom global preferences from router context.
*
* @param context - Router context provider
* @returns Custom global preferences data stored by data-store middleware
* @throws Error when the data-store context is not available
*/
function getCustomGlobalPreferences(context) {
	const data = context.get(customGlobalPreferencesContext);
	if (!data) {
		console.warn("Custom global preferences context not found. Ensure data-store middleware runs before loaders and the required env vars are set.");
		return {};
	}
	return data;
}
const customGlobalPreferencesMiddleware = createDataStoreMiddleware({
	entryKey: DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY,
	context: customGlobalPreferencesContext,
	onUnavailable: DATA_STORE_UNAVAILABLE_MODE$2 === "fallback" ? "fallback" : "throw",
	fallbackValue: {}
});

//#endregion
//#region src/data-store/middleware/gcp-preferences.ts
const DEFAULT_GCP_PREFERENCES_KEY = "gcp";
const DATA_STORE_UNAVAILABLE_MODE$1 = process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;
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
	onUnavailable: DATA_STORE_UNAVAILABLE_MODE$1 === "fallback" ? "fallback" : "throw",
	fallbackValue: { apiKey: "" },
	transform: (value) => {
		const rawKey = value[API_KEY_MAP_KEY];
		return { apiKey: typeof rawKey === "string" ? rawKey : "" };
	}
});

//#endregion
//#region src/data-store/middleware/login-preferences.ts
const loginPreferencesContext = createDataStoreContext();
const DATA_STORE_UNAVAILABLE_MODE = process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;
/**
* Read login preferences from router context.
*
* @param context - Router context provider
* @returns Login preferences data stored by data-store middleware
*/
function getLoginPreferences(context) {
	const data = context.get(loginPreferencesContext);
	if (!data) {
		console.warn("Login preferences context not found. Ensure data-store middleware runs before loaders and the required env vars are set.");
		return {};
	}
	return data;
}
const loginPreferencesMiddleware = createDataStoreMiddleware({
	entryKey: prefixWithSiteId("login-preferences"),
	context: loginPreferencesContext,
	onUnavailable: DATA_STORE_UNAVAILABLE_MODE === "fallback" ? "fallback" : "throw",
	fallbackValue: { emailVerificationEnabled: false },
	transform: (value) => value.data
});

//#endregion
//#region src/data-store/index.ts
const dataStoreMiddleware = [
	customSitePreferencesMiddleware,
	customGlobalPreferencesMiddleware,
	gcpPreferencesMiddleware,
	loginPreferencesMiddleware
];

//#endregion
export { DataStore, DataStoreNotFoundError, DataStoreServiceError, DataStoreUnavailableError, createDataStoreContext, createDataStoreMiddleware, createLazyDataStoreMiddleware, dataStoreMiddleware, getCustomGlobalPreferences, getDataStoreEntry, getGcpApiKey, getGcpPreferences, getLoginPreferences, getSitePreferences, readLazyDataStoreEntry };
//# sourceMappingURL=data-store.js.map