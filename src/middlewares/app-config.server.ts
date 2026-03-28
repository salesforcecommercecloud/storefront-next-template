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
import type { MiddlewareFunction } from 'react-router';
import config from '@/config/server';
import { appConfigContext } from '@salesforce/storefront-next-runtime/config';
import { getLogger } from '@/lib/logger.server';

let validationRun = false;

/**
 * Validate required Commerce API configuration on first access
 */
function validateConfig(logger: ReturnType<typeof getLogger>): void {
    if (validationRun || process.env.NODE_ENV === 'test') {
        return;
    }

    logger.debug('AppConfig: validating configuration', {
        hasProxyHost: !!process.env.SCAPI_PROXY_HOST,
    });

    const required: Record<string, string> = {
        clientId: config.app.commerce.api.clientId,
        organizationId: config.app.commerce.api.organizationId,
        siteId: config.app.commerce.api.siteId,
    };

    // shortCode is only required when not using a proxy host override
    if (!process.env.SCAPI_PROXY_HOST) {
        required.shortCode = config.app.commerce.api.shortCode;
    }

    const missing = Object.entries(required)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missing.length > 0) {
        logger.error('AppConfig: missing required configuration', { missing });
        // Map config keys to env var names
        const envVarMap: Record<string, string> = {
            clientId: 'PUBLIC__app__commerce__api__clientId',
            organizationId: 'PUBLIC__app__commerce__api__organizationId',
            siteId: 'PUBLIC__app__commerce__api__siteId',
            shortCode: 'PUBLIC__app__commerce__api__shortCode',
        };

        throw new Error(
            `Missing required Commerce API configuration: ${missing.join(', ')}\n\n` +
                `Set these environment variables in your MRT deployment or .env file:\n${missing
                    .map((key) => `  ${envVarMap[key]}=your-value`)
                    .join('\n')}\n\n` +
                `Example .env file:\n` +
                `PUBLIC__app__commerce__api__clientId=your-client-id\n` +
                `PUBLIC__app__commerce__api__organizationId=your-org-id\n` +
                `PUBLIC__app__commerce__api__siteId=your-site-id\n` +
                `PUBLIC__app__commerce__api__shortCode=your-short-code\n\n` +
                `See docs/README-CONFIG.md for complete configuration documentation.`
        );
    }

    logger.info('AppConfig: validation succeeded');
    validationRun = true;
}

/**
 * Server middleware to ensure app config is in context before any other middleware runs
 * This MUST run first so that scapi.ts can access config during auth middleware
 *
 * Note: We reference config.app.commerceAgent so the server bundle keeps it when tree-shaking.
 * Root and header read it via getConfig(context); the bundler does not trace that back to this module.
 */
export const appConfigMiddlewareServer: MiddlewareFunction<Response> = ({ context }, next) => {
    const logger = getLogger(context);
    logger.debug('AppConfig: middleware starting');
    validateConfig(logger);
    // Ensure commerceAgent is not tree-shaken from the config (used by root.tsx and header for shopper agent)
    void config.app.commerceAgent;
    context.set(appConfigContext, config.app);
    return next();
};
