/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { EventMediator, AnalyticsEvent, EventAdapter } from './types';

/**
 * Initialize event mediator
 *
 * @param getAdapters - Function that returns the current array of engagmenet adapters.
 *                      This function is called on each track() invocation to ensure
 *                      the mediator always uses the latest adapters from the adapter registry.
 * @returns EventMediator instance
 */
export function initializeEventMediator(getAdapters: () => EventAdapter[]): EventMediator {
    return {
        track: (event: AnalyticsEvent) => {
            processEventWithAdapters(event, getAdapters).catch((error) => {
                // eslint-disable-next-line no-console
                console.error('Analytics tracking failed:', error);
            });
        },
    };
}

/**
 * Process an event with all registered adapters
 *
 * @param event - The analytics event to process
 * @param getAdapters - Function that returns the current array of event adapters
 */
async function processEventWithAdapters(event: AnalyticsEvent, getAdapters: () => EventAdapter[]): Promise<void> {
    // TODO: Handle DNT here

    const eventAdapters = getAdapters();
    if (eventAdapters.length === 0) {
        // eslint-disable-next-line no-console
        console.warn(`There are no active adapters to send the event to`);
        return;
    }

    // Send event to all registered adapters that implement sendEvent in parallel
    const promises = eventAdapters.map(async (adapter) => {
        try {
            if (typeof adapter.sendEvent === 'function') {
                await adapter.sendEvent(event);
            } else {
                // eslint-disable-next-line no-console
                console.warn(`Adapter ${adapter.name} does not implement sendEvent`);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`Failed to send event to ${adapter.name}:`, error);
        }
    });

    await Promise.allSettled(promises);
}
