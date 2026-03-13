import { n as Site$1, r as Url, t as Locale$1 } from "./types.js";
import { PropsWithChildren } from "react";
import * as react_jsx_runtime2 from "react/jsx-runtime";
import * as react_router0 from "react-router";
import { Cookie, MiddlewareFunction, RouterContextProvider } from "react-router";
import { RouteConfigEntry } from "@react-router/dev/routes";

//#region src/multi-site/site-context.d.ts

/**
 * Provides the current site to the component tree.
 * Follows the same pattern as CurrencyProvider.
 *
 * Mounted in the template (e.g., app-wrapper.tsx or root.tsx) with the resolved
 * site value from the loader/middleware.
 */
declare function SiteProvider({
  value,
  children
}: PropsWithChildren<{
  value: Site$1;
}>): react_jsx_runtime2.JSX.Element;
/**
 * React hook to get the current site.
 * Returns undefined when no SiteProvider is mounted.
 */
declare function useSite(): Site$1 | undefined;
//#endregion
//#region src/multi-site/apply-url-config.d.ts

/**
 * Applies multi-site URL configuration to a set of route entries.
 *
 * Wraps non-excluded routes under a parent route with the configured URL prefix
 * (e.g. `/:siteId/:localeId`), while keeping excluded routes (action/resource by default)
 * at the root level. The homepage index route (and its parent layout) is always
 * duplicated at `/` so the root URL still serves content.
 *
 * @param options - Configuration for URL customisation.
 * @param options.routes - The flat route entries discovered from the filesystem.
 * @param options.urlConfig - URL customisation configuration (prefix, excludeRoutes).
 * @param options.wrapperFile - Path to the wrapper component file, relative to appDirectory.
 * @returns The transformed route entries with prefix wrapping applied.
 */
declare function applyUrlConfig(options: {
  routes: RouteConfigEntry[];
  urlConfig?: Url;
  wrapperFile: string;
}): RouteConfigEntry[];
//#endregion
//#region src/multi-site/build-url.d.ts

/**
 * Builds a fully-qualified URL with multi-site prefix and search params.
 *
 * Only keys defined in urlConfig.search are set by multi-site. Any other query params
 * already present on the `to` URL (including duplicate keys) are preserved as-is.
 * e.g. to='/api/search?refine=color:blue&refine=size:M', search='?lng=:localeId'
 *   → '/api/search?refine=color:blue&refine=size:M&lng=en-GB'
 *
 * @example
 * buildUrl({ to: '/product/123', urlConfig: { prefix: '/:siteId', search: '?lng=:localeId' }, params: { siteId: 'global', localeId: 'en-GB' } })
 * // → '/global/product/123?lng=en-GB'
 */
declare function buildUrl({
  to,
  urlConfig,
  params
}: {
  to: string;
  urlConfig?: Url;
  params: Record<string, string>;
}): string;
//#endregion
//#region src/multi-site/types.d.ts
type Locale = Locale$1 & {
  alias?: string;
};
type Site = Omit<Site$1, 'supportedLocales'> & {
  name?: string;
  alias?: string;
  supportedLocales: Locale[];
};
type MultiSiteContext = {
  site: Site;
  locale: Locale;
  siteCookie: Cookie;
  localeCookie: Cookie;
};
/**
 * Configuration passed into the multi-site middleware
 * Configured by the consumer
 */
type MultiSiteConfig = {
  sites: Site[];
  defaultSiteId: string;
  defaultLocale: string;
  siteDetectionConfig?: DetectionConfig;
  localeDetectionConfig?: DetectionConfig;
};
/** Detection method identifier (used for both site and locale detection) */
type DetectionMethod = 'path' | 'querystring' | 'cookie' | 'header';
type DetectionConfig = {
  order: DetectionMethod[];
  lookupFromPathIndex?: number;
  lookupQuerystring?: string;
  lookupCookie?: string;
  lookupHeader?: string;
  caches?: Array<'cookie'>;
};
//#endregion
//#region src/multi-site/middleware.d.ts
declare const multiSiteContext: react_router0.RouterContext<MultiSiteContext | null>;
/**
 * Helper function to get multi-site cookies from router context.
 * Useful in server actions and loaders that need to read/set cookies.
 *
 * @param context - Router context provider
 * @returns Object with siteCookie and localeCookie instances, or null if context not set
 *
 * @example
 * ```typescript
 * export const action: ActionFunction = async ({ request, context }) => {
 *     const cookies = getMultiSiteCookies(context);
 *     if (cookies) {
 *         const cookieHeader = await cookies.localeCookie.serialize(locale);
 *         // ... use cookieHeader
 *     }
 * };
 * ```
 */
declare function getMultiSiteCookies(context: Readonly<RouterContextProvider>): {
  siteCookie: react_router0.Cookie;
  localeCookie: react_router0.Cookie;
} | null;
/**
 * Creates a multi-site middleware that resolves the current site from
 * the request (path, cookie, header, query, or default) and stores the
 * result in the router context.
 *
 * Does not import or read from app config context; the consumer supplies config.
 */
declare function createMultiSiteMiddleware(config: MultiSiteConfig): MiddlewareFunction<Response>;
//#endregion
//#region src/multi-site/cookies.d.ts
/**
 * WeakMap to pass resolved locale from multi-site middleware to i18next's findLocale.
 * WeakMap allows garbage collection when requests are done.
 * This is necessary because findLocale() only receives the Request object, not the router context.
 */
declare const requestToLocaleMap: WeakMap<Request, string>;
//#endregion
export { type DetectionConfig, type Locale, type MultiSiteConfig, type MultiSiteContext, type Site, SiteProvider, applyUrlConfig, buildUrl, createMultiSiteMiddleware, getMultiSiteCookies, multiSiteContext, requestToLocaleMap, useSite };
//# sourceMappingURL=multi-site.d.ts.map