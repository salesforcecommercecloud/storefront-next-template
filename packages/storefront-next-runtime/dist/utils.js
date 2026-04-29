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
		const resolvedEntryKey = typeof entryKey === "function" ? entryKey(context) : entryKey;
		try {
			const entry = await getDataStoreEntry(resolvedEntryKey);
			if (!entry?.value || typeof entry.value !== "object") {
				console.warn(`Data store entry '${resolvedEntryKey}' not found or invalid.`);
				return next();
			}
			context.set(contextKey, transform(entry.value));
		} catch (error) {
			if (error instanceof DataStoreUnavailableError) {
				if (onUnavailable === "fallback" && typeof fallbackValue !== "undefined") {
					const resolvedFallbackValue = typeof fallbackValue === "function" ? fallbackValue(context) : fallbackValue;
					context.set(contextKey, resolvedFallbackValue);
					console.warn(`Data store unavailable for '${resolvedEntryKey}'. Using configured fallback value.`);
					return next();
				}
				throw new Error("Data store is unavailable. Ensure AWS_REGION, MOBIFY_PROPERTY_ID, and DEPLOY_TARGET are set.");
			}
			if (error instanceof DataStoreNotFoundError) {
				console.warn(`Data store entry '${resolvedEntryKey}' not found.`);
				return next();
			}
			if (error instanceof DataStoreServiceError) throw new Error(`Data store request failed for '${resolvedEntryKey}'.`);
			throw error;
		}
		return next();
	};
	return dataStoreMiddleware;
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
export { prefixWithSiteId as i, createDataStoreMiddleware as n, getDataStoreEntry as r, createDataStoreContext as t };
//# sourceMappingURL=utils.js.map