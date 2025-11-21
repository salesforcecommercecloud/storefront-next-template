/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { AnalyticsEvent, EventMediator, EventPayload, EventTypeMap, ViewPageEvent } from './types';

/**
 * Type-safe event creation function
 *
 * This generic function allows creating any event type under AnalyticsEvent
 * with full type safety. The event type is inferred from the string literal
 * passed as the first parameter, and TypeScript will enforce the correct
 * data properties for that specific event type.
 *
 * @example
 * ```typescript
 * const viewPageEvent = createEvent('view_page', { path: '/products', payload });
 * const viewProductEvent = createEvent('view_product', { product, payload });
 * ```
 */
export function createEvent<T extends AnalyticsEvent['eventType']>(
    eventType: T,
    data: EventPayload<T>
): EventTypeMap[T] {
    return {
        eventType,
        ...data,
    } as EventTypeMap[T];
}

/**
 * Send a view page event to the event mediator
 *
 * This wrapper function is used in the automated page view event tracking client middleware.
 * This function exists to support build-time checks and type safety.
 *
 * @param event - The view page event to send
 * @param eventMediator - The event mediator to send the event to
 */
export function sendViewPageEvent(event: ViewPageEvent, eventMediator: EventMediator): void {
    eventMediator.track(event);
}
