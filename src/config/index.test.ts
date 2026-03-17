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
/**
 * Configuration System Tests
 *
 * Simple tests that verify the configuration loads correctly.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import config from '@/config/server';
import { getConfig } from '@/config';
import { createAppConfig } from '@/config/context';
import { mockBuildConfig } from '@/test-utils/config';

describe('Configuration System', () => {
    describe('Basic Configuration Loading', () => {
        it('should load config.server.ts', () => {
            expect(config).toBeDefined();
            expect(config.metadata.projectName).toBeTruthy();
            expect(config.app.commerce.sites).toBeTruthy();
        });

        it('should have commerce configuration structure', () => {
            expect(config.app.commerce.api.clientId).toBeDefined();
            expect(config.app.commerce.api.organizationId).toBeDefined();
            expect(config.app.commerce.api.siteId).toBeDefined();
            expect(config.app.commerce.api.shortCode).toBeDefined();
        });

        it('should have UI configuration with defaults', () => {
            expect(config.app.global.productListing.productsPerPage).toBeTypeOf('number');
            expect(Array.isArray(config.app.global.badges)).toBe(true);
        });

        it('should have pages configuration with defaults', () => {
            expect(config.app.pages.home.featuredProductsCount).toBeTypeOf('number');
            expect(config.app.pages.cart.quantityUpdateDebounce).toBeTypeOf('number');
            expect(config.app.pages.search.placeholder).toBeTypeOf('string');
        });

        it('should have runtime configuration with defaults', () => {
            expect(config.runtime).toBeDefined();
            expect(config.runtime?.defaultMrtProject).toBeDefined();
            expect(config.runtime?.defaultMrtTarget).toBeDefined();
            expect(Array.isArray(config.runtime?.ssrOnly)).toBe(true);
            expect(Array.isArray(config.runtime?.ssrShared)).toBe(true);
            expect(config.runtime?.ssrParameters).toBeDefined();
            expect(config.runtime?.ssrParameters?.ssrFunctionNodeVersion).toBe('24.x');
        });

        it('should have site configuration with defaults', () => {
            expect(config.app.commerce.sites[0].defaultLocale).toBe('en-US');
            expect(config.app.commerce.sites[0].defaultCurrency).toBe('USD');
            expect(config.app.commerce.api.proxy).toBe('/mobify/proxy/api');
        });

        it('should allow cookies to be optional', () => {
            // cookies is optional in the schema
            const cookies = config.app.commerce.sites[0].cookies;
            if (cookies !== undefined) {
                expect(cookies).toHaveProperty('domain');
                const domain = cookies.domain;
                expect(domain).toBeTypeOf('string');
            }
        });
    });

    describe('getConfig() Function', () => {
        beforeEach(() => {
            // Set up window.__APP_CONFIG__ for client-side tests
            const mockConfig = createAppConfig(mockBuildConfig);
            (window as any).__APP_CONFIG__ = mockConfig;
        });

        afterEach(() => {
            // Clean up
            delete (window as any).__APP_CONFIG__;
        });

        it('should return app config on client-side', () => {
            const appConfig = getConfig();

            expect(appConfig).toBeDefined();
            expect(appConfig.commerce).toBeDefined();
            expect(appConfig.commerce.sites[0]).toBeDefined();
            expect(appConfig.pages).toBeDefined();
            expect(appConfig.global).toBeDefined();
        });

        it('should have all config sections accessible', () => {
            const appConfig = getConfig();

            expect(appConfig.commerce.api.clientId).toBe('test-client');
            expect(appConfig.commerce.sites[0].defaultLocale).toBe('en-US');
            expect(appConfig.global.productListing.productsPerPage).toBe(24);
        });

        it('should not include runtime build settings in app config', () => {
            const appConfig = getConfig();

            // Runtime config should not be in app config
            expect(appConfig).not.toHaveProperty('runtime');
        });
    });
});
