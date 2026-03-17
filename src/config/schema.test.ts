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
        // Helper to get clean env without PUBLIC__ vars (especially engagement which is protected)
        const getCleanEnv = () =>
            Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PUBLIC__')));

        it('should return config with structure preserved', () => {
            // Store original env
            const originalEnv = process.env;

            // Clear PUBLIC__ env vars to test with mock config defaults
            process.env = getCleanEnv();

            const result = defineConfig(mockBuildConfig);

            // Note: Won't be the same reference due to env var merging
            expect(result).toEqual(mockBuildConfig);

            // Restore original env
            process.env = originalEnv;
        });

        it('should preserve all config sections', () => {
            // Store original env and clear PUBLIC__ vars (engagement paths are protected)
            const originalEnv = process.env;
            process.env = getCleanEnv();

            const config = defineConfig(mockBuildConfig);

            expect(config.metadata).toBeDefined();
            expect(config.metadata.projectName).toBe('Test Project');
            expect(config.runtime).toBeDefined();
            expect(config.app).toBeDefined();

            // Restore original env
            process.env = originalEnv;
        });

        it('should provide type safety and return correct values', () => {
            // Store original env
            const originalEnv = process.env;

            // Clear PUBLIC__ env vars to test with mock config defaults
            process.env = getCleanEnv();

            const config = defineConfig(mockBuildConfig);

            expect(config.metadata.projectName).toBe('Test Project');
            expect(config.app.commerce.api.clientId).toBe('test-client');
            expect(config.app.commerce.sites[0].defaultLocale).toBe('en-US');
            expect(config.app.global.productListing.productsPerPage).toBe(24);

            // Restore original env
            process.env = originalEnv;
        });

        it('should merge environment variable overrides with PUBLIC__ prefix', () => {
            // Store original env
            const originalEnv = process.env;

            // Start with clean env (no PUBLIC__ vars), then add test-specific overrides
            process.env = {
                ...getCleanEnv(),
                PUBLIC__app__pages__cart__quantityUpdateDebounce: '1000',
                PUBLIC__app__pages__cart__maxQuantityPerItem: '500',
            };

            const config = defineConfig(mockBuildConfig);

            expect(config.app.pages.cart.quantityUpdateDebounce).toBe(1000);
            expect(config.app.pages.cart.maxQuantityPerItem).toBe(500);

            // Restore original env
            process.env = originalEnv;
        });

        it('should merge JSON environment variable overrides with optimistic parsing', () => {
            // Store original env
            const originalEnv = process.env;

            // Start with clean env (no PUBLIC__ vars), then add test-specific overrides
            process.env = {
                ...getCleanEnv(),
                PUBLIC__app__features__socialLogin__providers: '["Apple","Facebook","Twitter"]',
            };

            const config = defineConfig(mockBuildConfig);

            expect(config.app.features.socialLogin.providers).toEqual(['Apple', 'Facebook', 'Twitter']);

            // Restore original env
            process.env = originalEnv;
        });

        it('should deep merge nested config paths without overwriting sibling values', () => {
            // Store original env
            const originalEnv = process.env;

            // Start with clean env (no PUBLIC__ vars), then add test-specific overrides
            process.env = {
                ...getCleanEnv(),
                PUBLIC__app__pages__cart__quantityUpdateDebounce: '2000',
            };

            const config = defineConfig(mockBuildConfig);

            // The overridden value
            expect(config.app.pages.cart.quantityUpdateDebounce).toBe(2000);
            // Sibling values should be preserved
            expect(config.app.pages.cart.enableRemoveConfirmation).toBe(true);
            expect(config.app.pages.cart.maxQuantityPerItem).toBe(999);

            // Restore original env
            process.env = originalEnv;
        });
    });
});
