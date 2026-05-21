import { i as siteContext } from "./site-context2.js";
import { createContext } from "react-router";
import { DataStore, DataStoreNotFoundError, DataStoreServiceError, DataStoreUnavailableError } from "@salesforce/mrt-utilities/data-store";

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
	const dataStoreMiddleware = async ({ context }, next) => {
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
	return dataStoreMiddleware;
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
		if (error instanceof DataStoreUnavailableError) {
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
		if (error instanceof DataStoreNotFoundError) {
			console.warn(`Data store entry '${entryKey}' not found.`);
			return { state: "missing" };
		}
		if (error instanceof DataStoreServiceError) throw new Error(`Data store request failed for '${entryKey}'.`);
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
	const entry = await DataStore.getDataStore().getEntry(key);
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
export { prefixWithSiteId as a, getDataStoreEntry as i, createDataStoreMiddleware as n, readLazyDataStoreEntry as o, createLazyDataStoreMiddleware as r, createDataStoreContext as t };
//# sourceMappingURL=utils.js.map