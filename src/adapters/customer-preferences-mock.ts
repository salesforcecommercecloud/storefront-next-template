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
import type {
    CustomerInterestsPreferencesAdapter,
    CustomerPreferencesAdapterConfig,
    InterestOption,
    InterestCategory,
    CategorizedInterests,
    PreferenceOption,
    CustomerInterests,
    CustomerPreferences,
} from '@/lib/adapters/customer-preferences-types';
import { CUSTOMER_PREFERENCES_MOCK_ADAPTER_NAME } from '@/lib/adapters/customer-preferences-store';

export { CUSTOMER_PREFERENCES_MOCK_ADAPTER_NAME };

/**
 * Mock data for interest categories and options
 * Based on Market Street design with 4 categories: Design Styles, Room Types, Materials, Aesthetics
 */
const MOCK_INTEREST_CATEGORIES: InterestCategory[] = [
    {
        id: 'design_styles',
        name: 'Design Styles',
        description: 'Your preferred design styles',
        options: [
            { id: 'minimalist', name: 'Minimalist', category: 'design_styles' },
            { id: 'geometric', name: 'Geometric', category: 'design_styles' },
            { id: 'organic', name: 'Organic', category: 'design_styles' },
            { id: 'abstract', name: 'Abstract', category: 'design_styles' },
            { id: 'traditional', name: 'Traditional', category: 'design_styles' },
            { id: 'contemporary', name: 'Contemporary', category: 'design_styles' },
            { id: 'bohemian', name: 'Bohemian', category: 'design_styles' },
            { id: 'industrial', name: 'Industrial', category: 'design_styles' },
        ],
    },
    {
        id: 'room_types',
        name: 'Room Types',
        description: 'Rooms you are interested in decorating',
        options: [
            { id: 'living_room', name: 'Living Room', category: 'room_types' },
            { id: 'office', name: 'Office', category: 'room_types' },
            { id: 'bedroom', name: 'Bedroom', category: 'room_types' },
            { id: 'kitchen', name: 'Kitchen', category: 'room_types' },
            { id: 'bathroom', name: 'Bathroom', category: 'room_types' },
            { id: 'dining_room', name: 'Dining Room', category: 'room_types' },
            { id: 'outdoor', name: 'Outdoor', category: 'room_types' },
            { id: 'entryway', name: 'Entryway', category: 'room_types' },
        ],
    },
    {
        id: 'materials',
        name: 'Materials',
        description: 'Your preferred materials',
        options: [
            { id: 'ceramic', name: 'Ceramic', category: 'materials' },
            { id: 'wood', name: 'Wood', category: 'materials' },
            { id: 'metal', name: 'Metal', category: 'materials' },
            { id: 'glass', name: 'Glass', category: 'materials' },
            { id: 'fabric', name: 'Fabric', category: 'materials' },
            { id: 'leather', name: 'Leather', category: 'materials' },
            { id: 'stone', name: 'Stone', category: 'materials' },
            { id: 'rattan', name: 'Rattan', category: 'materials' },
        ],
    },
    {
        id: 'aesthetics',
        name: 'Aesthetics',
        description: 'Your preferred aesthetics',
        options: [
            { id: 'modern', name: 'Modern', category: 'aesthetics' },
            { id: 'vintage', name: 'Vintage', category: 'aesthetics' },
            { id: 'rustic', name: 'Rustic', category: 'aesthetics' },
            { id: 'scandinavian', name: 'Scandinavian', category: 'aesthetics' },
            { id: 'mid_century', name: 'Mid-Century', category: 'aesthetics' },
            { id: 'coastal', name: 'Coastal', category: 'aesthetics' },
            { id: 'farmhouse', name: 'Farmhouse', category: 'aesthetics' },
            { id: 'art_deco', name: 'Art Deco', category: 'aesthetics' },
        ],
    },
];

/**
 * Flatten all interests into a single list for backward compatibility
 */
const MOCK_AVAILABLE_INTERESTS: InterestOption[] = MOCK_INTEREST_CATEGORIES.flatMap((category) => category.options);

/**
 * Mock data for available preferences
 * Excludes "Market Street Newsletter" and "Preferred Store" as per requirements
 * Matches Market Street design with Product Categories, Shopping Preferences, and Size Preference
 */
const MOCK_AVAILABLE_PREFERENCES: PreferenceOption[] = [
    {
        id: 'product_categories',
        name: 'Product Categories',
        description: 'Select product categories you are interested in',
        type: 'multi-select',
        options: [
            { value: 'geometric', label: 'Geometric' },
            { value: 'sets', label: 'Sets' },
            { value: 'abstract', label: 'Abstract' },
            { value: 'floral', label: 'Floral' },
            { value: 'minimalist', label: 'Minimalist' },
            { value: 'vintage', label: 'Vintage' },
            { value: 'modern', label: 'Modern' },
            { value: 'rustic', label: 'Rustic' },
        ],
    },
    {
        id: 'shopping_preferences',
        name: 'Shopping Preferences',
        description: 'Select your shopping preference',
        type: 'button-group',
        options: [
            { value: 'womens', label: "Women's" },
            { value: 'mens', label: "Men's" },
            { value: 'unisex', label: 'Unisex' },
        ],
    },
    {
        id: 'measures',
        name: 'Measures',
        description: 'Enter your room dimensions for better product recommendations',
        type: 'text-group',
        fields: [
            { id: 'room_width', label: 'Room Width (inches)', placeholder: 'e.g., 120', width: 'half' },
            { id: 'room_length', label: 'Room Length (inches)', placeholder: 'e.g., 180', width: 'half' },
            { id: 'ceiling_height', label: 'Ceiling Height (inches)', placeholder: 'e.g., 96', width: 'full' },
        ],
    },
    {
        id: 'size_preference',
        name: 'Preferred Product Size',
        description: 'Help us recommend products that fit your space',
        type: 'select',
        options: [
            { value: 'no_preference', label: 'No preference' },
            { value: 'small', label: 'Small (S)' },
            { value: 'medium', label: 'Medium (M)' },
            { value: 'large', label: 'Large (L)' },
            { value: 'extra_large', label: 'Extra Large (XL)' },
        ],
    },
];

// In-memory storage for mock data (simulating a database)
const customerInterestsStore = new Map<string, string[]>();
const customerPreferencesStore = new Map<string, Record<string, boolean | string | string[]>>();

// Default preferences for new customers
const DEFAULT_CUSTOMER_PREFERENCES: Record<string, boolean | string | string[] | Record<string, string>> = {
    product_categories: [],
    shopping_preferences: '',
    measures: {
        room_width: '',
        room_length: '',
        ceiling_height: '',
    },
    size_preference: 'no_preference',
};

/**
 * Simulates network delay for mock API calls
 */
const simulateDelay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates a mock adapter for customer interests and preferences
 *
 * This adapter provides a fully functional mock API for CRUD operations
 * on customer interests and preferences. Data is stored in-memory and
 * persists for the duration of the session.
 *
 * @param config - Configuration for the mock adapter
 */
export function createCustomerPreferencesMockAdapter(
    config: CustomerPreferencesAdapterConfig
): CustomerInterestsPreferencesAdapter {
    const mockDelay = config.mockDelay ?? 300;

    return {
        name: CUSTOMER_PREFERENCES_MOCK_ADAPTER_NAME,

        // ============================================
        // Interests Methods
        // ============================================

        /**
         * Get all available interest options (flat list)
         */
        async getAvailableInterests(): Promise<InterestOption[]> {
            await simulateDelay(mockDelay);
            return [...MOCK_AVAILABLE_INTERESTS];
        },

        /**
         * Get all available interests organized by category
         */
        async getCategorizedInterests(): Promise<CategorizedInterests> {
            await simulateDelay(mockDelay);
            return {
                categories: MOCK_INTEREST_CATEGORIES.map((cat) => ({
                    ...cat,
                    options: [...cat.options],
                })),
            };
        },

        /**
         * Get customer's current interests
         */
        async getCustomerInterests(customerId: string): Promise<CustomerInterests> {
            await simulateDelay(mockDelay);

            // Return stored interests or empty array for new customers
            const selectedInterestIds = customerInterestsStore.get(customerId) || [];
            return { selectedInterestIds: [...selectedInterestIds] };
        },

        /**
         * Update customer's interests
         */
        async updateCustomerInterests(customerId: string, interestIds: string[]): Promise<CustomerInterests> {
            await simulateDelay(mockDelay);

            // Validate that all interest IDs are valid
            const validInterestIds = MOCK_AVAILABLE_INTERESTS.map((i) => i.id);
            const validatedIds = interestIds.filter((id) => validInterestIds.includes(id));

            // Store the updated interests
            customerInterestsStore.set(customerId, validatedIds);

            return { selectedInterestIds: [...validatedIds] };
        },

        // ============================================
        // Preferences Methods
        // ============================================

        /**
         * Get all available preference options
         */
        async getAvailablePreferences(): Promise<PreferenceOption[]> {
            await simulateDelay(mockDelay);
            return [...MOCK_AVAILABLE_PREFERENCES];
        },

        /**
         * Get customer's current preferences
         */
        async getCustomerPreferences(customerId: string): Promise<CustomerPreferences> {
            await simulateDelay(mockDelay);

            // Return stored preferences or defaults for new customers
            const preferences = customerPreferencesStore.get(customerId) || { ...DEFAULT_CUSTOMER_PREFERENCES };
            return { preferences: { ...preferences } };
        },

        /**
         * Update customer's preferences
         */
        async updateCustomerPreferences(
            customerId: string,
            preferences: Record<string, boolean | string | string[]>
        ): Promise<CustomerPreferences> {
            await simulateDelay(mockDelay);

            // Get current preferences or defaults
            const currentPreferences = customerPreferencesStore.get(customerId) || { ...DEFAULT_CUSTOMER_PREFERENCES };

            // Merge with new preferences (only update valid preference keys)
            const validPreferenceIds = MOCK_AVAILABLE_PREFERENCES.map((p) => p.id);
            const updatedPreferences = { ...currentPreferences };

            for (const [key, value] of Object.entries(preferences)) {
                if (validPreferenceIds.includes(key)) {
                    updatedPreferences[key] = value;
                }
            }

            // Store the updated preferences
            customerPreferencesStore.set(customerId, updatedPreferences);

            return { preferences: { ...updatedPreferences } };
        },
    };
}

/**
 * Reset mock data store (for testing purposes)
 */
export function resetMockCustomerPreferencesData(): void {
    customerInterestsStore.clear();
    customerPreferencesStore.clear();
}

/**
 * Seed mock data for a specific customer (for testing/demo purposes)
 */
export function seedMockCustomerData(
    customerId: string,
    interests?: string[],
    preferences?: Record<string, boolean | string | string[]>
): void {
    if (interests) {
        customerInterestsStore.set(customerId, interests);
    }
    if (preferences) {
        customerPreferencesStore.set(customerId, preferences);
    }
}
