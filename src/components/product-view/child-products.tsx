/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

import ProductQuantityPicker from '@/components/product-quantity-picker';
import { Button } from '@/components/ui/button';
import { useProductSetsBundles } from '@/hooks/product/use-product-sets-bundles';
import { useProductActions } from '@/hooks/product/use-product-actions';
import uiStrings from '@/temp-ui-string';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { type ReactElement } from 'react';
import { isProductSet, isProductBundle } from '@/lib/product-utils';
import ChildProductCard from './child-product-card';

type ChildProductsBaseProps = {
    /** Parent product (must be a set or bundle) */
    parentProduct: ShopperProducts.schemas['Product'];
    /** Called immediately before cart action starts (add or update) - for optimistic UI like closing modal */
    onBeforeCartAction?: () => void;
    /** Callback invoked after successful cart operation (add or update) */
    onCartSuccess?: () => void;
    /** Callback invoked if cart operation fails (add or update) */
    onCartError?: (error: unknown) => void;
};

type ChildProductsAddModeProps = ChildProductsBaseProps & {
    /** Rendering mode: 'add' for PDP */
    mode?: 'add';
    /** Initial bundle quantity (optional in add mode, defaults to 1) */
    initialBundleQuantity?: number;
    /** Cart item ID for update operations (not used in add mode) */
    itemId?: string;
};

type ChildProductsEditModeProps = ChildProductsBaseProps & {
    /** Rendering mode: 'edit' for cart edit modal */
    mode: 'edit';
    /** Initial bundle quantity (required in edit mode) */
    initialBundleQuantity: number;
    /** Cart item ID for update operations (required in edit mode) */
    itemId: string;
};

type ChildProductsProps = ChildProductsAddModeProps | ChildProductsEditModeProps;

/**
 * Manages child product selection and cart operations for product sets and bundles.
 *
 * This component orchestrates:
 * - Grid display of child product cards with variant selection
 * - Bundle-level quantity picker (bundles only)
 * - Selection validation and progress tracking
 * - Cart operations (add set, add bundle, update bundle)
 * - Success/error handling with callbacks
 *
 * **Product Set behavior**:
 * - Each child has its own quantity picker
 * - No bundle-level quantity selector
 * - Button: "Add Set to Cart"
 *
 * **Product Bundle behavior**:
 * - Single quantity picker for entire bundle
 * - All children use bundle quantity
 * - Button: "Add Bundle to Cart" or "Update Cart" (edit mode)
 *
 * **Add mode** (PDP):
 * - Creates new cart items
 * - Uses `handleProductSetAddToCart` or `handleProductBundleAddToCart`
 * - Button: "Add Set/Bundle to Cart"
 *
 * **Edit mode** (Cart modal):
 * - Updates existing cart items
 * - Uses `handleUpdateBundle` (bundles only - sets cannot be edited as a unit)
 * - Button: "Update Cart"
 * - Requires `itemId` and `initialBundleQuantity` props
 *
 * @example Add mode on PDP
 * ```tsx
 * <ChildProducts
 *   parentProduct={bundleProduct}
 *   mode="add"
 * />
 * ```
 *
 * @example Edit mode in cart modal
 * ```tsx
 * <ChildProducts
 *   parentProduct={bundleProduct}
 *   mode="edit"
 *   itemId={cartItem.itemId}
 *   initialBundleQuantity={cartItem.quantity}
 *   onBeforeCartAction={() => closeModal()}
 *   onCartSuccess={() => showSuccessToast()}
 *   onCartError={(error) => showError(error)}
 * />
 * ```
 *
 * @param props - Component props
 * @param props.parentProduct - Parent product (must be a set or bundle)
 * @param props.mode - Rendering mode: 'add' for PDP, 'edit' for cart edit modal
 * @param props.initialBundleQuantity - Initial bundle quantity (required in edit mode)
 * @param props.itemId - Cart item ID for update operations (required in edit mode)
 * @param props.onBeforeCartAction - Called before cart action starts (useful for optimistic UI like closing modal)
 * @param props.onCartSuccess - Called after successful cart operation (add or update)
 * @param props.onCartError - Called if cart operation fails (add or update)
 * @returns Grid of child product cards with cart controls, or null if not a set/bundle
 */
export default function ChildProducts({
    parentProduct,
    mode = 'add',
    initialBundleQuantity,
    itemId,
    onBeforeCartAction,
    onCartSuccess,
    onCartError,
}: ChildProductsProps): ReactElement | null {
    const isProductASet = isProductSet(parentProduct);
    const isProductABundle = isProductBundle(parentProduct);
    const {
        comboProduct,
        childProductSelection,
        selectedBundleQuantity,
        areAllChildProductsSelected,
        hasUnorderableChildProducts,
        handleChildProductValidation,
        setChildProductSelection,
        setSelectedBundleQuantity,
        selectedChildProductCount,
        totalChildProducts,
    } = useProductSetsBundles({
        product: parentProduct,
        initialBundleQuantity,
    });

    const {
        isAddingToOrUpdatingCart,
        handleProductSetAddToCart,
        handleProductBundleAddToCart,
        handleUpdateBundle,
        isOutOfStock,
        stockLevel,
    } = useProductActions({
        product: parentProduct,
        itemId,
    });

    const childProducts = comboProduct.childProducts || [];

    const handleAddToCart = async () => {
        // Validate all child products are selected
        if (!handleChildProductValidation()) {
            return;
        }

        try {
            onBeforeCartAction?.();
            if (isProductASet) {
                const selectedProducts = Object.values(childProductSelection);
                await handleProductSetAddToCart(selectedProducts);
            } else if (isProductABundle) {
                const selectedProducts = Object.values(childProductSelection);
                await handleProductBundleAddToCart(selectedBundleQuantity, selectedProducts);
            }

            // Call onSuccess callback if operation was successful
            onCartSuccess?.();
        } catch (error) {
            onCartError?.(error);
        }
    };

    const handleUpdate = async () => {
        // Validate all child products are selected
        if (!handleChildProductValidation()) {
            return;
        }

        try {
            onBeforeCartAction?.();
            // For bundles in edit mode, update the bundle with new quantity and/or child variants
            if (isProductABundle) {
                const selectedProducts = Object.values(childProductSelection);
                await handleUpdateBundle(selectedBundleQuantity, selectedProducts);
            }

            // Call onSuccess callback if operation was successful
            onCartSuccess?.();
        } catch (error) {
            onCartError?.(error);
        }
    };

    const canAddToCart = areAllChildProductsSelected && !hasUnorderableChildProducts;

    if (!isProductASet && !isProductABundle) {
        return null;
    }
    return (
        <div className="space-y-8">
            {/* Child Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {childProducts.map((childProduct: ShopperProducts.schemas['Product']) => (
                    <ChildProductCard
                        // if in edit mode (Edit cart), we want to use internal state to control swatch navigation
                        // in add mode (PDP), we let the swatches to be uncontrolled, which will render as link buttons
                        swatchMode={mode == 'add' ? 'uncontrolled' : 'controlled'}
                        key={childProduct.id}
                        childProduct={childProduct}
                        parentProduct={parentProduct}
                        onSelectionChange={setChildProductSelection}
                    />
                ))}
            </div>

            {/* Bundle Quantity Selector (for bundles only) */}
            {isProductABundle && (
                <div className="flex justify-center">
                    <div className="w-64">
                        <ProductQuantityPicker
                            value={selectedBundleQuantity.toString()}
                            onChange={setSelectedBundleQuantity}
                            stockLevel={stockLevel}
                            isOutOfStock={isOutOfStock}
                            productName={parentProduct.name}
                            isBundle={isProductABundle}
                        />
                    </div>
                </div>
            )}

            {/* Progress indicator */}
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <span>
                    {uiStrings.product.selectedOf
                        .replace('{selected}', selectedChildProductCount.toString())
                        .replace('{total}', totalChildProducts.toString())}
                </span>
                <div className="w-32 bg-muted rounded-full h-2">
                    <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(selectedChildProductCount / totalChildProducts) * 100}%` }}
                    />
                </div>
            </div>

            {/* Add to Cart / Update Cart Button */}
            <div className="flex justify-center">
                <Button
                    onClick={() => void (mode === 'edit' ? handleUpdate() : handleAddToCart())}
                    disabled={!canAddToCart || isAddingToOrUpdatingCart}
                    size="lg"
                    className="min-w-64">
                    {isAddingToOrUpdatingCart
                        ? mode === 'edit'
                            ? uiStrings.product.updatingCart
                            : uiStrings.product.adding
                        : mode === 'edit'
                          ? uiStrings.product.updateCart
                          : isProductASet
                            ? uiStrings.product.addSetToCart
                            : uiStrings.product.addBundleToCart}
                </Button>
            </div>

            {/* Error Messages */}
            {!areAllChildProductsSelected && (
                <div className="text-center text-destructive">{uiStrings.product.selectAllOptionsAbove}</div>
            )}
        </div>
    );
}
