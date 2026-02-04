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
import type { CustomerInterestsPreferencesAdapter } from './customer-preferences-types';

/** Default adapter name for the customer preferences mock (used by provider and lazy registration) */
export const CUSTOMER_PREFERENCES_MOCK_ADAPTER_NAME = 'customer-preferences-mock' as const;

// Global customer preferences adapter store
const customerPreferencesAdapterStore = new Map<string, CustomerInterestsPreferencesAdapter>();

/**
 * Add a customer preferences adapter to the adapter store
 */
export function addCustomerPreferencesAdapter(name: string, adapter: CustomerInterestsPreferencesAdapter): void {
    customerPreferencesAdapterStore.set(name, adapter);
}

/**
 * Remove a customer preferences adapter from the adapter store
 */
export function removeCustomerPreferencesAdapter(name: string): void {
    customerPreferencesAdapterStore.delete(name);
}

/**
 * Get a customer preferences adapter from the adapter store
 */
export function getCustomerPreferencesAdapter(name: string): CustomerInterestsPreferencesAdapter | undefined {
    return customerPreferencesAdapterStore.get(name);
}

/**
 * Get all customer preferences adapters from the adapter store
 */
export function getAllCustomerPreferencesAdapters(): CustomerInterestsPreferencesAdapter[] {
    return Array.from(customerPreferencesAdapterStore.values());
}

/**
 * Check if any customer preferences adapters are registered
 */
export function hasCustomerPreferencesAdapters(): boolean {
    return customerPreferencesAdapterStore.size > 0;
}

/**
 * Clear all customer preferences adapters (for testing)
 */
export function clearCustomerPreferencesAdapters(): void {
    customerPreferencesAdapterStore.clear();
}
