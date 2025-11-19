/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Express } from 'express';
import type { ServerBuild } from 'react-router';
import type { ServerConfig } from '../server/config';
import path from 'path';

// Mock dependencies
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
const mockInfo = vi.fn();
const mockWarn = vi.fn();
const mockError = vi.fn();

vi.mock('../utils/logger', () => ({
    printServerInfo: mockPrintServerInfo,
    printServerConfig: mockPrintServerConfig,
    printShutdownMessage: mockPrintShutdownMessage,
    info: mockInfo,
    warn: mockWarn,
    error: mockError,
}));

const mockLoadEnvFile = vi.fn();

vi.mock('../utils', () => ({
    loadEnvFile: mockLoadEnvFile,
}));

const mockExistsSync = vi.fn();
const mockExecSync = vi.fn();

vi.mock('fs', () => ({
    default: {
        existsSync: mockExistsSync,
    },
    existsSync: mockExistsSync,
}));

vi.mock('child_process', () => ({
    execSync: mockExecSync,
}));

const mockBuild: ServerBuild = {
    routes: {},
    entry: {
        module: {},
    },
} as unknown as ServerBuild;

vi.mock('url', async () => {
    const actual = await vi.importActual('url');
    return {
        ...actual,
        pathToFileURL: vi.fn((_filePath: string) => {
            return {
                href: 'mock://build-path',
            };
        }),
    };
});

// Mock the dynamic import that loads the production build
vi.mock('mock://build-path', () => ({
    default: mockBuild,
}));

describe('serve command', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.NODE_ENV;
        delete process.env.EXTERNAL_DOMAIN_NAME;
        mockExistsSync.mockReturnValue(true);
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
        // Remove all signal listeners to avoid MaxListenersExceededWarning
        process.removeAllListeners('SIGTERM');
        process.removeAllListeners('SIGINT');
    });

    describe('serve', () => {
        it('should start the production server with default options', async () => {
            const { serve } = await import('./serve');

            await serve();

            // Verify loadEnvFile was called
            expect(mockLoadEnvFile).toHaveBeenCalledWith(expect.any(String));

            // Verify loadProjectConfig was called
            expect(mockLoadProjectConfig).toHaveBeenCalledWith(expect.any(String));

            // Verify build exists check
            expect(mockExistsSync).toHaveBeenCalledWith(
                expect.stringContaining(path.join('build', 'server', 'index.js'))
            );

            // Verify createServer was called with correct options
            expect(mockCreateServer).toHaveBeenCalledWith({
                mode: 'serve',
                projectDirectory: expect.any(String),
                config: mockConfig,
                port: 3000,
                build: mockBuild,
            });

            // Verify server.listen was called
            expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.anything());

            // Verify printServerInfo was called
            expect(mockPrintServerInfo).toHaveBeenCalledWith('serve', 3000, expect.any(Number), expect.any(String));

            // Verify printServerConfig was called
            expect(mockPrintServerConfig).toHaveBeenCalledWith({
                mode: 'serve',
                port: 3000,
                enableProxy: true,
                enableStaticServing: true,
                enableCompression: true,
                proxyPath: '/mobify/proxy/api',
                proxyTarget: 'https://test-short-code.api.commercecloud.salesforce.com',
                shortCode: 'test-short-code',
                organizationId: 'test-org-id',
                clientId: 'test-client-id',
                siteId: 'test-site-id',
            });
        });

        it('should start the production server with custom port', async () => {
            const { serve } = await import('./serve');

            await serve({ port: 8080 });

            // Verify createServer was called with custom port
            expect(mockCreateServer).toHaveBeenCalledWith({
                mode: 'serve',
                projectDirectory: expect.any(String),
                config: mockConfig,
                port: 8080,
                build: mockBuild,
            });

            // Verify server.listen was called with custom port
            expect(mockApp.listen).toHaveBeenCalledWith(8080, expect.anything());

            // Verify EXTERNAL_DOMAIN_NAME includes custom port
            expect(process.env.EXTERNAL_DOMAIN_NAME).toBe('localhost:8080');
        });

        it('should start the production server with custom project directory', async () => {
            const { serve } = await import('./serve');

            const customDir = '/custom/project/dir';
            await serve({ projectDirectory: customDir });

            // Verify loadEnvFile was called with custom directory
            expect(mockLoadEnvFile).toHaveBeenCalledWith(customDir);

            // Verify loadProjectConfig was called with custom directory
            expect(mockLoadProjectConfig).toHaveBeenCalledWith(customDir);

            // Verify createServer was called with custom directory
            expect(mockCreateServer).toHaveBeenCalledWith({
                mode: 'serve',
                projectDirectory: customDir,
                config: mockConfig,
                port: 3000,
                build: mockBuild,
            });

            // Verify build path check uses custom directory
            expect(mockExistsSync).toHaveBeenCalledWith(path.join(customDir, 'build', 'server', 'index.js'));
        });

        it('should set NODE_ENV to production if not already set', async () => {
            const { serve } = await import('./serve');

            delete process.env.NODE_ENV;
            await serve();

            expect(process.env.NODE_ENV).toBe('production');
        });

        it('should not override existing NODE_ENV', async () => {
            const { serve } = await import('./serve');

            process.env.NODE_ENV = 'development';
            await serve();

            expect(process.env.NODE_ENV).toBe('development');
        });

        it('should set EXTERNAL_DOMAIN_NAME if not already set', async () => {
            const { serve } = await import('./serve');

            delete process.env.EXTERNAL_DOMAIN_NAME;
            await serve({ port: 4000 });

            expect(process.env.EXTERNAL_DOMAIN_NAME).toBe('localhost:4000');
        });

        it('should not override existing EXTERNAL_DOMAIN_NAME', async () => {
            const { serve } = await import('./serve');

            process.env.EXTERNAL_DOMAIN_NAME = 'custom-domain.com';
            await serve();

            expect(process.env.EXTERNAL_DOMAIN_NAME).toBe('custom-domain.com');
        });

        it('should build project if build does not exist', async () => {
            const { serve } = await import('./serve');

            mockExistsSync
                .mockReturnValueOnce(false) // First check: build doesn't exist
                .mockReturnValueOnce(true); // Second check: build exists after running build

            await serve();

            // Verify warning was logged
            expect(mockWarn).toHaveBeenCalledWith('Production build not found. Building project...');
            expect(mockInfo).toHaveBeenCalledWith('Running: pnpm build');

            // Verify execSync was called to build
            expect(mockExecSync).toHaveBeenCalledWith('pnpm build', {
                cwd: expect.any(String),
                stdio: 'inherit',
            });

            // Verify success message
            expect(mockInfo).toHaveBeenCalledWith('Build completed successfully');
        });

        it('should exit with error if build command fails', async () => {
            const { serve } = await import('./serve');

            mockExistsSync.mockReturnValue(false);
            mockExecSync.mockImplementation(() => {
                throw new Error('Build failed');
            });

            const processExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

            await serve();

            // Verify error was logged
            expect(mockError).toHaveBeenCalledWith('Build failed: Build failed');

            // Verify process.exit was called
            expect(processExit).toHaveBeenCalledWith(1);
        });

        it('should exit with error if build still does not exist after running build command', async () => {
            const { serve } = await import('./serve');

            mockExistsSync.mockReturnValue(false); // Build never exists
            mockExecSync.mockReturnValue(Buffer.from(''));

            const processExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

            await serve();

            // Verify error was logged
            expect(mockError).toHaveBeenCalledWith(expect.stringContaining('Build still not found at'));

            // Verify process.exit was called
            expect(processExit).toHaveBeenCalledWith(1);
        });

        it('should handle SIGTERM signal for graceful shutdown', async () => {
            const { serve } = await import('./serve');

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

            await serve();

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

            // Verify process.exit was called
            expect(processExit).toHaveBeenCalledWith(0);
        });

        it('should handle SIGINT signal for graceful shutdown', async () => {
            const { serve } = await import('./serve');

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

            await serve();

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

            // Verify process.exit was called
            expect(processExit).toHaveBeenCalledWith(0);
        });

        it('should use default project directory when not provided', async () => {
            const { serve } = await import('./serve');

            const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/mock/cwd');

            await serve({});

            // Verify loadProjectConfig was called with current working directory
            expect(mockLoadProjectConfig).toHaveBeenCalledWith('/mock/cwd');

            cwdSpy.mockRestore();
        });

        it('should load env file before loading config', async () => {
            const { serve } = await import('./serve');

            const callOrder: string[] = [];

            mockLoadEnvFile.mockImplementation(() => {
                callOrder.push('loadEnvFile');
            });

            mockLoadProjectConfig.mockImplementation(() => {
                callOrder.push('loadProjectConfig');
                return Promise.resolve(mockConfig);
            });

            await serve();

            expect(callOrder).toEqual(['loadEnvFile', 'loadProjectConfig']);
        });

        it('should log info message about loading production build', async () => {
            const { serve } = await import('./serve');

            const projectDir = '/test/project';
            await serve({ projectDirectory: projectDir });

            // Verify info message about loading build
            expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining('Loading production build from'));
        });

        it('should handle non-Error exceptions during build', async () => {
            const { serve } = await import('./serve');

            mockExistsSync.mockReturnValue(false);
            mockExecSync.mockImplementation(() => {
                // eslint-disable-next-line @typescript-eslint/only-throw-error
                throw 'String error';
            });

            const processExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

            await serve();

            // Verify error was logged with string conversion
            expect(mockError).toHaveBeenCalledWith('Build failed: String error');

            // Verify process.exit was called
            expect(processExit).toHaveBeenCalledWith(1);
        });
    });
});
