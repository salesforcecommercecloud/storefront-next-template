import { resolve } from 'path';
import { pathToFileURL } from 'url';

/**
 * Adapter configuration with event toggles
 * Event toggles are a dynamic map - any event name can be toggled
 */
export interface AdapterConfig {
    enabled?: boolean;
    eventToggles?: Record<string, boolean>;
}

/**
 * Expected structure of engagement config from config.server.ts
 */
export interface EngagementConfig {
    adapters?: Record<string, AdapterConfig>;
}

/**
 * Load the engagement config from config.server.ts
 */
export async function loadEngagementConfig(
    projectRoot: string,
    configPath: string,
    verbose: boolean
): Promise<EngagementConfig | null> {
    const absoluteConfigPath = resolve(projectRoot, configPath);

    try {
        // Use dynamic import with file URL for ESM compatibility
        const configUrl = pathToFileURL(absoluteConfigPath).href;
        const configModule = await import(configUrl);
        const config = configModule.default;

        if (verbose) {
            console.log(`  📄 Loaded config from ${configPath}`);
        }

        // Navigate to engagement config
        const engagement = config?.app?.engagement as EngagementConfig | undefined;

        if (!engagement) {
            if (verbose) {
                console.log(`  ⚠️  No engagement config found in ${configPath}`);
            }
            return null;
        }

        return engagement;
    } catch (error) {
        // Config might not exist or have import errors - this is non-fatal
        if (verbose) {
            console.warn(`  ⚠️  Could not load config from ${configPath}: ${(error as Error).message}`);
        }
        return null;
    }
}
