import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ResolvedConfig } from 'vite';

const {
    mockEnsureDir,
    mockOutputFile,
    mockCopy,
    mockReadJson,
    mockWriteJson,
    mockResolve,
    mockDirname,
    mockFileURLToPath,
    mockPathExists,
    mockReaddir,
    mockJoin,
} = vi.hoisted(() => {
    return {
        mockEnsureDir: vi.fn(),
        mockOutputFile: vi.fn(),
        mockCopy: vi.fn(),
        mockReadJson: vi.fn(),
        mockWriteJson: vi.fn(),
        mockResolve: vi.fn(),
        mockDirname: vi.fn((path: string) => path),
        mockFileURLToPath: vi.fn((url: string) => url),
        mockPathExists: vi.fn(),
        mockReaddir: vi.fn(),
        mockJoin: vi.fn((...args: string[]) => args.join('/')),
    };
});

vi.mock('fs-extra', () => {
    return {
        default: {
            ensureDir: mockEnsureDir,
            outputFile: mockOutputFile,
            copy: mockCopy,
            readJson: mockReadJson,
            writeJson: mockWriteJson,
            pathExists: mockPathExists,
            readdir: mockReaddir,
        },
    };
});

vi.mock('path', () => {
    return {
        default: {
            resolve: mockResolve,
            dirname: mockDirname,
            join: mockJoin,
        },
    };
});

vi.mock('url', () => {
    return {
        fileURLToPath: mockFileURLToPath,
    };
});

import { managedRuntimeBundlePlugin } from './managedRuntimeBundle';

// Helper to call plugin hooks that can be functions or objects
function callHook(hook: any, ...args: any[]) {
    if (typeof hook === 'function') {
        return hook(...args);
    }
    if (hook && typeof hook.handler === 'function') {
        return hook.handler(...args);
    }
}

describe('managedRuntimeBundlePlugin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockResolve.mockImplementation((...args: string[]) => args.join('/'));
        mockJoin.mockImplementation((...args: string[]) => args.join('/'));

        // Default behavior: assume mrt directory doesn't exist, but entry file does
        // This matches the implicit behavior expected by existing tests that rely on fallback
        mockPathExists.mockImplementation((path: string) => {
            if (path.endsWith('/mrt')) return Promise.resolve(false);
            return Promise.resolve(true);
        });
        mockReaddir.mockResolvedValue([]);
    });

    it('should return a plugin with correct name', () => {
        const plugin = managedRuntimeBundlePlugin();
        expect(plugin.name).toBe('odyssey:managed-runtime-bundle');
    });

    it('should have apply set to build', () => {
        const plugin = managedRuntimeBundlePlugin();
        expect(plugin.apply).toBe('build');
    });

    it('should have config hook', () => {
        const plugin = managedRuntimeBundlePlugin();
        expect(plugin.config).toBeDefined();
        expect(typeof plugin.config).toBe('function');
    });

    it('should have configResolved hook', () => {
        const plugin = managedRuntimeBundlePlugin();
        expect(plugin.configResolved).toBeDefined();
        expect(typeof plugin.configResolved).toBe('function');
    });

    it('should have buildApp hook', () => {
        const plugin = managedRuntimeBundlePlugin();
        expect(plugin.buildApp).toBeDefined();
    });

    describe('config hook', () => {
        it('should return environments configuration', () => {
            const plugin = managedRuntimeBundlePlugin();
            const config = callHook(plugin.config, { mode: 'production' });

            expect(config).toBeDefined();
            expect(config.environments).toBeDefined();
            expect(config.environments.ssr).toBeDefined();
            expect(config.environments.ssr.resolve.noExternal).toBe(true);
        });

        it('should return experimental renderBuiltUrl configuration', () => {
            const plugin = managedRuntimeBundlePlugin();
            const config = callHook(plugin.config, { mode: 'production' });

            expect(config.experimental).toBeDefined();
            expect(config.experimental.renderBuiltUrl).toBeDefined();
            expect(typeof config.experimental.renderBuiltUrl).toBe('function');
        });

        it('should transform asset URLs in production mode', () => {
            const plugin = managedRuntimeBundlePlugin();
            const config = callHook(plugin.config, { mode: 'production' });
            const renderBuiltUrl = config.experimental.renderBuiltUrl;

            const result = renderBuiltUrl('logo.png', { type: 'asset' });

            expect(result).toBeDefined();
            expect(result.runtime).toContain('window._BUNDLE_PATH');
            expect(result.runtime).toContain('/mobify/bundle/');
            expect(result.runtime).toContain('process.env.BUNDLE_ID');
            expect(result.runtime).toContain('logo.png');
        });

        it('should transform public URLs in production mode', () => {
            const plugin = managedRuntimeBundlePlugin();
            const config = callHook(plugin.config, { mode: 'production' });
            const renderBuiltUrl = config.experimental.renderBuiltUrl;

            const result = renderBuiltUrl('favicon.ico', { type: 'public' });

            expect(result).toBeDefined();
            expect(result.runtime).toContain('window._BUNDLE_PATH');
            expect(result.runtime).toContain('/mobify/bundle/');
        });

        it('should not transform asset URLs in preview mode', () => {
            const plugin = managedRuntimeBundlePlugin();
            const config = callHook(plugin.config, { mode: 'preview' });
            const renderBuiltUrl = config.experimental.renderBuiltUrl;

            const result = renderBuiltUrl('logo.png', { type: 'asset' });

            expect(result).toBeUndefined();
        });

        it('should not transform non-asset/non-public URLs', () => {
            const plugin = managedRuntimeBundlePlugin();
            const config = callHook(plugin.config, { mode: 'production' });
            const renderBuiltUrl = config.experimental.renderBuiltUrl;

            const result = renderBuiltUrl('chunk.js', { type: 'chunk' });

            expect(result).toBeUndefined();
        });
    });

    describe('configResolved hook', () => {
        it('should store resolved config', () => {
            const plugin = managedRuntimeBundlePlugin();
            const mockConfig = {
                root: '/project',
                __reactRouterPluginContext: {
                    reactRouterConfig: {
                        buildDirectory: '/build',
                    },
                },
            } as unknown as ResolvedConfig;

            callHook(plugin.configResolved, mockConfig);

            // The config should be stored and used later
            // We can verify this by calling buildApp and checking if it uses the config
        });

        it('should extract buildDirectory from react-router plugin context', () => {
            const plugin = managedRuntimeBundlePlugin();
            const mockConfig = {
                root: '/project',
                __reactRouterPluginContext: {
                    reactRouterConfig: {
                        buildDirectory: '/custom/build',
                    },
                },
            } as unknown as ResolvedConfig;

            callHook(plugin.configResolved, mockConfig);

            // The buildDirectory should be stored and used in buildApp
            // We'll verify this in the buildApp tests
        });
    });

    describe('buildApp hook', () => {
        it('should have order set to post', () => {
            const plugin = managedRuntimeBundlePlugin();
            expect(plugin.buildApp).toBeDefined();
            expect(typeof plugin.buildApp).toBe('object');
            if (plugin.buildApp && typeof plugin.buildApp === 'object' && 'order' in plugin.buildApp) {
                expect(plugin.buildApp.order).toBe('post');
            }
        });

        it('should create managed runtime bundle assets', async () => {
            const originalEnv = process.env.MRT_BUNDLE_TYPE;
            process.env.MRT_BUNDLE_TYPE = 'stream';

            const plugin = managedRuntimeBundlePlugin();
            const mockConfig = {
                root: '/project',
                mode: 'production',
                __reactRouterPluginContext: {
                    reactRouterConfig: {
                        buildDirectory: '/build',
                    },
                },
            } as unknown as ResolvedConfig;

            mockReadJson.mockResolvedValue({
                name: 'test-package',
                version: '1.0.0',
                type: 'module',
            });

            callHook(plugin.configResolved, mockConfig);
            await callHook(plugin.buildApp);

            expect(mockEnsureDir).toHaveBeenCalledWith('/build');

            // Restore original env
            if (originalEnv) {
                process.env.MRT_BUNDLE_TYPE = originalEnv;
            } else {
                delete process.env.MRT_BUNDLE_TYPE;
            }
        });

        it('should create empty loader.js file', async () => {
            const originalEnv = process.env.MRT_BUNDLE_TYPE;
            process.env.MRT_BUNDLE_TYPE = 'stream';

            const plugin = managedRuntimeBundlePlugin();
            const mockConfig = {
                root: '/project',
                mode: 'production',
                __reactRouterPluginContext: {
                    reactRouterConfig: {
                        buildDirectory: '/build',
                    },
                },
            } as unknown as ResolvedConfig;

            mockReadJson.mockResolvedValue({});

            callHook(plugin.configResolved, mockConfig);
            await callHook(plugin.buildApp);

            expect(mockOutputFile).toHaveBeenCalledWith('/build/loader.js', '// This file is intentionally empty');

            // Restore original env
            if (originalEnv) {
                process.env.MRT_BUNDLE_TYPE = originalEnv;
            } else {
                delete process.env.MRT_BUNDLE_TYPE;
            }
        });

        it('should copy prebuilt streamingHandler.mjs file when MRT_BUNDLE_TYPE is streaming', async () => {
            const originalEnv = process.env.MRT_BUNDLE_TYPE;
            process.env.MRT_BUNDLE_TYPE = 'streaming';

            const plugin = managedRuntimeBundlePlugin();
            const mockConfig = {
                root: '/project',
                mode: 'production',
                __reactRouterPluginContext: {
                    reactRouterConfig: {
                        buildDirectory: '/build',
                    },
                },
            } as unknown as ResolvedConfig;

            mockReadJson.mockResolvedValue({});

            callHook(plugin.configResolved, mockConfig);
            await callHook(plugin.buildApp);

            expect(mockCopy).toHaveBeenCalled();
            const copyCall = mockCopy.mock.calls[0];
            expect(copyCall[0]).toContain('streamingHandler.mjs');
            expect(copyCall[1]).toBe('/build/streamingHandler.mjs');

            // Restore original env
            if (originalEnv) {
                process.env.MRT_BUNDLE_TYPE = originalEnv;
            } else {
                delete process.env.MRT_BUNDLE_TYPE;
            }
        });

        it('should copy prebuilt ssr.mjs file when MRT_BUNDLE_TYPE is standard', async () => {
            const originalEnv = process.env.MRT_BUNDLE_TYPE;
            process.env.MRT_BUNDLE_TYPE = 'ssr';

            const plugin = managedRuntimeBundlePlugin();
            const mockConfig = {
                root: '/project',
                mode: 'production',
                __reactRouterPluginContext: {
                    reactRouterConfig: {
                        buildDirectory: '/build',
                    },
                },
            } as unknown as ResolvedConfig;

            mockReadJson.mockResolvedValue({});

            callHook(plugin.configResolved, mockConfig);
            await callHook(plugin.buildApp);

            expect(mockCopy).toHaveBeenCalled();
            const copyCall = mockCopy.mock.calls[0];
            expect(copyCall[0]).toContain('ssr.mjs');
            expect(copyCall[1]).toBe('/build/ssr.mjs');

            // Restore original env
            if (originalEnv) {
                process.env.MRT_BUNDLE_TYPE = originalEnv;
            } else {
                delete process.env.MRT_BUNDLE_TYPE;
            }
        });

        it('should copy package.json to build directory', async () => {
            const originalEnv = process.env.MRT_BUNDLE_TYPE;
            process.env.MRT_BUNDLE_TYPE = 'stream';

            const plugin = managedRuntimeBundlePlugin();
            const mockConfig = {
                root: '/project',
                mode: 'production',
                __reactRouterPluginContext: {
                    reactRouterConfig: {
                        buildDirectory: '/build',
                    },
                },
            } as unknown as ResolvedConfig;

            const originalPackageJson = {
                name: 'test-package',
                version: '1.0.0',
                dependencies: { react: '^18.0.0' },
            };

            mockReadJson.mockResolvedValue(originalPackageJson);

            callHook(plugin.configResolved, mockConfig);
            await callHook(plugin.buildApp);

            expect(mockReadJson).toHaveBeenCalledWith('/project/package.json');
            expect(mockWriteJson).toHaveBeenCalledWith('/build/package.json', originalPackageJson, { spaces: 2 });

            // Restore original env
            if (originalEnv) {
                process.env.MRT_BUNDLE_TYPE = originalEnv;
            } else {
                delete process.env.MRT_BUNDLE_TYPE;
            }
        });

        it('should remove type field from package.json', async () => {
            const originalEnv = process.env.MRT_BUNDLE_TYPE;
            process.env.MRT_BUNDLE_TYPE = 'stream';

            const plugin = managedRuntimeBundlePlugin();
            const mockConfig = {
                root: '/project',
                mode: 'production',
                __reactRouterPluginContext: {
                    reactRouterConfig: {
                        buildDirectory: '/build',
                    },
                },
            } as unknown as ResolvedConfig;

            const originalPackageJson = {
                name: 'test-package',
                version: '1.0.0',
                type: 'module',
                dependencies: { react: '^18.0.0' },
            };

            mockReadJson.mockResolvedValue({ ...originalPackageJson });

            callHook(plugin.configResolved, mockConfig);
            await callHook(plugin.buildApp);

            const writeJsonCall = mockWriteJson.mock.calls[0];
            const writtenPackageJson = writeJsonCall[1];

            expect(writtenPackageJson).not.toHaveProperty('type');
            expect(writtenPackageJson).toHaveProperty('name', 'test-package');
            expect(writtenPackageJson).toHaveProperty('version', '1.0.0');
            expect(writtenPackageJson).toHaveProperty('dependencies');

            // Restore original env
            if (originalEnv) {
                process.env.MRT_BUNDLE_TYPE = originalEnv;
            } else {
                delete process.env.MRT_BUNDLE_TYPE;
            }
        });

        it('should handle package.json without type field', async () => {
            const originalEnv = process.env.MRT_BUNDLE_TYPE;
            process.env.MRT_BUNDLE_TYPE = 'stream';

            const plugin = managedRuntimeBundlePlugin();
            const mockConfig = {
                root: '/project',
                mode: 'production',
                __reactRouterPluginContext: {
                    reactRouterConfig: {
                        buildDirectory: '/build',
                    },
                },
            } as unknown as ResolvedConfig;

            const originalPackageJson = {
                name: 'test-package',
                version: '1.0.0',
            };

            mockReadJson.mockResolvedValue({ ...originalPackageJson });

            callHook(plugin.configResolved, mockConfig);
            await callHook(plugin.buildApp);

            expect(mockWriteJson).toHaveBeenCalled();
            const writeJsonCall = mockWriteJson.mock.calls[0];
            const writtenPackageJson = writeJsonCall[1];

            expect(writtenPackageJson).not.toHaveProperty('type');

            // Restore original env
            if (originalEnv) {
                process.env.MRT_BUNDLE_TYPE = originalEnv;
            } else {
                delete process.env.MRT_BUNDLE_TYPE;
            }
        });

        it('should use custom buildDirectory from react-router config', async () => {
            const originalEnv = process.env.MRT_BUNDLE_TYPE;
            process.env.MRT_BUNDLE_TYPE = 'stream';

            const plugin = managedRuntimeBundlePlugin();
            const mockConfig = {
                root: '/project',
                mode: 'production',
                __reactRouterPluginContext: {
                    reactRouterConfig: {
                        buildDirectory: '/custom/output/dir',
                    },
                },
            } as unknown as ResolvedConfig;

            mockReadJson.mockResolvedValue({});

            callHook(plugin.configResolved, mockConfig);
            await callHook(plugin.buildApp);

            expect(mockEnsureDir).toHaveBeenCalledWith('/custom/output/dir');
            expect(mockOutputFile).toHaveBeenCalledWith(
                '/custom/output/dir/loader.js',
                '// This file is intentionally empty'
            );

            // Restore original env
            if (originalEnv) {
                process.env.MRT_BUNDLE_TYPE = originalEnv;
            } else {
                delete process.env.MRT_BUNDLE_TYPE;
            }
        });

        it('should call all file operations in correct order', async () => {
            const originalEnv = process.env.MRT_BUNDLE_TYPE;
            process.env.MRT_BUNDLE_TYPE = 'stream';

            const plugin = managedRuntimeBundlePlugin();
            const mockConfig = {
                root: '/project',
                mode: 'production',
                __reactRouterPluginContext: {
                    reactRouterConfig: {
                        buildDirectory: '/build',
                    },
                },
            } as unknown as ResolvedConfig;

            mockReadJson.mockResolvedValue({ name: 'test' });

            callHook(plugin.configResolved, mockConfig);
            await callHook(plugin.buildApp);

            // Verify order: ensureDir -> outputFile -> copy -> readJson -> writeJson
            const calls = [
                mockEnsureDir.mock.invocationCallOrder[0],
                mockOutputFile.mock.invocationCallOrder[0],
                mockCopy.mock.invocationCallOrder[0],
                mockReadJson.mock.invocationCallOrder[0],
                mockWriteJson.mock.invocationCallOrder[0],
            ];

            // Each subsequent call should have a higher invocation order
            for (let i = 1; i < calls.length; i++) {
                expect(calls[i]).toBeGreaterThan(calls[i - 1]);
            }

            // Restore original env
            if (originalEnv) {
                process.env.MRT_BUNDLE_TYPE = originalEnv;
            } else {
                delete process.env.MRT_BUNDLE_TYPE;
            }
        });

        describe('MRT assets copying', () => {
            it('should copy all .mjs and .map files when mrt directory exists', async () => {
                const plugin = managedRuntimeBundlePlugin();
                const mockConfig = {
                    root: '/project',
                    mode: 'production',
                    __reactRouterPluginContext: {
                        reactRouterConfig: {
                            buildDirectory: '/build',
                        },
                    },
                } as unknown as ResolvedConfig;

                mockReadJson.mockResolvedValue({});

                // Mock mrt directory existence
                mockPathExists.mockImplementation((path: string) => {
                    return path.endsWith('/mrt');
                });

                // Mock readdir to return some files
                mockReaddir.mockResolvedValue(['chunk1.mjs', 'chunk1.mjs.map', 'other.txt', 'chunk2.mjs']);

                callHook(plugin.configResolved, mockConfig);
                await callHook(plugin.buildApp);

                // Verify copy calls
                expect(mockCopy).toHaveBeenCalledWith(expect.stringContaining('chunk1.mjs'), '/build/chunk1.mjs');
                expect(mockCopy).toHaveBeenCalledWith(
                    expect.stringContaining('chunk1.mjs.map'),
                    '/build/chunk1.mjs.map'
                );
                expect(mockCopy).toHaveBeenCalledWith(expect.stringContaining('chunk2.mjs'), '/build/chunk2.mjs');

                // Should not copy non-matching files
                expect(mockCopy).not.toHaveBeenCalledWith(expect.stringContaining('other.txt'), expect.anything());
            });

            it('should fallback to copying entry file when mrt directory does not exist', async () => {
                const plugin = managedRuntimeBundlePlugin();
                const mockConfig = {
                    root: '/project',
                    mode: 'production',
                    __reactRouterPluginContext: {
                        reactRouterConfig: {
                            buildDirectory: '/build',
                        },
                    },
                } as unknown as ResolvedConfig;

                mockReadJson.mockResolvedValue({});

                // Mock mrt directory NOT existing, but entry file existing
                mockPathExists.mockImplementation((path: string) => {
                    if (path.endsWith('/mrt')) return false;
                    // Mock entry file check (e.g., ssr.mjs or streamingHandler.mjs)
                    return path.endsWith('.mjs');
                });

                callHook(plugin.configResolved, mockConfig);
                await callHook(plugin.buildApp);

                // Verify fallback copy call. Since we didn't set MRT_BUNDLE_TYPE, it likely defaults.
                // The actual file name depends on getMrtEntryFile result, likely 'ssr.mjs' or 'streamingHandler.mjs'
                // We check if *some* .mjs file was copied to the build directory that wasn't from readdir
                const copyCalls = mockCopy.mock.calls;
                const entryCopy = copyCalls.find(
                    (call: string[]) => call[0].includes('.mjs') && call[1].endsWith('.mjs')
                );
                expect(entryCopy).toBeDefined();
            });

            it('should do nothing if neither mrt directory nor entry file exists', async () => {
                const plugin = managedRuntimeBundlePlugin();
                const mockConfig = {
                    root: '/project',
                    mode: 'production',
                    __reactRouterPluginContext: {
                        reactRouterConfig: {
                            buildDirectory: '/build',
                        },
                    },
                } as unknown as ResolvedConfig;

                mockReadJson.mockResolvedValue({});

                // Mock nothing existing
                mockPathExists.mockResolvedValue(false);

                callHook(plugin.configResolved, mockConfig);
                await callHook(plugin.buildApp);

                // Should not have copied any .mjs files
                const copyCalls = mockCopy.mock.calls;
                const mjsCopy = copyCalls.find((call: string[]) => call[1].endsWith('.mjs'));
                expect(mjsCopy).toBeUndefined();
            });
        });
    });
});
