import type { Plugin } from 'vite';
import { fixReactRouterManifestUrlsPlugin } from './plugins/fixReactRouterManifestUrls';
import { readableChunkFileNamesPlugin } from './plugins/readableChunkFileNames';
import { managedRuntimeBundlePlugin } from './plugins/managedRuntimeBundle';
import { patchReactRouterPlugin } from './plugins/patchReactRouter';
import { transformPluginPlaceholderPlugin } from './plugins/transformPlugins';
import { watchConfigFilesPlugin } from './plugins/watchConfigFiles';
import { staticRegistryPlugin, type StaticRegistryPluginConfig } from './plugins/staticRegistry';

/**
 * Configuration options for the Storefront Next Vite plugin.
 */
export interface StorefrontNextPluginsConfig {
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

    /**
     * Configuration for the static registry plugin that automatically generates
     * component registrations based on @Component decorators.
     *
     * Set to `false` to disable the static registry plugin entirely.
     *
     * @default { componentPath: 'src/components', registryPath: 'src/lib/registry.ts' }
     */
    staticRegistry?: StaticRegistryPluginConfig;
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
export function storefrontNextPlugins(config: StorefrontNextPluginsConfig = {}): Plugin[] {
    const {
        readableChunkNames = false,
        staticRegistry = {
            componentPath: '',
            registryPath: '',
            verbose: false,
        },
    } = config;

    const plugins: Plugin[] = [
        managedRuntimeBundlePlugin(),
        fixReactRouterManifestUrlsPlugin(),
        patchReactRouterPlugin(),
        transformPluginPlaceholderPlugin(),
        watchConfigFilesPlugin(),
    ];

    // Add static registry plugin if enabled
    if (staticRegistry?.componentPath && staticRegistry?.registryPath) {
        plugins.push(staticRegistryPlugin(staticRegistry));
    }

    if (readableChunkNames) {
        plugins.push(readableChunkFileNamesPlugin());
    }

    return plugins;
}
