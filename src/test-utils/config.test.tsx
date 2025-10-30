/**
 * Tests for configuration test utilities
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useConfig } from '@/config';
import { ConfigWrapper, createConfigWrapper, mockConfig, mockBuildConfig } from './config';

describe('Config Test Utils', () => {
    describe('ConfigWrapper', () => {
        it('should provide config context to hooks', () => {
            const { result } = renderHook(() => useConfig(), { wrapper: ConfigWrapper });

            expect(result.current).toBeDefined();
            expect(result.current.commerce.api.clientId).toBe('test-client');
            expect(result.current.site.locale).toBe('en-US');
        });

        it('should provide access to all config sections', () => {
            const { result } = renderHook(() => useConfig(), { wrapper: ConfigWrapper });

            expect(result.current.commerce).toBeDefined();
            expect(result.current.site).toBeDefined();
            expect(result.current.global).toBeDefined();
            expect(result.current.pages).toBeDefined();
            expect(result.current.performance).toBeDefined();
            expect(result.current.development).toBeDefined();
        });
    });

    describe('createConfigWrapper', () => {
        it('should create a wrapper with default config when no overrides provided', () => {
            const CustomWrapper = createConfigWrapper();
            const { result } = renderHook(() => useConfig(), { wrapper: CustomWrapper });

            expect(result.current.commerce.api.clientId).toBe('test-client');
            expect(result.current.site.locale).toBe('en-US');
        });

        it('should merge overrides with base config', () => {
            const CustomWrapper = createConfigWrapper({
                app: {
                    ...mockBuildConfig.app,
                    commerce: {
                        ...mockBuildConfig.app.commerce,
                        api: {
                            ...mockBuildConfig.app.commerce.api,
                            clientId: 'custom-client',
                        },
                    },
                },
            });

            const { result } = renderHook(() => useConfig(), { wrapper: CustomWrapper });

            expect(result.current.commerce.api.clientId).toBe('custom-client');
            expect(result.current.site.locale).toBe('en-US'); // Original value preserved
        });

        it('should allow overriding site configuration', () => {
            const CustomWrapper = createConfigWrapper({
                app: {
                    ...mockBuildConfig.app,
                    site: {
                        ...mockBuildConfig.app.site,
                        locale: 'fr-FR',
                        currency: 'EUR',
                    },
                },
            });

            const { result } = renderHook(() => useConfig(), { wrapper: CustomWrapper });

            expect(result.current.site.locale).toBe('fr-FR');
            expect(result.current.site.currency).toBe('EUR');
        });

        it('should allow overriding global configuration', () => {
            const CustomWrapper = createConfigWrapper({
                app: {
                    ...mockBuildConfig.app,
                    global: {
                        ...mockBuildConfig.app.global,
                        productListing: {
                            ...mockBuildConfig.app.global.productListing,
                            productsPerPage: 48,
                        },
                    },
                },
            });

            const { result } = renderHook(() => useConfig(), { wrapper: CustomWrapper });

            expect(result.current.global.productListing.productsPerPage).toBe(48);
        });
    });

    describe('mockConfig', () => {
        it('should be a valid AppConfig object', () => {
            expect(mockConfig).toBeDefined();
            expect(mockConfig.commerce).toBeDefined();
            expect(mockConfig.site).toBeDefined();
            expect(mockConfig.global).toBeDefined();
        });

        it('should have expected test values', () => {
            expect(mockConfig.commerce.api.clientId).toBe('test-client');
            expect(mockConfig.commerce.api.organizationId).toBe('test-org');
            expect(mockConfig.commerce.api.siteId).toBe('test-site');
            expect(mockConfig.site.locale).toBe('en-US');
            expect(mockConfig.site.currency).toBe('USD');
        });
    });

    describe('mockBuildConfig', () => {
        it('should include metadata section', () => {
            expect(mockBuildConfig.metadata).toBeDefined();
            expect(mockBuildConfig.metadata.projectName).toBe('Test Project');
            expect(mockBuildConfig.metadata.projectSlug).toBe('test-project');
        });

        it('should include runtime section', () => {
            expect(mockBuildConfig.runtime).toBeDefined();
            expect(mockBuildConfig.runtime.ssrParameters.ssrFunctionNodeVersion).toBe('22.x');
        });

        it('should include app section with all subsections', () => {
            expect(mockBuildConfig.app).toBeDefined();
            expect(mockBuildConfig.app.pages).toBeDefined();
            expect(mockBuildConfig.app.commerce).toBeDefined();
            expect(mockBuildConfig.app.site).toBeDefined();
            expect(mockBuildConfig.app.global).toBeDefined();
            expect(mockBuildConfig.app.performance).toBeDefined();
            expect(mockBuildConfig.app.development).toBeDefined();
        });

        it('should have valid commerce API configuration', () => {
            expect(mockBuildConfig.app.commerce.api.clientId).toBe('test-client');
            expect(mockBuildConfig.app.commerce.api.organizationId).toBe('test-org');
            expect(mockBuildConfig.app.commerce.api.siteId).toBe('test-site');
            expect(mockBuildConfig.app.commerce.api.shortCode).toBe('test123');
        });

        it('should have valid page configurations', () => {
            expect(mockBuildConfig.app.pages.home.featuredProductsCount).toBe(12);
            expect(mockBuildConfig.app.pages.cart.quantityUpdateDebounce).toBe(750);
            expect(mockBuildConfig.app.pages.cart.maxQuantityPerItem).toBe(999);
            expect(mockBuildConfig.app.pages.search.enableSearchSuggestions).toBe(true);
        });

        it('should have valid global configurations', () => {
            expect(mockBuildConfig.app.global.branding.name).toBe('Test Store');
            expect(mockBuildConfig.app.global.productListing.productsPerPage).toBe(24);
            expect(mockBuildConfig.app.global.carousel.defaultItemCount).toBe(4);
            expect(mockBuildConfig.app.global.badges).toHaveLength(2);
        });
    });
});
