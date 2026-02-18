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
import { describe, it, expect } from 'vitest';
import { storefrontNextTargets, type StorefrontNextTargetsConfig } from './storefront-next-targets';

describe('storefrontNextTargets', () => {
    // TODO: Refactor these tests to be less fragile by:
    // - Removing most count assertions and checking for specific plugin names instead
    // - Only testing order if plugin order actually matters for functionality
    // - Testing presence/absence of specific plugins rather than exact counts
    it('should return an array of targets with default config', () => {
        const targets = storefrontNextTargets();
        expect(Array.isArray(targets)).toBe(true);
        // Base targets: managedRuntimeBundle, fixReactRouterManifestUrls, patchReactRouter,
        // transformTargetPlaceholder, watchConfigFiles, buildMiddlewareRegistry, eventInstrumentationValidator
        expect(targets.length).toBe(7);
        targets.forEach((target) => {
            expect(target).toHaveProperty('name');
        });
    });

    it('should return an array of targets with empty config', () => {
        const targets = storefrontNextTargets({});
        expect(Array.isArray(targets)).toBe(true);
        expect(targets.length).toBe(7);
    });

    it('should not include readableChunkFileNames when readableChunkNames is false', () => {
        const targets = storefrontNextTargets({ readableChunkNames: false });
        expect(targets.length).toBe(7);
        const targetNames = targets.map((t) => t.name);
        expect(targetNames).not.toContain('odyssey:readable-chunk-file-names');
    });

    it('should include readableChunkFileNames when readableChunkNames is true', () => {
        const targets = storefrontNextTargets({ readableChunkNames: true });
        expect(targets.length).toBe(8); // Should have 8 targets when readableChunkNames is enabled
        const targetNames = targets.map((t) => t.name);
        expect(targetNames).toContain('odyssey:readable-chunk-file-names');
    });

    it('should have all required targets in correct order', () => {
        const targets = storefrontNextTargets({ readableChunkNames: true });
        const targetNames = targets.map((t) => t.name);

        // Check order and presence
        expect(targetNames[0]).toBe('odyssey:managed-runtime-bundle');
        expect(targetNames[1]).toBe('odyssey:fix-react-router-manifest-urls');
        expect(targetNames[2]).toBe('odyssey:patch-react-router');
        expect(targetNames[3]).toBe('odyssey:transform-target-placeholder');
        expect(targetNames[4]).toBe('odyssey:watch-config-files');
        expect(targetNames[5]).toBe('odyssey:build-middleware-registry');
        expect(targetNames[6]).toBe('storefrontnext:event-instrumentation-validator');
        expect(targetNames[7]).toBe('odyssey:readable-chunk-file-names');
    });

    it('should accept StorefrontNextTargetsConfig type with readableChunkNames', () => {
        const config: StorefrontNextTargetsConfig = {
            readableChunkNames: true,
        };
        const targets = storefrontNextTargets(config);
        expect(targets.length).toBe(8);
    });

    it('should not include eventInstrumentationValidator when explicitly disabled', () => {
        const targets = storefrontNextTargets({ eventInstrumentationValidator: false });
        expect(targets.length).toBe(6); // One less than default
        const targetNames = targets.map((t) => t.name);
        expect(targetNames).not.toContain('storefrontnext:event-instrumentation-validator');
    });

    it('should include staticRegistry when staticRegistry config is provided', () => {
        const targets = storefrontNextTargets({
            staticRegistry: {
                componentPath: '/path/to/components',
                registryPath: '/path/to/registry',
            },
        });
        expect(targets.length).toBe(8); // 7 base + staticRegistry
        const targetNames = targets.map((t) => t.name);
        expect(targetNames).toContain('storefrontnext:static-registry');
    });

    it('should not include staticRegistry when only componentPath is provided', () => {
        const targets = storefrontNextTargets({
            staticRegistry: {
                componentPath: '/path/to/components',
            } as any,
        });
        expect(targets.length).toBe(7); // Only base targets
        const targetNames = targets.map((t) => t.name);
        expect(targetNames).not.toContain('storefrontnext:static-registry');
    });

    it('should not include staticRegistry when only registryPath is provided', () => {
        const targets = storefrontNextTargets({
            staticRegistry: {
                registryPath: '/path/to/registry',
            } as any,
        });
        expect(targets.length).toBe(7); // Only base targets
        const targetNames = targets.map((t) => t.name);
        expect(targetNames).not.toContain('storefrontnext:static-registry');
    });
});
