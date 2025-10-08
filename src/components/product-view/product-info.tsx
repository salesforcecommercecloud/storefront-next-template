/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

import { type ReactElement } from 'react';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import ProductQuantityPicker from '@/components/product-quantity-picker';
import { useToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { SwatchGroup, Swatch } from '@/components/swatch-group';
import { useVariationAttributes } from '@/hooks/product/use-variation-attributes';
import { useProductActions } from '@/hooks/product/use-product-actions';
import { useCurrentVariant } from '@/hooks/product/use-current-variant';
import uiStrings from '@/temp-ui-string';
import ProductPrice from '../product-price';
import { isProductSet, isProductBundle } from '@/lib/product-utils';
import InventoryMessage from '../inventory-message';

interface ProductInfoProps {
    product: ShopperProductsTypes.Product;
}

export default function ProductInfo({ product }: ProductInfoProps): ReactElement {
    const isProductASet = isProductSet(product);
    const isProductABundle = isProductBundle(product);
    // Use variation attributes hook for URL-aware swatches
    const variationAttributes = useVariationAttributes({ product });
    // Inventory and stock calculations
    const inventory = product.inventory;

    // Get current variant for UI display
    const currentVariant = useCurrentVariant({ product });

    // Use product actions hook
    const {
        isAddingToCart,
        isAddingToWishlist,
        quantity,
        canAddToCart,
        isOutOfStock,
        isMasterOrVariantProduct,
        stockLevel,
        handleAddToCart,
        handleAddToWishlist,
        setQuantity,
    } = useProductActions({
        product,
        stockLevel: inventory?.ats || 0,
    });

    const { addToast } = useToast();

    const onAddToWishlist = async () => {
        const productToAdd = isMasterOrVariantProduct ? currentVariant : product;
        try {
            // TODO: later refactor this to be similar to handleAddToCart
            await handleAddToWishlist(productToAdd as ShopperProductsTypes.Variant);
        } catch {
            addToast(uiStrings.product.failedToAddProductToWishlistError, 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Desktop Product Title - hidden on mobile */}
            <div className="hidden md:block">
                <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
                {product.shortDescription && (
                    <p className="mt-2 text-lg text-muted-foreground">{product.shortDescription}</p>
                )}
            </div>

            {/* Price - show unit price on PDP */}
            <div className="space-y-1">
                <ProductPrice
                    type="unit"
                    product={product}
                    quantity={quantity}
                    currency="USD"
                    labelForA11y={product?.name}
                    currentPriceProps={{
                        className: 'text-xl font-bold text-foreground',
                    }}
                />
            </div>

            {/* Inventory Status Message */}
            <InventoryMessage product={product} currentVariant={currentVariant} />

            {/* Swatch Groups for Product Variations */}
            {variationAttributes.map(({ id, name, selectedValue, values }) => {
                const swatches = values.map((value) => {
                    const { href, name: valueName, image, value: swatchValue, orderable } = value;
                    const content = image ? (
                        <div
                            className="w-full h-full bg-cover bg-center bg-no-repeat rounded-full"
                            style={{ backgroundImage: `url(${image.link})` }}
                            aria-label={image.alt || valueName}
                        />
                    ) : (
                        <span className="text-xs font-medium">{valueName}</span>
                    );

                    return (
                        <Swatch
                            key={swatchValue}
                            href={href}
                            disabled={!orderable}
                            value={swatchValue}
                            name={valueName}
                            shape={id === 'color' ? 'circle' : 'square'}>
                            {content}
                        </Swatch>
                    );
                });

                return (
                    <SwatchGroup
                        key={id}
                        value={selectedValue?.value}
                        displayName={selectedValue?.name || ''}
                        label={name}>
                        {swatches}
                    </SwatchGroup>
                );
            })}

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
                {/* Options Selection Message */}
                {isMasterOrVariantProduct && !currentVariant && !isProductASet && !isProductABundle && (
                    <div className="text-destructive font-medium">{uiStrings.product.selectAllOptions}</div>
                )}

                {/* Quantity Selector - Only for non-set/bundle products */}
                {!isProductASet && !isProductABundle && (
                    <ProductQuantityPicker
                        value={quantity.toString()}
                        onChange={setQuantity}
                        stockLevel={stockLevel}
                        isOutOfStock={isOutOfStock}
                        productName={product.name}
                    />
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                    {!isProductASet && !isProductABundle && (
                        <Button
                            onClick={() => void handleAddToCart()}
                            disabled={!canAddToCart || isAddingToCart}
                            className="w-full"
                            size="lg">
                            {isAddingToCart ? uiStrings.product.addingToCart : uiStrings.product.addToCart}
                        </Button>
                    )}

                    <Button
                        onClick={() => void onAddToWishlist()}
                        disabled={isAddingToWishlist}
                        variant="outline"
                        className="w-full"
                        size="lg">
                        {isAddingToWishlist ? uiStrings.product.addingToWishlist : uiStrings.product.addToWishlist}
                    </Button>
                </div>
            </div>

            {/* Product Bundle/Set Notice */}
            {(isProductASet || isProductABundle) && (
                <div className="bg-primary/10 border border-primary rounded-lg p-4">
                    <p className="text-sm text-primary">
                        {isProductASet ? uiStrings.product.productSetNotice : uiStrings.product.productBundleNotice}
                    </p>
                </div>
            )}
        </div>
    );
}
