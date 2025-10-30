import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ServerBuild } from 'react-router';

// Mock aws-serverless-express
const mockProxy = vi.fn();
const mockCreateServer = vi.fn(() => ({ mockServer: true }));
vi.mock('aws-serverless-express', () => ({
    default: {
        createServer: mockCreateServer,
        proxy: mockProxy,
    },
}));

// Mock the server module
const mockCreateServerFn = vi.fn((build: ServerBuild) => ({
    mockApp: true,
    build,
}));
vi.mock('../server', () => ({
    createServer: mockCreateServerFn,
}));

// Mock the react-router server build
const mockBuild = {
    assets: {
        url: '/assets/manifest.json',
        version: '123',
        entry: {
            module: '/assets/entry-abc123.js',
            imports: ['/assets/chunk-def456.js'],
        },
        routes: {
            root: {
                id: 'root',
                path: '',
                file: '/assets/root-ghi789.js',
                module: '/assets/root-ghi789.js',
            },
        },
    },
    publicPath: '/assets/',
} as unknown as ServerBuild;

vi.mock('./server/index.js', () => ({
    default: mockBuild,
}));

describe('ssr', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('module exports', () => {
        it('should export a get handler', async () => {
            const module = await import('./ssr');
            expect(module.get).toBeDefined();
            expect(typeof module.get).toBe('function');
        });
    });

    describe('createLambdaHandler', () => {
        it('should create a lambda handler that returns a function', async () => {
            // Re-import to get fresh module
            vi.resetModules();
            vi.doMock('aws-serverless-express', () => ({
                default: {
                    createServer: mockCreateServer,
                    proxy: mockProxy,
                },
            }));
            vi.doMock('../server', () => ({
                createServer: mockCreateServerFn,
            }));
            vi.doMock('./server/index.js', () => ({
                default: mockBuild,
            }));

            const module = await import('./ssr');

            expect(module.get).toBeDefined();
            expect(typeof module.get).toBe('function');
        });

        it('should call createServer with the patched build', async () => {
            vi.resetModules();
            process.env.BUNDLE_ID = 'test-bundle-123';

            vi.doMock('aws-serverless-express', () => ({
                default: {
                    createServer: mockCreateServer,
                    proxy: mockProxy,
                },
            }));
            vi.doMock('../server', () => ({
                createServer: mockCreateServerFn,
            }));
            vi.doMock('./server/index.js', () => ({
                default: mockBuild,
            }));

            await import('./ssr');

            expect(mockCreateServerFn).toHaveBeenCalledOnce();
            const patchedBuild = mockCreateServerFn.mock.calls[0][0];

            // Verify the build was patched
            expect(patchedBuild.publicPath).toBe('/mobify/bundle/test-bundle-123/client/');
        });

        it('should set callbackWaitsForEmptyEventLoop to false when handler is invoked', async () => {
            vi.resetModules();

            const mockServer = { mockServer: true };
            const localMockCreateServer = vi.fn(() => mockServer);
            const localMockProxy = vi.fn();

            vi.doMock('aws-serverless-express', () => ({
                default: {
                    createServer: localMockCreateServer,
                    proxy: localMockProxy,
                },
            }));
            vi.doMock('../server', () => ({
                createServer: mockCreateServerFn,
            }));
            vi.doMock('./server/index.js', () => ({
                default: mockBuild,
            }));

            const module = await import('./ssr');

            const mockEvent = { test: 'event' };
            const mockContext = { callbackWaitsForEmptyEventLoop: true };
            const mockCallback = vi.fn();

            module.get(mockEvent, mockContext, mockCallback);

            expect(mockContext.callbackWaitsForEmptyEventLoop).toBe(false);
        });

        it('should call proxy with correct arguments', async () => {
            vi.resetModules();

            const mockServer = { mockServer: true };
            const localMockCreateServer = vi.fn(() => mockServer);
            const localMockProxy = vi.fn();

            vi.doMock('aws-serverless-express', () => ({
                default: {
                    createServer: localMockCreateServer,
                    proxy: localMockProxy,
                },
            }));
            vi.doMock('../server', () => ({
                createServer: mockCreateServerFn,
            }));
            vi.doMock('./server/index.js', () => ({
                default: mockBuild,
            }));

            const module = await import('./ssr');

            const mockEvent = { test: 'event' };
            const mockContext = { callbackWaitsForEmptyEventLoop: true };
            const mockCallback = vi.fn();

            module.get(mockEvent, mockContext, mockCallback);

            expect(localMockProxy).toHaveBeenCalledWith(mockServer, mockEvent, mockContext, 'CALLBACK', mockCallback);
        });
    });

    describe('patchReactRouterBuild', () => {
        it('should replace /assets/ paths with bundle path', async () => {
            vi.resetModules();
            process.env.BUNDLE_ID = 'test-bundle-456';

            const testBuild = {
                assets: {
                    url: '/assets/manifest.json',
                    version: '123',
                    entry: {
                        module: '/assets/entry-abc123.js',
                        imports: ['/assets/chunk-def456.js', '/assets/chunk-ghi789.js'],
                    },
                    routes: {
                        root: {
                            id: 'root',
                            path: '',
                            file: '/assets/root-ghi789.js',
                            module: '/assets/root-ghi789.js',
                        },
                    },
                },
                publicPath: '/assets/',
            } as unknown as ServerBuild;

            vi.doMock('aws-serverless-express', () => ({
                default: {
                    createServer: mockCreateServer,
                    proxy: mockProxy,
                },
            }));
            vi.doMock('../server', () => ({
                createServer: mockCreateServerFn,
            }));
            vi.doMock('./server/index.js', () => ({
                default: testBuild,
            }));

            await import('./ssr');

            expect(mockCreateServerFn).toHaveBeenCalledOnce();
            const patchedBuild = mockCreateServerFn.mock.calls[0][0];

            // Check that publicPath is updated
            expect(patchedBuild.publicPath).toBe('/mobify/bundle/test-bundle-456/client/');

            // Check that assets paths are updated
            const assetsString = JSON.stringify(patchedBuild.assets);
            expect(assetsString).not.toContain('"/assets/');
            expect(assetsString).toContain('/mobify/bundle/test-bundle-456/client/assets/');
        });

        it('should handle different BUNDLE_ID values', async () => {
            vi.resetModules();
            process.env.BUNDLE_ID = 'production-bundle-789';

            vi.doMock('aws-serverless-express', () => ({
                default: {
                    createServer: mockCreateServer,
                    proxy: mockProxy,
                },
            }));
            vi.doMock('../server', () => ({
                createServer: mockCreateServerFn,
            }));
            vi.doMock('./server/index.js', () => ({
                default: mockBuild,
            }));

            await import('./ssr');

            expect(mockCreateServerFn).toHaveBeenCalledOnce();
            const patchedBuild = mockCreateServerFn.mock.calls[0][0];

            expect(patchedBuild.publicPath).toBe('/mobify/bundle/production-bundle-789/client/');
            const assetsString = JSON.stringify(patchedBuild.assets);
            expect(assetsString).toContain('/mobify/bundle/production-bundle-789/client/assets/');
        });

        it('should preserve non-asset paths in the build', async () => {
            vi.resetModules();
            process.env.BUNDLE_ID = 'test-bundle';

            const testBuild = {
                assets: {
                    url: '/assets/manifest.json',
                    version: '123',
                    entry: {
                        module: '/assets/entry.js',
                        imports: ['/assets/chunk.js'],
                    },
                    routes: {
                        root: {
                            id: 'root',
                            path: '/home',
                            file: '/assets/root.js',
                            module: '/assets/root.js',
                        },
                    },
                },
                publicPath: '/assets/',
                otherProperty: 'should-be-preserved',
            } as unknown as ServerBuild;

            vi.doMock('aws-serverless-express', () => ({
                default: {
                    createServer: mockCreateServer,
                    proxy: mockProxy,
                },
            }));
            vi.doMock('../server', () => ({
                createServer: mockCreateServerFn,
            }));
            vi.doMock('./server/index.js', () => ({
                default: testBuild,
            }));

            await import('./ssr');

            const patchedBuild = mockCreateServerFn.mock.calls[0][0];

            expect((patchedBuild as any).otherProperty).toBe('should-be-preserved');
            expect(patchedBuild.assets.version).toBe('123');
        });

        it('should create a deep copy of assets to avoid mutation', async () => {
            vi.resetModules();
            process.env.BUNDLE_ID = 'test-bundle';

            const testBuild = {
                assets: {
                    url: '/assets/manifest.json',
                    entry: {
                        module: '/assets/entry.js',
                    },
                },
                publicPath: '/assets/',
            } as unknown as ServerBuild;

            vi.doMock('aws-serverless-express', () => ({
                default: {
                    createServer: mockCreateServer,
                    proxy: mockProxy,
                },
            }));
            vi.doMock('../server', () => ({
                createServer: mockCreateServerFn,
            }));
            vi.doMock('./server/index.js', () => ({
                default: testBuild,
            }));

            await import('./ssr');

            const patchedBuild = mockCreateServerFn.mock.calls[0][0];

            // Verify the patched build has different assets object
            expect(patchedBuild.assets).not.toBe(testBuild.assets);
            expect(patchedBuild.assets.url).toContain('/mobify/bundle/');
        });
    });
});
