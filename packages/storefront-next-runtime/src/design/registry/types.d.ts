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
export type ComponentId = string;

/**
 * Loader and fallback function names for external invocation.
 */
export interface LoaderNames {
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
export interface ComponentModule<TProps, TFrameworkComponent = unknown> {
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
export interface DesignMetadata {
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
export interface Entry<TProps, TFrameworkComponent = unknown> {
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
export interface FrameworkAdapter<TProps, TFrameworkComponent = unknown> {
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
export interface ComponentRegistryOptions<TProps, TFrameworkComponent> {
    /**
     * Framework adapter for framework-specific operations.
     * The adapter handles all framework-specific behavior including decoration.
     */
    adapter: FrameworkAdapter<TProps, TFrameworkComponent>;
}
