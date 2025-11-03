import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ServerBuild } from 'react-router';

// Mock the dependencies before importing
vi.mock('@react-router/express', () => ({
    createRequestHandler: vi.fn(() => vi.fn()),
}));

const mockDisable = vi.fn();
const mockUse = vi.fn();
const mockApp = {
    disable: mockDisable,
    use: mockUse,
};

vi.mock('express', () => {
    const express = vi.fn(() => mockApp);
    return { default: express };
});

describe('server', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create an Express server', async () => {
        const { createServer } = await import('./server');
        const express = (await import('express')).default;

        const mockBuild = {} as ServerBuild;
        const server = createServer(mockBuild);

        expect(express).toHaveBeenCalledOnce();
        expect(server).toBeDefined();
    });

    it('should disable x-powered-by header', async () => {
        const { createServer } = await import('./server');
        const mockBuild = {} as ServerBuild;
        createServer(mockBuild);

        expect(mockDisable).toHaveBeenCalledWith('x-powered-by');
    });

    it('should use createRequestHandler middleware', async () => {
        const { createServer } = await import('./server');
        const reactRouterExpress = await import('@react-router/express');

        const mockBuild = {} as ServerBuild;
        createServer(mockBuild);

        expect(reactRouterExpress.createRequestHandler).toHaveBeenCalledWith({
            build: mockBuild,
            mode: expect.any(String),
        });
        expect(mockUse).toHaveBeenCalled();
    });

    it('should pass the correct build to createRequestHandler', async () => {
        const { createServer } = await import('./server');
        const reactRouterExpress = await import('@react-router/express');

        const mockBuild = { test: 'build' } as unknown as ServerBuild;
        createServer(mockBuild);

        expect(reactRouterExpress.createRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({
                build: mockBuild,
            })
        );
    });

    it('should use production mode when NODE_ENV is production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        // Need to reimport to get the updated env
        vi.resetModules();
        const { createServer } = await import('./server');
        const reactRouterExpress = await import('@react-router/express');

        const mockBuild = {} as ServerBuild;
        createServer(mockBuild);

        expect(reactRouterExpress.createRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: 'production',
            })
        );

        process.env.NODE_ENV = originalEnv;
    });

    it('should default to production mode when NODE_ENV is undefined', async () => {
        const originalEnv = process.env.NODE_ENV;
        delete process.env.NODE_ENV;

        // Need to reimport to get the updated env
        vi.resetModules();
        const { createServer } = await import('./server');
        const reactRouterExpress = await import('@react-router/express');

        const mockBuild = {} as ServerBuild;
        createServer(mockBuild);

        expect(reactRouterExpress.createRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({
                mode: 'production',
            })
        );

        process.env.NODE_ENV = originalEnv;
    });
});
