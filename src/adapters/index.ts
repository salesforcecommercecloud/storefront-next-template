import type { AppConfig } from '@/config';
import { createEinsteinAdapter, type EinsteinConfig } from './einstein';
import { registerAdapter } from '@/lib/adapters';

/**
 * Initialize engagement adapterss.
 *
 * Uses properties defined in appConfig.engagement.adapters to set up default adapters.
 *
 * This is the place to modify when adding new engagement adapters to the system.
 */
export function initializeEngagementAdapters(engagementAdapterConfigs: AppConfig['engagement']['adapters']) {
    // Register default adapters
    // Comment these out to disable the default adapters
    const einsteinConfig = engagementAdapterConfigs?.einstein as EinsteinConfig;
    if (einsteinConfig?.enabled) {
        try {
            registerAdapter('einstein', createEinsteinAdapter(einsteinConfig));
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('Failed to initialize Einstein adapter:', error);
        }
    }

    /* Example custom adapter registration
    registerAdapter('custom', {
        name: 'custom',
        // sendEvent handles how to send the event to the analytics provider
        sendEvent: async (event: AnalyticsEvent) => Promise.resolve({}),
    });
    */
}
