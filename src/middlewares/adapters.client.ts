import type { DataStrategyResult, MiddlewareFunction } from 'react-router';
import { getConfig } from '@/config';
import { initializeEngagementAdapters } from '@/adapters';

/**
 * Client middleware to initialize engagement adapters
 *
 * Client-side adapters are initialized here to ensure they are available for any client-side needs
 * such as analytics events.
 */
export const adaptersMiddlewareClient: MiddlewareFunction<Record<string, DataStrategyResult>> = async (
    { context },
    next
) => {
    const appConfig = getConfig(context);
    initializeEngagementAdapters(appConfig.engagement.adapters);

    return next();
};
