import { describe, it, expect } from 'vitest';
import storefrontNextPlugins, { type StorefrontNextPluginsConfig } from './index';

describe('index', () => {
    it('should export the storefrontNextPlugins function', () => {
        expect(storefrontNextPlugins).toBeDefined();
        expect(typeof storefrontNextPlugins).toBe('function');
    });

    it('should return an array of plugins', () => {
        const plugins = storefrontNextPlugins();
        expect(Array.isArray(plugins)).toBe(true);
    });

    it('should return plugins with default config', () => {
        const plugins = storefrontNextPlugins();
        expect(plugins.length).toBeGreaterThan(0);
        plugins.forEach((plugin) => {
            expect(plugin).toHaveProperty('name');
        });
    });

    it('should accept StorefrontNextPluginsConfig type', () => {
        const config: StorefrontNextPluginsConfig = {
            readableChunkNames: true,
        };
        const plugins = storefrontNextPlugins(config);
        expect(plugins.length).toBeGreaterThan(0);
    });
});
