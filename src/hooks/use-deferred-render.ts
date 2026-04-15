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

/**
 * Hook that defers rendering until an idle frame is available.
 * This is useful for rendering non-critical content after the main content
 * has been painted, improving initial render performance (LCP, TBT).
 *
 * @param enabled - Whether deferred rendering is enabled (default: true)
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
 */
export function useDeferredRender(enabled = true): boolean {
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
                { timeout: 2000 } // Max 2 seconds timeout to ensure content is eventually rendered
            );

            return () => cancelIdleCallback(idleCallbackId);
        } else {
            // Fallback: defer to next frame
            const timeoutId = setTimeout(() => {
                setShouldRender(true);
            }, 0);

            return () => clearTimeout(timeoutId);
        }
    }, [enabled, shouldRender]);

    return shouldRender;
}
