import { n as Site, r as Url, t as Locale } from "./types.js";
import { n as DefineConfigOptions, r as defineConfig, t as BaseConfig } from "./schema.js";
import * as react0 from "react";
import { ReactNode } from "react";
import * as react_jsx_runtime1 from "react/jsx-runtime";
import * as react_router2 from "react-router";
import { MiddlewareFunction, RouterContextProvider } from "react-router";

//#region src/config/get-config.d.ts

declare global {
  interface Window {
    __APP_CONFIG__?: Record<string, unknown>;
  }
}
/**
 * Get configuration in loaders, actions, and utilities.
 *
 * Pass context parameter in server loaders/actions.
 * Omit context parameter in client loaders (uses window.__APP_CONFIG__).
 *
 * @param context - Router context for server loaders/actions
 * @returns App configuration
 */
declare function getConfig<T extends Record<string, unknown> = Record<string, unknown>>(context?: Readonly<RouterContextProvider>): T;
/**
 * Get configuration in React components.
 *
 * Must use this hook (not getConfig) because React Context requires useContext().
 *
 * @returns App configuration
 */
declare function useConfig<T extends Record<string, unknown> = Record<string, unknown>>(): T;
//#endregion
//#region src/config/context.d.ts
/**
 * Router context for application configuration.
 *
 * Populated by `createAppConfigMiddleware` with the `app` section of config.
 * Accessible in loaders, actions, and middleware via `context.get(appConfigContext)`.
 */
declare const appConfigContext: react_router2.RouterContext<Record<string, unknown>>;
/**
 * React context for application configuration.
 *
 * Used by the `useConfig()` hook in React components.
 * Populated by `ConfigProvider` in the component tree.
 */
declare const ConfigContext: react0.Context<Record<string, unknown> | null>;
/**
 * Extract the `app` section from a full config object.
 *
 * @param staticConfig - The full config object (output of `defineConfig()`)
 * @returns The `app` section of the config
 */
declare function createAppConfig<T extends BaseConfig>(staticConfig: T): T['app'];
interface ConfigProviderProps {
  config: Record<string, unknown>;
  children: ReactNode;
}
/**
 * React context provider for application configuration.
 *
 * Wrap your component tree with this to enable `useConfig()` in child components.
 * Typically placed in the root layout component.
 */
declare function ConfigProvider({
  config,
  children
}: ConfigProviderProps): react_jsx_runtime1.JSX.Element;
//#endregion
//#region src/config/middleware.d.ts
/**
 * Create app config middleware for both server and client.
 *
 * Follows the same factory pattern as `createMultiSiteMiddleware`.
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
declare function createAppConfigMiddleware<T extends BaseConfig>(config: T): {
  server: MiddlewareFunction<Response>;
  client: MiddlewareFunction<Record<string, unknown>>;
};
//#endregion
//#region src/config/utils.d.ts
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
declare const deepMerge: <T extends Record<string, unknown>>(target: T, source: Record<string, unknown>) => T;
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
declare const pathToObject: (path: string, value: unknown, baseConfig?: Record<string, unknown>) => Record<string, unknown>;
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
declare const parseEnvValue: (varValue: string, varName?: string) => unknown;
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
declare const extractValidPaths: (obj: unknown, prefix?: string) => string[];
/**
 * Options for mergeEnvConfig
 */
interface MergeEnvConfigOptions {
  /**
   * Config paths that cannot be overridden by environment variables.
   * Paths are matched case-insensitively with double underscore separators.
   * Any env var targeting a protected path or a sub-path of it will throw an error.
   *
   * @example ['app__engagement'] — prevents PUBLIC__app__engagement__* from being set via env
   */
  protectedPaths?: string[];
}
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
declare const mergeEnvConfig: (env?: Record<string, string | undefined>, baseConfig?: Record<string, unknown>, options?: MergeEnvConfigOptions) => Record<string, unknown>;
//#endregion
export { type BaseConfig, ConfigContext, ConfigProvider, type DefineConfigOptions, type Locale, type MergeEnvConfigOptions, type Site, type Url, appConfigContext, createAppConfig, createAppConfigMiddleware, deepMerge, defineConfig, extractValidPaths, getConfig, mergeEnvConfig, parseEnvValue, pathToObject, useConfig };
//# sourceMappingURL=config.d.ts.map