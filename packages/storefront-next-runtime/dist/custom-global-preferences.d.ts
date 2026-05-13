import * as react_router1 from "react-router";
import { RouterContextProvider } from "react-router";

//#region src/data-store/middleware/custom-global-preferences.d.ts

type CustomGlobalPreferences = Record<string, unknown>;
declare const DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY = "custom-global-preferences";
declare const customGlobalPreferencesContext: react_router1.RouterContext<CustomGlobalPreferences | null>;
/**
 * Read custom global preferences from router context.
 *
 * @param context - Router context provider
 * @returns Custom global preferences data stored by data-store middleware
 * @throws Error when the data-store context is not available
 */
declare function getCustomGlobalPreferences(context: Readonly<RouterContextProvider>): CustomGlobalPreferences;
declare const customGlobalPreferencesMiddleware: react_router1.MiddlewareFunction<Response>;
//#endregion
export { getCustomGlobalPreferences as a, customGlobalPreferencesMiddleware as i, DEFAULT_CUSTOM_GLOBAL_PREFERENCES_KEY as n, customGlobalPreferencesContext as r, CustomGlobalPreferences as t };
//# sourceMappingURL=custom-global-preferences.d.ts.map