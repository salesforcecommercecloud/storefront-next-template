import { i as getDefaultDataStoreProvider, n as createDataStoreMiddleware, r as prefixWithSiteId, t as createDataStoreContext } from "./utils.js";
import "./site-context2.js";
import "./apply-url-config.js";
import { i as sitePreferencesContext, n as customSitePreferencesMiddleware, r as getSitePreferences, t as DEFAULT_SITE_PREFERENCES_KEY } from "./custom-site-preferences.js";
import { i as getCustomGlobalPreferences, n as customGlobalPreferencesContext, r as customGlobalPreferencesMiddleware, t as DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY } from "./custom-global-preferences.js";
import { a as getGcpPreferences, i as getGcpApiKey, n as gcpPreferencesContext, r as gcpPreferencesMiddleware, t as DEFAULT_GCP_PREFERENCES_KEY } from "./gcp-preferences.js";
import { DataStoreNotFoundError, DataStoreServiceError, DataStoreUnavailableError } from "@salesforce/mrt-utilities";

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
		console.warn("Login preferences context not found. Ensure data-store middleware runs before loaders and the required env vars are set.");
		return {};
	}
	return data;
}
const loginPreferencesMiddleware = createDataStoreMiddleware({
	entryKey: prefixWithSiteId("login-preferences"),
	context: loginPreferencesContext,
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
export { DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY, DEFAULT_GCP_PREFERENCES_KEY, DEFAULT_SITE_PREFERENCES_KEY, DataStoreNotFoundError, DataStoreServiceError, DataStoreUnavailableError, createDataStoreContext, createDataStoreMiddleware, customGlobalPreferencesContext, dataStoreMiddleware, gcpPreferencesContext, getCustomGlobalPreferences, getDefaultDataStoreProvider, getGcpApiKey, getGcpPreferences, getLoginPreferences, getSitePreferences, loginPreferencesContext, sitePreferencesContext };
//# sourceMappingURL=data-store.js.map