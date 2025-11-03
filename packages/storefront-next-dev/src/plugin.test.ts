import { describe, it, expect } from 'vitest';
import { storefrontNextPlugins, type StorefrontNextPluginsConfig } from './plugin';

describe('storefrontNextPlugins', () => {
    it('should return an array of plugins with default config', () => {
        const plugins = storefrontNextPlugins();
        expect(Array.isArray(plugins)).toBe(true);
        expect(plugins.length).toBe(3); // managedRuntimeBundle, fixReactRouterManifestUrls, patchReactRouter
        plugins.forEach((plugin) => {
            expect(plugin).toHaveProperty('name');
        });
    });

    it('should return an array of plugins with empty config', () => {
        const plugins = storefrontNextPlugins({});
        expect(Array.isArray(plugins)).toBe(true);
        expect(plugins.length).toBe(3);
    });

    it('should not include readableChunkFileNamesPlugin when readableChunkNames is false', () => {
        const plugins = storefrontNextPlugins({ readableChunkNames: false });
        expect(plugins.length).toBe(3);
        const pluginNames = plugins.map((p) => p.name);
        expect(pluginNames).not.toContain('odyssey:readable-chunk-file-names');
    });

    it('should include readableChunkFileNamesPlugin when readableChunkNames is true', () => {
        const plugins = storefrontNextPlugins({ readableChunkNames: true });
        expect(plugins.length).toBe(4); // Should have 4 plugins when readableChunkNames is enabled
        const pluginNames = plugins.map((p) => p.name);
        expect(pluginNames).toContain('odyssey:readable-chunk-file-names');
    });

    it('should have all required plugins in correct order', () => {
        const plugins = storefrontNextPlugins({ readableChunkNames: true });
        const pluginNames = plugins.map((p) => p.name);

        // Check order and presence
        expect(pluginNames[0]).toBe('odyssey:managed-runtime-bundle');
        expect(pluginNames[1]).toBe('odyssey:fix-react-router-manifest-urls');
        expect(pluginNames[2]).toBe('odyssey:patch-react-router');
        expect(pluginNames[3]).toBe('odyssey:readable-chunk-file-names');
    });

    it('should accept StorefrontNextPluginsConfig type with readableChunkNames', () => {
        const config: StorefrontNextPluginsConfig = {
            readableChunkNames: true,
        };
        const plugins = storefrontNextPlugins(config);
        expect(plugins.length).toBe(4);
    });
});
