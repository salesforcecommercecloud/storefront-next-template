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
    addCustomerPreferencesAdapter,
    CUSTOMER_PREFERENCES_MOCK_ADAPTER_NAME,
    hasCustomerPreferencesAdapters,
} from './customer-preferences-store';

/**
 * Ensures the default customer preferences adapter (mock) is registered.
 * Called when the Customer Preferences provider mounts, so the
 * customer-preferences-mock chunk is only loaded when that provider is used.
 *
 * Idempotent: safe to call multiple times.
 */
export async function ensureCustomerPreferencesAdapterRegistered(_appConfig: AppConfig): Promise<void> {
    if (hasCustomerPreferencesAdapters()) {
        return;
    }

    try {
        const { createCustomerPreferencesMockAdapter } = await import('@/adapters/customer-preferences-mock');
        addCustomerPreferencesAdapter(
            CUSTOMER_PREFERENCES_MOCK_ADAPTER_NAME,
            createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 300,
            })
        );
    } catch (error) {
        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn('Failed to register customer preferences adapter:', (error as Error).message);
        }
    }
}
