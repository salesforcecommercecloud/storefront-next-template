/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDeferredRender } from './use-deferred-render';

describe('useDeferredRender', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('should return true immediately when disabled', () => {
        const { result } = renderHook(() => useDeferredRender(false));
        expect(result.current).toBe(true);
    });

    it('should return false initially when enabled', () => {
        const { result } = renderHook(() => useDeferredRender(true));
        expect(result.current).toBe(false);
    });

    it('should return true after idle callback when requestIdleCallback is available', async () => {
        // Mock requestIdleCallback
        const mockRequestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
            // Simulate immediate idle callback
            setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 0);
            return 1;
        });
        const mockCancelIdleCallback = vi.fn();

        global.requestIdleCallback = mockRequestIdleCallback;
        global.cancelIdleCallback = mockCancelIdleCallback;

        const { result } = renderHook(() => useDeferredRender(true));

        expect(result.current).toBe(false);

        // Fast-forward timers
        await vi.runAllTimersAsync();

        await waitFor(() => {
            expect(result.current).toBe(true);
        });

        expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 });

        // Cleanup
        delete (global as any).requestIdleCallback;
        delete (global as any).cancelIdleCallback;
    });

    it('should use setTimeout fallback when requestIdleCallback is not available', async () => {
        // Ensure requestIdleCallback is not available
        const originalRequestIdleCallback = global.requestIdleCallback;
        delete (global as any).requestIdleCallback;

        const { result } = renderHook(() => useDeferredRender(true));

        expect(result.current).toBe(false);

        // Fast-forward timers
        await vi.runAllTimersAsync();

        await waitFor(() => {
            expect(result.current).toBe(true);
        });

        // Restore
        if (originalRequestIdleCallback) {
            global.requestIdleCallback = originalRequestIdleCallback;
        }
    });

    it('should cleanup idle callback on unmount', () => {
        const mockCancelIdleCallback = vi.fn();
        global.requestIdleCallback = vi.fn(() => 123);
        global.cancelIdleCallback = mockCancelIdleCallback;

        const { unmount } = renderHook(() => useDeferredRender(true));

        unmount();

        expect(mockCancelIdleCallback).toHaveBeenCalledWith(123);

        // Cleanup
        delete (global as any).requestIdleCallback;
        delete (global as any).cancelIdleCallback;
    });

    it('should cleanup timeout on unmount when using fallback', () => {
        delete (global as any).requestIdleCallback;

        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

        const { unmount } = renderHook(() => useDeferredRender(true));

        unmount();

        expect(clearTimeoutSpy).toHaveBeenCalled();
    });
});
