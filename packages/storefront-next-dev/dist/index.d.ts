import { Project } from "ts-morph";
import { Express } from "express";
import { Plugin, ViteDevServer } from "vite";
import { ServerBuild } from "react-router";

//#region src/plugins/staticRegistry.d.ts

/**
 * Configuration options for the static registry plugin
 */
interface StaticRegistryPluginConfig {
  /**
   * Path to the components directory to scan
   * @default 'src/components'
   */
  componentPath?: string;
  /**
   * Path to the registry file to update
   * Note: The registry file must contain STATIC_REGISTRY_START and STATIC_REGISTRY_END markers
   * and must export a 'registry' variable (or use registryIdentifier to specify a different name)
   * @default 'src/lib/registry.ts'
   */
  registryPath?: string;
  /**
   * Name of the registry variable to use in generated code
   * @default 'registry'
   */
  registryIdentifier?: string;
  /**
   * Whether to fail the build on registry generation errors
   * @default true
   */
  failOnError?: boolean;
  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
}
//#endregion
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
//#region src/commands/push.d.ts
/**
 * Main function to push bundle to Managed Runtime
 */
declare function push(options: PushOptions): Promise<void>;
//#endregion
//#region src/server/config.d.ts
/**
 * Server configuration extracted from environment variables
 */
interface ServerConfig {
  commerce: {
    api: {
      shortCode: string;
      organizationId: string;
      clientId: string;
      siteId: string;
      proxy: string;
    };
  };
}
/**
 * This is a temporary function before we move the config implementation from
 * template-retail-rsc-app to the SDK.
 *
 * @ TODO: Remove this function after we move the config implementation from
 * template-retail-rsc-app to the SDK.
 *
 */
declare function loadConfigFromEnv(): ServerConfig;
/**
 * Load storefront-next project configuration from config.server.ts.
 * Requires projectDirectory to be provided.
 *
 * @param projectDirectory - Project directory to load config.server.ts from
 * @throws Error if config.server.ts is not found or invalid
 */
declare function loadProjectConfig(projectDirectory: string): Promise<ServerConfig>;
//#endregion
//#region src/server/modes.d.ts
type ServerMode = 'development' | 'preview' | 'production';
/**
 * Feature flags for each server mode
 */
interface ServerModeFeatures {
  /** Enable Commerce API proxy middleware to forward /mobify/proxy/api requests to SCAPI */
  enableProxy: boolean;
  /** Enable static file serving from build/client directory */
  enableStaticServing: boolean;
  /** Enable gzip/brotli compression middleware for responses */
  enableCompression: boolean;
  /** Enable HTTP request/response logging */
  enableLogging: boolean;
  /** Enable patching of asset URLs with bundle path (for CDN deployment) */
  enableAssetUrlPatching: boolean;
}
//#endregion
//#region src/server/index.d.ts
interface ServerOptions extends Partial<ServerModeFeatures> {
  /** Server mode: development (with Vite), preview (preview), or production (minimal) */
  mode: ServerMode;
  /** Project root directory (optional, defaults to process.cwd()) */
  projectDirectory?: string;
  /** Server configuration (optional, will load from env vars if not provided) */
  config?: ServerConfig;
  /** Server port (optional, for logging) */
  port?: number;
  /** Vite dev server instance (required for development mode) */
  vite?: ViteDevServer;
  /** React Router server build (required for preview/production modes) */
  build?: ServerBuild;
  /** Enable streaming of responses */
  streaming?: boolean;
}
/**
 * Create a unified Express server for development, preview, or production mode
 */
declare function createServer(options: ServerOptions): Promise<Express>;
//#endregion
//#region src/extensibility/extension-config.d.ts
type ExtensionMeta = {
  name: string;
  description: string;
  installationInstructions: string;
  uninstallationInstructions: string;
  folder: string;
  dependencies: string[];
  defaultOn?: boolean;
};
declare const ExtensionConfig: {
  extensions: Record<string, ExtensionMeta>;
};
//#endregion
//#region src/extensibility/trim-extensions.d.ts
type ExtensionsSelection = Record<string, boolean>;
declare function trimExtensions(directory: string, selectedExtensions?: Partial<ExtensionsSelection>, extensionConfig?: typeof ExtensionConfig, verboseOverride?: boolean): void;
//#endregion
//#region src/cartridge-services/generate-cartridge.d.ts
/**
 * Options for generateMetadata function
 */
interface GenerateMetadataOptions {
  /**
   * Optional array of specific file paths to process.
   * If provided, only these files will be processed and existing cartridge files will NOT be deleted.
   * If omitted, the entire src/ directory will be scanned and all existing cartridge files will be deleted first.
   */
  filePaths?: string[];
}
declare function generateMetadata(projectDirectory: string, metadataDirectory: string, options?: GenerateMetadataOptions): Promise<void>;
//#endregion
export { type GenerateMetadataOptions, type PushOptions, type StorefrontNextPluginsConfig, createServer, storefrontNextPlugins as default, generateMetadata, loadConfigFromEnv, loadProjectConfig, push, trimExtensions };
//# sourceMappingURL=index.d.ts.map