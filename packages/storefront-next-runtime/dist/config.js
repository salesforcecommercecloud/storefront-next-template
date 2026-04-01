import { createContext, useContext } from "react";
import { jsx } from "react/jsx-runtime";
import { createContext as createContext$1 } from "react-router";

//#region src/config/utils.ts
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
* Type guard to check if value is a plain object (not array, null, or other types)
*/
const isPlainObject = (value) => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};
/**
* Deep merge two objects, with source values overriding target values
* Arrays are replaced, not merged
*
* @param target - The base object
* @param source - The object with values to merge in
* @returns A new merged object
*
* @example
* deepMerge(
*   { a: { b: 1, c: 2 } },
*   { a: { b: 3, d: 4 } }
* )
* // Returns: { a: { b: 3, c: 2, d: 4 } }
*/
const deepMerge = (target, source) => {
	const result = { ...target };
	for (const key in source) {
		const sourceValue = source[key];
		const targetValue = result[key];
		if (isPlainObject(sourceValue) && isPlainObject(targetValue)) result[key] = deepMerge(targetValue, sourceValue);
		else result[key] = sourceValue;
	}
	return result;
};
/**
* Convert a path string with double underscore separators to a nested object
* Normalizes keys to match baseConfig casing (case-insensitive lookup, preserves baseConfig case)
*
* @param path - The path string (e.g., 'app__pages__cart__quantityUpdateDebounce')
* @param value - The value to set at the path
* @param baseConfig - Optional base config for case normalization
* @returns A nested object
*
* @example
* pathToObject('app__pages__cart__maxQuantity', 999)
* // Returns: { app: { pages: { cart: { maxQuantity: 999 } } } }
*
* @example
* // With baseConfig normalization:
* pathToObject('APP__SITE__LOCALE', 'en-GB', { app: { site: { locale: 'en-GB' } } })
* // Returns: { app: { site: { locale: 'en-GB' } } } (normalized to baseConfig casing)
*/
const pathToObject = (path, value, baseConfig) => {
	const keys = path.split("__");
	const result = {};
	let current = result;
	let configCurrent = baseConfig;
	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		let normalizedKey = key;
		if (configCurrent && typeof configCurrent === "object" && !Array.isArray(configCurrent)) {
			const actualKey = Object.keys(configCurrent).find((k) => k.toLowerCase() === key.toLowerCase());
			if (actualKey) {
				normalizedKey = actualKey;
				configCurrent = configCurrent[actualKey];
			} else configCurrent = null;
		}
		current[normalizedKey] = {};
		current = current[normalizedKey];
	}
	const lastKey = keys[keys.length - 1];
	let normalizedLastKey = lastKey;
	if (configCurrent && typeof configCurrent === "object" && !Array.isArray(configCurrent)) {
		const actualKey = Object.keys(configCurrent).find((k) => k.toLowerCase() === lastKey.toLowerCase());
		if (actualKey) normalizedLastKey = actualKey;
	}
	current[normalizedLastKey] = value;
	return result;
};
/**
* Parse environment variable value with optimistic JSON parsing
* Tries to parse as JSON first, falls back to string if invalid
* Supports multi-line formatted JSON by normalizing whitespace before parsing
*
* @param varValue - The environment variable value
* @param varName - Optional variable name for better error messages
* @returns The parsed value (JSON type if valid JSON, otherwise string)
*
* @example
* // Primitives
* parseEnvValue('42') // → 42 (number)
* parseEnvValue('true') // → true (boolean)
* parseEnvValue('hello') // → 'hello' (string)
*
* @example
* // Single-line JSON
* parseEnvValue('["Apple","Google"]') // → ['Apple', 'Google'] (array)
* parseEnvValue('{"key":"value"}') // → {key: 'value'} (object)
*
* @example
* // Multi-line formatted JSON (whitespace normalized automatically)
* parseEnvValue('[
*   {"id": "en-GB"},
*   {"id": "fr-FR"}
* ]') // → [{id: 'en-GB'}, {id: 'fr-FR'}] (array)
*/
const parseEnvValue = (varValue, varName) => {
	try {
		return JSON.parse(varValue);
	} catch {
		const trimmed = varValue.trim();
		if (trimmed.startsWith("{") || trimmed.startsWith("[")) try {
			const normalized = varValue.replace(/\s+/g, " ").trim();
			return JSON.parse(normalized);
		} catch {
			if (process.env.NODE_ENV === "development") {
				const preview = varValue.length > 50 ? `${varValue.substring(0, 50)}...` : varValue;
				const varInfo = varName ? ` in "${varName}"` : "";
				console.warn(`[Config Warning] Value${varInfo} looks like JSON but failed to parse: "${preview}". Using as string instead. Check for syntax errors if this was meant to be JSON.`);
			}
		}
		return varValue;
	}
};
/**
* Extract all valid paths from a config object (recursively traverses the object structure)
* Returns paths in lowercase with double underscore separators
*
* @param obj - The config object to extract paths from
* @param prefix - Current path prefix (used for recursion)
* @returns Array of valid config paths
*
* @example
* extractValidPaths({ app: { site: { locale: 'en-GB' } } })
* // Returns: ['app__site__locale']
*/
const extractValidPaths = (obj, prefix = "") => {
	if (!isPlainObject(obj)) return prefix ? [prefix] : [];
	const paths = [];
	for (const [key, value] of Object.entries(obj)) {
		const normalizedKey = key.toLowerCase();
		const currentPath = prefix ? `${prefix}__${normalizedKey}` : normalizedKey;
		if (isPlainObject(value)) {
			paths.push(currentPath);
			paths.push(...extractValidPaths(value, currentPath));
		} else paths.push(currentPath);
	}
	return paths;
};
/**
* Merge environment variables with PUBLIC__ prefix into config.
*
* Uses double underscore (__) to target nested config paths.
* All PUBLIC__ prefixed variables are exposed to the client (bundled into window.__APP_CONFIG__).
*
* Server-only secrets should NEVER use this — read them directly from process.env in server code.
*
* Environment variables:
* - `PUBLIC__<path>` (optional): Override any config path. e.g. `PUBLIC__app__commerce__api__clientId=abc123`
* - `NODE_ENV` (optional): When set to 'development', enables conflict warnings for overlapping paths
*
* @param env - Environment variables object (defaults to process.env)
* @param baseConfig - Optional base config for strict path validation and case normalization
* @param options - Optional configuration including protected paths
* @returns Object with overrides to merge into base config
*
* @example
* // Environment variables:
* // PUBLIC__app__commerce__api__clientId=abc123
* // PUBLIC__app__pages__cart__quantityUpdateDebounce=1000
* // PUBLIC__app__features__socialLogin__providers=["Apple","Google"]
*
* mergeEnvConfig()
* // Returns:
* // {
* //   app: {
* //     commerce: { api: { clientId: 'abc123' } },
* //     pages: { cart: { quantityUpdateDebounce: 1000 } },
* //     features: { socialLogin: { providers: ['Apple', 'Google'] } }
* //   }
* // }
*/
const mergeEnvConfig = (env = typeof process !== "undefined" ? process.env : {}, baseConfig, options) => {
	const PUBLIC_PREFIX = "PUBLIC__";
	const MAX_VAR_NAME_LENGTH = 512;
	const MAX_TOTAL_VALUE_SIZE = 32 * 1024;
	const MAX_DEPTH = 10;
	const protectedPaths = options?.protectedPaths ?? [];
	const validPaths = baseConfig ? extractValidPaths(baseConfig) : [];
	const envVars = [];
	let totalValueSize = 0;
	for (const [varName, varValue] of Object.entries(env)) {
		if (varValue === void 0 || varValue === null || !varName.startsWith(PUBLIC_PREFIX)) continue;
		if (varName.length > MAX_VAR_NAME_LENGTH) throw new Error(`Environment variable name "${varName}" exceeds MRT limit of ${MAX_VAR_NAME_LENGTH} characters. Current length: ${varName.length} characters. Consider using shorter paths or consolidating configuration using JSON values.`);
		const path = varName.substring(8);
		if (!path) throw new Error(`Invalid environment variable "${varName}": Path cannot be empty after PUBLIC__ prefix. Expected format: PUBLIC__path__to__value (e.g., PUBLIC__app__site__locale)`);
		const depth = path.split("__").length;
		if (depth > MAX_DEPTH) throw new Error(`Environment variable "${varName}" exceeds maximum path depth of ${MAX_DEPTH}. Current depth: ${depth}. Consider consolidating with JSON values or reducing nesting levels.`);
		const normalizedPath = path.toLowerCase();
		if (protectedPaths.some((protectedPath) => normalizedPath === protectedPath || normalizedPath.startsWith(`${protectedPath}__`))) throw new Error(`Environment variable "${varName}" attempts to override protected config path "${path}".\n\nThe engagement configuration cannot be overridden via environment variables. Update config.server.ts directly to change engagement settings.`);
		if (baseConfig && validPaths.length > 0) {
			if (!validPaths.includes(normalizedPath)) throw new Error(`Invalid environment variable "${varName}": Config path "${path}" does not exist in config.server.ts.\n\nCheck your config.server.ts for available configuration paths, or add this path to your base configuration.`);
		}
		totalValueSize += varValue.length;
		envVars.push({
			name: varName,
			path,
			value: varValue,
			depth: path.split("__").length
		});
	}
	if (totalValueSize > MAX_TOTAL_VALUE_SIZE) throw new Error(`Total size of PUBLIC__ environment variable values exceeds MRT limit of ${MAX_TOTAL_VALUE_SIZE} bytes (32 KB). Current size: ${totalValueSize} bytes. Consider consolidating configuration using JSON values to reduce the number of variables, or move non-essential configuration to defaults in config.server.ts.`);
	envVars.sort((a, b) => a.depth - b.depth);
	const conflicts = [];
	for (let i = 0; i < envVars.length; i++) for (let j = i + 1; j < envVars.length; j++) {
		const shorter = envVars[i].path;
		if (envVars[j].path.startsWith(`${shorter}__`)) conflicts.push({
			parent: envVars[i].name,
			child: envVars[j].name
		});
	}
	if (conflicts.length > 0 && process.env.NODE_ENV === "development") console.warn(`[Config Warning] Conflicting environment variables detected. More specific paths will override parent paths:\n${conflicts.map((c) => `  ${c.parent} ← overridden by → ${c.child}`).join("\n")}`);
	let merged = {};
	for (const envVar of envVars) try {
		const parsedValue = parseEnvValue(envVar.value, envVar.name);
		const pathObject = pathToObject(envVar.path, parsedValue, baseConfig);
		merged = deepMerge(merged, pathObject);
	} catch (error) {
		throw new Error(`Failed to process environment variable "${envVar.name}" with value "${envVar.value}": ${error instanceof Error ? error.message : String(error)}`);
	}
	return merged;
};

//#endregion
//#region src/config/schema.ts
/**
* Define a type-safe storefront configuration with IDE autocomplete.
*
* Automatically merges `PUBLIC__` prefixed environment variables into the config
* at load time. Validates env vars against the base config structure (strict mode —
* only allows overriding existing paths).
*
* Environment variables:
* - `PUBLIC__<path>` (optional): Override any config path using double underscore separators.
*   e.g. `PUBLIC__app__commerce__api__clientId=abc123` maps to `config.app.commerce.api.clientId`
* - `PUBLIC__app__pages__cart__quantityUpdateDebounce=1000` maps to a number (optimistic JSON parsing)
* - `PUBLIC__app__features__socialLogin__providers=["Apple","Google"]` maps to an array
*
* @param config - The base configuration object with all defaults
* @param options - Optional settings (e.g., protectedPaths to prevent env var overrides)
* @returns The config with environment variable overrides merged in
*
* @example
* // In config.server.ts:
* import { defineConfig } from '@salesforce/storefront-next-runtime/config';
*
* export default defineConfig({
*     metadata: { projectName: 'My Store', projectSlug: 'my-store' },
*     app: {
*         commerce: { api: { clientId: '', organizationId: '', shortCode: '' }, sites: [] },
*         defaultSiteId: 'RefArch',
*     },
* }, { protectedPaths: ['app__engagement'] });
*/
function defineConfig(config, options) {
	return deepMerge(config, mergeEnvConfig(process.env, config, { protectedPaths: options?.protectedPaths }));
}

//#endregion
//#region src/config/context.tsx
/**
* Router context for application configuration.
*
* Populated by `createAppConfigMiddleware` with the `app` section of config.
* Accessible in loaders, actions, and middleware via `context.get(appConfigContext)`.
*/
const appConfigContext = createContext$1();
/**
* React context for application configuration.
*
* Used by the `useConfig()` hook in React components.
* Populated by `ConfigProvider` in the component tree.
*/
const ConfigContext = createContext(null);
/**
* Extract the `app` section from a full config object.
*
* @param staticConfig - The full config object (output of `defineConfig()`)
* @returns The `app` section of the config
*/
function createAppConfig(staticConfig) {
	return staticConfig.app;
}
/**
* React context provider for application configuration.
*
* Wrap your component tree with this to enable `useConfig()` in child components.
* Typically placed in the root layout component.
*/
function ConfigProvider({ config, children }) {
	return /* @__PURE__ */ jsx(ConfigContext.Provider, {
		value: config,
		children
	});
}

//#endregion
//#region src/config/get-config.ts
/**
* Get configuration in loaders, actions, and utilities.
*
* Pass context parameter in server loaders/actions.
* Omit context parameter in client loaders (uses window.__APP_CONFIG__).
*
* @param context - Router context for server loaders/actions
* @returns App configuration
*/
function getConfig(context) {
	if (context) {
		const config = context.get(appConfigContext);
		if (!config) throw new Error("Configuration not available in router context. Ensure appConfigMiddleware.server runs before other middleware.");
		return config;
	}
	if (typeof window !== "undefined" && window.__APP_CONFIG__) return window.__APP_CONFIG__;
	throw new Error("Configuration not available. This can happen if:\n1. Server: Pass context parameter: getConfig(context)\n2. Client: Ensure window.__APP_CONFIG__ was injected during SSR\n3. React component: Use useConfig() hook instead of getConfig()");
}
/**
* Get configuration in React components.
*
* Must use this hook (not getConfig) because React Context requires useContext().
*
* @returns App configuration
*/
function useConfig() {
	const config = useContext(ConfigContext);
	if (!config) throw new Error("useConfig must be used within ConfigProvider. Ensure ConfigProvider wraps your component tree in root.tsx");
	return config;
}

//#endregion
//#region src/config/middleware.ts
/**
* Create app config middleware for both server and client.
*
* Follows the same factory pattern as `createSiteContextMiddleware`.
*
* The server middleware:
* - Validates required Commerce API fields on first request (one-time)
* - Sets `appConfigContext` in router context with `config.app`
*
* The client middleware:
* - Reads `window.__APP_CONFIG__` (injected during SSR)
* - Sets `appConfigContext` in router context
*
* Environment variables:
* - `SCAPI_PROXY_HOST` (optional): When set, skips `shortCode` validation
*   (workspace environments route through a proxy that doesn't require shortCode)
* - `NODE_ENV` (optional): When set to 'test', skips validation entirely
*
* @param config - The full config object (output of `defineConfig()`)
* @returns Object with `server` and `client` middleware functions
*
* @example
* import { createAppConfigMiddleware } from '@salesforce/storefront-next-runtime/config';
* import config from '@/config/server';
*
* const appConfigMiddleware = createAppConfigMiddleware(config);
*
* export const middleware = [appConfigMiddleware.server, ...otherMiddleware];
* export const clientMiddleware = [appConfigMiddleware.client, ...otherClientMiddleware];
*/
function createAppConfigMiddleware(config) {
	let validationRun = false;
	function validateConfig() {
		if (validationRun || process.env.NODE_ENV === "test") return;
		const api = config.app.commerce?.api;
		const required = {
			clientId: api?.clientId ?? "",
			organizationId: api?.organizationId ?? ""
		};
		if (!process.env.SCAPI_PROXY_HOST) required.shortCode = api?.shortCode ?? "";
		const missing = Object.entries(required).filter(([_, value]) => !value).map(([key]) => key);
		if (missing.length > 0) {
			const envVarMap = {
				clientId: "PUBLIC__app__commerce__api__clientId",
				organizationId: "PUBLIC__app__commerce__api__organizationId",
				shortCode: "PUBLIC__app__commerce__api__shortCode"
			};
			throw new Error(`Missing required Commerce API configuration: ${missing.join(", ")}\n\nSet these environment variables in your MRT deployment or .env file:\n${missing.map((key) => `  ${envVarMap[key]}=your-value`).join("\n")}\n\nExample .env file:\nPUBLIC__app__commerce__api__clientId=your-client-id\nPUBLIC__app__commerce__api__organizationId=your-org-id\nPUBLIC__app__commerce__api__shortCode=your-short-code\n\nSee docs/README-CONFIG.md for complete configuration documentation.`);
		}
		validationRun = true;
	}
	const server = ({ context }, next) => {
		validateConfig();
		context.set(appConfigContext, config.app);
		return next();
	};
	const client = async ({ context }, next) => {
		const appConfig = typeof window !== "undefined" ? window.__APP_CONFIG__ : void 0;
		if (!appConfig) throw new Error("window.__APP_CONFIG__ not available. Check that server loader is injecting config into HTML via Layout component.");
		context.set(appConfigContext, appConfig);
		return next();
	};
	return {
		server,
		client
	};
}

//#endregion
export { ConfigContext, ConfigProvider, appConfigContext, createAppConfig, createAppConfigMiddleware, deepMerge, defineConfig, extractValidPaths, getConfig, mergeEnvConfig, parseEnvValue, pathToObject, useConfig };
//# sourceMappingURL=config.js.map