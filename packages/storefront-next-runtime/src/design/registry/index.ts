/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* ==================== Framework Agnostic Core Exports ==================== */

// Core types and interfaces
export type {
    ComponentId,
    LoaderNames,
    ComponentModule,
    DesignMetadata,
    Entry,
    FrameworkAdapter,
    ComponentRegistryOptions,
} from './types';

// Core registry class
export { ComponentRegistry } from './registry';
