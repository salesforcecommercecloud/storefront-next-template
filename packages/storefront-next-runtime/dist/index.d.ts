//#region src/design/registry/types.d.ts
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* ==================== Framework Agnostic Types ==================== */

/**
 * Unique identifier for a component type.
 */
type ComponentId = string;
/**
 * Loader and fallback function names for external invocation.
 */
interface LoaderNames {
  /** Server-side loader function name */
  loader?: string;
  /** Client-side loader function name */
  clientLoader?: string;
  /** Fallback component function name */
  fallback?: string;
}
/**
 * Shape of a dynamically imported component module.
 * This is what import.meta.glob() returns for each component.
 */
interface ComponentModule<TProps, TFrameworkComponent = unknown> {
  /** The main component export */
  default: TFrameworkComponent;
  /** Optional fallback component for Suspense boundaries */
  fallback?: TFrameworkComponent;
  /** Any additional exports (loaders, etc.) */
  [key: string]: unknown;
}
/**
 * Generic design metadata interface - framework agnostic.
 * Different frameworks can extend this with their specific metadata.
 */
interface DesignMetadata {
  /** Component identifier */
  id?: string;
  /** Component name for display */
  name?: string;
  /** Component group/category */
  group?: string;
  /** Component description */
  description?: string;
  /** Additional framework-specific metadata */
  [key: string]: any;
}
/**
 * Internal registry entry for a component.
 * Framework agnostic - no specific component types.
 */
interface Entry<TProps, TFrameworkComponent = unknown> {
  /** Component identifier */
  id: ComponentId;
  /** Eagerly loaded component (if registered directly) */
  raw: TFrameworkComponent | null;
  /** Lazily loaded component (if discovered via dynamic import) */
  lazy?: TFrameworkComponent;
  /** Dynamic importer function */
  import?: () => Promise<ComponentModule<TProps, TFrameworkComponent>>;
  /** Fallback component for loading states */
  fallback?: TFrameworkComponent;
  /** Loader function names for external invocation */
  loaderNames?: LoaderNames;
}
/**
 * Framework adapter interface.
 * Each framework implements this to provide framework-specific behavior.
 */
interface FrameworkAdapter<TProps, TFrameworkComponent = unknown> {
  /**
   * Creates a lazy-loaded component from an importer function.
   */
  createLazyComponent(importer: () => Promise<ComponentModule<TProps, TFrameworkComponent>>): TFrameworkComponent;

  /**
   * Decorates a component with design-time capabilities.
   * Each framework adapter implements its own decoration logic.
   */
  decorateComponent(component: TFrameworkComponent): TFrameworkComponent;
}
/**
 * Configuration options for ComponentRegistry.
 * Framework agnostic with adapter injection.
 */
interface ComponentRegistryOptions<TProps, TFrameworkComponent> {
  /**
   * Framework adapter for framework-specific operations.
   * The adapter handles all framework-specific behavior including decoration.
   */
  adapter: FrameworkAdapter<TProps, TFrameworkComponent>;
}
//#endregion
//#region src/design/registry/registry.d.ts
/**
 * Framework-agnostic ComponentRegistry manages component loading with static registration.
 *
 * Features:
 * - Framework agnostic core with adapter pattern
 * - Lazy loading via framework adapters for code splitting
 * - Static component registration via build plugins (no dynamic discovery)
 * - Design mode decoration via framework adapters
 * - Request deduplication for concurrent component loads
 * - Component metadata handled via API (not stored in registry)
 *
 * @template TProps - Component props type
 *
 * @example
 * ```tsx
 * const registry = new ComponentRegistry({
 *   adapter: new ReactAdapter(),
 *   designDecorator: createDesignDecorator,
 * });
 *
 * // Components are pre-registered via static registry plugin
 * // Get a component
 * const Hero = registry.getComponent('hero');
 *
 * // Preload for SSR
 * await registry.preload('hero');
 * ```
 */
declare class ComponentRegistry<TProps, TFrameworkComponent = unknown> {
  private readonly registry;
  private readonly pending;
  private readonly cancelled;
  private readonly adapter;
  constructor({
    adapter
  }: ComponentRegistryOptions<TProps, TFrameworkComponent>);
  /**
   * Registers a component in the registry with the specified id.
   * If a component with the same id already exists, it will be overwritten.
   */
  registerComponent(id: ComponentId, component: TFrameworkComponent): void;
  /**
   * Registers a dynamic importer for a component id. Useful if you don't want to rely on scanning.
   */
  registerImporter(id: ComponentId, importer: () => Promise<ComponentModule<TProps, TFrameworkComponent>>, loaderNames?: LoaderNames): void;
  /**
   * Retrieves a component by id. Returns a framework-specific component type.
   * In lazy loading scenarios, this will be a lazy component if the component
   * is discovered via dynamic import. In design mode, the returned component
   * is decorated via `designDecorator`.
   */
  getComponent(id: ComponentId): TFrameworkComponent | null;
  /**
   * Preload the JS chunk for a component id (use in route loaders/SSR to avoid waterfalls).
   *
   * This method ensures the component module is loaded and cached. Concurrent calls
   * for the same component ID are automatically deduplicated via the pending map
   * in ensureDiscovered().
   *
   * @throws Error if the component cannot be discovered
   */
  preload(id: ComponentId): Promise<void>;
  /** Get loader function names for external invocation. */
  getLoaderNames(id: ComponentId): LoaderNames | undefined;
  hasLoaders(id: ComponentId): boolean;
  /**
   * Call a loader function for a component externally.
   *
   * @param id - Component ID
   * @param loaderArgs - Arguments to pass to the loader function
   * @param loaderType - Type of loader to call ('loader' or 'clientLoader')
   * @returns Promise resolving to the loader result
   */
  callLoader(id: ComponentId, loaderArgs: unknown, loaderType?: keyof LoaderNames): Promise<unknown>;
  /** Get fallback component if available. */
  getFallback(id: ComponentId): TFrameworkComponent | undefined;
  /**
   * Returns all registered component IDs.
   * Useful for debugging and introspection.
   */
  getRegisteredIds(): ComponentId[];
  /**
   * Checks if a component is registered.
   */
  has(id: ComponentId): boolean;
  /**
   * Clears all cached components and cancels pending discoveries.
   * In-flight async operations will be cancelled and their promises will reject.
   * Useful for testing or hot module replacement.
   */
  clear(): void;
  private ensureLocalEntry;
  /**
   * Ensures a component is discovered and cached.
   * Only returns early if a raw (eagerly loaded) component exists.
   * Otherwise, attempts to discover via registered importer.
   *
   * @throws Error if the discovery is cancelled via clear()
   */
  private ensureDiscovered;
  private buildFromImporter;
  private buildFromLoadedModule;
}
//#endregion
export { DesignMetadata as a, LoaderNames as c, ComponentRegistryOptions as i, ComponentId as n, Entry as o, ComponentModule as r, FrameworkAdapter as s, ComponentRegistry as t };
//# sourceMappingURL=index.d.ts.map