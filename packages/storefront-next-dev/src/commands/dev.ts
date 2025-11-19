import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createServer } from '../server/index';
import { loadProjectConfig } from '../server/config';
import { printServerInfo, printServerConfig, printShutdownMessage } from '../utils/logger';
import { loadEnvFile } from '../utils';
import { getCommerceCloudApiUrl } from '../utils/paths';

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

    // Load .env file early
    loadEnvFile(projectDir);

    const config = await loadProjectConfig(projectDir);

    const vite = await createViteServer({
        root: projectDir,
        server: {
            middlewareMode: true,
        },
    });

    // Create unified server in development mode
    const app = createServer({
        mode: 'development',
        projectDirectory: projectDir,
        config,
        port,
        vite,
    });

    // Start server
    const server = app.listen(port, () => {
        printServerInfo('development', port, startTime, projectDir);

        // Print server configuration after startup banner
        printServerConfig({
            mode: 'development',
            port,
            enableProxy: true,
            enableStaticServing: false,
            enableCompression: false,
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
                void vite.close();
                process.exit(0);
            });
        });
    });
}
