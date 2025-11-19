/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Express } from 'express';
import type { ViteDevServer } from 'vite';
import type { ServerConfig } from '../server/config';

// Mock dependencies
const mockViteServer = {
    middlewares: vi.fn(),
    close: vi.fn(() => Promise.resolve()),
} as unknown as ViteDevServer;

const mockCreateViteServer = vi.fn(() => Promise.resolve(mockViteServer));

vi.mock('vite', () => ({
    createServer: mockCreateViteServer,
}));

const mockApp = {
    listen: vi.fn((port: number, callback?: () => void) => {
        if (callback) callback();
        return {
            close: vi.fn((cb?: () => void) => {
                if (cb) cb();
            }),
        };
    }),
} as unknown as Express;

const mockCreateServer = vi.fn(() => mockApp);

vi.mock('../server/index', () => ({
    createServer: mockCreateServer,
}));

const mockConfig: ServerConfig = {
    commerce: {
        api: {
            shortCode: 'test-short-code',
            organizationId: 'test-org-id',
            clientId: 'test-client-id',
            siteId: 'test-site-id',
            proxy: '/mobify/proxy/api',
        },
    },
};

const mockLoadProjectConfig = vi.fn(() => Promise.resolve(mockConfig));

vi.mock('../server/config', () => ({
    loadProjectConfig: mockLoadProjectConfig,
}));

const mockGetCommerceCloudApiUrl = vi.fn(() => 'https://test-short-code.api.commercecloud.salesforce.com');

vi.mock('../utils/paths', () => ({
    getCommerceCloudApiUrl: mockGetCommerceCloudApiUrl,
}));

const mockPrintServerInfo = vi.fn();
const mockPrintServerConfig = vi.fn();
const mockPrintShutdownMessage = vi.fn();

vi.mock('../utils/logger', () => ({
    printServerInfo: mockPrintServerInfo,
    printServerConfig: mockPrintServerConfig,
    printShutdownMessage: mockPrintShutdownMessage,
}));

const mockLoadEnvFile = vi.fn();

vi.mock('../utils', () => ({
    loadEnvFile: mockLoadEnvFile,
}));

describe('dev command', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.NODE_ENV;
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    describe('dev', () => {
        it('should start the development server with default options', async () => {
            const { dev } = await import('./dev');

            await dev();

            // Verify Vite server was created
            expect(mockCreateViteServer).toHaveBeenCalledWith({
                root: expect.any(String),
                server: {
                    middlewareMode: true,
                },
            });

            // Verify loadEnvFile was called
            expect(mockLoadEnvFile).toHaveBeenCalledWith(expect.any(String));

            // Verify loadProjectConfig was called
            expect(mockLoadProjectConfig).toHaveBeenCalledWith(expect.any(String));

            // Verify createServer was called with correct options
            expect(mockCreateServer).toHaveBeenCalledWith({
                mode: 'development',
                projectDirectory: expect.any(String),
                config: mockConfig,
                port: 5173,
                vite: mockViteServer,
            });

            // Verify server.listen was called
            expect(mockApp.listen).toHaveBeenCalledWith(5173, expect.anything());

            // Verify printServerInfo was called
            expect(mockPrintServerInfo).toHaveBeenCalledWith(
                'development',
                5173,
                expect.any(Number),
                expect.any(String)
            );

            // Verify printServerConfig was called
            expect(mockPrintServerConfig).toHaveBeenCalledWith({
                mode: 'development',
                port: 5173,
                enableProxy: true,
                enableStaticServing: false,
                enableCompression: false,
                proxyPath: '/mobify/proxy/api',
                proxyTarget: 'https://test-short-code.api.commercecloud.salesforce.com',
                shortCode: 'test-short-code',
                organizationId: 'test-org-id',
                clientId: 'test-client-id',
                siteId: 'test-site-id',
            });
        });

        it('should start the development server with custom port', async () => {
            const { dev } = await import('./dev');

            await dev({ port: 3000 });

            // Verify createServer was called with custom port
            expect(mockCreateServer).toHaveBeenCalledWith({
                mode: 'development',
                projectDirectory: expect.any(String),
                config: mockConfig,
                port: 3000,
                vite: mockViteServer,
            });

            // Verify server.listen was called with custom port
            expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.anything());
        });

        it('should start the development server with custom project directory', async () => {
            const { dev } = await import('./dev');

            const customDir = '/custom/project/dir';
            await dev({ projectDirectory: customDir });

            // Verify Vite server was created with custom directory
            expect(mockCreateViteServer).toHaveBeenCalledWith({
                root: customDir,
                server: {
                    middlewareMode: true,
                },
            });

            // Verify loadEnvFile was called with custom directory
            expect(mockLoadEnvFile).toHaveBeenCalledWith(customDir);

            // Verify loadProjectConfig was called with custom directory
            expect(mockLoadProjectConfig).toHaveBeenCalledWith(customDir);

            // Verify createServer was called with custom directory
            expect(mockCreateServer).toHaveBeenCalledWith({
                mode: 'development',
                projectDirectory: customDir,
                config: mockConfig,
                port: 5173,
                vite: mockViteServer,
            });
        });

        it('should set NODE_ENV to development if not already set', async () => {
            const { dev } = await import('./dev');

            delete process.env.NODE_ENV;
            await dev();

            expect(process.env.NODE_ENV).toBe('development');
        });

        it('should not override existing NODE_ENV', async () => {
            const { dev } = await import('./dev');

            process.env.NODE_ENV = 'production';
            await dev();

            expect(process.env.NODE_ENV).toBe('production');
        });

        it('should handle SIGTERM signal for graceful shutdown', async () => {
            const { dev } = await import('./dev');

            const mockServerClose = vi.fn((cb) => cb());
            const mockListen = vi.fn((port: number, callback?: () => void) => {
                if (callback) callback();
                return { close: mockServerClose };
            });

            const mockAppWithClose = {
                listen: mockListen,
            } as unknown as Express;

            mockCreateServer.mockReturnValueOnce(mockAppWithClose);

            const processOnce = vi.spyOn(process, 'once');
            const processExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

            await dev();

            // Get the SIGTERM handler
            const sigtermCall = processOnce.mock.calls.find((call) => call[0] === 'SIGTERM');
            const sigtermHandler = sigtermCall?.[1];
            expect(sigtermHandler).toBeDefined();

            // Call the handler
            if (sigtermHandler && typeof sigtermHandler === 'function') {
                sigtermHandler();
            }

            // Verify printShutdownMessage was called
            expect(mockPrintShutdownMessage).toHaveBeenCalled();

            // Verify server.close was called
            expect(mockServerClose).toHaveBeenCalled();

            // Verify vite.close was called
            const viteClose = mockViteServer.close as ReturnType<typeof vi.fn>;
            expect(viteClose).toHaveBeenCalled();

            // Verify process.exit was called
            expect(processExit).toHaveBeenCalledWith(0);
        });

        it('should handle SIGINT signal for graceful shutdown', async () => {
            const { dev } = await import('./dev');

            const mockServerClose = vi.fn((cb) => cb());
            const mockListen = vi.fn((port: number, callback?: () => void) => {
                if (callback) callback();
                return { close: mockServerClose };
            });

            const mockAppWithClose = {
                listen: mockListen,
            } as unknown as Express;

            mockCreateServer.mockReturnValueOnce(mockAppWithClose);

            const processOnce = vi.spyOn(process, 'once');
            const processExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

            await dev();

            // Get the SIGINT handler
            const sigintCall = processOnce.mock.calls.find((call) => call[0] === 'SIGINT');
            const sigintHandler = sigintCall?.[1];
            expect(sigintHandler).toBeDefined();

            // Call the handler
            if (sigintHandler && typeof sigintHandler === 'function') {
                sigintHandler();
            }

            // Verify printShutdownMessage was called
            expect(mockPrintShutdownMessage).toHaveBeenCalled();

            // Verify server.close was called
            expect(mockServerClose).toHaveBeenCalled();

            // Verify vite.close was called
            const viteClose = mockViteServer.close as ReturnType<typeof vi.fn>;
            expect(viteClose).toHaveBeenCalled();

            // Verify process.exit was called
            expect(processExit).toHaveBeenCalledWith(0);
        });

        it('should use default project directory when not provided', async () => {
            const { dev } = await import('./dev');

            const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/mock/cwd');

            await dev({});

            // Verify loadProjectConfig was called with current working directory
            expect(mockLoadProjectConfig).toHaveBeenCalledWith('/mock/cwd');

            cwdSpy.mockRestore();
        });

        it('should load env file before loading config', async () => {
            const { dev } = await import('./dev');

            const callOrder: string[] = [];

            mockLoadEnvFile.mockImplementation(() => {
                callOrder.push('loadEnvFile');
            });

            mockLoadProjectConfig.mockImplementation(() => {
                callOrder.push('loadProjectConfig');
                return Promise.resolve(mockConfig);
            });

            await dev();

            expect(callOrder).toEqual(['loadEnvFile', 'loadProjectConfig']);
        });
    });
});
