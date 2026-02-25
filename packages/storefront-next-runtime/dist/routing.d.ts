import { RouteConfigEntry } from "@react-router/dev/routes";

//#region src/routing/flat-routes.d.ts

/**
 * Discovers all file-based routes, merges extension routes, and applies multi-site
 * URL configuration if defined in the project's `config.server.ts`.
 *
 * 1. Discover routes from the filesystem using React Router's `flatRoutes`.
 * 2. Scans `src/extensions/` for extension routes and merges them into the route tree.
 * 3. Load `config.server.ts` from the project root and, if `app.url` is configured,
 *    wraps routes under the URL prefix (e.g. `/:siteId/:localeId`).
 *
 * @param options.ignoredRouteFiles - Glob patterns for files to ignore. Defaults to test files.
 * @param options.rootDirectory - Root directory for route discovery, relative to appDirectory.
 * @returns The final route config entries for React Router.
 */
declare function flatRoutes(options?: {
  ignoredRouteFiles?: string[];
  rootDirectory?: string;
}): Promise<RouteConfigEntry[]>;
//#endregion
//#region src/routing/merge-routes.d.ts

/**
 * Merges extension routes into the main routes array, handling route nesting.
 * Routes without IDs are added directly to the routes array. Routes with IDs are processed
 * to remove the extension prefix and are either:
 * - Added as children of existing routes (if a nearest route is found via prefix matching)
 * - Replace existing routes (if an exact match is found)
 * - Added directly to the routes array (if no matching route exists)
 *
 * When adding as a child, the parent route's path is clipped from the child route's path.
 *
 * @param routes - The main routes array to merge into (mutated in place)
 * @param extensionRoutes - The extension routes to merge
 * @param extensionIdPrefix - The prefix to remove from extension route IDs (e.g., "extensions/store-locator/")
 */
declare function mergeRoutes(routes: RouteConfigEntry[], extensionRoutes: RouteConfigEntry[], extensionIdPrefix: string): void;
//#endregion
//#region src/routing/types.d.ts
/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
type UrlConfig = {
  prefix?: string;
  search?: string;
  hash?: string;
  excludeRoutes?: string[];
};
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
  urlConfig?: UrlConfig;
  wrapperFile: string;
}): RouteConfigEntry[];
//#endregion
export { type UrlConfig, applyUrlConfig, flatRoutes, mergeRoutes };
//# sourceMappingURL=routing.d.ts.map