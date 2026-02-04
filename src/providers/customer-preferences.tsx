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
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';
import type { CustomerInterestsPreferencesAdapter } from '@/lib/adapters/customer-preferences-types';
import {
    getCustomerPreferencesAdapter,
    CUSTOMER_PREFERENCES_MOCK_ADAPTER_NAME,
} from '@/lib/adapters/customer-preferences-store';
import { ensureCustomerPreferencesAdapterRegistered } from '@/lib/adapters/ensure-customer-preferences-adapter';
import { useConfig } from '@/config';

const CustomerPreferencesContext = createContext<CustomerInterestsPreferencesAdapter | undefined>(undefined);

type CustomerPreferencesProviderProps = PropsWithChildren<{
    adapterName?: string;
}>;

/**
 * Provider for customer preferences adapter
 *
 * Retrieves the adapter from the global adapter registry (lazily initialized).
 * The adapter provides methods for managing customer interests and preferences.
 *
 * Currently uses the mock adapter which stores data in-memory.
 *
 * @param adapterName - Name of the adapter to use (default: CUSTOMER_PREFERENCES_MOCK_ADAPTER_NAME)
 */
const CustomerPreferencesProvider = ({
    children,
    adapterName = CUSTOMER_PREFERENCES_MOCK_ADAPTER_NAME,
}: CustomerPreferencesProviderProps) => {
    const config = useConfig();
    const [adapter, setAdapter] = useState<CustomerInterestsPreferencesAdapter | undefined>(undefined);

    useEffect(() => {
        // Register customer preferences adapter only when this provider mounts
        const initializeAdapter = async () => {
            try {
                await ensureCustomerPreferencesAdapterRegistered(config);
                const initializedAdapter = getCustomerPreferencesAdapter(adapterName);
                setAdapter(initializedAdapter);
            } catch (error) {
                // Silently handle initialization errors - preferences will simply not display
                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.warn('Failed to initialize customer preferences adapter:', error);
                }
            }
        };

        void initializeAdapter();
    }, [config, adapterName]);

    return <CustomerPreferencesContext.Provider value={adapter}>{children}</CustomerPreferencesContext.Provider>;
};

/**
 * Hook to access the customer preferences adapter from context
 * @returns The customer preferences adapter, or undefined if not yet initialized or not available
 * Note: Returns undefined during async initialization. Components should handle this gracefully.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useCustomerPreferencesAdapter = (): CustomerInterestsPreferencesAdapter | undefined => {
    const adapter = useContext(CustomerPreferencesContext);
    // Return undefined if adapter is not yet initialized - this is expected during async initialization
    // Components using this hook should check for undefined and handle gracefully
    return adapter;
};

export default CustomerPreferencesProvider;
