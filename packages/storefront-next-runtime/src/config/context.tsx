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
 * Configuration Context and Provider
 *
 * Provides configuration access throughout the application using React Router's
 * context system. Supports both server and client rendering with proper hydration.
 *
 * `ConfigContext` is intentionally not part of the public surface — consumers
 * must read configuration through `useConfig()` so a single React context owns
 * the value. `appConfigContext` is the public router-context handle for
 * loaders/actions/middleware.
 */

import { createContext, type ReactNode } from 'react';
import { createContext as createRouterContext } from 'react-router';

/**
 * Augmentation hook for typing `getConfig()` / `useConfig()` /
 * `appConfigContext`. Templates augment once via `declare module` so call
 * sites don't need a per-call generic. Without augmentation, property
 * accesses type to `unknown`. See README-CONFIG.md for the augmentation
 * snippet and the multi-template caveat.
 */
export interface AppConfigShape {
    [key: string]: unknown;
}

/**
 * Router context for application configuration. Populated by the template's
 * app-config middleware; read via `context.get(appConfigContext)` in loaders,
 * actions, and other middleware. Returns the augmented `AppConfigShape`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const appConfigContext = createRouterContext<AppConfigShape>();

/**
 * Router context for the **client-safe view** of the application configuration —
 * `appConfigContext` minus any server-only namespaces (which namespaces are server-only
 * is template-defined; the SDK only owns the slot). The template's app-config middleware
 * populates this with a precomputed view (the strip is identical on every request, so
 * computing it per-request allocates a fresh object every render for no behavioral
 * difference); the root loader reads from this context for the value it returns to React
 * Router, which then ships in the SSR hydration payload. Reading the unstripped
 * `appConfigContext` for the loader return would leak server-only namespaces into the
 * browser via that channel.
 *
 * Type is `Partial<AppConfigShape>` because the client view is always a subset of the
 * full shape. Templates may further narrow with `Omit<AppConfigShape, 'serverExtension'>`
 * or a branded `ClientAppConfig` type at the read site.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const clientAppConfigContext = createRouterContext<Partial<AppConfigShape>>();

/**
 * Internal React context backing `useConfig()`.
 *
 * Not exported from the public barrel — components must read config via
 * `useConfig()` so the React tree has a single source of truth.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const ConfigContext = createContext<AppConfigShape | null>(null);

interface ConfigProviderProps {
    config: AppConfigShape;
    children: ReactNode;
}

/**
 * React context provider for application configuration.
 *
 * Wrap your component tree with this to enable `useConfig()` in child components.
 * Typically placed in the root layout component.
 */
export function ConfigProvider({ config, children }: ConfigProviderProps) {
    return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}
