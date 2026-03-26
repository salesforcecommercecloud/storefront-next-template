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
import type { RecommendersAdapter } from '@/hooks/recommenders/use-recommenders';
import { getAdapter } from '@/lib/adapters';
import { ensureAdaptersInitialized } from '@/lib/adapters/initialize-adapters';
import { EINSTEIN_ADAPTER_NAME } from '@/adapters/einstein';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

const RecommendersContext = createContext<RecommendersAdapter | undefined>(undefined);

type RecommendersProviderProps = PropsWithChildren<{
    adapterName?: string;
}>;

/**
 * Provider for recommendations adapter
 *
 * Retrieves the adapter from the global adapter registry (lazily initialized).
 * The adapter is expected to implement both EngagementAdapter (for analytics events)
 * and RecommendersAdapter (for fetching recommendations).
 *
 * Currently only Einstein adapter is supported, which is registered via
 * initializeEngagementAdapters() when adapters are initialized.
 *
 * @param adapterName - Name of the adapter to use (default: EINSTEIN_ADAPTER_NAME)
 */
const RecommendersProvider = ({ children, adapterName = EINSTEIN_ADAPTER_NAME }: RecommendersProviderProps) => {
    const config = useConfig<AppConfig>();
    const [adapter, setAdapter] = useState<RecommendersAdapter | undefined>(undefined);

    useEffect(() => {
        // Ensure adapters are initialized before trying to get the adapter
        const initializeAdapter = async () => {
            try {
                await ensureAdaptersInitialized(config);
                // Get the adapter from the global registry after initialization
                const initializedAdapter = getAdapter(adapterName) as RecommendersAdapter | undefined;
                setAdapter(initializedAdapter);
            } catch (error) {
                // Silently handle initialization errors - recommendations will simply not display
                if (import.meta.env.DEV) {
                    logger.warn('Failed to initialize recommenders adapter', { error });
                }
            }
        };

        void initializeAdapter();
    }, [config, adapterName]);

    return <RecommendersContext.Provider value={adapter}>{children}</RecommendersContext.Provider>;
};

/**
 * Hook to access the recommenders adapter from context
 * @returns The recommenders adapter, or undefined if not yet initialized or not available
 * Note: Returns undefined during async initialization. Components should handle this gracefully.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useRecommendersAdapter = (): RecommendersAdapter | undefined => {
    const adapter = useContext(RecommendersContext);
    // Return undefined if adapter is not yet initialized - this is expected during async initialization
    // Components using this hook should check for undefined and handle gracefully
    return adapter;
};

export default RecommendersProvider;
