import { tsImport } from 'tsx/esm/api';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Server configuration extracted from environment variables
 */
export interface ServerConfig {
    commerce: {
        api: {
            shortCode: string;
            organizationId: string;
            clientId: string;
            siteId: string;
            proxy: string;
        };
    };
}

/**
 * This is a temporary function before we move the config implementation from
 * template-retail-rsc-app to the SDK.
 *
 * @ TODO: Remove this function after we move the config implementation from
 * template-retail-rsc-app to the SDK.
 *
 */
export function loadConfigFromEnv(): ServerConfig {
    const shortCode = process.env.PUBLIC_COMMERCE_API_SHORT_CODE;
    const organizationId = process.env.PUBLIC_COMMERCE_API_ORG_ID;
    const clientId = process.env.PUBLIC_COMMERCE_API_CLIENT_ID;
    const siteId = process.env.PUBLIC_COMMERCE_API_SITE_ID;
    const proxy = process.env.PUBLIC_COMMERCE_API_PROXY || '/mobify/proxy/api';

    if (!shortCode) {
        throw new Error(
            'Missing PUBLIC_COMMERCE_API_SHORT_CODE environment variable.\n' +
                'Please set it in your .env file or environment.'
        );
    }

    if (!organizationId) {
        throw new Error(
            'Missing PUBLIC_COMMERCE_API_ORG_ID environment variable.\n' +
                'Please set it in your .env file or environment.'
        );
    }

    if (!clientId) {
        throw new Error(
            'Missing PUBLIC_COMMERCE_API_CLIENT_ID environment variable.\n' +
                'Please set it in your .env file or environment.'
        );
    }

    if (!siteId) {
        throw new Error(
            'Missing PUBLIC_COMMERCE_API_SITE_ID environment variable.\n' +
                'Please set it in your .env file or environment.'
        );
    }

    return {
        commerce: {
            api: {
                shortCode,
                organizationId,
                clientId,
                siteId,
                proxy,
            },
        },
    };
}

/**
 * Load storefront-next project configuration from config.server.ts.
 * Requires projectDirectory to be provided.
 *
 * @param projectDirectory - Project directory to load config.server.ts from
 * @throws Error if config.server.ts is not found or invalid
 */
export async function loadProjectConfig(projectDirectory: string): Promise<ServerConfig> {
    const configPath = resolve(projectDirectory, 'config.server.ts');
    const tsconfigPath = resolve(projectDirectory, 'tsconfig.json');

    if (!existsSync(configPath)) {
        throw new Error(
            `config.server.ts not found at ${configPath}.\n` +
                'Please ensure config.server.ts exists in your project root.'
        );
    }

    const loaded = await tsImport(configPath, {
        parentURL: import.meta.url,
        tsconfig: existsSync(tsconfigPath) ? tsconfigPath : undefined,
    });

    // Extract commerce API config from the loaded config
    const config = loaded.default;
    if (!config?.app?.commerce?.api) {
        throw new Error(
            `Invalid config.server.ts: missing app.commerce.api configuration.\n` +
                'Please ensure your config.server.ts has the commerce API configuration.'
        );
    }

    const api = config.app.commerce.api;

    // Validate required fields
    if (!api.shortCode) {
        throw new Error('Missing shortCode in config.server.ts commerce.api configuration');
    }
    if (!api.organizationId) {
        throw new Error('Missing organizationId in config.server.ts commerce.api configuration');
    }
    if (!api.clientId) {
        throw new Error('Missing clientId in config.server.ts commerce.api configuration');
    }
    if (!api.siteId) {
        throw new Error('Missing siteId in config.server.ts commerce.api configuration');
    }

    return {
        commerce: {
            api: {
                shortCode: api.shortCode,
                organizationId: api.organizationId,
                clientId: api.clientId,
                siteId: api.siteId,
                proxy: api.proxy || '/mobify/proxy/api',
            },
        },
    };
}
