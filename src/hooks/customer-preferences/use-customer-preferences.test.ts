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
/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCustomerInterests, useCustomerPreferences } from './use-customer-preferences';
import type { CustomerInterestsPreferencesAdapter } from '@/lib/adapters/customer-preferences/types';

// Mock the provider hook
const mockAdapter: CustomerInterestsPreferencesAdapter = {
    name: 'mock-adapter',
    getAvailableInterests: vi.fn().mockResolvedValue([
        { id: 'minimalist', name: 'Minimalist', category: 'design_styles' },
        { id: 'geometric', name: 'Geometric', category: 'design_styles' },
    ]),
    getCategorizedInterests: vi.fn().mockResolvedValue({
        categories: [
            {
                id: 'design_styles',
                name: 'Design Styles',
                options: [
                    { id: 'minimalist', name: 'Minimalist', category: 'design_styles' },
                    { id: 'geometric', name: 'Geometric', category: 'design_styles' },
                ],
            },
        ],
    }),
    getCustomerInterests: vi.fn().mockResolvedValue({
        selectedInterestIds: ['minimalist'],
    }),
    updateCustomerInterests: vi.fn().mockResolvedValue({
        selectedInterestIds: ['minimalist', 'geometric'],
    }),
    getAvailablePreferences: vi.fn().mockResolvedValue([
        {
            id: 'product_categories',
            name: 'Product Categories',
            type: 'multi-select' as const,
            options: [
                { value: 'geometric', label: 'Geometric' },
                { value: 'sets', label: 'Sets' },
            ],
        },
        {
            id: 'size_preference',
            name: 'Preferred Product Size',
            type: 'select' as const,
            options: [{ value: 'medium', label: 'Medium (M)' }],
        },
    ]),
    getCustomerPreferences: vi.fn().mockResolvedValue({
        preferences: {
            product_categories: [],
            size_preference: 'no_preference',
        },
    }),
    updateCustomerPreferences: vi.fn().mockResolvedValue({
        preferences: {
            product_categories: ['geometric'],
            size_preference: 'medium',
        },
    }),
};

vi.mock('@/providers/customer-preferences', () => ({
    useCustomerPreferencesAdapter: () => mockAdapter,
}));

describe('useCustomerInterests', () => {
    const testCustomerId = 'test-customer-123';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return initial state', () => {
        const { result } = renderHook(() => useCustomerInterests());

        expect(result.current.availableInterests).toEqual([]);
        expect(result.current.interestCategories).toEqual([]);
        expect(result.current.selectedInterestIds).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSaving).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.isEnabled).toBe(true);
    });

    it('should fetch interests', async () => {
        const { result } = renderHook(() => useCustomerInterests());

        await act(async () => {
            await result.current.fetchInterests(testCustomerId);
        });

        await waitFor(() => {
            expect(result.current.availableInterests).toHaveLength(2);
            expect(result.current.interestCategories).toHaveLength(1);
            expect(result.current.selectedInterestIds).toEqual(['minimalist']);
        });

        expect(mockAdapter.getAvailableInterests).toHaveBeenCalled();
        expect(mockAdapter.getCategorizedInterests).toHaveBeenCalled();
        expect(mockAdapter.getCustomerInterests).toHaveBeenCalledWith(testCustomerId);
    });

    it('should update interests', async () => {
        const { result } = renderHook(() => useCustomerInterests());

        await act(async () => {
            await result.current.updateInterests(testCustomerId, ['minimalist', 'geometric']);
        });

        await waitFor(() => {
            expect(result.current.selectedInterestIds).toEqual(['minimalist', 'geometric']);
        });

        expect(mockAdapter.updateCustomerInterests).toHaveBeenCalledWith(testCustomerId, ['minimalist', 'geometric']);
    });
});

describe('useCustomerPreferences', () => {
    const testCustomerId = 'test-customer-123';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return initial state', () => {
        const { result } = renderHook(() => useCustomerPreferences());

        expect(result.current.availablePreferences).toEqual([]);
        expect(result.current.preferences).toEqual({});
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSaving).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.isEnabled).toBe(true);
    });

    it('should fetch preferences', async () => {
        const { result } = renderHook(() => useCustomerPreferences());

        await act(async () => {
            await result.current.fetchPreferences(testCustomerId);
        });

        await waitFor(() => {
            expect(result.current.availablePreferences).toHaveLength(2);
            expect(result.current.preferences.size_preference).toBe('no_preference');
        });

        expect(mockAdapter.getAvailablePreferences).toHaveBeenCalled();
        expect(mockAdapter.getCustomerPreferences).toHaveBeenCalledWith(testCustomerId);
    });

    it('should update preferences', async () => {
        const { result } = renderHook(() => useCustomerPreferences());

        await act(async () => {
            await result.current.updatePreferences(testCustomerId, {
                product_categories: ['geometric'],
                size_preference: 'medium',
            });
        });

        await waitFor(() => {
            expect(result.current.preferences.product_categories).toEqual(['geometric']);
            expect(result.current.preferences.size_preference).toBe('medium');
        });

        expect(mockAdapter.updateCustomerPreferences).toHaveBeenCalledWith(testCustomerId, {
            product_categories: ['geometric'],
            size_preference: 'medium',
        });
    });
});
