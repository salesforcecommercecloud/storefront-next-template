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
import path from 'path';
import { createServer as createNodeHttpServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import { createServer, initBasePathEnv } from '../server/index';
import { loadProjectConfig } from '../server/config';
import { printServerInfo, printServerConfig, printShutdownMessage } from '../utils/logger';
import { loadEnvFile } from '../utils';
import { getCommerceCloudApiUrl } from '../utils/paths';
import { getWorkspaceHmrConfig } from '../plugins/workspace';

export interface DevOptions {
    projectDirectory?: string;
    port?: number;
}

/**
 * Start the development server with Vite in middleware mode
 */
export async function dev(options: DevOptions = {}): Promise<void> {
    const startTime = Date.now();
    const projectDir = path.resolve(options.projectDirectory || process.cwd());
    const port = options.port || 5173;

    // Set NODE_ENV to development
    process.env.NODE_ENV = process.env.NODE_ENV ?? 'development';

    // Load .env file before reading EXTERNAL_DOMAIN_NAME so values in .env take precedence
    // over the localhost default set below.
    loadEnvFile(projectDir);

    // Set MRT_ENV_BASE_PATH from config.server.ts before Vite starts, since the
    // React Router preset reads getBasePath() at config time to set the basename.
    await initBasePathEnv(projectDir);

    // Set fallback only after .env has been loaded
    process.env.EXTERNAL_DOMAIN_NAME = process.env.EXTERNAL_DOMAIN_NAME ?? `localhost:${port}`;

    const config = await loadProjectConfig(projectDir);

    // Create the HTTP server before Vite so it can be passed to the workspace
    // HMR config (which attaches the WebSocket to the same port).
    const httpServer = createNodeHttpServer();

    const hmr = getWorkspaceHmrConfig(httpServer);

    const vite = await createViteServer({
        root: projectDir,
        server: {
            middlewareMode: true,
            ...(hmr && { hmr }),
        },
    });

    // Create unified server in development mode
    const app = await createServer({
        mode: 'development',
        projectDirectory: projectDir,
        config,
        port,
        vite,
    });

    // Attach Express to the HTTP server and start listening
    httpServer.on('request', app);
    httpServer.listen(port, () => {
        printServerInfo('development', port, startTime, projectDir);

        // Print server configuration after startup banner
        printServerConfig({
            mode: 'development',
            port,
            enableProxy: true,
            enableStaticServing: false,
            enableCompression: false,
            proxyPath: config.commerce.api.proxy,
            proxyHost: getCommerceCloudApiUrl(config.commerce.api.shortCode, config.commerce.api.proxyHost),
            shortCode: config.commerce.api.shortCode,
            organizationId: config.commerce.api.organizationId,
            clientId: config.commerce.api.clientId,
            siteId: config.commerce.api.siteId,
        });
    });

    // Graceful shutdown
    ['SIGTERM', 'SIGINT'].forEach((signal) => {
        process.once(signal, () => {
            printShutdownMessage();
            httpServer.close(() => {
                void vite.close();
                process.exit(0);
            });
        });
    });
}
