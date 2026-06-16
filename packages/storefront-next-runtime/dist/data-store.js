import "./env2.js";
import { i as siteContext } from "./site-context2.js";
import "./apply-url-config.js";
import { createContext } from "react-router";
import { DataStore, DataStore as DataStore$1, DataStoreNotFoundError, DataStoreNotFoundError as DataStoreNotFoundError$1, DataStoreServiceError, DataStoreServiceError as DataStoreServiceError$1, DataStoreUnavailableError, DataStoreUnavailableError as DataStoreUnavailableError$1 } from "@salesforce/mrt-utilities/data-store";

//#region src/data-store/logger-context.ts
function formatMessage(message, metadata) {
	if (!metadata) return message;
	try {
		return `${message} ${JSON.stringify(metadata, replacerForErrors)}`;
	} catch {
		return `${message} [unserializable metadata]`;
	}
}
function replacerForErrors(_key, value) {
	if (value instanceof Error) return {
		name: value.name,
		message: value.message,
		...value.stack && { stack: value.stack }
	};
	return value;
}
/**
* Default logger used when nothing has been injected via
* {@link dataStoreLoggerContext}. Routes warnings to `console.warn` and
* errors to `console.error` so diagnostics remain visible in environments
* (tests, scripts, hosts that haven't wired a structured logger) where the
* SDK is invoked outside the storefront template. `info` and `debug` are
* no-ops to avoid noisy default output.
*/
const consoleLogger = Object.freeze({
	error(message, metadata) {
		console.error(formatMessage(message, metadata));
	},
	warn(message, metadata) {
		console.warn(formatMessage(message, metadata));
	},
	info() {},
	debug() {}
});
/**
* Router context the SDK reads to obtain a request-scoped structured logger.
*
* Hosts (e.g. the storefront template) populate this from their own logging
* middleware. When unset, {@link getDataStoreLogger} falls back to a
* console-based logger so warnings remain visible.
*
* Defaults to `null` (not `undefined`) because React Router's
* `context.get()` throws when `defaultValue === undefined`.
*/
const dataStoreLoggerContext = createContext(null);
/**
* Read the data-store logger from router context, falling back to a
* console-based default when nothing has been injected.
*
* Use this from inside SDK middleware/loaders that have access to a
* {@link RouterContextProvider}.
*/
function getDataStoreLogger(context) {
	return context.get(dataStoreLoggerContext) ?? consoleLogger;
}

//#endregion
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
* Creates a React Router middleware that fetches a single MRT data store entry on every
* request and stores the resulting value in the supplied router context.
*
* Failure handling is controlled by `options.onUnavailable`:
* - `'throw'` (default for the factory): rethrow `DataStoreUnavailableError` and
*   `DataStoreServiceError` with a stable error message. Fail-fast — the request errors out.
* - `'fallback'`: log a warning and resolve to `options.fallbackValue` when configured, or
*   to the missing state (context not populated) when no `fallbackValue` is provided. The
*   request continues without crashing the middleware chain.
*
* `DataStoreNotFoundError` is always treated as "missing" (warn, do not populate context),
* regardless of `onUnavailable` — a not-found entry is an expected steady-state for
* features that haven't been published yet, not a service failure.
*
* Errors thrown from `options.transform` propagate to the caller — they indicate a
* programmer error in the middleware definition, not data-store unavailability.
*
* @param options - See {@link DataStoreMiddlewareOptions}.
* @returns React Router middleware for server requests.
*
* @env AWS_REGION (required): AWS region for the data store table (e.g., `us-east-1`).
* @env MOBIFY_PROPERTY_ID (required): MRT property identifier.
* @env DEPLOY_TARGET (required): MRT deploy target (e.g., `production`).
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
* Failure handling matches the eager variant: `onUnavailable` and
* `fallbackValue` are honored when the underlying fetch fails. The fallback
* value (or `null` for the missing state) surfaces through
* {@link readLazyDataStoreEntry}.
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
	const logger = getDataStoreLogger(context);
	try {
		const entry = await getDataStoreEntry(entryKey);
		if (!entry?.value || typeof entry.value !== "object") {
			logger.debug(`Data store entry '${entryKey}' not found or invalid.`, { entryKey });
			return { state: "missing" };
		}
		return {
			state: "value",
			value: transform(entry.value)
		};
	} catch (error) {
		if (error instanceof DataStoreNotFoundError$1) {
			logger.debug(`Data store entry '${entryKey}' not found.`, { entryKey });
			return { state: "missing" };
		}
		if (error instanceof DataStoreUnavailableError$1 || error instanceof DataStoreServiceError$1) return resolveDataStoreFallback({
			entryKey,
			context,
			error,
			onUnavailable,
			fallbackValue,
			logger
		});
		throw error;
	}
}
function resolveDataStoreFallback(args) {
	const { entryKey, context, error, onUnavailable, fallbackValue, logger } = args;
	const reason = error instanceof DataStoreServiceError$1 ? "service error" : "unavailable";
	if (onUnavailable === "fallback") {
		if (typeof fallbackValue !== "undefined") {
			const resolved = typeof fallbackValue === "function" ? fallbackValue(context) : fallbackValue;
			logger.warn(`Data store ${reason} for '${entryKey}'. Using configured fallback value.`, {
				entryKey,
				reason,
				error
			});
			return {
				state: "fallback",
				value: resolved
			};
		}
		logger.warn(`Data store ${reason} for '${entryKey}'. No fallback configured; treating entry as missing.`, {
			entryKey,
			reason,
			error
		});
		return { state: "missing" };
	}
	if (error instanceof DataStoreUnavailableError$1) throw new Error("Data store is unavailable. Ensure AWS_REGION, MOBIFY_PROPERTY_ID, and DEPLOY_TARGET are set.");
	throw new Error(`Data store request failed for '${entryKey}'.`);
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
/**
* Read site preferences from router context.
*
* @param context - Router context provider
* @returns Site preferences data stored by data-store middleware
*/
function getSitePreferences(context) {
	const data = context.get(sitePreferencesContext);
	if (!data) {
		getDataStoreLogger(context).debug("Data store context not found. Ensure data-store middleware runs before loaders and the required env vars are set.");
		return {};
	}
	return data;
}
/**
* Middleware that reads the site-scoped `custom-site-preferences` entry from the MRT data
* store and stores it in {@link sitePreferencesContext}. The entry key is prefixed with
* the current site id (e.g. `acme-custom-site-preferences`).
*
* Defaults to graceful degradation: if the data store is unavailable or returns a service
* error, the request continues with `{}` as the preferences value rather than crashing.
* Set `SFNEXT_DATA_STORE_UNAVAILABLE_MODE=throw` in the environment to opt back into
* fail-fast behavior. The env var is read once at module load.
*
* Must run after the site-context middleware (so the site id is available for the entry
* key) and before any loader that calls {@link getSitePreferences}.
*/
const customSitePreferencesMiddleware = createDataStoreMiddleware({
	entryKey: prefixWithSiteId("custom-site-preferences"),
	context: sitePreferencesContext,
	onUnavailable: process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE === "throw" ? "throw" : "fallback",
	fallbackValue: {}
});

//#endregion
//#region src/data-store/middleware/custom-global-preferences.ts
const DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY = "custom-global-preferences";
const customGlobalPreferencesContext = createDataStoreContext();
/**
* Read custom global preferences from router context.
*
* @param context - Router context provider
* @returns Custom global preferences data stored by data-store middleware
*/
function getCustomGlobalPreferences(context) {
	const data = context.get(customGlobalPreferencesContext);
	if (!data) {
		getDataStoreLogger(context).debug("Custom global preferences context not found. Ensure data-store middleware runs before loaders and the required env vars are set.");
		return {};
	}
	return data;
}
/**
* Middleware that reads the global `custom-global-preferences` entry from the MRT data
* store and stores it in {@link customGlobalPreferencesContext}.
*
* Defaults to graceful degradation: if the data store is unavailable or returns a service
* error, the request continues with `{}` as the preferences value rather than crashing.
* Set `SFNEXT_DATA_STORE_UNAVAILABLE_MODE=throw` in the environment to opt back into
* fail-fast behavior. The env var is read once at module load.
*/
const customGlobalPreferencesMiddleware = createDataStoreMiddleware({
	entryKey: DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY,
	context: customGlobalPreferencesContext,
	onUnavailable: process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE === "throw" ? "throw" : "fallback",
	fallbackValue: {}
});

//#endregion
//#region src/data-store/middleware/gcp-preferences.ts
const DEFAULT_GCP_PREFERENCES_KEY = "gcp";
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
		getDataStoreLogger(context).debug("GCP preferences context not found. Ensure gcpPreferencesMiddleware runs before loaders, or expect empty values in environments without the MRT data store entry.");
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
* Only available for storefronts connecting to production ECOM instances. When the entry
* is not synced (e.g. the GCP feature flag is off in ECOM), the underlying fetch surfaces
* as `DataStoreNotFoundError` and the context is left unset; consumers see the empty
* default `{ apiKey: '' }` via {@link getGcpPreferences}.
*
* Defaults to graceful degradation: if the data store is unavailable or returns a service
* error, the request continues with `{ apiKey: '' }` rather than crashing. Set
* `SFNEXT_DATA_STORE_UNAVAILABLE_MODE=throw` in the environment to opt back into
* fail-fast behavior. The env var is read once at module load.
*
* Must run before any loader/middleware that reads `getGcpPreferences(context)` or
* `getGcpApiKey(context)`.
*/
const gcpPreferencesMiddleware = createDataStoreMiddleware({
	entryKey: DEFAULT_GCP_PREFERENCES_KEY,
	context: gcpPreferencesContext,
	onUnavailable: process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE === "throw" ? "throw" : "fallback",
	fallbackValue: { apiKey: "" },
	transform: (value) => {
		const rawKey = value[API_KEY_MAP_KEY];
		return { apiKey: typeof rawKey === "string" ? rawKey : "" };
	}
});

//#endregion
//#region src/data-store/middleware/login-preferences.ts
const loginPreferencesContext = createDataStoreContext();
/**
* Read login preferences from router context.
*
* @param context - Router context provider
* @returns Login preferences data stored by data-store middleware
*/
function getLoginPreferences(context) {
	const data = context.get(loginPreferencesContext);
	if (!data) {
		getDataStoreLogger(context).debug("Login preferences context not found. Ensure data-store middleware runs before loaders and the required env vars are set.");
		return {};
	}
	return data;
}
/**
* Middleware that reads the site-scoped `login-preferences` entry from the MRT data store
* and stores its `data` field in {@link loginPreferencesContext}. The entry key is
* prefixed with the current site id (e.g. `acme-login-preferences`).
*
* Defaults to graceful degradation: if the data store is unavailable or returns a service
* error, the request continues with `{ emailVerificationEnabled: false }` rather than
* crashing. Set `SFNEXT_DATA_STORE_UNAVAILABLE_MODE=throw` in the environment to opt back
* into fail-fast behavior. The env var is read once at module load.
*
* Must run after the site-context middleware (so the site id is available for the entry
* key) and before any loader that calls {@link getLoginPreferences}.
*/
const loginPreferencesMiddleware = createDataStoreMiddleware({
	entryKey: prefixWithSiteId("login-preferences"),
	context: loginPreferencesContext,
	onUnavailable: process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE === "throw" ? "throw" : "fallback",
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
export { DataStore, DataStoreNotFoundError, DataStoreServiceError, DataStoreUnavailableError, createDataStoreContext, createDataStoreMiddleware, createLazyDataStoreMiddleware, dataStoreLoggerContext, dataStoreMiddleware, getCustomGlobalPreferences, getDataStoreEntry, getDataStoreLogger, getGcpApiKey, getGcpPreferences, getLoginPreferences, getSitePreferences, readLazyDataStoreEntry };
//# sourceMappingURL=data-store.js.map