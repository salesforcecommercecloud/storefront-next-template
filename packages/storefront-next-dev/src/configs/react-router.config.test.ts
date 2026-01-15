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
import { odysseyPreset } from './react-router.config';

// Helper to create a mock resolved config with all required properties
const createMockResolvedConfig = (overrides: Record<string, any> = {}) => {
    return {
        appDirectory: '/absolute/path/to/src',
        basename: '/',
        buildDirectory: '/absolute/path/to/build',
        serverBuildFile: 'index.js',
        routes: {},
        unstable_routeConfig: [],
        future: {
            v8_middleware: true,
            v8_viteEnvironmentApi: true,
            unstable_optimizeDeps: false,
            v8_splitRouteModules: false,
            unstable_subResourceIntegrity: false,
            unstable_trailingSlashAwareDataRequests: false,
        },
        routeDiscovery: { mode: 'initial' as const },
        serverModuleFormat: 'cjs' as const,
        ssr: true,
        prerender: false,
        allowedActionOrigins: [],
        ...overrides,
    };
};

describe('react-router.config', () => {
    describe('odysseyPreset', () => {
        it('should return a preset with correct name', () => {
            const preset = odysseyPreset();
            expect(preset.name).toBe('odyssey-preset');
        });

        it('should have reactRouterConfig function', () => {
            const preset = odysseyPreset();
            expect(preset.reactRouterConfig).toBeDefined();
            expect(typeof preset.reactRouterConfig).toBe('function');
        });

        it('should have reactRouterConfigResolved function', () => {
            const preset = odysseyPreset();
            expect(preset.reactRouterConfigResolved).toBeDefined();
            expect(typeof preset.reactRouterConfigResolved).toBe('function');
        });

        describe('reactRouterConfig', () => {
            it('should return correct configuration values', () => {
                const preset = odysseyPreset();
                const mockUserConfig = {
                    appDirectory: './app',
                    buildDirectory: 'dist',
                };
                const config = preset.reactRouterConfig?.({ reactRouterUserConfig: mockUserConfig });

                expect(config).toEqual({
                    appDirectory: './src',
                    buildDirectory: 'build',
                    routeDiscovery: { mode: 'initial' },
                    serverModuleFormat: 'cjs',
                    ssr: true,
                    future: {
                        v8_middleware: true,
                        v8_viteEnvironmentApi: true,
                    },
                });
            });

            it('should return consistent config on multiple calls', () => {
                const preset = odysseyPreset();
                const mockUserConfig = {};
                const config1 = preset.reactRouterConfig?.({ reactRouterUserConfig: mockUserConfig });
                const config2 = preset.reactRouterConfig?.({ reactRouterUserConfig: mockUserConfig });

                expect(config1).toEqual(config2);
            });
        });

        describe('reactRouterConfigResolved', () => {
            it('should not throw error when config matches preset values', () => {
                const preset = odysseyPreset();
                const validConfig = createMockResolvedConfig();

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: validConfig });
                }).not.toThrow();
            });

            it('should throw error when routeDiscovery.mode is overridden', () => {
                const preset = odysseyPreset();
                const invalidConfig = createMockResolvedConfig({
                    routeDiscovery: { mode: 'lazy' as const },
                });

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: invalidConfig });
                }).toThrow('Odyssey preset configuration was overridden');

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: invalidConfig });
                }).toThrow('routeDiscovery.mode: expected "initial", got "lazy"');
            });

            it('should throw error when serverModuleFormat is overridden', () => {
                const preset = odysseyPreset();
                const invalidConfig = createMockResolvedConfig({
                    serverModuleFormat: 'esm' as const,
                });

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: invalidConfig });
                }).toThrow('Odyssey preset configuration was overridden');

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: invalidConfig });
                }).toThrow('serverModuleFormat: expected "cjs", got "esm"');
            });

            it('should throw error when ssr is overridden', () => {
                const preset = odysseyPreset();
                const invalidConfig = createMockResolvedConfig({
                    ssr: false,
                });

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: invalidConfig });
                }).toThrow('Odyssey preset configuration was overridden');

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: invalidConfig });
                }).toThrow('ssr: expected true, got false');
            });

            it('should throw error when future.v8_middleware is overridden', () => {
                const preset = odysseyPreset();
                const invalidConfig = createMockResolvedConfig({
                    future: {
                        v8_middleware: false,
                        v8_viteEnvironmentApi: true,
                        unstable_optimizeDeps: false,
                        v8_splitRouteModules: false,
                        unstable_subResourceIntegrity: false,
                    },
                });

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: invalidConfig });
                }).toThrow('Odyssey preset configuration was overridden');

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: invalidConfig });
                }).toThrow('future.v8_middleware: expected true, got false');
            });

            it('should throw error when future.v8_viteEnvironmentApi is overridden', () => {
                const preset = odysseyPreset();
                const invalidConfig = createMockResolvedConfig({
                    future: {
                        v8_middleware: true,
                        v8_viteEnvironmentApi: false,
                        unstable_optimizeDeps: false,
                        v8_splitRouteModules: false,
                        unstable_subResourceIntegrity: false,
                    },
                });

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: invalidConfig });
                }).toThrow('Odyssey preset configuration was overridden');

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: invalidConfig });
                }).toThrow('future.v8_viteEnvironmentApi: expected true, got false');
            });

            it('should throw error with all validation errors when multiple values are overridden', () => {
                const preset = odysseyPreset();
                const invalidConfig = createMockResolvedConfig({
                    routeDiscovery: { mode: 'lazy' as const },
                    serverModuleFormat: 'esm' as const,
                    ssr: false,
                    future: {
                        v8_middleware: false,
                        v8_viteEnvironmentApi: false,
                        unstable_optimizeDeps: false,
                        v8_splitRouteModules: false,
                        unstable_subResourceIntegrity: false,
                    },
                });

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: invalidConfig });
                }).toThrow('Odyssey preset configuration was overridden');

                let errorMessage = '';
                try {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: invalidConfig });
                } catch (error) {
                    errorMessage = (error as Error).message;
                }

                expect(errorMessage).toContain('routeDiscovery.mode: expected "initial", got "lazy"');
                expect(errorMessage).toContain('serverModuleFormat: expected "cjs", got "esm"');
                expect(errorMessage).toContain('ssr: expected true, got false');
                expect(errorMessage).toContain('future.v8_middleware: expected true, got false');
                expect(errorMessage).toContain('future.v8_viteEnvironmentApi: expected true, got false');
            });

            it('should handle missing routeDiscovery object', () => {
                const preset = odysseyPreset();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { routeDiscovery, ...configWithoutRouteDiscovery } = createMockResolvedConfig();

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: configWithoutRouteDiscovery as any });
                }).toThrow('routeDiscovery.mode: expected "initial", got "undefined"');
            });

            it('should handle missing future object', () => {
                const preset = odysseyPreset();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { future, ...configWithoutFuture } = createMockResolvedConfig();

                expect(() => {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: configWithoutFuture as any });
                }).toThrow('future.v8_middleware: expected true, got undefined');

                let errorMessage = '';
                try {
                    void preset.reactRouterConfigResolved?.({ reactRouterConfig: configWithoutFuture as any });
                } catch (error) {
                    errorMessage = (error as Error).message;
                }

                expect(errorMessage).toContain('future.v8_middleware: expected true, got undefined');
                expect(errorMessage).toContain('future.v8_viteEnvironmentApi: expected true, got undefined');
            });

            it('should not validate appDirectory and buildDirectory', () => {
                const preset = odysseyPreset();
                const configWithDifferentPaths = createMockResolvedConfig({
                    appDirectory: '/absolute/path/to/different/src',
                    buildDirectory: '/absolute/path/to/different/build',
                });

                // Should not throw because appDirectory and buildDirectory are not validated
                expect(() => {
                    void preset.reactRouterConfigResolved?.({
                        reactRouterConfig: configWithDifferentPaths,
                    });
                }).not.toThrow();
            });
        });
    });
});
