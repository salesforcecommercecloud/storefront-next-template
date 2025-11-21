/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initializeEventMediator } from './mediator';
import type { EventAdapter, AnalyticsEvent } from './types';

const createMockViewPageEvent = (path: string): AnalyticsEvent => ({
    eventType: 'view_page',
    path,
    payload: { userType: 'guest' },
});

describe('Analytics Mediator', () => {
    let mockAdapter: EventAdapter;
    let getAdapters: () => EventAdapter[];

    beforeEach(() => {
        mockAdapter = {
            name: 'test-adapter',
            sendEvent: vi.fn().mockResolvedValue({ success: true }),
        };

        getAdapters = vi.fn(() => []);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('mediator initialization', () => {
        it('should return a mediator with track method', () => {
            const mediator = initializeEventMediator(getAdapters);

            expect(mediator).toBeDefined();
            expect(mediator.track).toBeInstanceOf(Function);
        });
    });

    describe('event processing', () => {
        it('should process events with registered adapters', async () => {
            getAdapters = vi.fn(() => [mockAdapter]);
            const mediator = initializeEventMediator(getAdapters);

            const event = createMockViewPageEvent('/test');
            mediator.track(event);

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockAdapter.sendEvent).toHaveBeenCalledWith(event);
            expect(mockAdapter.sendEvent).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple adapters in parallel', async () => {
            const adapter1 = { ...mockAdapter, name: 'adapter-1' };
            const adapter2 = { ...mockAdapter, name: 'adapter-2' };

            getAdapters = vi.fn(() => [adapter1, adapter2]);

            const mediator = initializeEventMediator(getAdapters);
            const event = createMockViewPageEvent('/test');

            mediator.track(event);

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(adapter1.sendEvent).toHaveBeenCalledWith(event);
            expect(adapter2.sendEvent).toHaveBeenCalledWith(event);
        });

        it('should handle adapters without sendEvent method', async () => {
            const adapterWithoutSendEvent: EventAdapter = {
                name: 'no-send-event-adapter',
            };

            getAdapters = vi.fn(() => [adapterWithoutSendEvent]);
            const mediator = initializeEventMediator(getAdapters);

            const event = createMockViewPageEvent('/test');

            // Should not throw even when adapter doesn't implement sendEvent
            expect(() => mediator.track(event)).not.toThrow();

            await new Promise((resolve) => setTimeout(resolve, 10));

            // Verify the adapter doesn't have sendEvent called (since it doesn't exist)
            expect(adapterWithoutSendEvent.sendEvent).toBeUndefined();
        });

        it('should handle adapter failures gracefully', async () => {
            const failingAdapter = {
                ...mockAdapter,
                name: 'failing-adapter',
                sendEvent: vi.fn().mockRejectedValue(new Error('Adapter failed')),
            };

            getAdapters = vi.fn(() => [failingAdapter]);
            const mediator = initializeEventMediator(getAdapters);

            const event = createMockViewPageEvent('/test');

            expect(() => mediator.track(event)).not.toThrow();

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(failingAdapter.sendEvent).toHaveBeenCalledWith(event);
        });

        it('should handle events when no adapters are registered', async () => {
            getAdapters = vi.fn(() => []);
            const mediator = initializeEventMediator(getAdapters);
            const event = createMockViewPageEvent('/test');

            expect(() => mediator.track(event)).not.toThrow();

            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(mockAdapter.sendEvent).not.toHaveBeenCalled();
        });

        it('should react to adapter registry changes', async () => {
            // Use a mutable array that the function reads from
            const adapters: EventAdapter[] = [];
            getAdapters = vi.fn(() => adapters);
            const mediator = initializeEventMediator(getAdapters);
            const event = createMockViewPageEvent('/test');

            // First track - no adapters
            mediator.track(event);
            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(mockAdapter.sendEvent).not.toHaveBeenCalled();

            // Add adapter to registry
            adapters.push(mockAdapter);

            // Second track - should use new adapter
            mediator.track(event);
            await new Promise((resolve) => setTimeout(resolve, 10));
            expect(mockAdapter.sendEvent).toHaveBeenCalledWith(event);
            expect(mockAdapter.sendEvent).toHaveBeenCalledTimes(1);
        });
    });
});
