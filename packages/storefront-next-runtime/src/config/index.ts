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
 * Provides the config system: type-safe schema definition via `defineConfig()`,
 * access via `getConfig()` / `useConfig()`, and React context.
 */

// Types
export type { Locale, Site, Url } from './types';
export type { BaseConfig, DefineConfigOptions } from './schema';

// Config definition (server-only by convention)
export { defineConfig } from './schema';

// Config access (isomorphic)
export { getConfig, useConfig } from './get-config';

// Context primitives (isomorphic)
export { appConfigContext, ConfigContext, ConfigProvider, createAppConfig } from './context';

// Dynamic loading (for dev server / build tools — node-only)
// Exported via separate entry point: @salesforce/storefront-next-runtime/config/load-config
