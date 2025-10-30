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
        throw new Error(
            `Missing required Commerce API configuration: ${missing.join(', ')}\n` +
                `Set these environment variables in your MRT deployment or .env file:\n${missing
                    .map((key) => `  - PUBLIC_COMMERCE_API_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`)
                    .join('\n')}\n\n` +
                `Example .env file:\n` +
                `PUBLIC_COMMERCE_API_CLIENT_ID=your-client-id\n` +
                `PUBLIC_COMMERCE_API_ORG_ID=your-org-id\n` +
                `PUBLIC_COMMERCE_API_SITE_ID=your-site-id\n` +
                `PUBLIC_COMMERCE_API_SHORT_CODE=your-short-code`
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
