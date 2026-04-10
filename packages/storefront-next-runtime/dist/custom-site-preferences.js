import { n as createDataStoreMiddleware, t as createDataStoreContext } from "./utils.js";
import { i as siteContext } from "./site-context2.js";

//#region src/data-store/middleware/custom-site-preferences.ts
const DEFAULT_SITE_PREFERENCES_KEY = "site-preferences";
const sitePreferencesContext = createDataStoreContext();
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
	entryKey: (context) => {
		const siteId = context.get(siteContext)?.site?.id;
		if (!siteId) throw new Error("Site id not found. Ensure site context middleware runs before data-store middleware.");
		return `${siteId}-custom-site-preferences`;
	},
	context: sitePreferencesContext
});

//#endregion
export { sitePreferencesContext as i, customSitePreferencesMiddleware as n, getSitePreferences as r, DEFAULT_SITE_PREFERENCES_KEY as t };
//# sourceMappingURL=custom-site-preferences.js.map