import type { MiddlewareFunction } from 'react-router';
import config from '@/config/server';
import { appConfigContext } from '@/config';

let validationRun = false;

/**
 * Validate required Commerce API configuration on first access
 */
function validateConfig(): void {
    if (validationRun || process.env.NODE_ENV === 'test') {
        return;
    }

    const required = {
        clientId: config.app.commerce.api.clientId,
        organizationId: config.app.commerce.api.organizationId,
        siteId: config.app.commerce.api.siteId,
        shortCode: config.app.commerce.api.shortCode,
    };

    const missing = Object.entries(required)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missing.length > 0) {
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
                `See src/config/README.md for complete configuration documentation.`
        );
    }

    validationRun = true;
}

/**
 * Server middleware to ensure app config is in context before any other middleware runs
 * This MUST run first so that scapi.ts can access config during auth middleware
 */
export const appConfigMiddlewareServer: MiddlewareFunction<Response> = ({ context }, next) => {
    validateConfig();
    context.set(appConfigContext, config.app);
    return next();
};
