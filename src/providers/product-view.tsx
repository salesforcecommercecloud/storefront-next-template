/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { createContext, useContext, type PropsWithChildren } from 'react';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import { useProductActions } from '@/hooks/product/use-product-actions';
import { useCurrentVariant } from '@/hooks/product/use-current-variant';

interface ProductViewContextValue extends ReturnType<typeof useProductActions> {
    product: ShopperProductsTypes.Product;
    mode: 'add' | 'edit';
}

const ProductViewContext = createContext<ProductViewContextValue | null>(null);

interface ProductViewProviderProps {
    product: ShopperProductsTypes.Product;
    mode?: 'add' | 'edit';
    initialQuantity?: number;
    itemId?: string;
}

/**
 * Provider for product view state that manages shared product data, quantity, and actions.
 *
 * This provider helps avoid prop drilling by sharing state like quantity, inventory status,
 * and action handlers (add to cart, add to wishlist) across product view children components.
 *
 * **Usage:**
 * - Wrap product view components (ProductInfo, ProductActions) with this provider
 * - Use `useProductView` hook in child components to access shared state
 * - Set `mode="edit"` for edit mode (e.g cart edit also needs to show product view),
 *      `mode="add"` (default) for product display pages
 *
 * @example
 * ```tsx
 * <ProductViewProvider product={product} mode="edit" initialQuantity={4}>
 *   <ProductInfo />
 *   <ProductCartActions />
 * </ProductViewProvider>
 * ```
 */
const ProductViewProvider = ({
    children,
    product,
    mode = 'add',
    initialQuantity,
    itemId,
}: PropsWithChildren<ProductViewProviderProps>) => {
    const currentVariant = useCurrentVariant({ product });

    const productActionsData = useProductActions({
        product,
        currentVariant,
        initialQuantity,
        itemId,
    });

    return (
        <ProductViewContext.Provider value={{ product, mode, ...productActionsData }}>
            {children}
        </ProductViewContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useProductView = () => {
    const context = useContext(ProductViewContext);
    if (!context) {
        throw new Error('useProductView must be used within ProductViewProvider');
    }
    return context;
};

export default ProductViewProvider;
