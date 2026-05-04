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

/**
 * Represents a single interest option that customers can select
 */
export interface InterestOption {
    /** Unique identifier for the interest */
    id: string;
    /** Display name of the interest */
    name: string;
    /** Optional description of the interest */
    description?: string;
    /** Category this interest belongs to */
    category: string;
}

/**
 * Represents a category of interests
 */
export interface InterestCategory {
    /** Unique identifier for the category */
    id: string;
    /** Display name of the category */
    name: string;
    /** Optional description of the category */
    description?: string;
    /** Interest options in this category */
    options: InterestOption[];
}

/**
 * Represents a customer's selected interests
 */
export interface CustomerInterests {
    /** Array of selected interest IDs */
    selectedInterestIds: string[];
}

/**
 * Available interests organized by category
 */
export interface CategorizedInterests {
    /** List of interest categories with their options */
    categories: InterestCategory[];
}

/**
 * Represents a single preference option
 */
export interface PreferenceOption {
    /** Unique identifier for the preference */
    id: string;
    /** Display name of the preference */
    name: string;
    /** Optional description of the preference */
    description?: string;
    /** Type of preference control */
    type: 'toggle' | 'select' | 'multi-select' | 'button-group' | 'text-group';
    /** Available options for 'select', 'multi-select', and 'button-group' type preferences */
    options?: { value: string; label: string }[];
    /** Text input fields for 'text-group' type preferences */
    fields?: { id: string; label: string; placeholder?: string; width?: 'half' | 'full' }[];
}

/**
 * Preference value type - can be boolean, string, array of strings, or record of strings (for text-group)
 */
export type PreferenceValue = boolean | string | string[] | Record<string, string>;

/**
 * Represents a customer's selected preferences
 */
export interface CustomerPreferences {
    /** Map of preference ID to its value (boolean for toggles, string for selects, string[] for multi-select) */
    preferences: Record<string, PreferenceValue>;
}

/**
 * Combined response for interests data
 */
export interface InterestsResponse {
    /** Available interest options */
    availableInterests: InterestOption[];
    /** Customer's current selected interests */
    customerInterests: CustomerInterests;
}

/**
 * Combined response for preferences data
 */
export interface PreferencesResponse {
    /** Available preference options */
    availablePreferences: PreferenceOption[];
    /** Customer's current preferences */
    customerPreferences: CustomerPreferences;
}

/**
 * Adapter interface for customer interests operations
 */
export interface CustomerInterestsAdapter {
    /** Adapter name */
    name: string;

    /**
     * Get all available interest options (flat list)
     */
    getAvailableInterests(): Promise<InterestOption[]>;

    /**
     * Get all available interests organized by category
     */
    getCategorizedInterests(): Promise<CategorizedInterests>;

    /**
     * Get customer's current interests
     * @param customerId - The customer ID
     */
    getCustomerInterests(customerId: string): Promise<CustomerInterests>;

    /**
     * Update customer's interests
     * @param customerId - The customer ID
     * @param interestIds - Array of selected interest IDs
     */
    updateCustomerInterests(customerId: string, interestIds: string[]): Promise<CustomerInterests>;
}

/**
 * Adapter interface for customer preferences operations
 */
export interface CustomerPreferencesAdapter {
    /** Adapter name */
    name: string;

    /**
     * Get all available preference options
     */
    getAvailablePreferences(): Promise<PreferenceOption[]>;

    /**
     * Get customer's current preferences
     * @param customerId - The customer ID
     */
    getCustomerPreferences(customerId: string): Promise<CustomerPreferences>;

    /**
     * Update customer's preferences
     * @param customerId - The customer ID
     * @param preferences - Map of preference ID to value
     */
    updateCustomerPreferences(
        customerId: string,
        preferences: Record<string, PreferenceValue>
    ): Promise<CustomerPreferences>;
}

/**
 * Combined adapter interface for both interests and preferences
 */
export interface CustomerInterestsPreferencesAdapter extends CustomerInterestsAdapter, CustomerPreferencesAdapter {}

/**
 * Configuration for the customer preferences adapter
 */
export interface CustomerPreferencesAdapterConfig {
    /** Whether the adapter is enabled */
    enabled: boolean;
    /** Optional delay for mock responses (ms) */
    mockDelay?: number;
}
