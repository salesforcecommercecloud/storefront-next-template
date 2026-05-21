import "./site-context2.js";
import "./apply-url-config.js";
import { a as prefixWithSiteId, i as getDataStoreEntry, n as createDataStoreMiddleware, o as readLazyDataStoreEntry, r as createLazyDataStoreMiddleware, t as createDataStoreContext } from "./utils.js";
import { i as sitePreferencesContext, n as customSitePreferencesMiddleware, r as getSitePreferences, t as DEFAULT_SITE_PREFERENCES_KEY } from "./custom-site-preferences.js";
import { i as getCustomGlobalPreferences, n as customGlobalPreferencesContext, r as customGlobalPreferencesMiddleware, t as DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY } from "./custom-global-preferences.js";
import { a as getGcpPreferences, i as getGcpApiKey, n as gcpPreferencesContext, r as gcpPreferencesMiddleware, t as DEFAULT_GCP_PREFERENCES_KEY } from "./gcp-preferences.js";
import { DataStore, DataStoreNotFoundError, DataStoreServiceError, DataStoreUnavailableError } from "@salesforce/mrt-utilities/data-store";

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
export { DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY, DEFAULT_GCP_PREFERENCES_KEY, DEFAULT_SITE_PREFERENCES_KEY, DataStore, DataStoreNotFoundError, DataStoreServiceError, DataStoreUnavailableError, createDataStoreContext, createDataStoreMiddleware, createLazyDataStoreMiddleware, customGlobalPreferencesContext, dataStoreMiddleware, gcpPreferencesContext, getCustomGlobalPreferences, getDataStoreEntry, getGcpApiKey, getGcpPreferences, getLoginPreferences, getSitePreferences, loginPreferencesContext, readLazyDataStoreEntry, sitePreferencesContext };
//# sourceMappingURL=data-store.js.map