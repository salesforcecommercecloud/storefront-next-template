/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { createContext, useContext, type PropsWithChildren } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

/**
 * Simple context for sharing product data across components.
 */
interface ProductContextValue {
    product: ShopperProducts.schemas['Product'];
}

const ProductContext = createContext<ProductContextValue | null>(null);

interface ProductProviderProps {
    product: ShopperProducts.schemas['Product'];
}

/**
 * Provider for product data that makes the product available via context.
 *
 * @example
 * ```tsx
 * <ProductProvider product={product}>
 *   <ProductRecommendations />
 *   <OtherComponents />
 * </ProductProvider>
 * ```
 */
export const ProductProvider = ({ children, product }: PropsWithChildren<ProductProviderProps>) => {
    return <ProductContext.Provider value={{ product }}>{children}</ProductContext.Provider>;
};

/**
 * Hook to access product from ProductContext.
 * Returns null if not within a ProductProvider.
 *
 * @returns The product from context, or null if not available
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useProduct = () => {
    const context = useContext(ProductContext);
    return context?.product ?? null;
};
