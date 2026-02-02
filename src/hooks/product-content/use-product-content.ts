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
import { useProductContentAdapter } from '@/providers/product-content';
import type { ProductContentAdapter } from '@/lib/adapters/product-content-types';

// Re-export for consumers
export type { ProductContentAdapter } from '@/lib/adapters/product-content-types';

/**
 * Return type for the useProductContent hook
 */
export interface UseProductContentResult {
    /** The product content adapter, or undefined if not yet initialized or not available */
    adapter: ProductContentAdapter | undefined;
    /** Whether the adapter is available */
    isEnabled: boolean;
}

/**
 * Hook to access product content for PDP modals and collapsible sections.
 *
 * Uses the ProductContentAdapter from context. Components should check isEnabled
 * and optional method presence before calling (e.g. adapter?.getSizeGuide?.(productId)).
 *
 * @example
 * ```tsx
 * const { adapter, isEnabled } = useProductContent();
 * if (isEnabled && adapter?.getSizeGuide) {
 *   const data = await adapter.getSizeGuide(productId);
 * }
 * ```
 */
export const useProductContent = (): UseProductContentResult => {
    const adapter = useProductContentAdapter();
    return {
        adapter,
        isEnabled: !!adapter,
    };
};
