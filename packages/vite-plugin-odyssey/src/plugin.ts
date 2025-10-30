import type { Plugin } from 'vite';
import { fixReactRouterManifestUrlsPlugin } from './plugins/fixReactRouterManifestUrls';
import { readableChunkFileNamesPlugin } from './plugins/readableChunkFileNames';
import { managedRuntimeBundlePlugin } from './plugins/managedRuntimeBundle';
import { patchReactRouterPlugin } from './plugins/patchReactRouter';

/**
 * Configuration options for the Odyssey Vite plugin.
 */
export interface OdysseyPluginsConfig {
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
export function odysseyPlugins(config: OdysseyPluginsConfig = {}): Plugin[] {
    const { readableChunkNames = false } = config;

    const plugins: Plugin[] = [
        managedRuntimeBundlePlugin(),
        fixReactRouterManifestUrlsPlugin(),
        patchReactRouterPlugin(),
    ];

    if (readableChunkNames) {
        plugins.push(readableChunkFileNamesPlugin());
    }

    return plugins;
}
