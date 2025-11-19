import express, { type Express } from 'express';
import { createRequestHandler } from '@react-router/express';
import type { ServerBuild } from 'react-router';
import { isRunnableDevEnvironment, type ViteDevServer } from 'vite';
import { loadConfigFromEnv, type ServerConfig } from './config';
import { createCommerceProxyMiddleware } from './middleware/proxy';
import { createStaticMiddleware } from './middleware/static';
import { createCompressionMiddleware } from './middleware/compression';
import { createLoggingMiddleware } from './middleware/logging';
import { patchReactRouterBuild } from './utils';
import { ServerModeFeatureMap, type ServerMode, type ServerModeFeatures } from './modes';
import { getBundlePath } from '../utils/paths';

export interface ServerOptions extends Partial<ServerModeFeatures> {
    /** Server mode: development (with Vite), serve (preview), or production (minimal) */
    mode: ServerMode;

    /** Project root directory */
    projectDirectory: string;

    /** Server configuration (optional, will load from env vars if not provided) */
    config?: ServerConfig;

    /** Server port (optional, for logging) */
    port?: number;

    /** Vite dev server instance (required for development mode) */
    vite?: ViteDevServer;

    /** React Router server build (required for serve/production modes) */
    build?: ServerBuild;
}

/**
 * Create a unified Express server for development, serve, or production mode
 */
export function createServer(options: ServerOptions): Express {
    const {
        mode,
        projectDirectory,
        config: providedConfig,
        vite,
        build,
        enableProxy = ServerModeFeatureMap[mode].enableProxy,
        enableStaticServing = ServerModeFeatureMap[mode].enableStaticServing,
        enableCompression = ServerModeFeatureMap[mode].enableCompression,
        enableLogging = ServerModeFeatureMap[mode].enableLogging,
        enableAssetUrlPatching = ServerModeFeatureMap[mode].enableAssetUrlPatching,
    } = options;

    if (mode === 'development' && !vite) {
        throw new Error('Vite dev server instance is required for development mode');
    }

    if ((mode === 'serve' || mode === 'production') && !build) {
        throw new Error('React Router server build is required for serve/production mode');
    }

    // Use provided config or load from environment variables
    // TODO: move the config implementation from template-retail-rsc-app to the SDK.
    const config = providedConfig ?? loadConfigFromEnv();

    // Load bundle ID from environment
    const bundleId = process.env.BUNDLE_ID ?? 'local';

    // Create Express app
    const app = express();
    app.disable('x-powered-by');

    // Apply middleware based on mode
    if (enableLogging) {
        app.use(createLoggingMiddleware());
    }

    if (enableCompression) {
        app.use(createCompressionMiddleware());
    }

    if (enableStaticServing && build) {
        const bundlePath = getBundlePath(bundleId);
        app.use(bundlePath, createStaticMiddleware(bundleId, projectDirectory));
    }

    if (mode === 'development' && vite) {
        // In development, Vite middleware handles HMR, transforms, and proxy
        app.use(vite.middlewares);
    }

    if (enableProxy) {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        app.use(config.commerce.api.proxy, createCommerceProxyMiddleware(config));
    }

    // SSR request handler
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    app.all('*', createSSRHandler(mode, bundleId, vite, build, enableAssetUrlPatching));

    return app;
}

/**
 * Create the SSR request handler based on mode
 */
function createSSRHandler(
    mode: ServerMode,
    bundleId: string,
    vite: ViteDevServer | undefined,
    build: ServerBuild | undefined,
    enableAssetUrlPatching: boolean
) {
    if (mode === 'development' && vite) {
        // Development mode: dynamic SSR with Vite Environment API
        return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
                const ssrEnvironment = vite.environments.ssr;

                // Check if the environment is runnable (has a module runner)
                if (!isRunnableDevEnvironment(ssrEnvironment)) {
                    const error = new Error(
                        'SSR environment is not runnable. Please ensure:\n' +
                            '  1. "@salesforce/storefront-next-dev" plugin is added to vite.config.ts\n' +
                            '  2. "future.unstable_viteEnvironmentApi: true" is set in react-router.config.ts'
                    );
                    next(error);
                    return;
                }

                // Load server build using Vite Environment API
                // This gets the latest build with HMR updates
                const devBuild = await ssrEnvironment.runner.import('virtual:react-router/server-build');

                // Use the same request handler pattern as production
                const handler = createRequestHandler({
                    build: devBuild,
                    mode: process.env.NODE_ENV,
                });

                await handler(req, res, next);
            } catch (error) {
                // Let Vite handle SSR errors with nice error overlay
                vite.ssrFixStacktrace(error as Error);
                next(error);
            }
        };
    } else if (build) {
        // Serve/Production mode: static build
        let patchedBuild = build;

        if (enableAssetUrlPatching) {
            patchedBuild = patchReactRouterBuild(build, bundleId);
        }

        return createRequestHandler({
            build: patchedBuild,
            mode: process.env.NODE_ENV,
        });
    } else {
        throw new Error('Invalid server configuration: no vite or build provided');
    }
}

// Re-export config and types
export { loadProjectConfig, loadConfigFromEnv, type ServerConfig } from './config';
