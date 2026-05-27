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
 * Configuration module for storefront applications.
 *
 * Public surface:
 * - `defineConfig()` — define a typed config in `config.server.ts` (merges `PUBLIC__*` env vars at call time)
 * - `getConfig()` / `useConfig()` — access the resolved app config in loaders/actions/components
 * - `appConfigContext` — router context populated by template middleware (read with `context.get(appConfigContext)`)
 * - `ConfigProvider` — React provider that powers `useConfig()`
 * - `BaseConfig`, `DefineConfigOptions` — types for `defineConfig`
 * - `Locale`, `Site`, `Url` — opt-in baseline shapes templates can use in their `AppConfig`
 * - `AppConfigShape` — augmentation hook for typing `getConfig()` / `useConfig()` (see JSDoc on `AppConfigShape`)
 *
 * Templates own their own validating server/client middleware that read `defineConfig`'s output
 * and write `config.app` into `appConfigContext`. The SDK does not ship a generic config middleware
 * because validation is template-specific (e.g. retail validates SCAPI credentials and sites).
 */

// Types
export type { Locale, Site, Url } from './types';
export type { BaseConfig, DefineConfigOptions } from './schema';
export type { AppConfigShape } from './get-config';

// Config definition (server-only by convention — reads process.env at call time)
export { defineConfig } from './schema';

// Config access (isomorphic)
export { getConfig, useConfig } from './get-config';

// Context primitives (isomorphic)
export { appConfigContext, ConfigProvider } from './context';

// Dynamic loading (for dev server / build tools — node-only)
// Exported via separate entry point: @salesforce/storefront-next-runtime/config/load-config
