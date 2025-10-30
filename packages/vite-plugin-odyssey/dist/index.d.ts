import { Plugin } from "vite";

//#region src/plugin.d.ts

/**
 * Configuration options for the Odyssey Vite plugin.
 */
interface OdysseyPluginsConfig {
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
 * Odyssey Vite plugin that powers the React Router RSC app.
 * Supports building and optimizing for the managed runtime environment.
 *
 * @param config - Configuration options for the plugin
 * @returns {Plugin[]} An array of Vite plugins for Odyssey functionality
 *
 * @example
 * // With default options
 * export default defineConfig({
 *   plugins: [odysseyPlugin()]
 * })
 *
 * @example
 * // Disable readable chunk names
 * export default defineConfig({
 *   plugins: [odysseyPlugin({ readableChunkNames: false })]
 * })
 */
declare function odysseyPlugins(config?: OdysseyPluginsConfig): Plugin[];
//#endregion
export { type OdysseyPluginsConfig, odysseyPlugins as default };
//# sourceMappingURL=index.d.ts.map