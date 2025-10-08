/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

import ImageGallery from '@/components/image-gallery';
import ProductQuantityPicker from '@/components/product-quantity-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SwatchGroup, Swatch } from '@/components/swatch-group';
import { useCurrentVariant } from '@/hooks/product/use-current-variant';
import { useSelectedVariations } from '@/hooks/product/use-selected-variations';
import { useVariationAttributes } from '@/hooks/product/use-variation-attributes';
import { useProductImages } from '@/hooks/product/use-product-images';
import { useProductActions } from '@/hooks/product/use-product-actions';
import uiStrings from '@/temp-ui-string';
import ProductPrice from '@/components/product-price';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import { type ReactElement, useEffect, useMemo, useRef } from 'react';
import { isProductSet } from '@/lib/product-utils';

interface ProductSelectionValues {
    product: ShopperProductsTypes.Product;
    variant: ShopperProductsTypes.Variant;
    quantity: number;
}

interface ChildProductCardProps {
    childProduct: ShopperProductsTypes.Product;
    parentProduct: ShopperProductsTypes.Product;
    onSelectionChange: (productId: string, selection: ProductSelectionValues) => void;
}

export default function ChildProductCard({
    childProduct,
    parentProduct,
    onSelectionChange,
}: ChildProductCardProps): ReactElement {
    const isParentProductASet = isProductSet(parentProduct);
    // To avoid infinite loop, do not rely on `childProduct` because it'll always be new object reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const product = useMemo(() => childProduct, [childProduct.id]);

    // Get current variant for UI display and parent communication
    const currentVariant = useCurrentVariant({
        product,
        isChildProduct: true,
    });

    const selectedAttributes = useSelectedVariations({ product, isChildProduct: true });
    const { galleryImages } = useProductImages({
        product,
        selectedAttributes,
    });

    // Use product actions hook for individual product cart operations
    const {
        isAddingToCart: isAddingChildToCart,
        canAddToCart: canAddChildToCart,
        stockLevel,
        isOutOfStock,
        handleAddToCart: handleAddChildToCart,
        quantity,
        setQuantity,
    } = useProductActions({
        product,
        isChildProduct: true,
        stockLevel: currentVariant?.inventory?.ats || product?.inventory?.ats || 0,
    });

    const variationAttributes = useVariationAttributes({ product, isChildProduct: true });

    const prevSelectionRef = useRef<{ variantId?: string; quantity: number } | null>(null);

    // Update parent when selection changes
    useEffect(() => {
        if (currentVariant) {
            const newSelection = {
                variantId: currentVariant.productId,
                quantity,
            };

            // Only notify parent if selection actually changed
            if (
                !prevSelectionRef.current ||
                prevSelectionRef.current.variantId !== newSelection.variantId ||
                prevSelectionRef.current.quantity !== newSelection.quantity
            ) {
                onSelectionChange(product.id, {
                    product,
                    variant: currentVariant,
                    quantity,
                });

                prevSelectionRef.current = newSelection;
            }
        }
    }, [currentVariant, quantity, onSelectionChange, product]);

    return (
        <Card className="h-full" data-testid="child-product">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg">{product?.name}</CardTitle>
                <ProductPrice
                    type="unit"
                    product={currentVariant || product}
                    currency="USD"
                    labelForA11y={product?.name}
                    quantity={quantity}
                    currentPriceProps={{
                        className: 'text-xl font-bold text-foreground',
                    }}
                />
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Product Image */}
                <div className="aspect-square">
                    <ImageGallery images={galleryImages} eager={false} />
                </div>

                {/* Variant Selection */}
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

                {/* Quantity for Product Sets */}
                {isParentProductASet && (
                    <ProductQuantityPicker
                        value={quantity.toString()}
                        onChange={setQuantity}
                        stockLevel={stockLevel}
                        isOutOfStock={isOutOfStock}
                        productName={product?.name}
                    />
                )}

                {/* Selection Status */}
                <div className="text-center text-sm">
                    {currentVariant ? (
                        <span className="text-primary font-medium">{uiStrings.product.selected}</span>
                    ) : (
                        <span className="text-muted-foreground">{uiStrings.product.selectOptionsAbove}</span>
                    )}
                </div>

                {/* Individual Add to Cart Button */}
                {isParentProductASet && (
                    <Button
                        onClick={() => void handleAddChildToCart()}
                        disabled={!canAddChildToCart || isAddingChildToCart}
                        size="sm"
                        className="w-full">
                        {isAddingChildToCart ? uiStrings.product.addingToCart : uiStrings.product.addToCart}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export type { ChildProductCardProps, ProductSelectionValues };
