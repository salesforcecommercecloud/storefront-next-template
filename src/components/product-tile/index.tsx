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
// React & Router
import { forwardRef, type ComponentProps, useState, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router';

// Types
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import type { ComponentDesignMetadata } from '@salesforce/storefront-next-runtime/design/react';

// Libs & Utils
import { cn } from '@/lib/utils';
import { createProductUrl, getDecoratedVariationAttributes } from '@/lib/product-utils';
import { useProductTileContext } from './context';

// Page Designer Decorators
import { Component } from '@/lib/decorators/component';
import { AttributeDefinition } from '@/lib/decorators/attribute-definition';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import type { ComponentType } from '@/components/region';

// Components
import { ProductTileSwatchesSkeleton } from '@/components/category-skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { ProductImageContainer } from '@/components/product-image';
import ProductPrice from '@/components/product-price';

const LazySwatches = lazy(() => import('./swatches'));

interface ProductTileProps extends ComponentProps<'div'> {
    product: ShopperSearch.schemas['ProductSearchHit'];
    maxSwatches?: number;
    handleProductClick?: (product: ShopperSearch.schemas['ProductSearchHit']) => void;
    /** Custom footer action button. If provided, replaces the default "More Options" button */
    footerAction?: React.ReactNode;
    /** If true, swatches are displayed but not interactive (read-only mode for wishlist) */
    disableSwatchInteraction?: boolean;
    /** For variant products in read-only mode, filter swatches to only show this variant's color value */
    selectedVariantColorValue?: string | null;
    /** Image aspect ratio (width/height). If provided, calculates height based on viewport width. Defaults to 1 (square) */
    imgAspectRatio?: number;

    // Page Designer styling props
    objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    boxShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    padding?: '0' | '2' | '4' | '6' | '8';
    margin?: '0' | '2' | '4' | '6' | '8';
    fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
    letterSpacing?: 'tighter' | 'tight' | 'normal' | 'wide' | 'wider';
    hoverEffect?: 'default' | 'scale' | 'shadow' | 'lift';

    // Page Designer system props (need to be filtered)
    regionId?: string;
    component?: ComponentType;
    componentData?: Record<string, Promise<unknown>>;
    designMetadata?: ComponentDesignMetadata;
    data?: unknown;
}

// Configure which attribute to show swatches for and how many to display
// Change these constants to adapt to different customer needs
const PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID = 'color';
const PRODUCT_TILE_MAX_SWATCHES = 2;

/* v8 ignore start - do not test decorators in unit tests, decorator functionality is tested separately*/
@Component('productTile', {
    name: 'Product Tile',
    description: 'Configurable product tile with customizable styling for images, typography, and hover effects',
})
@RegionDefinition([])
export class ProductTileMetadata {
    @AttributeDefinition({
        id: 'objectFit',
        name: 'Image Object Fit',
        description: 'How the product image should fit within its container',
        type: 'enum',
        values: ['contain', 'cover', 'fill', 'none', 'scale-down'],
        defaultValue: 'contain',
    })
    objectFit?: string;

    @AttributeDefinition({
        id: 'borderRadius',
        name: 'Border Radius',
        description: 'Corner roundness of the tile card',
        type: 'enum',
        values: ['none', 'sm', 'md', 'lg', 'xl', '2xl'],
        defaultValue: 'xl',
    })
    borderRadius?: string;

    @AttributeDefinition({
        id: 'boxShadow',
        name: 'Box Shadow',
        description: 'Shadow effect for the tile card',
        type: 'enum',
        values: ['none', 'sm', 'md', 'lg', 'xl', '2xl'],
        defaultValue: 'sm',
    })
    boxShadow?: string;

    @AttributeDefinition({
        id: 'padding',
        name: 'Padding',
        description: 'Padding on all sides of the tile',
        type: 'enum',
        values: ['0', '2', '4', '6', '8'],
        defaultValue: '0',
    })
    padding?: string;

    @AttributeDefinition({
        id: 'margin',
        name: 'Margin',
        description: 'Margin on all sides of the tile',
        type: 'enum',
        values: ['0', '2', '4', '6', '8'],
        defaultValue: '0',
    })
    margin?: string;

    @AttributeDefinition({
        id: 'fontWeight',
        name: 'Font Weight',
        description: 'Weight of the product name text',
        type: 'enum',
        values: ['normal', 'medium', 'semibold', 'bold'],
        defaultValue: 'semibold',
    })
    fontWeight?: string;

    @AttributeDefinition({
        id: 'letterSpacing',
        name: 'Letter Spacing',
        description: 'Spacing between letters in product name',
        type: 'enum',
        values: ['tighter', 'tight', 'normal', 'wide', 'wider'],
        defaultValue: 'normal',
    })
    letterSpacing?: string;

    @AttributeDefinition({
        id: 'hoverEffect',
        name: 'Hover Effect',
        description: 'Interactive hover effect for the tile',
        type: 'enum',
        values: ['default', 'scale', 'shadow', 'lift'],
        defaultValue: 'default',
    })
    hoverEffect?: string;
}
/* v8 ignore stop */

// Helper function to map Page Designer attribute values to Tailwind classes
const getPageDesignerStyleClasses = ({
    objectFit,
    borderRadius,
    boxShadow,
    padding,
    margin,
    fontWeight,
    letterSpacing,
    hoverEffect,
}: Partial<ProductTileProps>) => {
    const classes: string[] = [];

    // Object fit for images - override existing styles
    if (objectFit) {
        const fitMap = {
            contain: '[&_img]:!object-contain',
            cover: '[&_img]:!object-cover',
            fill: '[&_img]:!object-fill',
            none: '[&_img]:!object-none',
            'scale-down': '[&_img]:!object-scale-down',
        };
        classes.push(fitMap[objectFit]);
    }

    // Border radius - override default rounded-xl
    if (borderRadius) {
        const radiusMap = {
            none: '!rounded-none',
            sm: '!rounded-sm',
            md: '!rounded-md',
            lg: '!rounded-lg',
            xl: '!rounded-xl',
            '2xl': '!rounded-2xl',
        };
        classes.push(radiusMap[borderRadius]);
    }

    // Box shadow - override default shadow-sm and hover:shadow-md
    if (boxShadow === 'none') {
        classes.push('!shadow-none hover:!shadow-none');
    } else if (boxShadow) {
        const shadowMap = {
            sm: '!shadow-sm hover:!shadow-sm',
            md: '!shadow-md hover:!shadow-md',
            lg: '!shadow-lg hover:!shadow-lg',
            xl: '!shadow-xl hover:!shadow-xl',
            '2xl': '!shadow-2xl hover:!shadow-2xl',
        };
        classes.push(shadowMap[boxShadow]);
    }

    // Padding - applied to wrapper
    if (padding && padding !== '0') {
        classes.push(`p-${padding}`);
    }

    // Margin - applied to wrapper
    if (margin && margin !== '0') {
        classes.push(`m-${margin}`);
    }

    // Font weight - apply to product name Link
    if (fontWeight) {
        const weightMap = {
            normal: '[&_a]:!font-normal',
            medium: '[&_a]:!font-medium',
            semibold: '[&_a]:!font-semibold',
            bold: '[&_a]:!font-bold',
        };
        classes.push(weightMap[fontWeight]);
    }

    // Letter spacing - apply to product name Link
    if (letterSpacing) {
        const spacingMap = {
            tighter: '[&_a]:!tracking-tighter',
            tight: '[&_a]:!tracking-tight',
            normal: '[&_a]:!tracking-normal',
            wide: '[&_a]:!tracking-wide',
            wider: '[&_a]:!tracking-wider',
        };
        classes.push(spacingMap[letterSpacing]);
    }

    // Hover effects - override default hover:shadow-md
    if (hoverEffect && hoverEffect !== 'default') {
        const hoverMap = {
            scale: 'hover:!scale-105 !transition-transform !duration-200 hover:!shadow-md',
            shadow: 'hover:!shadow-xl !transition-shadow !duration-200',
            lift: 'hover:!-translate-y-1 hover:!shadow-lg !transition-all !duration-200',
        };
        classes.push(hoverMap[hoverEffect]);
    }

    return classes.join(' ');
};

const ProductTile = forwardRef<HTMLDivElement, ProductTileProps>(
    (
        {
            className,
            product,
            maxSwatches = PRODUCT_TILE_MAX_SWATCHES,
            footerAction,
            disableSwatchInteraction = false,
            selectedVariantColorValue,
            handleProductClick,
            imgAspectRatio,
            // Page Designer styling props
            objectFit,
            borderRadius,
            boxShadow,
            padding,
            margin,
            fontWeight,
            letterSpacing,
            hoverEffect,
            // Page Designer system props (filter out)
            regionId: _regionId,
            component: _component,
            componentData: _componentData,
            designMetadata: _designMetadata,
            data: _data,
            ...props
        },
        ref
    ) => {
        const { navigate, config, t, currency, swatchMode, getBadges } = useProductTileContext();
        const { hasBadges, badges } = useMemo(() => getBadges(product), [getBadges, product]);

        // Use config default if imgAspectRatio is not provided
        const effectiveImgAspectRatio = imgAspectRatio ?? config.global.productListing.defaultProductTileImgAspectRatio;

        // Business logic: use representedProduct for product-tile swatches if available
        // For wishlist items, prioritize selectedVariantColorValue
        const isMasterProd = !!product?.variants;
        const initialVariationValue =
            selectedVariantColorValue !== undefined && selectedVariantColorValue !== null
                ? selectedVariantColorValue
                : isMasterProd && !!product?.representedProduct
                  ? product?.variants?.find((variant) => variant?.productId == product?.representedProduct?.id)
                        ?.variationValues?.[PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID]
                  : undefined;
        const [selectedAttributeValue, setSelectedAttributeValue] = useState<string | null>(
            initialVariationValue || null
        );

        // Update selectedAttributeValue when selectedVariantColorValue changes (for wishlist)
        useEffect(() => {
            if (selectedVariantColorValue !== undefined && selectedVariantColorValue !== null) {
                setSelectedAttributeValue(selectedVariantColorValue);
            }
        }, [selectedVariantColorValue]);
        const variationAttributes = useMemo(() => getDecoratedVariationAttributes(product), [product]);
        const swatchesVariationAttributes = variationAttributes.filter(
            ({ id }) => PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID === id
        );

        const handleAttributeChange = useCallback((attributeValue: string) => {
            setSelectedAttributeValue(attributeValue);
        }, []);

        const handleMoreOptions = useCallback(() => {
            handleProductClick?.(product);
            // Navigate to PDP page with selected attribute if available
            const productUrl = createProductUrl(
                product.productId,
                selectedAttributeValue,
                PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID
            );
            void navigate(productUrl);
        }, [navigate, product, selectedAttributeValue, handleProductClick]);

        // Apply Page Designer styling if any styling props are provided
        const pageDesignerStyles = getPageDesignerStyleClasses({
            objectFit,
            borderRadius,
            boxShadow,
            padding,
            margin,
            fontWeight,
            letterSpacing,
            hoverEffect,
        });

        return (
            <Card
                ref={ref}
                className={cn(
                    'group rounded-xl overflow-hidden w-full min-w-0 max-w-full flex flex-col h-full gap-0 py-0 transition-all duration-200',
                    pageDesignerStyles,
                    className
                )}
                {...props}>
                {/* Image area with overlaid badges */}
                <CardHeader className="p-0 relative">
                    <div className="relative overflow-hidden">
                        <ProductImageContainer
                            product={product}
                            selectedColorValue={
                                PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID === 'color' ? selectedAttributeValue : null
                            }
                            imgAspectRatio={effectiveImgAspectRatio}
                            className="w-full aspect-square [&_img]:object-cover! [&_img]:h-full! [&_img]:max-w-full! [&_img]:mx-auto!"
                            handleProductClick={handleProductClick}
                        />

                        {/* Badges overlaid top-left */}
                        {hasBadges && (
                            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                                {badges.map((badge) => (
                                    <Badge
                                        key={badge.label}
                                        variant="default"
                                        className="text-xs leading-3 font-medium">
                                        {badge.label}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </CardHeader>

                {/* Swatches */}
                <CardContent className="px-4 pt-3 pb-0">
                    {swatchesVariationAttributes.length > 0 && (
                        <Suspense fallback={<ProductTileSwatchesSkeleton count={maxSwatches} />}>
                            <LazySwatches
                                variationAttributes={swatchesVariationAttributes}
                                maxSwatches={maxSwatches}
                                selectedAttributeValue={selectedAttributeValue}
                                handleAttributeChange={handleAttributeChange}
                                disableSwatchInteraction={disableSwatchInteraction}
                                selectedVariantColorValue={selectedVariantColorValue}
                                swatchMode={swatchMode}
                            />
                        </Suspense>
                    )}
                </CardContent>

                {/* Product name */}
                <CardContent className="px-4 pt-2 pb-0">
                    <Link
                        to={createProductUrl(product.productId)}
                        className="text-card-foreground font-semibold text-sm leading-snug hover:underline line-clamp-2 block"
                        onClick={() => {
                            handleProductClick?.(product);
                        }}>
                        {product.productName}
                    </Link>
                </CardContent>

                {/* Price + promo callout */}
                <CardContent className="px-4 pt-2 pb-0">
                    <ProductPrice
                        type="unit"
                        product={product}
                        currency={currency}
                        labelForA11y={product?.productName}
                        currentPriceProps={{
                            className: 'text-card-foreground font-semibold text-sm leading-none',
                        }}
                        listPriceProps={{
                            className: 'text-muted-foreground text-sm leading-none line-through',
                        }}
                        promoCalloutProps={{
                            className: 'text-xs text-green-600 mt-1',
                        }}
                        className="text-sm"
                    />
                </CardContent>

                {/* Action button */}
                <CardFooter className="px-4 pt-3 pb-4 mt-auto">
                    {footerAction !== undefined ? (
                        footerAction
                    ) : (
                        <Button className="w-full text-sm font-normal" size="default" onClick={handleMoreOptions}>
                            {t('moreOptions')}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        );
    }
);

ProductTile.displayName = 'ProductTile';

export { ProductTile };
// eslint-disable-next-line react-refresh/only-export-components
export { ProductTileProvider, useProductTileContext } from './context';
export default ProductTile;
