/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import uiStrings from '@/temp-ui-string';
import { isProductSet, isProductBundle, isStandardProduct } from '@/lib/product-utils';

interface ChildProductSelection {
    product: ShopperProducts.schemas['Product'];
    variant?: ShopperProducts.schemas['Variant'];
    quantity: number;
}

interface ChildProductOrderability {
    [productId: string]: {
        isOrderable: boolean;
        errorMessage?: string;
    };
}

interface UseProductSetsBundlesProps {
    product: ShopperProducts.schemas['Product'];
    initialBundleQuantity?: number;
}

/**
 * Manages child product selections and validation for product sets and bundles.
 *
 * @example Basic usage in ChildProducts component
 * ```tsx
 * const {
 *   comboProduct,
 *   childProductSelection,
 *   selectedBundleQuantity,
 *   areAllChildProductsSelected,
 *   hasUnorderableChildProducts,
 *   handleChildProductValidation,
 *   setChildProductSelection,
 *   setSelectedBundleQuantity,
 *   selectedChildProductCount,
 *   totalChildProducts,
 * } = useProductSetsBundles({
 *   product: parentProduct,
 *   initialBundleQuantity: 2, // Optional - defaults to 1
 * });
 * ```
 *
 * @example Validation and cart operations
 * ```tsx
 * const { handleChildProductValidation, getSelectedChildProducts } =
 *   useProductSetsBundles({ product });
 *
 * const handleAddToCart = async () => {
 *   if (!handleChildProductValidation()) return;
 *   const selectedProducts = getSelectedChildProducts();
 *   await handleProductSetAddToCart(selectedProducts);
 * };
 * ```
 *
 * @example Progress tracking
 * ```tsx
 * const { selectedChildProductCount, totalChildProducts } =
 *   useProductSetsBundles({ product });
 *
 * const progress = `${selectedChildProductCount}/${totalChildProducts} selected`;
 * ```
 *
 * @param props - Configuration object
 * @param props.product - Parent product (set or bundle) from Commerce Cloud
 * @param props.initialBundleQuantity - Initial quantity for bundle (defaults to 1)
 * @returns State management, validation, and utility functions
 */
export function useProductSetsBundles({ product, initialBundleQuantity = 1 }: UseProductSetsBundlesProps) {
    const isProductASet = isProductSet(product);
    const isProductABundle = isProductBundle(product);
    const [childProductSelection, setChildProductSelection] = useState<Record<string, ChildProductSelection>>({});
    const [childProductOrderability, setChildProductOrderability] = useState<ChildProductOrderability>({});
    const [selectedBundleQuantity, setSelectedBundleQuantity] = useState(initialBundleQuantity);
    const childProductRefs = useRef<Record<string, globalThis.HTMLElement>>({});

    // Get normalized product data for sets/bundles
    interface NormalizedComboProduct {
        childProducts?: ShopperProducts.schemas['Product'][];
    }

    const comboProduct: NormalizedComboProduct =
        isProductASet || isProductABundle ? normalizeSetBundleProduct(product) : ({} as NormalizedComboProduct);

    // Handle child product selection
    const handleChildProductSelection = useCallback((productId: string, selection: ChildProductSelection) => {
        setChildProductSelection((prev) => ({
            ...prev,
            [productId]: selection,
        }));
    }, []);

    // Handle child product orderability
    const handleChildProductOrderability = useCallback(
        (productId: string, orderability: { isOrderable: boolean; errorMessage?: string }) => {
            setChildProductOrderability((prev) => ({
                ...prev,
                [productId]: orderability,
            }));
        },
        []
    );

    // Validate all child products are selected and orderable
    const validateChildProducts = useCallback(() => {
        const childProducts = comboProduct.childProducts || [];

        for (const childProduct of childProducts) {
            const productId = childProduct.id;
            const selection = childProductSelection[productId];
            const orderability = childProductOrderability[productId];
            const isStandard = isStandardProduct(childProduct);

            // Skip validation for standard products because there are no variants to be selected
            if (isStandard) {
                continue;
            }

            // Check if product is selected
            if (!selection) {
                return {
                    isValid: false,
                    errorMessage: uiStrings.product.pleaseSelectOptionsFor.replace(
                        '{productName}',
                        childProduct.product.name || 'product'
                    ),
                    firstUnselectedProduct: childProduct.product,
                };
            }

            // Check if product is orderable
            if (orderability && !orderability.isOrderable) {
                return {
                    isValid: false,
                    errorMessage:
                        orderability.errorMessage ||
                        uiStrings.product.productNotOrderable.replace(
                            '{productName}',
                            childProduct.product.name || 'product'
                        ),
                    firstUnselectedProduct: childProduct.product,
                };
            }
        }

        return { isValid: true };
    }, [comboProduct.childProducts, childProductSelection, childProductOrderability]);

    // Handle child product validation with scrolling
    const handleChildProductValidation = useCallback(() => {
        const validation = validateChildProducts();

        if (!validation.isValid && validation.firstUnselectedProduct) {
            // Scroll to first unselected product
            const productRef = childProductRefs.current[validation.firstUnselectedProduct.id];
            if (productRef?.scrollIntoView) {
                productRef.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }

            return false;
        }

        return true;
    }, [validateChildProducts]);

    // Get all selected child products for add to cart
    const getSelectedChildProducts = useCallback(() => {
        return Object.values(childProductSelection);
    }, [childProductSelection]);

    // Check if all child products are selected
    const areAllChildProductsSelected = useMemo(() => {
        const childProducts = comboProduct.childProducts || [];
        return childProducts.every((childProduct) => {
            // Simple products are auto-selected, so consider them as selected
            if (isStandardProduct(childProduct)) {
                return true;
            }
            return childProductSelection[childProduct.id];
        });
    }, [comboProduct.childProducts, childProductSelection]);

    // Check if any child product is out of stock or not orderable
    const hasUnorderableChildProducts = useMemo(() => {
        return Object.values(childProductOrderability).some((orderability) => !orderability.isOrderable);
    }, [childProductOrderability]);

    return {
        // State
        /** Record of selected child products with their variants and quantities */
        childProductSelection,
        /** Record of child product orderability status and error messages */
        childProductOrderability,
        /** Selected quantity for the entire bundle (bundles only) */
        selectedBundleQuantity,
        /** Refs to child product DOM elements for scrolling to validation errors */
        childProductRefs,
        /** Normalized product data containing child products array */
        comboProduct,

        // Actions
        /** Updates the selection for a specific child product (used by ChildProductCard) */
        setChildProductSelection: handleChildProductSelection,
        /** Updates the orderability status for a specific child product */
        setChildProductOrderability: handleChildProductOrderability,
        /** Updates the selected quantity for the bundle (bundles only) */
        setSelectedBundleQuantity,
        /** Validates all child products and scrolls to first error if any */
        handleChildProductValidation,

        // Utils
        /** Validates that all child products are selected and orderable */
        validateChildProducts,
        /** Returns array of all selected child products for cart operations */
        getSelectedChildProducts,
        /** Indicates if all required child products have been selected */
        areAllChildProductsSelected,
        /** Indicates if any child product is out of stock or not orderable */
        hasUnorderableChildProducts,

        // Computed values
        /** Number of child products currently selected (used for progress indicator) */
        selectedChildProductCount: Object.keys(childProductSelection).length,
        /** Total number of child products in the set/bundle (used for progress indicator) */
        totalChildProducts: comboProduct.childProducts?.length || 0,
    };
}

// Helper function to normalize set/bundle product data
function normalizeSetBundleProduct(product: ShopperProducts.schemas['Product']): {
    childProducts: ShopperProducts.schemas['Product'][];
} {
    if (!product.type?.set && !product.type?.bundle) {
        return { childProducts: [] };
    }

    let childProducts: ShopperProducts.schemas['Product'][] = [];

    if (product.type.set && product.setProducts) {
        childProducts = product.setProducts.map((setProduct) => ({
            ...setProduct,
            quantity: 1,
        }));
    } else if (product.type.bundle && product.bundledProducts) {
        childProducts = product.bundledProducts.map((bundleProduct) => ({
            ...bundleProduct.product,
            quantity: bundleProduct.quantity ?? 1,
        }));
    }

    return { childProducts };
}
