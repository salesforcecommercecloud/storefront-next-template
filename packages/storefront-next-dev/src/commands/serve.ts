import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { execSync } from 'child_process';
import type { ServerBuild } from 'react-router';
import { createServer } from '../server/index';
import { loadProjectConfig } from '../server/config';
import {
    printServerInfo,
    printServerConfig,
    printShutdownMessage,
    info,
    warn,
    error as logError,
} from '../utils/logger';
import { loadEnvFile } from '../utils';
import { getCommerceCloudApiUrl } from '../utils/paths';

export interface ServeOptions {
    projectDirectory?: string;
    port?: number;
}

/**
 * Start the preview server with production build
 */
export async function serve(options: ServeOptions = {}): Promise<void> {
    const startTime = Date.now();
    const projectDir = path.resolve(options.projectDirectory || process.cwd());
    const port = options.port || 3000;

    // Set NODE_ENV to production for serve mode
    process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';
    process.env.EXTERNAL_DOMAIN_NAME = process.env.EXTERNAL_DOMAIN_NAME ?? `localhost:${port}`;

    loadEnvFile(projectDir);
    // Check if build exists, todo: read build dir from react-router config
    const buildPath = path.join(projectDir, 'build', 'server', 'index.js');

    if (!fs.existsSync(buildPath)) {
        warn('Production build not found. Building project...');
        info('Running: pnpm build');

        try {
            // Run build command
            execSync('pnpm build', {
                cwd: projectDir,
                stdio: 'inherit',
            });

            info('Build completed successfully');
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logError(`Build failed: ${errorMsg}`);
            process.exit(1);
        }

        // Verify build was created
        if (!fs.existsSync(buildPath)) {
            logError(`Build still not found at ${buildPath} after running build command`);
            process.exit(1);
        }
    }

    // Load production build (env vars already loaded above)
    info(`Loading production build from ${buildPath}`);
    const buildModule = (await import(pathToFileURL(buildPath).href)) as { default: ServerBuild };
    const build = buildModule.default;

    // TODO: this should load the config from /build
    const config = await loadProjectConfig(projectDir);

    // Create unified server in serve mode
    const app = createServer({
        mode: 'serve',
        projectDirectory: projectDir,
        config,
        port,
        build,
    });

    // Start server
    const server = app.listen(port, () => {
        printServerInfo('serve', port, startTime, projectDir);

        // Print server configuration after startup banner
        printServerConfig({
            mode: 'serve',
            port,
            enableProxy: true,
            enableStaticServing: true,
            enableCompression: true,
            proxyPath: config.commerce.api.proxy,
            proxyTarget: getCommerceCloudApiUrl(config.commerce.api.shortCode),
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
            server?.close(() => {
                process.exit(0);
            });
        });
    });
}
