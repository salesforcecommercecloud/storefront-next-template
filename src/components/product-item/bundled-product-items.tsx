'use client';

// React
import { useMemo, type ReactElement } from 'react';

// Commerce SDK
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

// Utils
import { getDisplayVariationValues } from '@/lib/product-utils';

// Constants
import uiStrings from '@/temp-ui-string';

/**
 * BundledProductItems component that displays bundled product items
 *
 * @param props - Component props
 * @param props.bundledProducts - Array of bundled products with full product details and quantity
 * @returns JSX element with bundled product items list or null if no items
 */
export default function BundledProductItems({
    bundledProducts,
}: {
    bundledProducts: ShopperProducts.schemas['BundledProduct'][];
}): ReactElement {
    const allVariationDisplayValues = useMemo(
        () =>
            bundledProducts.map((bundledProduct) =>
                getDisplayVariationValues(
                    bundledProduct.product.variationAttributes,
                    bundledProduct.product.variationValues
                )
            ),
        [bundledProducts]
    );

    return (
        <div className="mt-2 space-y-2" data-testid="bundledProductItems">
            <div className="text-sm font-medium">{uiStrings.cart.bundle.selectedOptions}:</div>
            <div className="space-y-2 pl-2">
                {bundledProducts.map((bundledProduct, index) => {
                    const product = bundledProduct.product;
                    const variationDisplayValues = allVariationDisplayValues[index];

                    return (
                        <div key={product.id || index} className="space-y-0.5">
                            {/* Product name */}
                            <div className="text-sm text-foreground">{product.name}</div>

                            {/* Variation attributes */}
                            {Object.keys(variationDisplayValues).length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                    {Object.entries(variationDisplayValues).map(([attrName, attrValue]) => (
                                        <span key={attrName}>
                                            {attrName}: {attrValue}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Quantity */}
                            <div className="text-sm text-muted-foreground">
                                {uiStrings.cart.attributes.quantity} {bundledProduct.quantity}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
