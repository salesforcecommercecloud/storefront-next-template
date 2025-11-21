// Import runtime types for use in app-specific types
import type { AnalyticsEvent, EventAdapter } from '@salesforce/storefront-next-runtime/events';

/**
 * Configuration for adapters
 */
export type EngagementAdapterConfig = {
    siteId: string;
    eventToggles: Record<AnalyticsEvent['eventType'], boolean>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};

/**
 * Interface for adapters
 */
export interface EngagementAdapter extends EventAdapter {
    name: string;
    sendEvent?: (event: AnalyticsEvent) => Promise<unknown>;
    send?: (url: string, options?: RequestInit) => Promise<Response>;
}
