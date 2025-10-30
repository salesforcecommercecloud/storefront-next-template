/**
 * Tests for configuration schema helpers
 */

import { describe, it, expect } from 'vitest';
import { getBadgeVariant, defineConfig, BADGE_VARIANTS } from './schema';
import { mockBuildConfig } from '@/test-utils/config';

describe('Config Schema Helpers', () => {
    describe('getBadgeVariant', () => {
        it('should return correct variant for green color', () => {
            expect(getBadgeVariant('green')).toBe('success');
        });

        it('should return correct variant for orange color', () => {
            expect(getBadgeVariant('orange')).toBe('warning');
        });

        it('should return correct variant for yellow color', () => {
            expect(getBadgeVariant('yellow')).toBe('warning');
        });

        it('should return correct variant for purple color', () => {
            expect(getBadgeVariant('purple')).toBe('secondary');
        });

        it('should return correct variant for red color', () => {
            expect(getBadgeVariant('red')).toBe('destructive');
        });

        it('should return correct variant for blue color', () => {
            expect(getBadgeVariant('blue')).toBe('info');
        });

        it('should return correct variant for pink color', () => {
            expect(getBadgeVariant('pink')).toBe('default');
        });
    });

    describe('BADGE_VARIANTS', () => {
        it('should have all color mappings defined', () => {
            expect(BADGE_VARIANTS.green).toBe('success');
            expect(BADGE_VARIANTS.orange).toBe('warning');
            expect(BADGE_VARIANTS.yellow).toBe('warning');
            expect(BADGE_VARIANTS.purple).toBe('secondary');
            expect(BADGE_VARIANTS.red).toBe('destructive');
            expect(BADGE_VARIANTS.blue).toBe('info');
            expect(BADGE_VARIANTS.pink).toBe('default');
        });
    });

    describe('defineConfig', () => {
        it('should return the same config object', () => {
            const result = defineConfig(mockBuildConfig);

            expect(result).toBe(mockBuildConfig);
            expect(result).toEqual(mockBuildConfig);
        });

        it('should preserve all config sections', () => {
            const config = defineConfig(mockBuildConfig);

            expect(config.metadata).toBeDefined();
            expect(config.metadata.projectName).toBe('Test Project');
            expect(config.runtime).toBeDefined();
            expect(config.app).toBeDefined();
        });

        it('should provide type safety and return correct values', () => {
            const config = defineConfig(mockBuildConfig);

            expect(config.metadata.projectName).toBe('Test Project');
            expect(config.app.commerce.api.clientId).toBe('test-client');
            expect(config.app.site.locale).toBe('en-US');
            expect(config.app.global.productListing.productsPerPage).toBe(24);
        });
    });
});
