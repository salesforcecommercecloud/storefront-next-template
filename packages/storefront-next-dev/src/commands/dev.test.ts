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
/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Express } from 'express';
import type { ViteDevServer } from 'vite';
import type { ServerConfig } from '../server/config';
import { pathsEqual } from '../test-utils';

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
            expect(mockCreateViteServer).toHaveBeenCalled();
            const viteCall = (
                mockCreateViteServer.mock.calls[0] as unknown as [{ root: string; server: { middlewareMode: boolean } }]
            )[0];
            expect(pathsEqual(viteCall.root, customDir)).toBe(true);
            expect(viteCall.server).toEqual({ middlewareMode: true });

            // Verify loadEnvFile was called with custom directory
            expect(mockLoadEnvFile).toHaveBeenCalled();
            const envFileCall = mockLoadEnvFile.mock.calls[0] as unknown as [string];
            expect(pathsEqual(envFileCall[0], customDir)).toBe(true);

            // Verify loadProjectConfig was called with custom directory
            expect(mockLoadProjectConfig).toHaveBeenCalled();
            const configCall = mockLoadProjectConfig.mock.calls[0] as unknown as [string];
            expect(pathsEqual(configCall[0], customDir)).toBe(true);

            // Verify createServer was called with custom directory
            expect(mockCreateServer).toHaveBeenCalled();
            const serverCall = (
                mockCreateServer.mock.calls[0] as unknown as [
                    { mode: string; projectDirectory: string; config: ServerConfig; port: number; vite: ViteDevServer },
                ]
            )[0];
            expect(serverCall.mode).toBe('development');
            expect(pathsEqual(serverCall.projectDirectory, customDir)).toBe(true);
            expect(serverCall.config).toEqual(mockConfig);
            expect(serverCall.port).toBe(5173);
            expect(serverCall.vite).toBe(mockViteServer);
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

        it('should set EXTERNAL_DOMAIN_NAME if not already set', async () => {
            const { dev } = await import('./dev');

            delete process.env.EXTERNAL_DOMAIN_NAME;
            await dev({ port: 4000 });

            expect(process.env.EXTERNAL_DOMAIN_NAME).toBe('localhost:4000');
        });

        it('should not override existing EXTERNAL_DOMAIN_NAME', async () => {
            const { dev } = await import('./dev');

            process.env.EXTERNAL_DOMAIN_NAME = 'custom-domain.com';
            await dev();

            expect(process.env.EXTERNAL_DOMAIN_NAME).toBe('custom-domain.com');
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
            expect(mockLoadProjectConfig).toHaveBeenCalled();
            const firstCall = mockLoadProjectConfig.mock.calls[0] as unknown as [string];
            expect(pathsEqual(firstCall[0], '/mock/cwd')).toBe(true);

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
