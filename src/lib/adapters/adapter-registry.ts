import type { EngagementAdapter } from './types';

// Global engagement adapter registry
const engagementAdapterRegistry = new Map<string, EngagementAdapter>();

/**
 * Register an engagement adapter to the adapter registry
 */
export function registerAdapter(name: string, adapter: EngagementAdapter): void {
    engagementAdapterRegistry.set(name, adapter);
}

/**
 * Unregister an engagement adapter from the adapter registry
 */
export function unregisterAdapter(name: string): void {
    engagementAdapterRegistry.delete(name);
}

/**
 * Get an engagement adapter from the adapter registry
 */
export function getAdapter(name: string): EngagementAdapter | undefined {
    return engagementAdapterRegistry.get(name);
}

/**
 * Get all registered engagement adapters
 */
export function getAllAdapters(): EngagementAdapter[] {
    return Array.from(engagementAdapterRegistry.values());
}
