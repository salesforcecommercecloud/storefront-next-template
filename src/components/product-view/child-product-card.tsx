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
import { type ReactElement, useEffect, useRef } from 'react';
import { isProductSet, isStandardProduct } from '@/lib/product-utils';
// @sfdc-extension-line SFDC_EXT_BOPIS
import DeliveryOptions from '@/extensions/bopis/components/delivery-options/delivery-options';

interface ProductSelectionValues {
    product: ShopperProductsTypes.Product;
    variant?: ShopperProductsTypes.Variant;
    quantity: number;
}

interface ChildProductCardProps {
    /** Child product from the parent set or bundle */
    childProduct: ShopperProductsTypes.Product;
    /** Parent product (set or bundle) containing this child */
    parentProduct: ShopperProductsTypes.Product;
    /** Callback to notify parent component of selection changes (variant, quantity) */
    onSelectionChange: (productId: string, selection: ProductSelectionValues) => void;
    /** Mode for swatch interaction: 'uncontrolled' render as link button, controlled renders as normal button*/
    swatchMode?: 'uncontrolled' | 'controlled';
}

/**
 * Displays a child product card within a product set or bundle, with variant selection and quantity control.
 *
 * This component provides:
 * - Product image gallery with variant-specific images
 * - Interactive variant selection (color, size, etc.) with swatches
 * - Quantity picker (for sets only - bundles use parent quantity)
 * - Real-time selection validation and stock checks
 * - Individual "Add to Cart" button (for sets only)
 * - Automatic parent notification on selection changes
 *
 * Supports two swatch modes:
 * - uncontrolled mode (default): Swatches use URL navigation for variant selection
 * - controlled mode: Swatches use callbacks for controlled variant selection (used in modals)
 *
 * @example Basic usage in ChildProducts component
 * ```tsx
 * <ChildProductCard
 *   childProduct={childProduct}
 *   parentProduct={parentProduct}
 *   onSelectionChange={setChildProductSelection}
 *   mode="add"
 * />
 * ```
 *
 * @example Edit mode (in modal)
 * ```tsx
 * <ChildProductCard
 *   childProduct={childProduct}
 *   parentProduct={parentProduct}
 *   onSelectionChange={setChildProductSelection}
 *   mode="edit"
 * />
 * ```
 *
 * @param props - Component props
 * @returns Card component with product details, variant selection, and cart controls
 */
export default function ChildProductCard({
    childProduct: product,
    parentProduct,
    onSelectionChange,
    swatchMode,
}: ChildProductCardProps): ReactElement {
    const isParentProductASet = isProductSet(parentProduct);

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
        isAddingToOrUpdatingCart: isAddingChildOrUpdatingToCart,
        canAddToCart: canAddChildToCart,
        stockLevel,
        isOutOfStock,
        handleAddToCart: handleAddChildToCart,
        quantity,
        setQuantity,
    } = useProductActions({
        product,
        isChildProduct: true,
        currentVariant,
    });

    const variationAttributes = useVariationAttributes({ product, isChildProduct: true });

    const prevSelectionRef = useRef<{ variantId?: string; quantity: number } | null>(null);
    const isStandard = isStandardProduct(product);

    // Auto-select standard products
    useEffect(() => {
        if (isStandard && !prevSelectionRef.current) {
            onSelectionChange(product.id, {
                product,
                quantity,
            });

            prevSelectionRef.current = {
                quantity,
            };
        }
    }, [isStandard, product, quantity, onSelectionChange]);

    // Update parent when selection changes
    useEffect(() => {
        if (currentVariant) {
            const newSelection = {
                variantId: currentVariant.productId,
                quantity,
            };

            // Only notify parent if selection actually changed
            // This is to avoid infinite loop because the childProduct is a new object reference every time it is rendered
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
                                // Don't use link button if the component is rendered in edit mode
                                href={swatchMode === 'uncontrolled' ? href : undefined}
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
                    {currentVariant || isStandard ? (
                        <span className="text-primary font-medium">{uiStrings.product.selected}</span>
                    ) : (
                        <span className="text-muted-foreground">{uiStrings.product.selectOptionsAbove}</span>
                    )}
                </div>

                {/* @sfdc-extension-block-start SFDC_EXT_BOPIS */}
                {/* Delivery Options - Only for Product Sets (not Bundles) */}
                {isParentProductASet && <DeliveryOptions product={product} quantity={quantity} className="mt-6" />}
                {/* @sfdc-extension-block-end SFDC_EXT_BOPIS */}

                {/* Individual Add to Cart Button */}
                {isParentProductASet && (
                    <Button
                        onClick={() => void handleAddChildToCart()}
                        disabled={!canAddChildToCart || isAddingChildOrUpdatingToCart}
                        size="sm"
                        className="w-full">
                        {isAddingChildOrUpdatingToCart ? uiStrings.product.addingToCart : uiStrings.product.addToCart}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export type { ChildProductCardProps, ProductSelectionValues };
