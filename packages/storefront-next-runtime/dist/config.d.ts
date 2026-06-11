import { n as Site, r as Url, t as Locale } from "./types.js";
import { n as DefineConfigOptions, r as defineConfig, t as BaseConfig } from "./schema.js";
import { n as defaultSecurityHeaders } from "./defaults.js";
import { ReactNode } from "react";
import * as react_jsx_runtime0 from "react/jsx-runtime";
import * as react_router1 from "react-router";
import { RouterContextProvider } from "react-router";

//#region src/config/context.d.ts

/**
 * Augmentation hook for typing `getConfig()` / `useConfig()` /
 * `appConfigContext`. Templates augment once via `declare module` so call
 * sites don't need a per-call generic. Without augmentation, property
 * accesses type to `unknown`. See README-CONFIG.md for the augmentation
 * snippet and the multi-template caveat.
 */
interface AppConfigShape {
  [key: string]: unknown;
}
/**
 * Router context for application configuration. Populated by the template's
 * app-config middleware; read via `context.get(appConfigContext)` in loaders,
 * actions, and other middleware. Returns the augmented `AppConfigShape`.
 */
declare const appConfigContext: react_router1.RouterContext<AppConfigShape>;
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
declare function ConfigProvider({
  config,
  children
}: ConfigProviderProps): react_jsx_runtime0.JSX.Element;
//#endregion
//#region src/config/get-config.d.ts
declare global {
  interface Window {
    __APP_CONFIG__?: Record<string, unknown>;
  }
}
/**
 * Get configuration in loaders, actions, and utilities. Pass `context` on the
 * server; omit it on the client (reads `window.__APP_CONFIG__`). Returns the
 * augmented `AppConfigShape` — pass an explicit generic only for narrower or
 * unrelated shapes (rare).
 */
declare function getConfig<T extends Record<string, unknown> = AppConfigShape>(context?: Readonly<RouterContextProvider>): T;
/**
 * Get configuration in React components (use this instead of `getConfig` —
 * React Context requires `useContext`). Returns the augmented `AppConfigShape`.
 */
declare function useConfig<T extends Record<string, unknown> = AppConfigShape>(): T;
//#endregion
export { type AppConfigShape, type BaseConfig, ConfigProvider, type DefineConfigOptions, type Locale, type Site, type Url, appConfigContext, defaultSecurityHeaders, defineConfig, getConfig, useConfig };
//# sourceMappingURL=config.d.ts.map