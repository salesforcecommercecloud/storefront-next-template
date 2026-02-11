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

// Libs & Utils
import { cn } from '@/lib/utils';
import { createProductUrl, getDecoratedVariationAttributes } from '@/lib/product-utils';
import { useProductTileContext } from './context';

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
}

// Configure which attribute to show swatches for and how many to display
// Change these constants to adapt to different customer needs
const PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID = 'color';
const PRODUCT_TILE_MAX_SWATCHES = 2;

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

        return (
            <Card
                ref={ref}
                className={cn(
                    'group border rounded-xl overflow-hidden w-full min-w-0 max-w-full flex flex-col-reverse justify-end h-full shadow-sm gap-0 py-0 transition-all duration-200 hover:shadow-md',
                    className
                )}
                {...props}>
                <CardFooter className="px-6 pb-6 pt-6 flex-1 flex flex-col justify-end">
                    {footerAction !== undefined ? (
                        footerAction
                    ) : (
                        <Button className="w-full text-sm font-normal" size="default" onClick={handleMoreOptions}>
                            {t('moreOptions')}
                        </Button>
                    )}
                </CardFooter>

                <CardContent>
                    <ProductPrice
                        type="unit"
                        product={product}
                        currency={currency}
                        labelForA11y={product?.productName}
                        currentPriceProps={{
                            className: 'text-card-foreground text-right font-semibold text-sm leading-none relative',
                        }}
                        listPriceProps={{
                            className: 'text-muted-foreground text-right text-sm leading-none relative',
                        }}
                        className="text-sm mt-2"
                    />
                </CardContent>

                <CardContent className="px-6 pb-0 pt-0 flex flex-row gap-1.5 items-start justify-start self-stretch relative h-16">
                    <div className="flex flex-col gap-1 items-start justify-start relative flex-1 min-w-0 h-full">
                        <div className="h-10 flex items-start">
                            <Link
                                to={createProductUrl(product.productId)}
                                className="text-card-foreground text-left font-semibold text-sm leading-[1.25] relative hover:underline line-clamp-2 overflow-hidden block"
                                style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
                                onClick={() => {
                                    handleProductClick?.(product);
                                }}>
                                {product.productName}
                            </Link>
                        </div>

                        {/* Fixed height for variant selector area */}
                        <div className="h-8 flex items-end">
                            {/* Attribute Swatch Group - Lazy loaded to reduce hydration cost */}
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
                        </div>
                    </div>

                    <div className="flex flex-col gap-2.5 items-end justify-start shrink-0 relative w-max">
                        {hasBadges && (
                            <div className="flex flex-row gap-1.5 items-start justify-start shrink-0 relative">
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
                </CardContent>

                <CardHeader className="py-8 px-6 flex flex-col gap-4 items-center justify-center">
                    <div className="bg-background rounded-xl overflow-hidden flex items-center justify-center w-full">
                        <ProductImageContainer
                            product={product}
                            selectedColorValue={
                                PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID === 'color' ? selectedAttributeValue : null
                            }
                            imgAspectRatio={effectiveImgAspectRatio}
                            className="w-full aspect-square [&_img]:object-contain! [&_img]:h-full! [&_img]:max-w-full! [&_img]:mx-auto!"
                            handleProductClick={handleProductClick}
                        />
                    </div>
                </CardHeader>
            </Card>
        );
    }
);

ProductTile.displayName = 'ProductTile';

export { ProductTile };
// eslint-disable-next-line react-refresh/only-export-components
export { ProductTileProvider, useProductTileContext } from './context';
export default ProductTile;
