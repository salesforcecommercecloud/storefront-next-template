/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { createReactComponentDesignDecorator } from '@salesforce/storefront-next-runtime/design/react';
import {
    ComponentRegistry,
    type ComponentModule,
    type ComponentTypeMetadata,
    type ComponentLoaders,
} from './component-registry';
import { LOADER_KEY, META_KEY, REGION_DEFINITIONS_KEY, TYPE_ID_KEY } from './decorators';

// Re-export types and class for convenience
export { ComponentRegistry, type ComponentModule, type ComponentTypeMetadata } from './component-registry';
export type { ComponentId, ComponentLoaders } from './component-registry';

/**
 * Default prop type for components (generic object).
 */
type DefaultProps = Record<string, unknown>;

/**
 * Default params type for component loaders.
 */
type DefaultParams = unknown;

/**
 * Vite glob import of all component modules.
 * Scans /src/components/{star}/index.tsx for component definitions.
 */
const modules = import.meta.glob<ComponentModule<DefaultProps, DefaultParams>>('/src/components/**/index.tsx', {
    eager: false,
});

/**
 * Global component registry instance.
 * Used throughout the application to discover and load components.
 *
 * This singleton instance is configured with:
 * - Design mode decorator for Page Designer integration
 * - Vite glob imports for automatic component discovery
 * - Reflect-metadata extraction for component metadata
 * - Smart path guessing for camelCase to kebab-case conversion
 */
export const registry = new ComponentRegistry<DefaultProps, DefaultParams>({
    designDecorator: createReactComponentDesignDecorator,
    modules,
    extractMeta: (
        modDefault: React.ComponentType<DefaultProps> | undefined,
        mod: Partial<Record<string, unknown>>
    ): ComponentTypeMetadata | undefined => {
        const candidates = new Set<unknown>([modDefault, ...Object.values(mod ?? {})]);
        for (const c of candidates) {
            if (!c) continue;
            try {
                const id = Reflect.getMetadata(TYPE_ID_KEY, c) as string | undefined;
                if (!id) continue;
                const meta = (Reflect.getMetadata(META_KEY, c) || { id }) as ComponentTypeMetadata;
                const loader = Reflect.getMetadata(LOADER_KEY, c) as ComponentLoaders;
                const regions = Reflect.getMetadata(REGION_DEFINITIONS_KEY, c);

                // cache onto default for faster future lookups
                if (modDefault && c !== modDefault) {
                    Reflect.defineMetadata(TYPE_ID_KEY, id, modDefault);
                    Reflect.defineMetadata(META_KEY, meta, modDefault);
                    Reflect.defineMetadata(LOADER_KEY, loader, modDefault);
                }
                return { id, ...meta, loader, regions };
            } catch {
                // reflect not initialized yet → ignore and continue
            }
        }
        return undefined;
    },
});
