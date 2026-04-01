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
import ProductPrice from '@/components/product-price';
import { useCurrency } from '@/providers/currency';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { type ReactElement, useEffect, useRef } from 'react';
import { isProductSet, isStandardProduct } from '@/lib/product-utils';
// @sfdc-extension-line SFDC_EXT_BOPIS
import DeliveryOptions from '@/extensions/bopis/components/delivery-options/delivery-options';
import { useTranslation } from 'react-i18next';

interface ProductSelectionValues {
    product: ShopperProducts.schemas['Product'];
    variant?: ShopperProducts.schemas['Variant'];
    quantity: number;
}

interface ChildProductCardProps {
    /** Child product from the parent set or bundle */
    childProduct: ShopperProducts.schemas['Product'];
    /** Parent product (set or bundle) containing this child */
    parentProduct: ShopperProducts.schemas['Product'];
    /** Callback to notify parent component of selection changes (variant, quantity) */
    onSelectionChange: (productId: string, selection: ProductSelectionValues) => void;
    /** Callback to notify parent component of orderability changes (stock, orderable status) */
    onOrderabilityChange?: (productId: string, orderability: { isOrderable: boolean; errorMessage?: string }) => void;
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
    onOrderabilityChange,
    swatchMode,
}: ChildProductCardProps): ReactElement {
    const { t } = useTranslation('product');
    const isParentProductASet = isProductSet(parentProduct);
    const currency = useCurrency();

    // Get current variant for UI display and parent communication
    const currentVariant = useCurrentVariant({
        product,
        isChildProduct: true,
    });

    const selectedAttributes = useSelectedVariations({
        product,
        isChildProduct: true,
    });
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

    const variationAttributes = useVariationAttributes({
        product,
        isChildProduct: true,
    });

    // Track previous selection to prevent infinite loops
    // This tracks what we last notified parent about, not just "previous render"
    const prevSelectionRef = useRef<{
        variantId?: string;
        quantity: number;
    } | null>(null);
    const isStandard = isStandardProduct(product);

    // Auto-select standard products
    useEffect(() => {
        // Only notify if this is first selection OR quantity changed
        if (isStandard && (!prevSelectionRef.current || prevSelectionRef.current.quantity !== quantity)) {
            onSelectionChange(product.id, {
                product,
                quantity,
            });

            prevSelectionRef.current = {
                quantity,
            };
        }
    }, [isStandard, product, quantity, onSelectionChange]);

    // Update parent when selection changes (variant or quantity)
    // For sets: we need to track quantity changes even without variant selection
    // to calculate parent inventory correctly based on child quantities
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
        } else if (isParentProductASet) {
            // For sets: track quantity changes even without variant selection
            // This allows parent to calculate inventory based on child quantities
            const newSelection = {
                quantity,
            };

            if (!prevSelectionRef.current || prevSelectionRef.current.quantity !== newSelection.quantity) {
                onSelectionChange(product.id, {
                    product,
                    quantity,
                });

                prevSelectionRef.current = newSelection;
            }
        }
    }, [currentVariant, quantity, onSelectionChange, product, isParentProductASet]);

    // Report orderability status to parent
    useEffect(() => {
        if (onOrderabilityChange) {
            onOrderabilityChange(product.id, {
                isOrderable: canAddChildToCart,
                errorMessage: !canAddChildToCart ? t('selectAllOptions') : undefined,
            });
        }
    }, [canAddChildToCart, product.id, onOrderabilityChange, t]);

    return (
        <Card className="h-full" data-testid="child-product">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg">{product?.name}</CardTitle>
                <ProductPrice
                    type="unit"
                    product={currentVariant || product}
                    currency={currency}
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
                    <ImageGallery key={product.id} images={galleryImages} eager={false} productName={product.name} />
                </div>

                {/* Variant Selection */}
                {variationAttributes.map(({ id, name, selectedValue, values }) => {
                    const swatches = values.map((value) => {
                        const { href, name: valueName, image, value: swatchValue, orderable } = value;
                        const content = image ? (
                            <div
                                className="w-full h-full bg-cover bg-center bg-no-repeat rounded-pill"
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
                                shape={id === 'color' ? 'color' : 'label'}>
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
                        <span className="text-primary font-medium">{t('selected')}</span>
                    ) : (
                        <span className="text-muted-foreground">{t('selectOptionsAbove')}</span>
                    )}
                </div>

                {/* @sfdc-extension-block-start SFDC_EXT_BOPIS */}
                {/* Delivery Options - Only for Product Sets (not Bundles) */}
                {isParentProductASet && <DeliveryOptions product={product} quantity={quantity} className="mt-6" />}
                {/* @sfdc-extension-block-end SFDC_EXT_BOPIS */}

                {/* Individual Add to Cart Button */}
                {isParentProductASet && (
                    <Button
                        data-testid="add-to-cart"
                        onClick={() => void handleAddChildToCart()}
                        disabled={!canAddChildToCart || isAddingChildOrUpdatingToCart}
                        size="sm"
                        className="w-full">
                        {isAddingChildOrUpdatingToCart ? t('addingToCart') : t('addToCart')}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export type { ChildProductCardProps, ProductSelectionValues };
