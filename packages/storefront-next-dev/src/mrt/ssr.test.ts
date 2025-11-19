import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Express } from 'express';

// Mock aws-serverless-express
const mockProxy = vi.fn();
const mockAwsCreateServer = vi.fn(() => ({ mockServer: true }));
vi.mock('aws-serverless-express', () => ({
    default: {
        createServer: mockAwsCreateServer,
        proxy: mockProxy,
    },
}));

// Mock the server module
const mockApp = { mockApp: true } as unknown as Express;
const mockCreateServerFn = vi.fn(() => mockApp);
vi.mock('../server/index', () => ({
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
} as any;

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
                    createServer: mockAwsCreateServer,
                    proxy: mockProxy,
                },
            }));
            vi.doMock('../server/index', () => ({
                createServer: mockCreateServerFn,
            }));
            vi.doMock('./server/index.js', () => ({
                default: mockBuild,
            }));

            const module = await import('./ssr');

            expect(module.get).toBeDefined();
            expect(typeof module.get).toBe('function');
        });

        it('should call createServer with correct options', async () => {
            vi.resetModules();
            process.env.BUNDLE_ID = 'test-bundle-123';

            const localMockCreateServerFn = vi.fn(() => mockApp);

            vi.doMock('aws-serverless-express', () => ({
                default: {
                    createServer: mockAwsCreateServer,
                    proxy: mockProxy,
                },
            }));
            vi.doMock('../server/index', () => ({
                createServer: localMockCreateServerFn,
            }));
            vi.doMock('./server/index.js', () => ({
                default: mockBuild,
            }));

            await import('./ssr');

            expect(localMockCreateServerFn).toHaveBeenCalledOnce();

            // Verify the options passed to createServer
            const callArgs = (localMockCreateServerFn.mock.calls[0] as any)?.[0];
            expect(callArgs?.mode).toBe('production');
            expect(callArgs?.projectDirectory).toBe(process.cwd());
            expect(callArgs?.build).toBe(mockBuild);
        });

        it('should set callbackWaitsForEmptyEventLoop to false when handler is invoked', async () => {
            vi.resetModules();

            const mockServer = { mockServer: true };
            const localMockAwsCreateServer = vi.fn(() => mockServer);
            const localMockProxy = vi.fn();

            vi.doMock('aws-serverless-express', () => ({
                default: {
                    createServer: localMockAwsCreateServer,
                    proxy: localMockProxy,
                },
            }));
            vi.doMock('../server/index', () => ({
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
            const localMockAwsCreateServer = vi.fn(() => mockServer);
            const localMockProxy = vi.fn();

            vi.doMock('aws-serverless-express', () => ({
                default: {
                    createServer: localMockAwsCreateServer,
                    proxy: localMockProxy,
                },
            }));
            vi.doMock('../server/index', () => ({
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
});
