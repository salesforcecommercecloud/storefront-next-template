'use client';

// React & Router
import { forwardRef, type ComponentProps, useState, useCallback, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';

// Types
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';

// Libs & Utils
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { createProductUrl, getDecoratedVariationAttributes } from '@/lib/product-utils';
import { getProductBadges } from '@/lib/product-badges';
import uiStrings from '@/temp-ui-string';
import { useConfig } from '@/config';

// Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { ProductImageContainer } from '@/components/product-image';
import { SwatchGroup, Swatch } from '@/components/swatch-group';

interface ProductTileProps extends ComponentProps<'div'> {
    product: ShopperSearch.schemas['ProductSearchHit'];
    maxSwatches?: number;
    /** Custom footer action button. If provided, replaces the default "More Options" button */
    footerAction?: React.ReactNode;
    /** If true, swatches are displayed but not interactive (read-only mode for wishlist) */
    disableSwatchInteraction?: boolean;
    /** For variant products in read-only mode, filter swatches to only show this variant's color value */
    selectedVariantColorValue?: string | null;
}

// Simple component to display the "+X more" indicator for additional swatches
const MoreSwatchesIndicator = ({ count }: { count: number }) => (
    <div
        className="relative shrink-0 rounded-full border-2 border-border bg-background flex items-center justify-center cursor-pointer w-7 h-7"
        title={`+${count}`}>
        <svg className="text-muted-foreground w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    </div>
);

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
            ...props
        },
        ref
    ) => {
        const navigate = useNavigate();
        const config = useConfig();
        const { hasBadges, badges } = getProductBadges({
            product,
            badgeDetails: config.global.badges,
            maxBadges: 2,
        });

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

        const handleAttributeChange = useCallback((attributeValue: string) => {
            setSelectedAttributeValue(attributeValue);
        }, []);

        const handleMoreOptions = useCallback(() => {
            // Navigate to PDP page with selected attribute if available
            const productUrl = createProductUrl(
                product.productId,
                selectedAttributeValue,
                PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID
            );
            void navigate(productUrl);
        }, [navigate, product.productId, selectedAttributeValue]);

        // Detect if we're on desktop (≥1024px) to determine swatch interaction mode
        const swatchMode = useMemo(() => {
            if (typeof window === 'undefined') {
                return 'click'; // Default to click on server
            }
            const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
            return isDesktop ? 'hover' : 'click';
        }, []);

        return (
            <Card
                ref={ref}
                className={cn(
                    'group border rounded-xl overflow-hidden w-full min-w-0 flex flex-col-reverse h-full shadow-sm gap-0 py-0 transition-all duration-200 hover:shadow-md',
                    className
                )}
                {...props}>
                <CardFooter className="px-6 pb-6 pt-6">
                    {footerAction !== undefined ? (
                        footerAction
                    ) : (
                        <Button className="w-full text-sm font-normal" size="default" onClick={handleMoreOptions}>
                            {uiStrings.product.moreOptions}
                        </Button>
                    )}
                </CardFooter>

                <CardContent className="px-6 pb-0 pt-0 flex flex-row gap-1.5 items-start justify-start self-stretch relative h-24">
                    <div className="flex flex-col gap-1.5 items-start justify-start relative flex-1 min-w-0 h-full">
                        {/* Fixed height for product title - exactly 2 lines */}
                        <div className="h-10 flex items-start">
                            <Link
                                to={createProductUrl(product.productId)}
                                className="text-card-foreground text-left font-semibold text-sm leading-[1.25] relative hover:underline line-clamp-2 overflow-hidden block"
                                style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>
                                {product.productName}
                            </Link>
                        </div>

                        {/* Fixed height for variant selector area */}
                        <div className="h-8 flex items-center">
                            {/* Attribute Swatch Group - Configurable */}
                            {variationAttributes
                                ?.filter(({ id }) => PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID === id)
                                ?.map(({ id, name, values }) => {
                                    // For variant products in wishlist: filter to show only the selected variant's swatch
                                    // For master products: show all swatches and allow interaction
                                    const isVariantProduct = disableSwatchInteraction && selectedVariantColorValue;
                                    const swatchesToShow = isVariantProduct
                                        ? values?.filter((v) => v.value === selectedVariantColorValue) || []
                                        : values?.slice(0, maxSwatches) || [];

                                    // Only disable interaction for variant products (when selectedVariantColorValue is provided)
                                    // Master products should allow interaction for preview
                                    const shouldDisableInteraction = isVariantProduct;

                                    return (
                                        <SwatchGroup
                                            key={id}
                                            ariaLabel={name}
                                            value={selectedAttributeValue || ''}
                                            handleChange={shouldDisableInteraction ? undefined : handleAttributeChange}>
                                            {swatchesToShow.map(({ name: valueName, swatch, value }) => {
                                                // For color attributes, show swatch image/color; for others, show text
                                                const content =
                                                    swatch && id === 'color' ? (
                                                        <div
                                                            className="bg-no-repeat bg-cover bg-center rounded-full w-full h-full"
                                                            style={{
                                                                backgroundColor: valueName?.toLowerCase(),
                                                                backgroundImage: `url(${swatch?.disBaseLink || swatch.link})`,
                                                            }}
                                                            aria-label={valueName}
                                                        />
                                                    ) : (
                                                        <span className="text-xs font-medium truncate">
                                                            {valueName}
                                                        </span>
                                                    );

                                                return (
                                                    <Swatch
                                                        key={value}
                                                        value={value}
                                                        name={valueName}
                                                        shape={id === 'color' ? 'circle' : 'square'}
                                                        size="md"
                                                        selected={selectedAttributeValue === value}
                                                        disabled={false}
                                                        handleSelect={
                                                            shouldDisableInteraction
                                                                ? undefined
                                                                : (attributeValue: string | null) => {
                                                                      if (attributeValue !== null) {
                                                                          handleAttributeChange(attributeValue);
                                                                      }
                                                                  }
                                                        }
                                                        isFocusable={!shouldDisableInteraction}
                                                        mode={shouldDisableInteraction ? undefined : swatchMode}>
                                                        {content}
                                                    </Swatch>
                                                );
                                            })}
                                            {/* Only show "more" indicator if not filtering to single variant and there are more swatches */}
                                            {!isVariantProduct && values && values.length > maxSwatches && (
                                                <MoreSwatchesIndicator count={values.length - maxSwatches} />
                                            )}
                                        </SwatchGroup>
                                    );
                                })}
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

                        <div className="text-card-foreground text-right font-semibold text-base leading-none relative">
                            {formatCurrency(product.price || 0)}
                        </div>
                    </div>
                </CardContent>

                <CardHeader className="py-8 px-6 flex flex-col gap-4 items-center justify-center flex-1">
                    <div className="bg-background rounded-xl overflow-hidden flex items-center justify-center">
                        <ProductImageContainer
                            product={product}
                            selectedColorValue={
                                PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID === 'color' ? selectedAttributeValue : null
                            }
                            className="w-full !aspect-auto [&_img]:!object-contain [&_img]:!h-auto [&_img]:!max-w-full [&_img]:!mx-auto"
                        />
                    </div>
                </CardHeader>
            </Card>
        );
    }
);

ProductTile.displayName = 'ProductTile';

export { ProductTile };
export default ProductTile;
