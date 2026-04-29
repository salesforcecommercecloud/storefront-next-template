import { n as createDataStoreMiddleware, t as createDataStoreContext } from "./utils.js";

//#region src/data-store/middleware/custom-global-preferences.ts
const DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY = "custom-global-preferences";
const customGlobalPreferencesContext = createDataStoreContext();
const DATA_STORE_UNAVAILABLE_MODE = process.env.SFNEXT_DATA_STORE_UNAVAILABLE_MODE;
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
	onUnavailable: DATA_STORE_UNAVAILABLE_MODE === "fallback" ? "fallback" : "throw",
	fallbackValue: {}
});

//#endregion
export { getCustomGlobalPreferences as i, customGlobalPreferencesContext as n, customGlobalPreferencesMiddleware as r, DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY as t };
//# sourceMappingURL=custom-global-preferences.js.map