/**
 * Configuration Access Tests
 *
 * Tests both getConfig() (for loaders/utilities) and useConfig() (for React components).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { getConfig, useConfig } from './get-config';
import { ConfigProvider, createAppConfig, appConfigContext, type AppConfig } from './context';
import { createTestContext } from '@/lib/test-utils';
import { mockBuildConfig } from '@/test-utils/config';

describe('Config Access APIs', () => {
    let mockConfig: AppConfig;

    beforeEach(() => {
        mockConfig = createAppConfig(mockBuildConfig);
    });

    afterEach(() => {
        // Clean up window mock
        delete (window as any).__APP_CONFIG__;
    });

    describe('getConfig() - for loaders and utilities', () => {
        describe('Server context', () => {
            it('should read from router context when provided', () => {
                const context = createTestContext({ appConfig: mockConfig });

                const config = getConfig(context);

                expect(config).toBeDefined();
                expect(config.commerce.api.clientId).toBe('test-client');
                expect(config.site.locale).toBe('en-US');
            });

            it('should throw error if context provided but config not set', () => {
                const context = createTestContext();
                context.set(appConfigContext, undefined);

                expect(() => getConfig(context)).toThrow('Configuration not available in router context');
            });
        });

        describe('Client-side (window.__APP_CONFIG__)', () => {
            it('should read from window.__APP_CONFIG__ when available', () => {
                (window as any).__APP_CONFIG__ = mockConfig;

                const config = getConfig();

                expect(config).toBeDefined();
                expect(config.commerce.api.clientId).toBe('test-client');
                expect(config.site.locale).toBe('en-US');
            });

            it('should throw error when window.__APP_CONFIG__ not available', () => {
                delete (window as any).__APP_CONFIG__;

                expect(() => getConfig()).toThrow('Configuration not available');
            });
        });

        describe('Priority', () => {
            it('should prioritize router context over window', () => {
                const context = createTestContext({ appConfig: mockConfig });
                const windowConfig = createAppConfig({
                    ...mockBuildConfig,
                    app: {
                        ...mockBuildConfig.app,
                        global: {
                            ...mockBuildConfig.app.global,
                            branding: { name: 'Window Config', logoAlt: 'Home' },
                        },
                    },
                });
                (window as any).__APP_CONFIG__ = windowConfig;

                // Context should win
                const config = getConfig(context);
                expect(config.global.branding.name).toBe('Test Store');
            });
        });
    });

    describe('useConfig() - for React components', () => {
        it('should read from React Context', () => {
            const { result } = renderHook(() => useConfig(), {
                wrapper: ({ children }) => <ConfigProvider config={mockConfig}>{children}</ConfigProvider>,
            });

            expect(result.current).toBeDefined();
            expect(result.current.commerce.api.clientId).toBe('test-client');
            expect(result.current.site.locale).toBe('en-US');
            expect(result.current).toEqual(mockConfig);
        });

        it('should throw error when used outside ConfigProvider', () => {
            // Suppress console.error for this test since we expect an error
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            expect(() => {
                renderHook(() => useConfig());
            }).toThrow('useConfig must be used within ConfigProvider');

            consoleSpy.mockRestore();
        });
    });

    describe('All config sections accessible', () => {
        it('should provide access to all app config sections via useConfig', () => {
            const { result } = renderHook(() => useConfig(), {
                wrapper: ({ children }) => <ConfigProvider config={mockConfig}>{children}</ConfigProvider>,
            });

            const config = result.current;

            expect(config.commerce).toBeDefined();
            expect(config.site).toBeDefined();
            expect(config.pages).toBeDefined();
            expect(config.global).toBeDefined();
            expect(config.performance).toBeDefined();
            expect(config.development).toBeDefined();
            expect(config.global.branding).toBeDefined();
            expect(config.site.features.socialShare).toBeDefined();
            expect(config.site.features.socialShare.enabled).toBeDefined();
            expect(config.site.features.socialShare.providers).toBeDefined();
        });

        it('should not include runtime build settings in app config', () => {
            (window as any).__APP_CONFIG__ = mockConfig;

            const config = getConfig();

            // Runtime config should not be in app config
            expect(config).not.toHaveProperty('runtime');
            expect(config).not.toHaveProperty('metadata');
        });
    });
});
