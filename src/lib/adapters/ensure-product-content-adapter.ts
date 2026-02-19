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
import type { AppConfig } from '@/config';
import {
    addProductContentAdapter,
    hasProductContentAdapters,
    PRODUCT_CONTENT_DEFAULT_ADAPTER_NAME,
} from './product-content-store';

/**
 * Ensures the default product content adapter (mock) is registered.
 * Called when the Product Content provider mounts (e.g. on PDP), so the
 * product-content-mock chunk is only loaded when a PDP is actually visited.
 *
 * Idempotent: safe to call multiple times.
 */
export async function ensureProductContentAdapterRegistered(_appConfig: AppConfig): Promise<void> {
    if (hasProductContentAdapters()) {
        return;
    }

    try {
        const { createProductContentMockAdapter } = await import('@/adapters/product-content-mock');
        addProductContentAdapter(
            PRODUCT_CONTENT_DEFAULT_ADAPTER_NAME,
            createProductContentMockAdapter({
                enabled: true,
                mockDelay: 300,
            })
        );
    } catch (error) {
        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn('Failed to register product content adapter:', (error as Error).message);
        }
    }
}
