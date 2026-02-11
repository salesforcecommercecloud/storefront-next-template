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
import type { ProductContentAdapter } from '@/lib/adapters/product-content-types';
import { getProductContentAdapter, PRODUCT_CONTENT_DEFAULT_ADAPTER_NAME } from '@/lib/adapters/product-content-store';
import { ensureProductContentAdapterRegistered } from '@/lib/adapters/ensure-product-content-adapter';
import { useConfig } from '@/config';

const ProductContentContext = createContext<ProductContentAdapter | undefined>(undefined);

type ProductContentProviderProps = PropsWithChildren<{
    adapterName?: string;
}>;

/**
 * Provider for product content adapter
 *
 * Retrieves the adapter from the product content adapter registry (lazily initialized).
 * The adapter provides optional methods for PDP modal content (size guide, returns & warranty,
 * BNPL content, estimated delivery, ingredients, usage/care/tech specs, shipping estimates).
 *
 *
 * @param adapterName - Name of the adapter to use (default: PRODUCT_CONTENT_DEFAULT_ADAPTER_NAME)
 */
const ProductContentProvider = ({
    children,
    adapterName = PRODUCT_CONTENT_DEFAULT_ADAPTER_NAME,
}: ProductContentProviderProps) => {
    const config = useConfig();
    const [adapter, setAdapter] = useState<ProductContentAdapter | undefined>(undefined);

    useEffect(() => {
        // Register product content adapter only when this provider mounts (e.g. on PDP)
        const initializeAdapter = async () => {
            try {
                await ensureProductContentAdapterRegistered(config);
                const initializedAdapter = getProductContentAdapter(adapterName);
                setAdapter(initializedAdapter);
            } catch (error) {
                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.warn('Failed to initialize product content adapter:', error);
                }
            }
        };

        void initializeAdapter();
    }, [config, adapterName]);

    return <ProductContentContext.Provider value={adapter}>{children}</ProductContentContext.Provider>;
};

/**
 * Hook to access the product content adapter from context
 * @returns The product content adapter, or undefined if not yet initialized or not available
 * Note: Returns undefined during async initialization. Components should handle this gracefully.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useProductContentAdapter = (): ProductContentAdapter | undefined => {
    const adapter = useContext(ProductContentContext);
    return adapter;
};

export default ProductContentProvider;
