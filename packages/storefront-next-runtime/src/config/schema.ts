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
import { deepMerge, mergeEnvConfig } from './utils';

/**
 * Base configuration type for storefront-next projects.
 *
 * Generic parameter `App` represents the template's application config shape.
 * The SDK does not prescribe what fields `app` must contain — templates define
 * their own `AppConfig` type with SCAPI credentials, pages, features, etc.
 * and pass it as `BaseConfig<AppConfig>`.
 *
 * The SDK accesses specific `app` fields (e.g., `commerce.api.clientId`) at
 * runtime via the middleware validation, not via compile-time type constraints.
 *
 * @typeParam App - The template's application config shape (defaults to `Record<string, unknown>`)
 *
 * @example
 * // In the template's types file:
 * type AppConfig = { commerce: { api: {...} }; pages: {...}; features: {...} };
 * type Config = BaseConfig<AppConfig>;
 *
 * // In config.server.ts:
 * export default defineConfig<Config>({ metadata: {...}, app: {...} });
 */
export type BaseConfig<App extends Record<string, unknown> = Record<string, unknown>> = {
    metadata: {
        projectName: string;
        projectSlug: string;
    };
    runtime?: {
        defaultMrtProject?: string;
        defaultMrtTarget?: string;
        ssrOnly?: string[];
        ssrShared?: string[];
        ssrParameters?: Record<string, string | number | boolean>;
    };
    app: App;
};

export interface DefineConfigOptions {
    /**
     * Config paths that cannot be overridden by environment variables.
     * Paths use double underscore separators and are matched case-insensitively.
     *
     * @example ['app__engagement'] — prevents PUBLIC__app__engagement__* from being set via env
     */
    protectedPaths?: string[];
}

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
export function defineConfig<T extends BaseConfig>(config: T, options?: DefineConfigOptions): T {
    const envOverrides = mergeEnvConfig(process.env, config as unknown as Record<string, unknown>, {
        protectedPaths: options?.protectedPaths,
    });
    return deepMerge(config, envOverrides);
}
