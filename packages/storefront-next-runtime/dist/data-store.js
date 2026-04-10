import { n as createDataStoreMiddleware, t as createDataStoreContext } from "./utils.js";
import "./site-context2.js";
import "./apply-url-config.js";
import { i as sitePreferencesContext, n as customSitePreferencesMiddleware, r as getSitePreferences, t as DEFAULT_SITE_PREFERENCES_KEY } from "./custom-site-preferences.js";
import { i as getCustomGlobalPreferences, n as customGlobalPreferencesContext, r as customGlobalPreferencesMiddleware, t as DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY } from "./custom-global-preferences.js";

export { DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY, DEFAULT_SITE_PREFERENCES_KEY, createDataStoreContext, createDataStoreMiddleware, customGlobalPreferencesContext, customGlobalPreferencesMiddleware, customSitePreferencesMiddleware, getCustomGlobalPreferences, getSitePreferences, sitePreferencesContext };