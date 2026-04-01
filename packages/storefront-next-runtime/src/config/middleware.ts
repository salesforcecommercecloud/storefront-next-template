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
import { appConfigContext } from './context';
import type { BaseConfig } from './schema';

/**
 * Create app config middleware for both server and client.
 *
 * Follows the same factory pattern as `createSiteContextMiddleware`.
 *
 * The server middleware:
 * - Validates required Commerce API fields on first request (one-time)
 * - Sets `appConfigContext` in router context with `config.app`
 *
 * The client middleware:
 * - Reads `window.__APP_CONFIG__` (injected during SSR)
 * - Sets `appConfigContext` in router context
 *
 * Environment variables:
 * - `SCAPI_PROXY_HOST` (optional): When set, skips `shortCode` validation
 *   (workspace environments route through a proxy that doesn't require shortCode)
 * - `NODE_ENV` (optional): When set to 'test', skips validation entirely
 *
 * @param config - The full config object (output of `defineConfig()`)
 * @returns Object with `server` and `client` middleware functions
 *
 * @example
 * import { createAppConfigMiddleware } from '@salesforce/storefront-next-runtime/config';
 * import config from '@/config/server';
 *
 * const appConfigMiddleware = createAppConfigMiddleware(config);
 *
 * export const middleware = [appConfigMiddleware.server, ...otherMiddleware];
 * export const clientMiddleware = [appConfigMiddleware.client, ...otherClientMiddleware];
 */
export function createAppConfigMiddleware<T extends BaseConfig>(
    config: T
): {
    server: MiddlewareFunction<Response>;
    client: MiddlewareFunction<Record<string, unknown>>;
} {
    let validationRun = false;

    function validateConfig(): void {
        if (validationRun || process.env.NODE_ENV === 'test') {
            return;
        }

        const api = (config.app as Record<string, unknown> & { commerce?: { api?: Record<string, string> } }).commerce
            ?.api;

        const required: Record<string, string> = {
            clientId: api?.clientId ?? '',
            organizationId: api?.organizationId ?? '',
        };

        if (!process.env.SCAPI_PROXY_HOST) {
            required.shortCode = api?.shortCode ?? '';
        }

        const missing = Object.entries(required)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (missing.length > 0) {
            const envVarMap: Record<string, string> = {
                clientId: 'PUBLIC__app__commerce__api__clientId',
                organizationId: 'PUBLIC__app__commerce__api__organizationId',
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
                    `PUBLIC__app__commerce__api__shortCode=your-short-code\n\n` +
                    `See docs/README-CONFIG.md for complete configuration documentation.`
            );
        }

        validationRun = true;
    }

    const server: MiddlewareFunction<Response> = ({ context }, next) => {
        validateConfig();
        context.set(appConfigContext, config.app);
        return next();
    };

    const client: MiddlewareFunction<Record<string, unknown>> = async ({ context }, next) => {
        const appConfig = typeof window !== 'undefined' ? window.__APP_CONFIG__ : undefined;

        if (!appConfig) {
            throw new Error(
                'window.__APP_CONFIG__ not available. ' +
                    'Check that server loader is injecting config into HTML via Layout component.'
            );
        }

        context.set(appConfigContext, appConfig);

        return next();
    };

    return { server, client };
}
