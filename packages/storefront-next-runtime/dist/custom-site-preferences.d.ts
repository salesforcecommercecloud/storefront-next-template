import * as react_router3 from "react-router";
import { RouterContextProvider } from "react-router";

//#region src/data-store/middleware/custom-site-preferences.d.ts

type SitePreferences = Record<string, unknown>;
declare const DEFAULT_SITE_PREFERENCES_KEY = "site-preferences";
declare const sitePreferencesContext: react_router3.RouterContext<SitePreferences | null>;
/**
 * Read site preferences from router context.
 *
 * @param context - Router context provider
 * @returns Site preferences data stored by data-store middleware
 * @throws Error when the data-store context is not available
 */
declare function getSitePreferences(context: Readonly<RouterContextProvider>): SitePreferences;
declare const customSitePreferencesMiddleware: react_router3.MiddlewareFunction<Response>;
//#endregion
export { sitePreferencesContext as a, getSitePreferences as i, SitePreferences as n, customSitePreferencesMiddleware as r, DEFAULT_SITE_PREFERENCES_KEY as t };
//# sourceMappingURL=custom-site-preferences.d.ts.map