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
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import { type ReactElement } from 'react';
import { isProductSet, isProductBundle } from '@/lib/product-utils';
import ChildProductCard from './child-product-card';

interface ChildProductsProps {
    parentProduct: ShopperProductsTypes.Product;
}

export default function ChildProducts({ parentProduct }: ChildProductsProps): ReactElement | null {
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
    });

    const { isAddingToCart, handleProductSetAddToCart, handleProductBundleAddToCart, isOutOfStock, stockLevel } =
        useProductActions({
            product: parentProduct,
        });

    const childProducts = comboProduct.childProducts || [];

    const handleAddToCart = async () => {
        // Validate all child products are selected
        if (!handleChildProductValidation()) {
            return;
        }

        if (isProductASet) {
            const selectedProducts = Object.values(childProductSelection);
            await handleProductSetAddToCart(selectedProducts);
        } else if (isProductABundle) {
            const selectedProducts = Object.values(childProductSelection);
            await handleProductBundleAddToCart(selectedBundleQuantity, selectedProducts);
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
                {childProducts.map((childProduct: ShopperProductsTypes.Product) => (
                    <ChildProductCard
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

            {/* Add to Cart Button */}
            <div className="flex justify-center">
                <Button
                    onClick={() => void handleAddToCart()}
                    disabled={!canAddToCart || isAddingToCart}
                    size="lg"
                    className="min-w-64">
                    {isAddingToCart
                        ? uiStrings.product.adding
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
