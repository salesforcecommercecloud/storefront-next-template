import { createContext } from "react-router";
import { DataStore, DataStoreNotFoundError, DataStoreServiceError, DataStoreUnavailableError } from "@salesforce/mrt-utilities/middleware";

//#region src/data-store/provider.ts
let providerPromise = null;
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
function getDefaultDataStoreProvider() {
	if (providerPromise) return providerPromise;
	providerPromise = hasMrtEnvironment() ? Promise.resolve(createMrtDataStoreProvider()) : resolveNonMrtProvider();
	return providerPromise;
}
/**
* Create the MRT data-store provider.
*
* @returns MRT provider backed by `@salesforce/mrt-utilities`.
* @example
* const provider = createMrtDataStoreProvider();
* await provider.getEntry('custom-global-preferences');
*/
function createMrtDataStoreProvider() {
	return {
		kind: "mrt",
		getEntry: async (key) => await DataStore.getDataStore().getEntry(key)
	};
}
/**
* Load the local data-store provider for development.
*
* @returns Local provider loaded via dynamic import.
* @example
* const provider = await loadLocalDataStoreProvider();
* await provider.getEntry('custom-global-preferences');
*/
async function loadLocalDataStoreProvider() {
	const module = await tryImportLocalProvider();
	if (typeof module.createLocalDataStoreProvider !== "function") throw new Error("Missing createLocalDataStoreProvider export.");
	return module.createLocalDataStoreProvider();
}
/**
* Resolve the non-MRT provider based on environment.
*
* Environment variables:
* - `SFNEXT_DATA_STORE_ALLOW_LOCAL` (optional): allow local provider outside development ("true")
* - `CI` (optional): allow local provider when set to "true"
*
* @returns Local provider in development, otherwise throws.
* @example
* const provider = await resolveNonMrtProvider();
*/
async function resolveNonMrtProvider() {
	if (isDevelopmentEnvironment() || process.env.SFNEXT_DATA_STORE_ALLOW_LOCAL === "true" || process.env.CI === "true") return loadLocalDataStoreProvider();
	throw new Error("Data store is unavailable. Ensure AWS_REGION, MOBIFY_PROPERTY_ID, and DEPLOY_TARGET are set.");
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
	const { entryKey, context: contextKey } = options;
	const transform = options.transform ?? ((value) => value);
	const providerPromise$1 = options.provider ? Promise.resolve(options.provider) : getDefaultDataStoreProvider();
	const dataStoreMiddleware = async ({ context }, next) => {
		const resolvedEntryKey = typeof entryKey === "function" ? entryKey(context) : entryKey;
		try {
			const entry = await (await providerPromise$1).getEntry(resolvedEntryKey);
			if (!entry?.value || typeof entry.value !== "object") {
				console.warn(`Data store entry '${resolvedEntryKey}' not found or invalid.`);
				return next();
			}
			context.set(contextKey, transform(entry.value));
		} catch (error) {
			if (error instanceof DataStoreUnavailableError) throw new Error("Data store is unavailable. Ensure AWS_REGION, MOBIFY_PROPERTY_ID, and DEPLOY_TARGET are set.");
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
* Check whether MRT environment variables are present.
*
* @returns True when all MRT environment variables are set.
* @example
* if (hasMrtEnvironment()) {
*   // Use MRT provider
* }
*/
function hasMrtEnvironment() {
	return Boolean(process.env.AWS_REGION && process.env.MOBIFY_PROPERTY_ID && process.env.DEPLOY_TARGET);
}
/**
* Check whether the runtime is in a development environment.
*
* @returns True when NODE_ENV is not "production".
* @example
* if (isDevelopmentEnvironment()) {
*   // Load local provider
* }
*/
function isDevelopmentEnvironment() {
	return process.env.NODE_ENV !== "production";
}
/**
* Attempt to import the local provider from the dev package or workspace path.
*
* @returns Local provider module.
* @throws Error when the provider cannot be resolved.
* @example
* const module = await tryImportLocalProvider();
* const provider = module.createLocalDataStoreProvider();
*/
async function tryImportLocalProvider() {
	try {
		return await import(
			/* @vite-ignore */
			"@salesforce/storefront-next-dev/data-store/local-provider"
);
	} catch (error) {
		throw new Error("Failed to load local data-store provider. Ensure @salesforce/storefront-next-dev is installed.", { cause: error });
	}
}

//#endregion
export { createDataStoreMiddleware as n, getDefaultDataStoreProvider as r, createDataStoreContext as t };
//# sourceMappingURL=utils.js.map