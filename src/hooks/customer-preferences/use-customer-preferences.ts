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
import { useState, useCallback, useEffect } from 'react';
import { useCustomerPreferencesAdapter } from '@/providers/customer-preferences';
import type {
    InterestOption,
    InterestCategory,
    PreferenceOption,
    PreferenceValue,
    CustomerInterests,
    CustomerPreferences,
} from '@/lib/adapters/customer-preferences-types';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

/**
 * Return type for the useCustomerInterests hook
 */
export interface UseCustomerInterestsResult {
    /** Available interest options (flat list) */
    availableInterests: InterestOption[];
    /** Available interests organized by category */
    interestCategories: InterestCategory[];
    /** Customer's current selected interest IDs */
    selectedInterestIds: string[];
    /** Whether data is currently loading */
    isLoading: boolean;
    /** Whether data is being saved */
    isSaving: boolean;
    /** Any error that occurred */
    error: Error | null;
    /** Whether the adapter is available */
    isEnabled: boolean;
    /** Fetch customer interests data */
    fetchInterests: (customerId: string) => Promise<void>;
    /** Update customer interests */
    updateInterests: (customerId: string, interestIds: string[]) => Promise<CustomerInterests | null>;
}

/**
 * Hook to manage customer interests
 *
 * Provides methods to fetch available interests and manage customer's selected interests.
 * Uses the CustomerPreferences adapter from context.
 *
 * @example
 * ```tsx
 * const { availableInterests, selectedInterestIds, fetchInterests, updateInterests } = useCustomerInterests();
 *
 * useEffect(() => {
 *   if (customerId) {
 *     fetchInterests(customerId);
 *   }
 * }, [customerId, fetchInterests]);
 *
 * const handleSave = async (newInterestIds: string[]) => {
 *   await updateInterests(customerId, newInterestIds);
 * };
 * ```
 */
export const useCustomerInterests = (): UseCustomerInterestsResult => {
    const adapter = useCustomerPreferencesAdapter();
    const [availableInterests, setAvailableInterests] = useState<InterestOption[]>([]);
    const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
    const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchInterests = useCallback(
        async (customerId: string) => {
            if (!adapter) return;

            setIsLoading(true);
            setError(null);

            try {
                const [available, categorized, customerData] = await Promise.all([
                    adapter.getAvailableInterests(),
                    adapter.getCategorizedInterests(),
                    adapter.getCustomerInterests(customerId),
                ]);

                setAvailableInterests(available);
                setInterestCategories(categorized.categories);
                setSelectedInterestIds(customerData.selectedInterestIds);
            } catch (err) {
                const fetchError = err instanceof Error ? err : new Error('Failed to fetch interests');
                setError(fetchError);
                if (import.meta.env.DEV) {
                    logger.error('Error fetching interests', { error: fetchError });
                }
            } finally {
                setIsLoading(false);
            }
        },
        [adapter]
    );

    const updateInterests = useCallback(
        async (customerId: string, interestIds: string[]): Promise<CustomerInterests | null> => {
            if (!adapter) return null;

            setIsSaving(true);
            setError(null);

            try {
                const result = await adapter.updateCustomerInterests(customerId, interestIds);
                setSelectedInterestIds(result.selectedInterestIds);
                return result;
            } catch (err) {
                const updateError = err instanceof Error ? err : new Error('Failed to update interests');
                setError(updateError);
                if (import.meta.env.DEV) {
                    logger.error('Error updating interests', { error: updateError });
                }
                throw updateError;
            } finally {
                setIsSaving(false);
            }
        },
        [adapter]
    );

    return {
        availableInterests,
        interestCategories,
        selectedInterestIds,
        isLoading,
        isSaving,
        error,
        isEnabled: !!adapter,
        fetchInterests,
        updateInterests,
    };
};

/**
 * Return type for the useCustomerPreferences hook
 */
export interface UseCustomerPreferencesResult {
    /** Available preference options */
    availablePreferences: PreferenceOption[];
    /** Customer's current preference values */
    preferences: Record<string, PreferenceValue>;
    /** Whether data is currently loading */
    isLoading: boolean;
    /** Whether data is being saved */
    isSaving: boolean;
    /** Any error that occurred */
    error: Error | null;
    /** Whether the adapter is available */
    isEnabled: boolean;
    /** Fetch customer preferences data */
    fetchPreferences: (customerId: string) => Promise<void>;
    /** Update customer preferences */
    updatePreferences: (
        customerId: string,
        preferences: Record<string, PreferenceValue>
    ) => Promise<CustomerPreferences | null>;
}

/**
 * Hook to manage customer preferences
 *
 * Provides methods to fetch available preferences and manage customer's preference values.
 * Uses the CustomerPreferences adapter from context.
 *
 * @example
 * ```tsx
 * const { availablePreferences, preferences, fetchPreferences, updatePreferences } = useCustomerPreferences();
 *
 * useEffect(() => {
 *   if (customerId) {
 *     fetchPreferences(customerId);
 *   }
 * }, [customerId, fetchPreferences]);
 *
 * const handleToggle = async (preferenceId: string, value: boolean) => {
 *   await updatePreferences(customerId, { [preferenceId]: value });
 * };
 * ```
 */
export const useCustomerPreferences = (): UseCustomerPreferencesResult => {
    const adapter = useCustomerPreferencesAdapter();
    const [availablePreferences, setAvailablePreferences] = useState<PreferenceOption[]>([]);
    const [preferences, setPreferences] = useState<Record<string, PreferenceValue>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchPreferences = useCallback(
        async (customerId: string) => {
            if (!adapter) return;

            setIsLoading(true);
            setError(null);

            try {
                const [available, customerData] = await Promise.all([
                    adapter.getAvailablePreferences(),
                    adapter.getCustomerPreferences(customerId),
                ]);

                setAvailablePreferences(available);
                setPreferences(customerData.preferences);
            } catch (err) {
                const fetchError = err instanceof Error ? err : new Error('Failed to fetch preferences');
                setError(fetchError);
                if (import.meta.env.DEV) {
                    logger.error('Error fetching preferences', { error: fetchError });
                }
            } finally {
                setIsLoading(false);
            }
        },
        [adapter]
    );

    const updatePreferences = useCallback(
        async (
            customerId: string,
            newPreferences: Record<string, PreferenceValue>
        ): Promise<CustomerPreferences | null> => {
            if (!adapter) return null;

            setIsSaving(true);
            setError(null);

            try {
                const result = await adapter.updateCustomerPreferences(customerId, newPreferences);
                setPreferences(result.preferences);
                return result;
            } catch (err) {
                const updateError = err instanceof Error ? err : new Error('Failed to update preferences');
                setError(updateError);
                if (import.meta.env.DEV) {
                    logger.error('Error updating preferences', { error: updateError });
                }
                throw updateError;
            } finally {
                setIsSaving(false);
            }
        },
        [adapter]
    );

    return {
        availablePreferences,
        preferences,
        isLoading,
        isSaving,
        error,
        isEnabled: !!adapter,
        fetchPreferences,
        updatePreferences,
    };
};

/**
 * Combined hook for both interests and preferences
 *
 * Convenience hook that combines useCustomerInterests and useCustomerPreferences.
 * Automatically fetches both when customerId is provided.
 *
 * @param customerId - Optional customer ID to auto-fetch data
 */
export const useCustomerInterestsAndPreferences = (customerId?: string) => {
    const interests = useCustomerInterests();
    const preferences = useCustomerPreferences();

    useEffect(() => {
        if (customerId && interests.isEnabled) {
            void interests.fetchInterests(customerId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only depend on specific properties
    }, [customerId, interests.isEnabled, interests.fetchInterests]);

    useEffect(() => {
        if (customerId && preferences.isEnabled) {
            void preferences.fetchPreferences(customerId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only depend on specific properties
    }, [customerId, preferences.isEnabled, preferences.fetchPreferences]);

    return {
        interests,
        preferences,
        isLoading: interests.isLoading || preferences.isLoading,
        isSaving: interests.isSaving || preferences.isSaving,
        isEnabled: interests.isEnabled && preferences.isEnabled,
    };
};
