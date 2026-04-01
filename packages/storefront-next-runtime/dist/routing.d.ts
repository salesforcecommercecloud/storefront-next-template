import { RouteConfigEntry } from "@react-router/dev/routes";

//#region src/routing/flat-routes.d.ts

/**
 * Discovers all file-based routes, merges extension routes, and applies site context
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
export { flatRoutes, mergeRoutes };
//# sourceMappingURL=routing.d.ts.map