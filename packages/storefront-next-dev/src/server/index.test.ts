import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { ServerBuild } from 'react-router';
import type { ViteDevServer, DevEnvironment } from 'vite';
import type { ServerConfig } from './config';

// Mock modules with factory functions
vi.mock('express', () => {
    const mockExpressApp = {
        disable: vi.fn().mockReturnThis(),
        use: vi.fn().mockReturnThis(),
        all: vi.fn().mockReturnThis(),
    };
    return {
        default: vi.fn(() => mockExpressApp),
    };
});

vi.mock('@react-router/express', () => ({
    createRequestHandler: vi.fn(),
}));

vi.mock('./config', () => ({
    loadConfigFromEnv: vi.fn(),
}));

vi.mock('../utils/paths', () => ({
    getBundlePath: vi.fn(),
}));

vi.mock('./middleware/proxy', () => ({
    createCommerceProxyMiddleware: vi.fn(),
}));

vi.mock('./middleware/static', () => ({
    createStaticMiddleware: vi.fn(),
}));

vi.mock('./middleware/compression', () => ({
    createCompressionMiddleware: vi.fn(),
}));

vi.mock('./middleware/logging', () => ({
    createLoggingMiddleware: vi.fn(),
}));

vi.mock('./utils', () => ({
    patchReactRouterBuild: vi.fn(),
}));

vi.mock('vite', () => ({
    isRunnableDevEnvironment: vi.fn(),
}));

vi.mock('node:fs', () => ({
    existsSync: vi.fn(),
}));

vi.mock('./ts-import', () => ({
    importTypescript: vi.fn(),
}));

// Import after mocks are set up
const { createServer } = await import('./index');
import type { ServerOptions } from './index';
const express = (await import('express')).default;
const { createRequestHandler } = await import('@react-router/express');
const { loadConfigFromEnv } = await import('./config');
const { getBundlePath } = await import('../utils/paths');
const { createCommerceProxyMiddleware } = await import('./middleware/proxy');
const { createStaticMiddleware } = await import('./middleware/static');
const { createCompressionMiddleware } = await import('./middleware/compression');
const { createLoggingMiddleware } = await import('./middleware/logging');
const { patchReactRouterBuild } = await import('./utils');
const { isRunnableDevEnvironment } = await import('vite');
const { existsSync } = await import('node:fs');
const { importTypescript } = await import('./ts-import');

describe('server/index', () => {
    let mockExpressApp: {
        disable: ReturnType<typeof vi.fn>;
        use: ReturnType<typeof vi.fn>;
        all: ReturnType<typeof vi.fn>;
    };

    const mockConfig: ServerConfig = {
        commerce: {
            api: {
                shortCode: 'test-short-code',
                organizationId: 'test-org-id',
                clientId: 'test-client-id',
                siteId: 'test-site-id',
                proxy: '/api/commerce',
            },
        },
    };

    const mockBuild: ServerBuild = {
        assets: { version: '1', entry: { module: 'entry.js', imports: [] }, routes: {} },
        assetsBuildDirectory: '/build/client',
        basename: '/',
        entry: { module: {} },
        future: {},
        publicPath: '/',
        routes: {},
    } as unknown as ServerBuild;

    beforeEach(() => {
        vi.clearAllMocks();

        // Get the mock express app instance
        mockExpressApp = express() as unknown as typeof mockExpressApp;

        vi.mocked(loadConfigFromEnv).mockReturnValue(mockConfig);
        vi.mocked(getBundlePath).mockReturnValue('/bundles/test-bundle');
        vi.mocked(createCommerceProxyMiddleware).mockReturnValue(vi.fn() as any);
        vi.mocked(createStaticMiddleware).mockReturnValue(vi.fn() as any);
        vi.mocked(createCompressionMiddleware).mockReturnValue(vi.fn() as any);
        vi.mocked(createLoggingMiddleware).mockReturnValue(vi.fn() as any);
        vi.mocked(patchReactRouterBuild).mockReturnValue(mockBuild);
        vi.mocked(createRequestHandler).mockReturnValue(vi.fn() as any);
        vi.mocked(existsSync).mockReturnValue(false);
        vi.mocked(importTypescript).mockResolvedValue({});

        // Reset process.env
        delete process.env.BUNDLE_ID;
    });

    describe('createServer', () => {
        describe('validation', () => {
            it('should throw error when development mode is missing vite instance', async () => {
                const options: ServerOptions = {
                    mode: 'development',
                    projectDirectory: '/test/project',
                };

                await expect(() => createServer(options)).rejects.toThrow(
                    'Vite dev server instance is required for development mode'
                );
            });

            it('should throw error when preview mode is missing build', async () => {
                const options: ServerOptions = {
                    mode: 'preview',
                    projectDirectory: '/test/project',
                };

                await expect(() => createServer(options)).rejects.toThrow(
                    'React Router server build is required for preview/production mode'
                );
            });

            it('should throw error when production mode is missing build', async () => {
                const options: ServerOptions = {
                    mode: 'production',
                    projectDirectory: '/test/project',
                };

                await expect(() => createServer(options)).rejects.toThrow(
                    'React Router server build is required for preview/production mode'
                );
            });
        });

        describe('development mode', () => {
            it('should create server with all default development features', async () => {
                const mockVite = {
                    middlewares: vi.fn(),
                    environments: {},
                } as unknown as ViteDevServer;

                const options: ServerOptions = {
                    mode: 'development',
                    projectDirectory: '/test/project',
                    vite: mockVite,
                };

                const app = await createServer(options);

                expect(app).toBe(mockExpressApp);
                expect(mockExpressApp.disable).toHaveBeenCalledWith('x-powered-by');
                expect(mockExpressApp.use).toHaveBeenCalledWith(mockVite.middlewares);
                expect(vi.mocked(loadConfigFromEnv)).toHaveBeenCalled();
            });

            it('should use provided config instead of loading from env', async () => {
                const mockVite = {
                    middlewares: vi.fn(),
                    environments: {},
                } as unknown as ViteDevServer;

                const customConfig: ServerConfig = {
                    commerce: {
                        api: {
                            shortCode: 'custom-short-code',
                            organizationId: 'custom-org-id',
                            clientId: 'custom-client-id',
                            siteId: 'custom-site-id',
                            proxy: '/custom/api',
                        },
                    },
                };

                const options: ServerOptions = {
                    mode: 'development',
                    projectDirectory: '/test/project',
                    vite: mockVite,
                    config: customConfig,
                };

                await createServer(options);

                expect(vi.mocked(loadConfigFromEnv)).not.toHaveBeenCalled();
                expect(vi.mocked(createCommerceProxyMiddleware)).toHaveBeenCalledWith(customConfig);
            });

            it('should apply logging middleware when enableLogging is true', async () => {
                const mockVite = {
                    middlewares: vi.fn(),
                    environments: {},
                } as unknown as ViteDevServer;

                const mockLoggingMiddleware = vi.fn() as any;
                vi.mocked(createLoggingMiddleware).mockReturnValue(mockLoggingMiddleware);

                const options: ServerOptions = {
                    mode: 'development',
                    projectDirectory: '/test/project',
                    vite: mockVite,
                    enableLogging: true,
                };

                await createServer(options);

                expect(vi.mocked(createLoggingMiddleware)).toHaveBeenCalled();
                expect(mockExpressApp.use).toHaveBeenCalledWith(mockLoggingMiddleware);
            });

            it('should not apply logging middleware when enableLogging is false', async () => {
                const mockVite = {
                    middlewares: vi.fn(),
                    environments: {},
                } as unknown as ViteDevServer;

                const options: ServerOptions = {
                    mode: 'development',
                    projectDirectory: '/test/project',
                    vite: mockVite,
                    enableLogging: false,
                };

                await createServer(options);

                expect(vi.mocked(createLoggingMiddleware)).not.toHaveBeenCalled();
            });

            it('should apply compression middleware when enableCompression is true', async () => {
                const mockVite = {
                    middlewares: vi.fn(),
                    environments: {},
                } as unknown as ViteDevServer;

                const mockCompressionMiddleware = vi.fn() as any;
                vi.mocked(createCompressionMiddleware).mockReturnValue(mockCompressionMiddleware);

                const options: ServerOptions = {
                    mode: 'development',
                    projectDirectory: '/test/project',
                    vite: mockVite,
                    enableCompression: true,
                };

                await createServer(options);

                expect(vi.mocked(createCompressionMiddleware)).toHaveBeenCalled();
                expect(mockExpressApp.use).toHaveBeenCalledWith(mockCompressionMiddleware);
            });

            it('should apply proxy middleware when enableProxy is true', async () => {
                const mockVite = {
                    middlewares: vi.fn(),
                    environments: {},
                } as unknown as ViteDevServer;

                const mockProxyMiddleware = vi.fn() as any;
                vi.mocked(createCommerceProxyMiddleware).mockReturnValue(mockProxyMiddleware);

                const options: ServerOptions = {
                    mode: 'development',
                    projectDirectory: '/test/project',
                    vite: mockVite,
                    enableProxy: true,
                };

                await createServer(options);

                expect(vi.mocked(createCommerceProxyMiddleware)).toHaveBeenCalledWith(mockConfig);
                expect(mockExpressApp.use).toHaveBeenCalledWith('/api/commerce', mockProxyMiddleware);
            });

            it('should load and apply custom middlewares from middleware-registry.ts if it exists', async () => {
                const mockVite = {
                    middlewares: vi.fn(),
                    environments: {},
                } as unknown as ViteDevServer;

                const mockCustomMiddleware = vi.fn();
                const mockRegistry = {
                    customMiddlewares: [mockCustomMiddleware],
                };

                // Mock existsSync to return true
                vi.mocked(existsSync).mockReturnValue(true);

                // Mock importTypescript to return the registry
                vi.mocked(importTypescript).mockResolvedValue(mockRegistry);

                const options: ServerOptions = {
                    mode: 'development',
                    projectDirectory: '/test/project',
                    vite: mockVite,
                };

                await createServer(options);

                expect(vi.mocked(existsSync)).toHaveBeenCalledWith(expect.stringContaining('middleware-registry.ts'));
                expect(vi.mocked(importTypescript)).toHaveBeenCalledWith(
                    expect.stringContaining('middleware-registry.ts'),
                    expect.objectContaining({ projectDirectory: '/test/project' })
                );
                expect(mockExpressApp.use).toHaveBeenCalledWith(mockCustomMiddleware);
            });
        });

        describe('serve mode', () => {
            it('should create server with all default preview features', async () => {
                const options: ServerOptions = {
                    mode: 'preview',
                    projectDirectory: '/test/project',
                    build: mockBuild,
                };

                const app = await createServer(options);

                expect(app).toBe(mockExpressApp);
                expect(mockExpressApp.disable).toHaveBeenCalledWith('x-powered-by');
                expect(vi.mocked(createLoggingMiddleware)).toHaveBeenCalled();
                expect(vi.mocked(createCompressionMiddleware)).toHaveBeenCalled();
                expect(vi.mocked(createStaticMiddleware)).toHaveBeenCalledWith('local', '/test/project');
                expect(vi.mocked(createCommerceProxyMiddleware)).toHaveBeenCalledWith(mockConfig);
            });

            it('should use BUNDLE_ID from environment', async () => {
                process.env.BUNDLE_ID = 'test-bundle-123';

                const options: ServerOptions = {
                    mode: 'preview',
                    projectDirectory: '/test/project',
                    build: mockBuild,
                };

                await createServer(options);

                expect(vi.mocked(getBundlePath)).toHaveBeenCalledWith('test-bundle-123');
                expect(vi.mocked(createStaticMiddleware)).toHaveBeenCalledWith('test-bundle-123', '/test/project');
            });

            it('should default to process.cwd() when projectDirectory is not provided', async () => {
                const options: ServerOptions = {
                    mode: 'preview',
                    build: mockBuild,
                };

                await createServer(options);

                expect(vi.mocked(createStaticMiddleware)).toHaveBeenCalledWith('local', process.cwd());
            });

            it('should not apply static middleware when enableStaticServing is false', async () => {
                const options: ServerOptions = {
                    mode: 'preview',
                    projectDirectory: '/test/project',
                    build: mockBuild,
                    enableStaticServing: false,
                };

                await createServer(options);

                expect(vi.mocked(createStaticMiddleware)).not.toHaveBeenCalled();
            });

            it('should apply asset url patching when enableAssetUrlPatching is true', async () => {
                const patchedBuild = { ...mockBuild };
                vi.mocked(patchReactRouterBuild).mockReturnValue(patchedBuild);

                const options: ServerOptions = {
                    mode: 'preview',
                    projectDirectory: '/test/project',
                    build: mockBuild,
                    enableAssetUrlPatching: true,
                };

                await createServer(options);

                expect(vi.mocked(patchReactRouterBuild)).toHaveBeenCalledWith(mockBuild, 'local');
                expect(vi.mocked(createRequestHandler)).toHaveBeenCalledWith({
                    build: patchedBuild,
                    mode: process.env.NODE_ENV,
                });
            });
        });

        describe('production mode', () => {
            it('should create server with minimal production features', async () => {
                const options: ServerOptions = {
                    mode: 'production',
                    projectDirectory: '/test/project',
                    build: mockBuild,
                };

                const app = await createServer(options);

                expect(app).toBe(mockExpressApp);
                expect(mockExpressApp.disable).toHaveBeenCalledWith('x-powered-by');
                // Production mode has compression and logging enabled by default, but not static serving or proxy
                expect(vi.mocked(createLoggingMiddleware)).toHaveBeenCalled();
                expect(vi.mocked(createCompressionMiddleware)).toHaveBeenCalled();
                expect(vi.mocked(createStaticMiddleware)).not.toHaveBeenCalled();
                // Proxy is disabled in production mode by default
                expect(vi.mocked(createCommerceProxyMiddleware)).not.toHaveBeenCalled();
            });

            it('should respect explicit feature overrides in production mode', async () => {
                const mockLoggingMiddleware = vi.fn() as any;
                vi.mocked(createLoggingMiddleware).mockReturnValue(mockLoggingMiddleware);

                const options: ServerOptions = {
                    mode: 'production',
                    projectDirectory: '/test/project',
                    build: mockBuild,
                    enableLogging: true,
                    enableCompression: true,
                };

                await createServer(options);

                expect(vi.mocked(createLoggingMiddleware)).toHaveBeenCalled();
                expect(vi.mocked(createCompressionMiddleware)).toHaveBeenCalled();
            });
        });

        describe('SSR handler', () => {
            it('should create SSR handler for all routes', async () => {
                const mockVite = {
                    middlewares: vi.fn(),
                    environments: {},
                } as unknown as ViteDevServer;

                const options: ServerOptions = {
                    mode: 'development',
                    projectDirectory: '/test/project',
                    vite: mockVite,
                };

                await createServer(options);

                expect(mockExpressApp.all).toHaveBeenCalledWith('*', expect.any(Function));
            });
        });
    });

    describe('createSSRHandler (via integration)', () => {
        describe('development mode handler', () => {
            it('should handle SSR requests in development mode', async () => {
                const mockDevBuild = { ...mockBuild };
                const mockRunner = {
                    import: vi.fn().mockResolvedValue(mockDevBuild),
                };
                const mockSSREnvironment = {
                    runner: mockRunner,
                } as unknown as DevEnvironment;

                const mockVite = {
                    middlewares: vi.fn(),
                    environments: {
                        ssr: mockSSREnvironment,
                    },
                    ssrFixStacktrace: vi.fn(),
                } as unknown as ViteDevServer;

                vi.mocked(isRunnableDevEnvironment).mockReturnValue(true);

                const mockHandler = vi.fn() as any;
                vi.mocked(createRequestHandler).mockReturnValue(mockHandler);

                const options: ServerOptions = {
                    mode: 'development',
                    projectDirectory: '/test/project',
                    vite: mockVite,
                };

                await createServer(options);

                // Get the SSR handler that was registered
                const ssrHandlerCall = mockExpressApp.all.mock.calls.find((call) => call[0] === '*');
                expect(ssrHandlerCall).toBeDefined();
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const ssrHandler = ssrHandlerCall![1];

                // Create mock request, response, next
                const mockReq = {} as Request;
                const mockRes = {} as Response;
                const mockNext = vi.fn() as NextFunction;

                // Execute the handler
                await ssrHandler(mockReq, mockRes, mockNext);

                expect(vi.mocked(isRunnableDevEnvironment)).toHaveBeenCalledWith(mockSSREnvironment);
                expect(mockRunner.import).toHaveBeenCalledWith('virtual:react-router/server-build');
                expect(vi.mocked(createRequestHandler)).toHaveBeenCalledWith({
                    build: mockDevBuild,
                    mode: process.env.NODE_ENV,
                });
                expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
            });

            it('should handle non-runnable SSR environment', async () => {
                const mockSSREnvironment = {} as unknown as DevEnvironment;

                const mockVite = {
                    middlewares: vi.fn(),
                    environments: {
                        ssr: mockSSREnvironment,
                    },
                    ssrFixStacktrace: vi.fn(),
                } as unknown as ViteDevServer;

                vi.mocked(isRunnableDevEnvironment).mockReturnValue(false);

                const options: ServerOptions = {
                    mode: 'development',
                    projectDirectory: '/test/project',
                    vite: mockVite,
                };

                await createServer(options);

                // Get the SSR handler
                const ssrHandlerCall = mockExpressApp.all.mock.calls.find((call) => call[0] === '*');
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const ssrHandler = ssrHandlerCall![1];

                const mockReq = {} as Request;
                const mockRes = {} as Response;
                const mockNext = vi.fn() as NextFunction;

                await ssrHandler(mockReq, mockRes, mockNext);

                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: expect.stringContaining('SSR environment is not runnable'),
                    })
                );
            });

            it('should handle SSR errors with Vite error overlay', async () => {
                const mockError = new Error('SSR Error');
                const mockRunner = {
                    import: vi.fn().mockRejectedValue(mockError),
                };
                const mockSSREnvironment = {
                    runner: mockRunner,
                } as unknown as DevEnvironment;

                const mockVite = {
                    middlewares: vi.fn(),
                    environments: {
                        ssr: mockSSREnvironment,
                    },
                    ssrFixStacktrace: vi.fn(),
                } as unknown as ViteDevServer;

                vi.mocked(isRunnableDevEnvironment).mockReturnValue(true);

                const options: ServerOptions = {
                    mode: 'development',
                    projectDirectory: '/test/project',
                    vite: mockVite,
                };

                await createServer(options);

                const ssrHandlerCall = mockExpressApp.all.mock.calls.find((call) => call[0] === '*');
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const ssrHandler = ssrHandlerCall![1];

                const mockReq = {} as Request;
                const mockRes = {} as Response;
                const mockNext = vi.fn() as NextFunction;

                await ssrHandler(mockReq, mockRes, mockNext);

                // eslint-disable-next-line @typescript-eslint/unbound-method
                expect(mockVite.ssrFixStacktrace).toHaveBeenCalledWith(mockError);
                expect(mockNext).toHaveBeenCalledWith(mockError);
            });
        });

        describe('serve/production mode handler', () => {
            it('should create request handler with build in preview mode', async () => {
                const mockHandler = vi.fn() as any;
                vi.mocked(createRequestHandler).mockReturnValue(mockHandler);

                const options: ServerOptions = {
                    mode: 'preview',
                    projectDirectory: '/test/project',
                    build: mockBuild,
                };

                await createServer(options);

                expect(vi.mocked(createRequestHandler)).toHaveBeenCalledWith({
                    build: mockBuild,
                    mode: process.env.NODE_ENV,
                });

                const ssrHandlerCall = mockExpressApp.all.mock.calls.find((call) => call[0] === '*');
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                expect(ssrHandlerCall![1]).toBe(mockHandler);
            });

            it('should create request handler with build in production mode', async () => {
                const mockHandler = vi.fn() as any;
                vi.mocked(createRequestHandler).mockReturnValue(mockHandler);

                const options: ServerOptions = {
                    mode: 'production',
                    projectDirectory: '/test/project',
                    build: mockBuild,
                };

                await createServer(options);

                expect(vi.mocked(createRequestHandler)).toHaveBeenCalledWith({
                    build: mockBuild,
                    mode: process.env.NODE_ENV,
                });

                const ssrHandlerCall = mockExpressApp.all.mock.calls.find((call) => call[0] === '*');
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                expect(ssrHandlerCall![1]).toBe(mockHandler);
            });

            it('should use patched build when enableAssetUrlPatching is true', async () => {
                const patchedBuild = { ...mockBuild, patched: true };
                vi.mocked(patchReactRouterBuild).mockReturnValue(patchedBuild);

                const options: ServerOptions = {
                    mode: 'preview',
                    projectDirectory: '/test/project',
                    build: mockBuild,
                    enableAssetUrlPatching: true,
                };

                await createServer(options);

                expect(vi.mocked(patchReactRouterBuild)).toHaveBeenCalledWith(mockBuild, 'local');
                expect(vi.mocked(createRequestHandler)).toHaveBeenCalledWith({
                    build: patchedBuild,
                    mode: process.env.NODE_ENV,
                });
            });

            it('should use original build when enableAssetUrlPatching is false', async () => {
                const options: ServerOptions = {
                    mode: 'preview',
                    projectDirectory: '/test/project',
                    build: mockBuild,
                    enableAssetUrlPatching: false,
                };

                await createServer(options);

                expect(vi.mocked(patchReactRouterBuild)).not.toHaveBeenCalled();
                expect(vi.mocked(createRequestHandler)).toHaveBeenCalledWith({
                    build: mockBuild,
                    mode: process.env.NODE_ENV,
                });
            });
        });
    });
});
