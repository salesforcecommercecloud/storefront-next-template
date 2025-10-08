import { useState, useMemo } from 'react';
import type { ShopperSearchTypes } from 'commerce-sdk-isomorphic';
import { ProductImageContainer } from '../product-image';
import { SwatchGroup, Swatch } from '@/components/swatch-group';
import { getDecoratedVariationAttributes } from '@/lib/product-utils';

const PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID = 'color';

interface ProductTileProps {
    product: ShopperSearchTypes.ProductSearchHit;
    maxSwatches?: number;
    className?: string;
}

const ProductTile = ({ product, maxSwatches = 4, className }: ProductTileProps) => {
    const isMasterProd = !!product?.variants;
    const initialVariationValue =
        isMasterProd && !!product?.representedProduct
            ? product?.variants?.find((variant) => variant?.productId == product?.representedProduct?.id)
                  ?.variationValues?.[PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID]
            : undefined;
    const [selectedAttributeValue, setSelectedAttributeValue] = useState(initialVariationValue);
    const variationAttributes = useMemo(() => getDecoratedVariationAttributes(product), [product]);

    // Detect if we're on desktop (≥1024px) to determine swatch interaction mode
    const swatchMode = useMemo(() => {
        if (typeof window === 'undefined') {
            return 'click'; // Default to click on server
        }
        const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
        return isDesktop ? 'hover' : 'click';
    }, []);

    return (
        <div className={className}>
            {/* Product Image Container with color-aware image */}
            <ProductImageContainer product={product} selectedColorValue={selectedAttributeValue} />

            {/* Color Swatch Group - Render color attributes if they exist */}
            {variationAttributes
                ?.filter(({ id }) => PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID === id)
                ?.map(({ id, name, values }) => (
                    <SwatchGroup
                        ariaLabel={name}
                        key={id}
                        value={selectedAttributeValue}
                        handleChange={(value: string) => {
                            setSelectedAttributeValue(value);
                        }}>
                        {values?.slice(0, maxSwatches).map(({ name: valueName, swatch, value }) => {
                            const content = swatch ? (
                                <div
                                    className="bg-no-repeat bg-cover bg-center rounded-full min-w-6 min-h-6 w-ful h-full"
                                    style={{
                                        backgroundColor: valueName?.toLowerCase(),
                                        backgroundImage: `url(${swatch?.disBaseLink || swatch.link})`,
                                    }}
                                />
                            ) : (
                                <span className="text-xs font-medium truncate">{valueName}</span>
                            );

                            return (
                                <Swatch
                                    key={value}
                                    value={value}
                                    name={valueName}
                                    shape="circle"
                                    isFocusable={true}
                                    mode={swatchMode}>
                                    {content}
                                </Swatch>
                            );
                        })}
                    </SwatchGroup>
                ))}
        </div>
    );
};

export { ProductTile };
