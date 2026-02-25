import { flatRoutes as flatRoutes$1 } from "@react-router/fs-routes";
import fs from "node:fs/promises";
import path from "node:path";
import fs$1 from "node:fs";
import { pathToFileURL } from "node:url";

//#region src/routing/merge-routes.ts
/**
* Find the nearest route by its ID in the route tree
* @param routes - The route subtree to search
* @param layoutId - The route ID to find (e.g., "routes/_app" or "routes/_app.account")
* @param rootPath - The full route path from the root to the current route (default: '')
* @returns An object with routes array, routeIndex, and path, or null if not found. Returns exact match if found, otherwise returns route where route.id is a prefix of layoutId
*/
function findNearestRoute(routes, layoutId, rootPath = "") {
	for (let i = 0; i < routes.length; i++) {
		const route = routes[i];
		const path$1 = route.path ? `${rootPath}/${route.path}` : rootPath;
		if (route.id === layoutId) return {
			routes,
			routeIndex: i,
			path: path$1
		};
		if (route.children) {
			const found = findNearestRoute(route.children, layoutId, path$1);
			if (found) return found;
		}
		if (route.id && layoutId.startsWith(route.id)) return {
			routes,
			routeIndex: i,
			path: path$1
		};
	}
	return null;
}
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
function mergeRoutes(routes, extensionRoutes, extensionIdPrefix) {
	for (const route of extensionRoutes) {
		if (!route.id) {
			routes.unshift(route);
			continue;
		}
		const routeId = route.id.replace(extensionIdPrefix, "");
		const nearestRouteResult = findNearestRoute(routes, routeId);
		if (nearestRouteResult) {
			const nearestRoute = nearestRouteResult.routes[nearestRouteResult.routeIndex];
			if (nearestRoute.id === routeId) nearestRouteResult.routes[nearestRouteResult.routeIndex].file = route.file;
			else {
				let path$1 = route.path?.slice(nearestRouteResult.path.length);
				if (path$1?.startsWith("/")) path$1 = path$1.slice(1);
				path$1 = path$1 ? path$1 : void 0;
				if (!nearestRoute.children) nearestRoute.children = [];
				nearestRoute.children.unshift({
					...route,
					id: routeId,
					path: path$1
				});
			}
		} else routes.unshift({
			...route,
			id: routeId
		});
	}
}

//#endregion
//#region src/routing/utils.ts
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
/**
* Creates a matcher function from an array of path patterns.
* Supports `/**` suffix wildcards (e.g. '/resource/**', '/action/**').
* Exact paths without wildcards are matched literally.
*/
function createPatternMatcher(patterns) {
	const exactMatches = /* @__PURE__ */ new Set();
	const prefixPatterns = [];
	for (const pattern of patterns) if (pattern.endsWith("/**")) prefixPatterns.push(pattern.slice(0, -3));
	else exactMatches.add(pattern);
	return (path$1) => {
		if (exactMatches.has(path$1)) return true;
		return prefixPatterns.some((prefix) => path$1 === prefix || path$1.startsWith(`${prefix}/`));
	};
}

//#endregion
//#region src/multi-site/apply-url-config.ts
const DEFAULT_EXCLUDED_ROUTES = ["/resource/**", "/action/**"];
/**
* Separates routes into excluded (stay at root) and included (go under prefix).
*/
function partitionRoutes(routes, excludePatterns) {
	const isExcluded = createPatternMatcher(excludePatterns);
	const excludedRoutes = [];
	const includedRoutes = [];
	for (const route of routes) {
		const matchPath = route.path?.startsWith("/") ? route.path : `/${route.path}`;
		if (route.path && isExcluded(matchPath)) excludedRoutes.push(route);
		else includedRoutes.push(route);
	}
	return {
		excludedRoutes,
		includedRoutes
	};
}
/**
* Normalizes route paths by stripping leading `/` so they're relative under a
* parent route (React Router requirement).
*/
function normalizeRoutePaths(routes) {
	return routes.map((route) => ({
		...route,
		path: route.path?.startsWith("/") ? route.path.slice(1) : route.path
	}));
}
/**
* Creates the `multi-site-wrapper` parent route entry with the given prefix.
*/
function createPrefixWrapper(prefix, children, wrapperFile) {
	return {
		id: "multi-site-wrapper",
		file: wrapperFile,
		path: prefix.slice(1),
		children
	};
}
/**
* Finds the root index route (`/`) and duplicates it with its parent layout.
* Looks at the top level for pathless layouts whose direct children include an index route.
* e.g. _app (pathless) → _app._index (index: true)
* Returns: _app--root-duplicate → _app._index--root-duplicate
*/
function cloneRootIndexRoutes(routes) {
	const duplicates = [];
	for (const route of routes) if (route.index === true) duplicates.push({
		...route,
		id: `${route.id}--root-duplicate`
	});
	else if (!route.path && route.children) {
		const indexChild = route.children.find((child) => child.index === true);
		if (indexChild) duplicates.push({
			...route,
			id: `${route.id}--root-duplicate`,
			children: [{
				...indexChild,
				id: `${indexChild.id}--root-duplicate`
			}]
		});
	}
	return duplicates;
}
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
function applyUrlConfig(options) {
	const { routes, urlConfig, wrapperFile } = options;
	if (!urlConfig) return routes;
	if (!urlConfig.prefix?.startsWith("/")) throw new Error(`urlConfig.prefix must start with a leading slash ("/"). Received: "${urlConfig.prefix}"`);
	if (urlConfig.prefix === "/") return routes;
	const { excludedRoutes, includedRoutes } = partitionRoutes(routes, urlConfig.excludeRoutes ?? DEFAULT_EXCLUDED_ROUTES);
	const wrappableRoutes = normalizeRoutePaths(includedRoutes);
	const wrapperRoute = createPrefixWrapper(urlConfig.prefix, wrappableRoutes, wrapperFile);
	return [
		...cloneRootIndexRoutes(includedRoutes),
		wrapperRoute,
		...excludedRoutes
	];
}

//#endregion
//#region src/config/load-config.ts
/**
* Dynamically imports `config.server.ts` from the project root (CWD) and returns
* the `app` configuration object. This runs at route discovery time under vite-node
* (typegen, dev, build), which handles the TS transformation.
*
* - If the config file is missing, warns and returns an empty config.
* - If the config file exists but fails to import, throws with the original error as cause.
*
* @returns The `app` configuration object, or an empty object if not available.
*/
async function loadConfig() {
	const configPath = path.resolve(process.cwd(), "config.server.ts");
	if (!fs$1.existsSync(configPath)) {
		console.warn(`[storefront-next-runtime] config.server.ts not found at ${configPath}. Returning empty config.`);
		return {};
	}
	try {
		const mod = await import(
			/* @vite-ignore */
			pathToFileURL(configPath).href
);
		return (mod.default ?? mod)?.app ?? {};
	} catch (error) {
		throw new Error(`[storefront-next-runtime] Found config.server.ts at ${configPath} but failed to import it.`, { cause: error });
	}
}

//#endregion
//#region src/routing/flat-routes.ts
const APP_SRC_DIR = "src";
const EXTENSIONS_DIR = "extensions";
const APP_WRAPPER_FILE = "app-wrapper.tsx";
/**
* Scans `src/extensions/` for extension route directories and merges any discovered
* routes into the base route tree. Mutates `routes` in place via `mergeRoutes`.
*/
async function discoverExtensionRoutes(ignoredRouteFiles, routes) {
	const extensionsDir = path.join(".", APP_SRC_DIR, EXTENSIONS_DIR);
	const extensions = await fs.readdir(extensionsDir).then((entries) => entries.sort(), () => []);
	for (const ext of extensions) {
		const routesDir = `${EXTENSIONS_DIR}/${ext}/routes`;
		const routesDirFull = path.join(".", APP_SRC_DIR, EXTENSIONS_DIR, ext, "routes");
		try {
			await fs.access(routesDirFull);
			mergeRoutes(routes, await flatRoutes$1({
				ignoredRouteFiles,
				rootDirectory: routesDir
			}), `${EXTENSIONS_DIR}/${ext}/`);
		} catch {}
	}
}
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
async function flatRoutes(options) {
	const { ignoredRouteFiles = ["**/*.test.{ts,tsx}"], rootDirectory } = options ?? {};
	const routes = await flatRoutes$1({
		ignoredRouteFiles,
		rootDirectory
	});
	await discoverExtensionRoutes(ignoredRouteFiles, routes);
	const { url: urlConfig } = await loadConfig();
	if (urlConfig?.prefix) {
		try {
			await fs.access(path.join(".", APP_SRC_DIR, APP_WRAPPER_FILE));
		} catch {
			throw new Error(`[storefront-next-runtime] URL prefix "${urlConfig.prefix}" is configured but "${APP_SRC_DIR}/${APP_WRAPPER_FILE}" does not exist. Create this file with: export { default } from '@salesforce/storefront-next-runtime/routing/app-wrapper';`);
		}
		return applyUrlConfig({
			routes,
			urlConfig,
			wrapperFile: APP_WRAPPER_FILE
		});
	}
	return routes;
}

//#endregion
export { applyUrlConfig, flatRoutes, mergeRoutes };
//# sourceMappingURL=routing.js.map