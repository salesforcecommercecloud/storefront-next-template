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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensureCustomerPreferencesAdapterRegistered } from './ensure-customer-preferences-adapter';
import type { AppConfig } from '@/config';

const mockHasCustomerPreferencesAdapters = vi.fn();
const mockAddCustomerPreferencesAdapter = vi.fn();

vi.mock('./customer-preferences-store', () => ({
    hasCustomerPreferencesAdapters: () => mockHasCustomerPreferencesAdapters(),
    addCustomerPreferencesAdapter: (...args: unknown[]) => mockAddCustomerPreferencesAdapter(...args),
    CUSTOMER_PREFERENCES_MOCK_ADAPTER_NAME: 'customer-preferences-mock',
}));

const mockCreateCustomerPreferencesMockAdapter = vi.fn();

vi.mock('@/adapters/customer-preferences-mock', () => ({
    createCustomerPreferencesMockAdapter: (...args: unknown[]) => mockCreateCustomerPreferencesMockAdapter(...args),
}));

const mockAppConfig = {} as AppConfig;

describe('ensureCustomerPreferencesAdapterRegistered', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockHasCustomerPreferencesAdapters.mockReturnValue(false);
        mockCreateCustomerPreferencesMockAdapter.mockReturnValue({ name: 'customer-preferences-mock' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return early when adapters are already registered', async () => {
        mockHasCustomerPreferencesAdapters.mockReturnValue(true);

        await ensureCustomerPreferencesAdapterRegistered(mockAppConfig);

        expect(mockAddCustomerPreferencesAdapter).not.toHaveBeenCalled();
    });

    it('should dynamically import and register the mock adapter when none are registered', async () => {
        await ensureCustomerPreferencesAdapterRegistered(mockAppConfig);

        expect(mockAddCustomerPreferencesAdapter).toHaveBeenCalledWith('customer-preferences-mock', expect.any(Object));
        expect(mockCreateCustomerPreferencesMockAdapter).toHaveBeenCalledWith({
            enabled: true,
            mockDelay: 300,
        });
    });

    it('should be idempotent - second call does not double-register when first succeeds', async () => {
        await ensureCustomerPreferencesAdapterRegistered(mockAppConfig);
        mockHasCustomerPreferencesAdapters.mockReturnValue(true);
        await ensureCustomerPreferencesAdapterRegistered(mockAppConfig);

        expect(mockAddCustomerPreferencesAdapter).toHaveBeenCalledTimes(1);
    });

    it('should not throw when registration fails', async () => {
        mockCreateCustomerPreferencesMockAdapter.mockImplementation(() => {
            throw new Error('Adapter creation failed');
        });
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await expect(ensureCustomerPreferencesAdapterRegistered(mockAppConfig)).resolves.toBeUndefined();

        if (import.meta.env.DEV) {
            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to register customer preferences adapter:',
                'Adapter creation failed'
            );
        }
        consoleSpy.mockRestore();
    });
});
