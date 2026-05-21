import { a as prefixWithSiteId, n as createDataStoreMiddleware, t as createDataStoreContext } from "./utils.js";

//#region src/data-store/middleware/custom-site-preferences.ts
const DEFAULT_SITE_PREFERENCES_KEY = "site-preferences";
const sitePreferencesContext = createDataStoreContext();
const DATA_STORE_UNAVAILABLE_MODE = process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;
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
	onUnavailable: DATA_STORE_UNAVAILABLE_MODE === "fallback" ? "fallback" : "throw",
	fallbackValue: {}
});

//#endregion
export { sitePreferencesContext as i, customSitePreferencesMiddleware as n, getSitePreferences as r, DEFAULT_SITE_PREFERENCES_KEY as t };
//# sourceMappingURL=custom-site-preferences.js.map