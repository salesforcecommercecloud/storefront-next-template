import type { MiddlewareFunction } from 'react-router';
import { getConfig } from '@/config';
import { initializeEngagementAdapters } from '@/adapters';

/**
 * Server middleware to initialize adapters
 *
 * This ensures adapters are registered on the server side so they're available
 * for any server-side needs (ie. recommendations)
 */
export const adaptersMiddlewareServer: MiddlewareFunction<Response> = async ({ context }, next) => {
    const appConfig = getConfig(context);
    initializeEngagementAdapters(appConfig.engagement.adapters);

    return next();
};
