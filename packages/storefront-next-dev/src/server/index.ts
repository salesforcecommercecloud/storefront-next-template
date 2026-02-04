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
import express, { type Express } from 'express';
import { createRequestHandler } from '@react-router/express';
import { type ServerBuild } from 'react-router';
import type { ViteDevServer } from 'vite';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfigFromEnv, type ServerConfig } from './config';
import { importTypescript } from './ts-import';
import { createCommerceProxyMiddleware } from './middleware/proxy';
import { createStaticMiddleware } from './middleware/static';
import { createCompressionMiddleware } from './middleware/compression';
import { createLoggingMiddleware } from './middleware/logging';
import { createHostHeaderMiddleware } from './middleware/host-header';
import { patchReactRouterBuild } from './utils';
import { ServerModeFeatureMap, type ServerMode, type ServerModeFeatures } from './modes';
import { getBundlePath } from '../utils/paths';

export interface ServerOptions extends Partial<ServerModeFeatures> {
    /** Server mode: development (with Vite), preview (preview), or production (minimal) */
    mode: ServerMode;

    /** Project root directory (optional, defaults to process.cwd()) */
    projectDirectory?: string;

    /** Server configuration (optional, will load from env vars if not provided) */
    config?: ServerConfig;

    /** Server port (optional, for logging) */
    port?: number;

    /** Vite dev server instance (required for development mode) */
    vite?: ViteDevServer;

    /** React Router server build (required for preview/production modes) */
    build?: ServerBuild;

    /** Enable streaming of responses */
    streaming?: boolean;
}

/**
 * Create a unified Express server for development, preview, or production mode
 */
export async function createServer(options: ServerOptions): Promise<Express> {
    const {
        mode,
        projectDirectory = process.cwd(),
        config: providedConfig,
        vite,
        build,
        streaming = false,
        enableProxy = ServerModeFeatureMap[mode].enableProxy,
        enableStaticServing = ServerModeFeatureMap[mode].enableStaticServing,
        enableCompression = ServerModeFeatureMap[mode].enableCompression,
        enableLogging = ServerModeFeatureMap[mode].enableLogging,
        enableAssetUrlPatching = ServerModeFeatureMap[mode].enableAssetUrlPatching,
    } = options;

    if (mode === 'development' && !vite) {
        throw new Error('Vite dev server instance is required for development mode');
    }

    if ((mode === 'preview' || mode === 'production') && !build) {
        throw new Error('React Router server build is required for preview/production mode');
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

    // If streaming is enabled then compression needs to be handled by the streaming handler
    // in the streamingHandler file
    if (enableCompression && !streaming) {
        app.use(createCompressionMiddleware());
    }

    if (enableStaticServing && build) {
        const bundlePath = getBundlePath(bundleId);
        app.use(bundlePath, createStaticMiddleware(bundleId, projectDirectory));
    }

    // Load and apply custom middlewares from the app's middleware-registry.ts
    // This allows extensions to inject middleware (e.g. Hybrid Proxy)
    const middlewareRegistryPath = resolve(projectDirectory, 'src/server/middleware-registry.ts');
    if (existsSync(middlewareRegistryPath)) {
        interface MiddlewareRegistry {
            customMiddlewares?: express.RequestHandler[];
        }

        const registry = await importTypescript<MiddlewareRegistry>(middlewareRegistryPath, {
            projectDirectory,
        });

        if (registry.customMiddlewares && Array.isArray(registry.customMiddlewares)) {
            registry.customMiddlewares.forEach((middleware: express.RequestHandler) => {
                app.use(middleware);
            });
        }
    }

    if (mode === 'development' && vite) {
        // In development, Vite middleware handles HMR, transforms, and proxy
        app.use(vite.middlewares);
    }

    if (enableProxy) {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        app.use(config.commerce.api.proxy, createCommerceProxyMiddleware(config));
    }

    // Normalize the Host header for React Router's CSRF validation features
    app.use(createHostHeaderMiddleware());

    // SSR request handler
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    app.all('*', await createSSRHandler(mode, bundleId, vite, build, enableAssetUrlPatching));

    return app;
}

/**
 * Create the SSR request handler based on mode
 */
async function createSSRHandler(
    mode: ServerMode,
    bundleId: string,
    vite: ViteDevServer | undefined,
    build: ServerBuild | undefined,
    enableAssetUrlPatching: boolean
) {
    if (mode === 'development' && vite) {
        // The vite package is not designed to be bundlable via build tools
        // You will run into a lot of build errors if you try to bundle it.
        // So, we dynamically import it here to avoid bundling it in production.
        const { isRunnableDevEnvironment } = await import('vite');

        return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            try {
                const ssrEnvironment = vite.environments.ssr;

                // Check if the environment is runnable (has a module runner)
                if (!isRunnableDevEnvironment(ssrEnvironment)) {
                    const error = new Error(
                        'SSR environment is not runnable. Please ensure:\n' +
                            '  1. "@salesforce/storefront-next-dev" plugin is added to vite.config.ts\n' +
                            '  2. React Router config uses the Storefront Next preset'
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
