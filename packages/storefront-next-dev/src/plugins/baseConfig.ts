/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { Plugin } from 'vite';

/**
 * Vite plugin contributing the baseline Vite config required by the
 * Storefront Next framework. These settings are uniform across every
 * customer project and are not intended to be customized.
 *
 * Additional framework-level Vite defaults should be added here rather
 * than in the template's vite.config.ts or in a new single-purpose plugin.
 *
 * Current defaults:
 * - `resolve.dedupe`: prevents duplicate React / React Router copies.
 *   Duplicate React instances cause hooks to throw "Invalid hook call".
 * - `optimizeDeps.include`: forces Vite's dep optimizer to pre-bundle
 *   `react-router` and its `/internal/react-server-client` entry so the
 *   React Router dev plugin resolves a single shared instance.
 *
 * @returns {Plugin} A Vite plugin contributing the framework's base config.
 */
export const baseConfigPlugin = (): Plugin => ({
    name: 'storefront-next:base-config',
    config() {
        return {
            resolve: {
                dedupe: ['react', 'react-dom', 'react-router'],
            },
            optimizeDeps: {
                include: ['react-router', 'react-router/internal/react-server-client'],
            },
        };
    },
});
