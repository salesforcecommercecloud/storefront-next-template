import { Plugin } from "vite";

//#region src/plugin.d.ts

/**
 * Configuration options for the Storefront Next Vite plugin.
 */
interface StorefrontNextPluginsConfig {
  /**
   * Enable human-readable chunk file names for easier debugging in production builds.
   * When enabled, chunk files will be named based on their source location
   * rather than just the file name and random hashes.
   *
   * This is useful to identify the chunk files and is usually used in development,
   * in conjunction with the bundle analyzer.
   *
   * Example:
   *
   * ```
   * (package)-(pkg-name)-index.[hash].js
   * (components)-(ui)-(inputs)-(TextField)-index.[hash].js
   * ```
   *
   * Instead of:
   *
   * ```
   * index.[hash].js
   * ```
   *
   * @default false
   */
  readableChunkNames?: boolean;
}
/**
 * Storefront Next Vite plugin that powers the React Router RSC app.
 * Supports building and optimizing for the managed runtime environment.
 *
 * @param config - Configuration options for the plugin
 * @returns {Plugin[]} An array of Vite plugins for Storefront Next functionality
 *
 * @example
 * // With default options
 * export default defineConfig({
 *   plugins: [storefrontNextPlugins()]
 * })
 *
 * @example
 * // Disable readable chunk names
 * export default defineConfig({
 *   plugins: [storefrontNextPlugins({ readableChunkNames: false })]
 * })
 */
declare function storefrontNextPlugins(config?: StorefrontNextPluginsConfig): Plugin[];
//#endregion
//#region src/types.d.ts

interface PushOptions {
  projectDirectory: string;
  buildDirectory?: string;
  message?: string;
  projectSlug?: string;
  target?: string;
  cloudOrigin?: string;
  credentialsFile?: string;
  user?: string;
  key?: string;
  wait?: boolean;
}
//#endregion
//#region src/push.d.ts
/**
 * Main function to push bundle to Managed Runtime
 */
declare function push(options: PushOptions): Promise<void>;
//#endregion
//#region src/extensibility/extension-config.d.ts
type ExtensionMeta = {
  name: string;
  description: string;
  dependencies: string[];
};
declare const ExtensionConfig: {
  extensions: Record<string, ExtensionMeta>;
};
//#endregion
//#region src/extensibility/trim-extensions.d.ts
type ExtensionsSelection = Record<string, boolean>;
declare function trimExtensions(directory: string, selectedExtensions?: Partial<ExtensionsSelection>, extensionConfig?: typeof ExtensionConfig, verboseOverride?: boolean): void;
//#endregion
export { type PushOptions, type StorefrontNextPluginsConfig, storefrontNextPlugins as default, push, trimExtensions };
//# sourceMappingURL=index-B_gPg_Xz.d.ts.map