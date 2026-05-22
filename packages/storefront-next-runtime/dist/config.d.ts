import { n as Site, r as Url, t as Locale } from "./types.js";
import { n as DefineConfigOptions, r as defineConfig, t as BaseConfig } from "./schema.js";
import * as react0 from "react";
import { ReactNode } from "react";
import * as react_jsx_runtime1 from "react/jsx-runtime";
import * as react_router1 from "react-router";
import { RouterContextProvider } from "react-router";

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
declare const appConfigContext: react_router1.RouterContext<Record<string, unknown>>;
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
export { type BaseConfig, ConfigContext, ConfigProvider, type DefineConfigOptions, type Locale, type Site, type Url, appConfigContext, createAppConfig, defineConfig, getConfig, useConfig };
//# sourceMappingURL=config.d.ts.map