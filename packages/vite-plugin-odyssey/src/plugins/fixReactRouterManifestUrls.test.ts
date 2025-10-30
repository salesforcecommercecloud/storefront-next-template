import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ResolvedConfig } from 'vite';

const { mockReadFileSync, mockWriteFileSync, mockExistsSync, mockReaddirSync } = vi.hoisted(() => {
    return {
        mockReadFileSync: vi.fn(),
        mockWriteFileSync: vi.fn(),
        mockExistsSync: vi.fn(),
        mockReaddirSync: vi.fn(),
    };
});

vi.mock('fs-extra', () => {
    return {
        default: {
            readFileSync: mockReadFileSync,
            writeFileSync: mockWriteFileSync,
            existsSync: mockExistsSync,
            readdirSync: mockReaddirSync,
        },
    };
});

import { fixReactRouterManifestUrlsPlugin } from './fixReactRouterManifestUrls';

// Helper to call plugin hooks that can be functions or objects
function callHook(hook: any, ...args: any[]) {
    if (typeof hook === 'function') {
        return hook(...args);
    }
    if (hook && typeof hook.handler === 'function') {
        return hook.handler(...args);
    }
}

describe('fixReactRouterManifestUrlsPlugin', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return a plugin with correct name', () => {
        const plugin = fixReactRouterManifestUrlsPlugin();
        expect(plugin.name).toBe('odyssey:fix-react-router-manifest-urls');
    });

    it('should have enforce set to post', () => {
        const plugin = fixReactRouterManifestUrlsPlugin();
        expect(plugin.enforce).toBe('post');
    });

    it('should have configResolved hook', () => {
        const plugin = fixReactRouterManifestUrlsPlugin();
        expect(plugin.configResolved).toBeDefined();
        expect(typeof plugin.configResolved).toBe('function');
    });

    it('should have closeBundle hook', () => {
        const plugin = fixReactRouterManifestUrlsPlugin();
        expect(plugin.closeBundle).toBeDefined();
        expect(typeof plugin.closeBundle).toBe('function');
    });

    describe('closeBundle', () => {
        it('should return early when mode is preview', () => {
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'preview',
                environments: {
                    client: {
                        build: {
                            outDir: '/path/to/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            expect(mockExistsSync).not.toHaveBeenCalled();
        });

        it('should return early when client build directory does not exist', () => {
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/path/to/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(false);

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            expect(mockExistsSync).toHaveBeenCalledWith('/path/to/build');
            expect(mockReaddirSync).not.toHaveBeenCalled();
        });

        it('should find and process manifest files', () => {
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue([
                { name: 'manifest-abc123.js', isDirectory: () => false },
                { name: 'other-file.js', isDirectory: () => false },
            ]);
            mockReadFileSync.mockReturnValue('const url = "/assets/file.js";');

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            expect(mockReaddirSync).toHaveBeenCalledWith('/build', { withFileTypes: true });
            expect(mockReadFileSync).toHaveBeenCalled();
        });

        it('should transform double-quoted asset URLs', () => {
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue([{ name: 'manifest-abc.js', isDirectory: () => false }]);
            mockReadFileSync.mockReturnValue('const url = "/assets/file.js";');

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            expect(mockWriteFileSync).toHaveBeenCalledWith(
                '/build/manifest-abc.js',
                'const url = (window._BUNDLE_PATH || "/") + "assets/file.js";'
            );
        });

        it('should transform single-quoted asset URLs', () => {
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue([{ name: 'manifest-xyz.js', isDirectory: () => false }]);
            mockReadFileSync.mockReturnValue("const url = '/assets/style.css';");

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            // Note: regex only replaces opening quote+/assets/, leaving closing quote intact
            expect(mockWriteFileSync).toHaveBeenCalledWith(
                '/build/manifest-xyz.js',
                'const url = (window._BUNDLE_PATH || "/") + "assets/style.css\';'
            );
        });

        it('should transform multiple asset URLs in same file', () => {
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue([{ name: 'manifest-multi.js', isDirectory: () => false }]);
            mockReadFileSync.mockReturnValue('"/assets/a.js" and "/assets/b.css"');

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            expect(mockWriteFileSync).toHaveBeenCalledWith(
                '/build/manifest-multi.js',
                '(window._BUNDLE_PATH || "/") + "assets/a.js" and (window._BUNDLE_PATH || "/") + "assets/b.css"'
            );
        });

        it('should not write file if no asset URLs found', () => {
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue([{ name: 'manifest-no-assets.js', isDirectory: () => false }]);
            mockReadFileSync.mockReturnValue('const url = "/other/path.js";');

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            expect(mockWriteFileSync).not.toHaveBeenCalled();
        });

        it('should process nested directories', () => {
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync
                .mockReturnValueOnce([
                    { name: 'subdir', isDirectory: () => true },
                    { name: 'manifest-root.js', isDirectory: () => false },
                ])
                .mockReturnValueOnce([{ name: 'manifest-nested.js', isDirectory: () => false }]);
            mockReadFileSync.mockReturnValue('"/assets/file.js"');

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            expect(mockReaddirSync).toHaveBeenCalledTimes(2);
            expect(mockReaddirSync).toHaveBeenCalledWith('/build', { withFileTypes: true });
            expect(mockReaddirSync).toHaveBeenCalledWith('/build/subdir', { withFileTypes: true });
        });

        it('should only process files with manifest- prefix and .js extension', () => {
            const plugin = fixReactRouterManifestUrlsPlugin();
            const mockConfig = {
                mode: 'production',
                environments: {
                    client: {
                        build: {
                            outDir: '/build',
                        },
                    },
                },
            } as unknown as ResolvedConfig;

            mockExistsSync.mockReturnValue(true);
            mockReaddirSync.mockReturnValue([
                { name: 'manifest-valid.js', isDirectory: () => false },
                { name: 'manifest-valid.ts', isDirectory: () => false },
                { name: 'other-manifest.js', isDirectory: () => false },
                { name: 'manifest.js', isDirectory: () => false },
            ]);
            mockReadFileSync.mockReturnValue('"/assets/file.js"');

            callHook(plugin.configResolved, mockConfig);
            callHook(plugin.closeBundle);

            // Should only read manifest-valid.js (includes 'manifest-' and ends with '.js')
            // 'manifest.js' doesn't include 'manifest-' substring, so it's excluded
            expect(mockReadFileSync).toHaveBeenCalledTimes(1);
        });
    });
});
