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
import { describe, it, expect, beforeEach } from 'vitest';
import {
    createCustomerPreferencesMockAdapter,
    resetMockCustomerPreferencesData,
    seedMockCustomerData,
    CUSTOMER_PREFERENCES_MOCK_ADAPTER_NAME,
} from './mock';

describe('CustomerPreferencesMockAdapter', () => {
    const testCustomerId = 'test-customer-123';

    beforeEach(() => {
        // Reset mock data before each test
        resetMockCustomerPreferencesData();
    });

    describe('createCustomerPreferencesMockAdapter', () => {
        it('should create adapter with correct name', () => {
            const adapter = createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 0,
            });

            expect(adapter.name).toBe(CUSTOMER_PREFERENCES_MOCK_ADAPTER_NAME);
        });
    });

    describe('Interests API', () => {
        it('should return available interests', async () => {
            const adapter = createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 0,
            });

            const interests = await adapter.getAvailableInterests();

            expect(interests).toBeInstanceOf(Array);
            expect(interests.length).toBeGreaterThan(0);
            expect(interests[0]).toHaveProperty('id');
            expect(interests[0]).toHaveProperty('name');
            expect(interests[0]).toHaveProperty('category');
        });

        it('should return categorized interests with 4 categories', async () => {
            const adapter = createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 0,
            });

            const result = await adapter.getCategorizedInterests();

            expect(result.categories).toBeInstanceOf(Array);
            expect(result.categories).toHaveLength(4);
            expect(result.categories.map((c) => c.id)).toEqual([
                'design_styles',
                'room_types',
                'materials',
                'aesthetics',
            ]);

            // Each category should have options
            result.categories.forEach((category) => {
                expect(category.options).toBeInstanceOf(Array);
                expect(category.options.length).toBeGreaterThan(0);
                expect(category.options[0].category).toBe(category.id);
            });
        });

        it('should return empty interests for new customer', async () => {
            const adapter = createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 0,
            });

            const result = await adapter.getCustomerInterests(testCustomerId);

            expect(result.selectedInterestIds).toEqual([]);
        });

        it('should update and persist customer interests', async () => {
            const adapter = createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 0,
            });

            const interestIds = ['minimalist', 'geometric', 'living_room'];
            const updateResult = await adapter.updateCustomerInterests(testCustomerId, interestIds);

            expect(updateResult.selectedInterestIds).toEqual(interestIds);

            // Verify persistence
            const getResult = await adapter.getCustomerInterests(testCustomerId);
            expect(getResult.selectedInterestIds).toEqual(interestIds);
        });

        it('should filter out invalid interest IDs', async () => {
            const adapter = createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 0,
            });

            const interestIds = ['minimalist', 'invalid-id', 'ceramic'];
            const result = await adapter.updateCustomerInterests(testCustomerId, interestIds);

            expect(result.selectedInterestIds).toEqual(['minimalist', 'ceramic']);
            expect(result.selectedInterestIds).not.toContain('invalid-id');
        });
    });

    describe('Preferences API', () => {
        it('should return available preferences', async () => {
            const adapter = createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 0,
            });

            const preferences = await adapter.getAvailablePreferences();

            expect(preferences).toBeInstanceOf(Array);
            expect(preferences.length).toBeGreaterThan(0);
            expect(preferences[0]).toHaveProperty('id');
            expect(preferences[0]).toHaveProperty('name');
            expect(preferences[0]).toHaveProperty('type');
        });

        it('should return default preferences for new customer', async () => {
            const adapter = createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 0,
            });

            const result = await adapter.getCustomerPreferences(testCustomerId);

            expect(result.preferences).toBeDefined();
            expect(Array.isArray(result.preferences.product_categories)).toBe(true);
            expect(result.preferences.shopping_preferences).toBe('');
            expect(typeof result.preferences.measures).toBe('object');
            expect(typeof result.preferences.size_preference).toBe('string');
        });

        it('should update and persist customer preferences', async () => {
            const adapter = createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 0,
            });

            const updates = {
                product_categories: ['geometric', 'sets'],
                shopping_preferences: 'unisex',
                size_preference: 'medium',
            };

            const updateResult = await adapter.updateCustomerPreferences(testCustomerId, updates);

            expect(updateResult.preferences.product_categories).toEqual(['geometric', 'sets']);
            expect(updateResult.preferences.shopping_preferences).toBe('unisex');
            expect(updateResult.preferences.size_preference).toBe('medium');

            // Verify persistence
            const getResult = await adapter.getCustomerPreferences(testCustomerId);
            expect(getResult.preferences.product_categories).toEqual(['geometric', 'sets']);
            expect(getResult.preferences.shopping_preferences).toBe('unisex');
        });

        it('should ignore invalid preference keys', async () => {
            const adapter = createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 0,
            });

            const updates = {
                size_preference: 'large',
                invalid_preference: 'should be ignored',
            };

            const result = await adapter.updateCustomerPreferences(
                testCustomerId,
                updates as Record<string, boolean | string | string[]>
            );

            expect(result.preferences.size_preference).toBe('large');
            expect(result.preferences).not.toHaveProperty('invalid_preference');
        });

        it('should merge preferences instead of replacing', async () => {
            const adapter = createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 0,
            });

            // First update
            await adapter.updateCustomerPreferences(testCustomerId, {
                product_categories: ['geometric'],
            });

            // Second update with different key
            const result = await adapter.updateCustomerPreferences(testCustomerId, {
                size_preference: 'small',
            });

            // Both should be updated
            expect(result.preferences.product_categories).toEqual(['geometric']);
            expect(result.preferences.size_preference).toBe('small');
        });
    });

    describe('seedMockCustomerData', () => {
        it('should seed interests data', async () => {
            const adapter = createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 0,
            });

            seedMockCustomerData(testCustomerId, ['minimalist', 'modern']);

            const result = await adapter.getCustomerInterests(testCustomerId);
            expect(result.selectedInterestIds).toEqual(['minimalist', 'modern']);
        });

        it('should seed preferences data', async () => {
            const adapter = createCustomerPreferencesMockAdapter({
                enabled: true,
                mockDelay: 0,
            });

            seedMockCustomerData(testCustomerId, undefined, {
                product_categories: ['geometric', 'abstract'],
                size_preference: 'large',
            });

            const result = await adapter.getCustomerPreferences(testCustomerId);
            expect(result.preferences.product_categories).toEqual(['geometric', 'abstract']);
            expect(result.preferences.size_preference).toBe('large');
        });
    });
});
