/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React from 'react';
import { type ComponentModule, type FrameworkAdapter } from '../../index';
import { createReactComponentDesignDecorator } from '../index';

/* ==================== React-Specific Types ==================== */

export type ReactComponentModule<TProps> = ComponentModule<TProps, ReactDesignComponentType<TProps>>;

/**
 * A React component that optionally accepts design metadata.
 * Any component returned from the registry could potentially accept design metadata.
 * This includes both regular components and lazy components with their React-specific properties.
 */
export type ReactDesignComponentType<TProps> =
    | React.ComponentType<TProps>
    | React.LazyExoticComponent<React.ComponentType<TProps>>;

/* ==================== React Adapter Implementation ==================== */

/**
 * React framework adapter that implements React-specific behavior
 * for the framework-agnostic component registry.
 */
export class ReactAdapter<TProps> implements FrameworkAdapter<TProps, ReactDesignComponentType<TProps>> {
    /**
     * Creates a React lazy component from an importer function.
     */
    createLazyComponent(importer: () => Promise<ReactComponentModule<TProps>>): ReactDesignComponentType<TProps> {
        const lazyComp = React.lazy(async () => {
            const m = await importer();

            const component = m.default as React.ComponentType<TProps>;

            return { default: component };
        });

        return lazyComp as ReactDesignComponentType<TProps>;
    }

    /**
     * Decorates a React component with design-time capabilities.
     * Uses the React-specific design decorator directly.
     */
    decorateComponent(component: ReactDesignComponentType<TProps>): ReactDesignComponentType<TProps> {
        const reactComponent = component as React.ComponentType<TProps>;

        return createReactComponentDesignDecorator(reactComponent) as ReactDesignComponentType<TProps>;
    }
}

/**
 * Creates a React adapter instance with optional configuration.
 */
export function createReactAdapter<TProps>(): ReactAdapter<TProps> {
    return new ReactAdapter<TProps>();
}
