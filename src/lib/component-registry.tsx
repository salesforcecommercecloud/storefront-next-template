/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React from 'react';
import { isDesignModeActive } from '@salesforce/storefront-next-runtime/design/mode';
import type { ComponentDesignMetadata } from '@salesforce/storefront-next-runtime/design/react';
import type { LoaderFunctionArgs } from 'react-router';
import type { RegionDefinitionConfig } from '@/lib/decorators';

/* ==================== Type Definitions ==================== */

/**
 * Unique identifier for a component type.
 */
export type ComponentId = string;

/**
 * Metadata describing a component type.
 */
export interface ComponentTypeMetadata {
    id?: ComponentId;
    /** Human-readable name */
    name?: string;
    /** Component description */
    description?: string;
    /** Component group/category */
    group?: string;
    /** Data loaders for server-side and client-side data fetching */
    loader?: ComponentLoaders;
    /** Region definitions of a component */
    regions?: RegionDefinitionConfig[];
}

/**
 * Data loaders for server-side and client-side data fetching.
 */
export interface ComponentLoaders<TParams = unknown> {
    /** Server-side data loader (runs during SSR/route loading) */
    server?: (args: { componentData: TParams; context: LoaderFunctionArgs['context'] }) => Promise<unknown>;
    /** Client-side data loader (runs in browser) */
    client?: (args: { componentData: TParams; context: LoaderFunctionArgs['context'] }) => Promise<unknown>;
}

/**
 * Shape of a dynamically imported component module.
 * This is what import.meta.glob() returns for each component.
 */
export type ComponentModule<TProps, TParams> = {
    /** The main component export */
    default: React.ComponentType<TProps>;
    /** Optional fallback component for Suspense boundaries */
    fallback?: React.ComponentType<TProps>;
    /** Optional data loaders for server/client-side data fetching */
    loaders?: ComponentLoaders<TParams>;
};

/**
 * A React component that optionally accepts design metadata.
 * Any component returned from the registry could potentially accept design metadata.
 */
type ReactDesignComponentType<TProps> = React.ComponentType<TProps & { designMetadata?: ComponentDesignMetadata }>;

/**
 * Internal registry entry for a component.
 * Caches the component and its metadata after discovery.
 */
interface Entry<TProps, TParams> {
    /** Component identifier */
    id: ComponentId;
    /** Eagerly loaded component (if registered directly) */
    raw: React.ComponentType<TProps> | null;
    /** Lazily loaded component (if discovered via dynamic import) */
    lazy?: React.LazyExoticComponent<React.ComponentType<TProps>>;
    /** Dynamic importer function */
    import?: () => Promise<ComponentModule<TProps, TParams>>;
    /** Fallback component for Suspense */
    fallback?: React.ComponentType<TProps>;
    /** Data loaders */
    loaders?: ComponentLoaders<TParams>;
    /** Component metadata */
    meta?: ComponentTypeMetadata;
}

/**
 * Configuration options for ComponentRegistry.
 */
export interface ComponentRegistryOptions<TProps, TParams> {
    /**
     * Decorator to apply in design mode (e.g., Page Designer).
     * Wraps components with design-time capabilities.
     */
    designDecorator?: (component: React.ComponentType<TProps>) => ReactDesignComponentType<TProps>;
    /**
     * Map of file paths to dynamic importers (e.g., from import.meta.glob()).
     * Keeps the registry decoupled from the bundler.
     */
    modules?: Record<string, () => Promise<ComponentModule<TProps, TParams>>>;
    /**
     * Optional optimization: provide candidate file paths for a component ID.
     * Return [] to force a full scan of `modules`.
     */
    guessPathsForId?: (id: ComponentId) => readonly string[];
    /**
     * Custom metadata extraction from a component module.
     * Default behavior reads reflect-metadata attached by decorators.
     */
    extractMeta?: (
        modDefault: React.ComponentType<TProps> | undefined,
        mod: Partial<Record<string, unknown>>
    ) => ComponentTypeMetadata | undefined;
}

/**
 * ComponentRegistry manages dynamic component discovery and loading.
 *
 * Features:
 * - Lazy loading with React.lazy() for code splitting
 * - Automatic component discovery via import.meta.glob()
 * - Design mode decoration for Page Designer integration
 * - Metadata extraction via reflect-metadata decorators
 * - Request deduplication for concurrent component loads
 * - Support for server/client data loaders
 *
 * @template TProps - Component props type
 * @template TParams - Component loader params type
 *
 * @example
 * ```tsx
 * const registry = new ComponentRegistry({
 *   modules: import.meta.glob('/components/**\/index.tsx'),
 *   designDecorator: createReactComponentDesignDecorator,
 * });
 *
 * // Get a component
 * const Hero = registry.getComponent('hero');
 *
 * // Preload for SSR
 * await registry.preload('hero');
 * ```
 *
 * ToDo: move this to commerce-sdk, only the instanciated registry should be part of odyssey
 */
export class ComponentRegistry<TProps, TParams> {
    private readonly registry = new Map<ComponentId, Entry<TProps, TParams>>();
    private readonly pending = new Map<ComponentId, Promise<Entry<TProps, TParams> | null>>();
    private readonly cancelled = new Set<ComponentId>();

    private readonly designDecorator: NonNullable<ComponentRegistryOptions<TProps, TParams>['designDecorator']>;
    private readonly modules: Record<string, () => Promise<ComponentModule<TProps, TParams>>>;
    private readonly extractMeta: (
        modDefault: React.ComponentType<TProps> | undefined,
        mod: Partial<Record<string, unknown>>
    ) => ComponentTypeMetadata | undefined;

    constructor({
        designDecorator = (c) => c as ReactDesignComponentType<TProps>,
        modules = {},
        extractMeta = (def: React.ComponentType<TProps> | undefined) => {
            if (!def) return undefined;
            const metaObj = def as unknown as { __meta?: ComponentTypeMetadata };
            return metaObj.__meta;
        },
    }: ComponentRegistryOptions<TProps, TParams> = {}) {
        this.designDecorator = designDecorator;
        this.modules = modules;
        this.extractMeta = extractMeta;
    }

    /**
     * Registers a component in the registry with the specified id.
     * If a component with the same id already exists, it will be overwritten.
     */
    registerComponent(id: ComponentId, component: React.ComponentType<TProps>): void {
        const prev = this.registry.get(id) ?? ({ id, raw: null } as Entry<TProps, TParams>);
        this.registry.set(id, { ...prev, id, raw: component });
    }

    /**
     * Registers a dynamic importer for a component id. Useful if you don’t want to rely on scanning.
     */
    registerImporter(
        id: ComponentId,
        importer: () => Promise<ComponentModule<TProps, TParams>>,
        loaders?: ComponentLoaders<TParams>
    ): void {
        const prev = this.registry.get(id) ?? ({ id, raw: null } as Entry<TProps, TParams>);
        this.registry.set(id, { ...prev, id, import: importer, loaders });
    }

    /**
     * Retrieves a component by id. In React usage, this will be a React.lazy component if
     * the component is discovered via dynamic import. In design mode, the returned component
     * is decorated via `designDecorator`.
     */
    getComponent(id: ComponentId): React.ComponentType<TProps & { designMetadata?: ComponentDesignMetadata }> | null {
        const e = this.ensureLocalEntry(id);
        if (!e) return null;

        const comp = e.lazy ?? e.raw ?? null;
        if (!comp) return null;

        return isDesignModeActive() ? this.designDecorator(comp) : (comp as ReactDesignComponentType<TProps>);
    }

    /**
     * Preload the JS chunk for a component id (use in route loaders/SSR to avoid waterfalls).
     *
     * This method ensures the component module is loaded and cached. Concurrent calls
     * for the same component ID are automatically deduplicated via the pending map
     * in ensureDiscovered().
     *
     * @throws Error if the component cannot be discovered
     */
    async preload(id: ComponentId): Promise<void> {
        // Wait for discovery to finish (this.pending deduplicates concurrent calls)
        const e = await this.ensureDiscovered(id);

        // If we have a lazy or raw component, we're done.
        // The importer was already called during ensureDiscovered if needed.
        if (e?.lazy || e?.raw) {
            return;
        }

        // At this point discovery finished and we still don't have a component:
        // reject so the nearest ErrorBoundary can render an error state.
        throw new Error(`Component "${id}" could not be discovered (no importer, no raw/lazy).`);
    }

    /** Get metadata/loaders/fallback if available. */
    getMetadata(id: ComponentId): ComponentTypeMetadata | undefined {
        return this.registry.get(id)?.meta;
    }
    getLoaders(id: ComponentId): ComponentLoaders<TParams> | undefined {
        return this.registry.get(id)?.loaders;
    }
    getFallback(id: ComponentId): React.ComponentType<TProps> | undefined {
        return this.registry.get(id)?.fallback;
    }

    /**
     * Get region definitions for a component by ID.
     * Returns the regions defined by the @RegionDefinition decorator.
     *
     * @param id - Component ID to get regions for
     * @returns Array of region definitions or undefined if component has no regions
     */
    getRegions(id: ComponentId): RegionDefinitionConfig[] | undefined {
        const metadata = this.getMetadata(id);
        return metadata?.regions;
    }

    /**
     * Get a specific region definition by component ID and region ID.
     *
     * @param componentId - Component ID that contains the region
     * @param regionId - Region ID to find
     * @returns Region definition or undefined if not found
     */
    getRegion(componentId: ComponentId, regionId: string): RegionDefinitionConfig | undefined {
        const regions = this.getRegions(componentId);
        return regions?.find((region) => region.id === regionId);
    }

    /**
     * Check if a component has any regions defined.
     *
     * @param id - Component ID to check
     * @returns True if component has regions, false otherwise
     */
    hasRegions(id: ComponentId): boolean {
        const regions = this.getRegions(id);
        return regions !== undefined && regions.length > 0;
    }

    /**
     * Returns all registered component IDs.
     * Useful for debugging and introspection.
     */
    getRegisteredIds(): ComponentId[] {
        return Array.from(this.registry.keys());
    }

    /**
     * Checks if a component is registered.
     */
    has(id: ComponentId): boolean {
        return this.registry.has(id);
    }

    /**
     * Clears all cached components and cancels pending discoveries.
     * In-flight async operations will be cancelled and their promises will reject.
     * Useful for testing or hot module replacement.
     */
    clear(): void {
        // Mark all pending discoveries as cancelled
        for (const id of this.pending.keys()) {
            this.cancelled.add(id);
        }

        this.registry.clear();
        this.pending.clear();
    }

    /* ==================== Private Methods ==================== */

    private ensureLocalEntry(id: ComponentId): Entry<TProps, TParams> | null {
        const cached = this.registry.get(id);
        if (cached) {
            return cached;
        }

        // Create a placeholder entry so concurrent calls coalesce.
        const placeholder: Entry<TProps, TParams> = { id, raw: null };
        this.registry.set(id, placeholder);

        // Kick off discovery in background; callers that need it awaited should call ensureDiscovered.
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.ensureDiscovered(id);

        return placeholder;
    }

    /**
     * Ensures a component is discovered and cached.
     * Only returns early if a raw (eagerly loaded) component exists.
     * Otherwise, attempts to discover via registered importer or module scan.
     *
     * @throws Error if the discovery is cancelled via clear()
     */
    private async ensureDiscovered(id: ComponentId): Promise<Entry<TProps, TParams> | null> {
        const existing = this.registry.get(id);

        if (existing?.raw) return existing;

        if (this.pending.has(id)) {
            return this.pending.get(id) ?? null;
        }

        const work = (async () => {
            // Check if cancelled before starting work
            if (this.cancelled.has(id)) {
                this.cancelled.delete(id);
                throw new Error(`Component discovery for "${id}" was cancelled`);
            }

            // 1) Explicit importer registered
            let entry = this.registry.get(id) ?? ({ id, raw: null } as Entry<TProps, TParams>);
            if (entry.import) {
                entry = await this.buildFromImporter(id, entry.import);

                // Check if cancelled after async operation
                if (this.cancelled.has(id)) {
                    this.cancelled.delete(id);
                    throw new Error(`Component discovery for "${id}" was cancelled`);
                }

                this.registry.set(id, entry);
                return entry;
            }

            // 2) Fallback scan
            for (const [, importer] of Object.entries(this.modules)) {
                const mod = await importer();

                // Check if cancelled after each async operation
                if (this.cancelled.has(id)) {
                    this.cancelled.delete(id);
                    throw new Error(`Component discovery for "${id}" was cancelled`);
                }

                const meta = this.extractMeta(mod.default, mod);
                if (meta?.id === id) {
                    const built = this.buildFromLoadedModule(id, importer, mod, meta);
                    this.registry.set(id, built);
                    return built;
                }
            }

            return this.registry.get(id) ?? null;
        })();

        this.pending.set(id, work);
        try {
            const done = await work;
            this.pending.delete(id);
            return done;
        } catch (error) {
            this.pending.delete(id);
            throw error;
        }
    }

    private async buildFromImporter(
        id: ComponentId,
        importer: () => Promise<ComponentModule<TProps, TParams>>
    ): Promise<Entry<TProps, TParams>> {
        const mod = await importer();
        const meta = this.extractMeta(mod.default, mod);
        return this.buildFromLoadedModule(id, importer, mod, meta);
    }

    private buildFromLoadedModule(
        id: ComponentId,
        importer: () => Promise<ComponentModule<TProps, TParams>>,
        mod: ComponentModule<TProps, TParams>,
        meta?: ComponentTypeMetadata
    ): Entry<TProps, TParams> {
        // IMPORTANT: React.lazy expects a promise of { default: Component }, not the whole module.
        const lazyComp = React.lazy(async () => {
            const m = await importer();
            return { default: m.default };
        });

        return {
            id,
            raw: null,
            lazy: lazyComp,
            import: importer,
            fallback: mod.fallback,
            loaders: mod.loaders ?? meta?.loader,
            meta: meta ?? { id },
        };
    }
}
