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
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { logger } from '../logger';

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
export async function loadEngagementConfig(projectRoot: string, configPath: string): Promise<EngagementConfig | null> {
    const absoluteConfigPath = resolve(projectRoot, configPath);

    try {
        // Use dynamic import with file URL for ESM compatibility
        const configUrl = pathToFileURL(absoluteConfigPath).href;
        const configModule = await import(configUrl);
        const config = configModule.default;

        logger.debug(`📄 Loaded config from ${configPath}`);

        // Navigate to engagement config
        const engagement = config?.app?.engagement as EngagementConfig | undefined;

        if (!engagement) {
            logger.debug(`⚠️  No engagement config found in ${configPath}`);
            return null;
        }

        return engagement;
    } catch (error) {
        // Config might not exist or have import errors - this is non-fatal
        logger.warn(`⚠️  Could not load config from ${configPath}: ${(error as Error).message}`);
        return null;
    }
}
