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
import { useEffect, useState } from 'react';

const DEFAULT_IDLE_TIMEOUT = 2000;
const DEFAULT_FALLBACK_TIMEOUT = 0;

export type UseDeferredRenderOptions = {
    /**
     * Maximum time (ms) to wait for an idle frame before forcing the deferred content to render. Forwarded to
     * `requestIdleCallback` as `{ timeout }`.
     * @default 2000
     */
    idleTimeout?: number;
    /**
     * Delay (ms) for the `setTimeout` fallback used when `requestIdleCallback` is unavailable.
     * @default 0
     */
    fallbackTimeout?: number;
};

/**
 * Hook that defers rendering until an idle frame is available.
 * This is useful for rendering non-critical content after the main content
 * has been painted, improving initial render performance (LCP, TBT).
 *
 * @param enabled - Whether deferred rendering is enabled (default: true)
 * @param options - Optional timing overrides for idle and fallback scheduling
 * @returns Boolean indicating whether the deferred content should be rendered
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const shouldRenderDeferred = useDeferredRender();
 *   return (
 *     <>
 *       <CriticalContent />
 *       {shouldRenderDeferred && <NonCriticalContent />}
 *     </>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Custom timeouts for a latency-sensitive consumer
 * const shouldRender = useDeferredRender(true, {
 *   idleTimeout: 500,
 *   fallbackTimeout: 16,
 * });
 * ```
 */
export function useDeferredRender(enabled = true, options?: UseDeferredRenderOptions): boolean {
    const idleTimeout = options?.idleTimeout ?? DEFAULT_IDLE_TIMEOUT;
    const fallbackTimeout = options?.fallbackTimeout ?? DEFAULT_FALLBACK_TIMEOUT;
    const [shouldRender, setShouldRender] = useState(!enabled);

    useEffect(() => {
        if (!enabled || shouldRender) {
            return;
        }

        // Use requestIdleCallback if available, otherwise fallback to setTimeout
        if (typeof requestIdleCallback !== 'undefined') {
            const idleCallbackId = requestIdleCallback(
                () => {
                    setShouldRender(true);
                },
                { timeout: idleTimeout }
            );

            return () => cancelIdleCallback(idleCallbackId);
        } else {
            const timeoutId = setTimeout(() => {
                setShouldRender(true);
            }, fallbackTimeout);

            return () => clearTimeout(timeoutId);
        }
    }, [enabled, shouldRender, idleTimeout, fallbackTimeout]);

    return shouldRender;
}
