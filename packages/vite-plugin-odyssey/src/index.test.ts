import { describe, it, expect } from 'vitest';
import odysseyPlugins, { type OdysseyPluginsConfig } from './index';

describe('index', () => {
    it('should export the odysseyPlugins function', () => {
        expect(odysseyPlugins).toBeDefined();
        expect(typeof odysseyPlugins).toBe('function');
    });

    it('should return an array of plugins', () => {
        const plugins = odysseyPlugins();
        expect(Array.isArray(plugins)).toBe(true);
    });

    it('should return plugins with default config', () => {
        const plugins = odysseyPlugins();
        expect(plugins.length).toBeGreaterThan(0);
        plugins.forEach((plugin) => {
            expect(plugin).toHaveProperty('name');
        });
    });

    it('should accept OdysseyPluginsConfig type', () => {
        const config: OdysseyPluginsConfig = {
            readableChunkNames: true,
        };
        const plugins = odysseyPlugins(config);
        expect(plugins.length).toBeGreaterThan(0);
    });
});
