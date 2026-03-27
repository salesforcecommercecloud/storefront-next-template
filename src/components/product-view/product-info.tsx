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

import { type ReactElement } from 'react';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import ProductQuantityPicker from '@/components/product-quantity-picker';
import { SwatchGroup, Swatch } from '@/components/swatch-group';
import { useVariationAttributes } from '@/hooks/product/use-variation-attributes';
import { useProductView } from '@/providers/product-view';
import { useCurrency } from '@/providers/currency';
import { toImageUrl } from '@/lib/dynamic-image';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import ProductPrice from '../product-price';
import { isProductSet, isProductBundle } from '@/lib/product-utils';
import InventoryMessage from '../inventory-message';
import { ProductRatingSummary } from './product-rating-summary';
import { useCurrentVariant } from '@/hooks/product/use-current-variant';
import { useTranslation } from 'react-i18next';
import { WishlistButton } from '@/components/buttons/wishlist-button';
import { ShareButton } from '@/components/buttons/share-button';
// @sfdc-extension-line SFDC_EXT_BOPIS
import DeliveryOptions from '@/extensions/bopis/components/delivery-options/delivery-options';

type ProductInfoBaseProps = {
    product: ShopperProducts.schemas['Product'];
    hideVariantSelection?: boolean;
    /** Layout style: 'full' (default) shows title, description, inventory; 'compact' shows brand, smaller title, sorted attributes */
    variantStyle?: 'full' | 'compact';
    /** When true and mode is 'edit', show quantity picker (e.g. in cart edit modal) */
    showQuantityInEditMode?: boolean;
};
type ProductInfoUncontrolledProps = ProductInfoBaseProps & {
    /** Mode for swatch interaction: 'uncontrolled' uses URL navigation */
    swatchMode?: 'uncontrolled';
    onAttributeChange?: never;
    variationValues?: never;
};
type ProductInfoControlledProps = ProductInfoBaseProps & {
    /** Mode for swatch interaction: 'controlled' uses callback */
    swatchMode: 'controlled';
    /** Callback when variant attribute changes in controlled mode */
    onAttributeChange: (attributeId: string, value: string) => void;
    /** Controlled variation values for controlled mode (e.g., {color: 'red', size: 'M'}) */
    variationValues: { [key: string]: string };
};
type ProductInfoProps = ProductInfoUncontrolledProps | ProductInfoControlledProps;
/**
 * ProductInfo component displays product details including title, description, price, variants, and quantity picker
 *
 * Supports two swatch modes:
 * - uncontrolled mode (default): Swatches use URL navigation for variant selection
 * - controlled mode: Swatches use callbacks for controlled variant selection (used in modals)
 *
 * @param props - Component props
 * @param props.product - The product data to display
 * @param props.swatchMode - Swatch interaction mode ('uncontrolled' or 'controlled')
 * @param props.onAttributeChange - Callback for controlled mode variant changes
 * @param props.variationValues - Controlled variation values for controlled mode
 * @returns JSX element with product information display
 */
export default function ProductInfo({
    product,
    swatchMode = 'uncontrolled',
    onAttributeChange,
    variationValues,
    hideVariantSelection = false,
    variantStyle = 'full',
    showQuantityInEditMode = false,
}: ProductInfoProps): ReactElement {
    const config = useConfig<AppConfig>();
    const isProductASet = isProductSet(product);
    const isProductABundle = isProductBundle(product);
    // Use variation attributes hook for URL-aware swatches
    const variationAttributes = useVariationAttributes({ product });
    // Get current variant for UI display
    const currentVariant = useCurrentVariant({ product });
    // Get currency from context (automatically derived from locale)
    const currency = useCurrency();
    // Get shared state from context
    const {
        quantity,
        isOutOfStock,
        stockLevel,
        maxQuantity,
        setQuantity,
        mode,
        // @sfdc-extension-line SFDC_EXT_BOPIS
        basketPickupStore,
    } = useProductView();

    const { t } = useTranslation('product');

    const isCompactStyle = variantStyle === 'compact';
    const showQuantity = !isProductASet && !isProductABundle && (mode !== 'edit' || showQuantityInEditMode);

    // In compact mode, sort variation attributes by priority order
    const COMPACT_ATTRIBUTE_ORDER = ['size', 'color'];
    const sortedVariationAttributes = isCompactStyle
        ? [...variationAttributes].sort((a, b) => {
              const aIndex = COMPACT_ATTRIBUTE_ORDER.indexOf(a.id);
              const bIndex = COMPACT_ATTRIBUTE_ORDER.indexOf(b.id);
              // Attributes not in the list sort to the end, preserving original order
              const aPriority = aIndex === -1 ? COMPACT_ATTRIBUTE_ORDER.length : aIndex;
              const bPriority = bIndex === -1 ? COMPACT_ATTRIBUTE_ORDER.length : bIndex;
              return aPriority - bPriority;
          })
        : variationAttributes;

    return (
        <div className="relative grid gap-4">
            {/* Action icons — top-right */}
            {!isCompactStyle && (
                <div className="absolute top-0 right-0 flex items-center gap-2 z-10">
                    <WishlistButton
                        product={{
                            productId: product.id,
                            productName: product.name,
                            price: product.price,
                            image: product.imageGroups?.[0]?.images?.[0],
                        }}
                        size="sm"
                        className="!static border border-border bg-background/90 shadow-none hover:border-muted-foreground/50 hover:bg-background"
                    />
                    <ShareButton
                        product={product}
                        size="sm"
                        className="!static border border-border bg-background/90 shadow-none hover:bg-background hover:border-muted-foreground/50 [&_svg]:stroke-[2]"
                    />
                </div>
            )}

            {/* Compact style: brand (uppercase) then product name */}
            {isCompactStyle && (
                <>
                    {product.brand && (
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {product.brand}
                        </p>
                    )}
                    <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
                </>
            )}

            {/* Product Title, SKU, Description */}
            {!isCompactStyle && (
                <div className="pr-20">
                    <h1
                        data-testid="product-title"
                        className="text-2xl lg:text-3xl font-medium text-foreground tracking-tight">
                        {product.name}
                    </h1>
                    {product.id && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            {t('sku')} {product.id}
                        </p>
                    )}
                    {product.shortDescription && (
                        <p className="mt-2 text-lg text-muted-foreground">{product.shortDescription}</p>
                    )}
                </div>
            )}
            {/* Rating summary - visible on both mobile and desktop */}
            {!isCompactStyle && <ProductRatingSummary />}

            {/* Price - show unit price on PDP */}
            <div className="space-y-3">
                <ProductPrice
                    type="unit"
                    product={product}
                    quantity={quantity}
                    currency={currency}
                    labelForA11y={product?.name}
                    currentPriceProps={{
                        className: 'text-xl font-bold text-foreground',
                    }}
                    promoCalloutProps={{
                        className: 'text-sm [&_span]:mx-0 [&_span]:text-status-positive',
                    }}
                    hidePromo={isCompactStyle}
                    currentPriceOnly={isCompactStyle}
                />
            </div>

            {/* Inventory Status Message - hidden in compact/edit mode */}
            {!isCompactStyle && (
                <InventoryMessage
                    product={product}
                    currentVariant={currentVariant}
                    lowStockThreshold={config.global.inventory.lowStockThreshold}
                    maxStockDisplay={config.global.inventory.maxStockDisplay}
                />
            )}

            {/* Swatch Groups for Product Variations */}
            {sortedVariationAttributes.map(({ id, name, selectedValue, values }) => {
                // In controlled mode, derive display name from variationValues state
                const controlledValue = variationValues?.[id];
                const controlledDisplayName = controlledValue
                    ? values.find((v) => v.value === controlledValue)?.name || ''
                    : '';

                // When hideVariantSelection is true, only show the selected swatch (read-only)
                const swatchesToShow = hideVariantSelection
                    ? values.filter((v) => v.value === selectedValue?.value)
                    : values;

                const swatches = swatchesToShow.map((value) => {
                    const { href, name: valueName, image, value: swatchValue, orderable } = value;
                    const swatchImageUrl = (image && toImageUrl({ image, config })) || '';
                    const content = image ? (
                        <>
                            <span
                                className="rounded-pill bg-cover bg-center bg-no-repeat"
                                style={{
                                    width: 'var(--swatch-color-dot, 100%)',
                                    height: 'var(--swatch-color-dot, 100%)',
                                    backgroundColor: valueName?.toLowerCase(),
                                    backgroundImage: swatchImageUrl ? `url(${swatchImageUrl})` : undefined,
                                    border: 'var(--swatch-color-dot-border, none)',
                                }}
                                aria-label={image.alt || valueName}
                            />
                            <span
                                className="text-xs font-medium capitalize ml-1"
                                style={{ display: 'var(--swatch-color-label)' }}>
                                {valueName}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs font-medium">{valueName}</span>
                    );

                    return (
                        <Swatch
                            key={swatchValue}
                            href={swatchMode === 'uncontrolled' ? href : undefined}
                            // Disable when not orderable (out of stock)
                            disabled={!orderable}
                            value={swatchValue}
                            name={valueName}
                            shape={id === 'color' ? 'color' : 'label'}
                            labeled>
                            {content}
                        </Swatch>
                    );
                });
                return (
                    <SwatchGroup
                        key={id}
                        value={swatchMode === 'uncontrolled' ? selectedValue?.value : controlledValue}
                        displayName={swatchMode === 'controlled' ? controlledDisplayName : selectedValue?.name || ''}
                        label={name}
                        handleChange={
                            // Disable handleChange when hideVariantSelection is true
                            hideVariantSelection
                                ? undefined
                                : swatchMode === 'controlled'
                                  ? (value) => onAttributeChange?.(id, value)
                                  : undefined
                        }>
                        {swatches}
                    </SwatchGroup>
                );
            })}

            {/* @sfdc-extension-block-start SFDC_EXT_BOPIS */}
            {/* Delivery Options - For individual products */}
            {/* Hide for non-pickup items when opened from cart page */}
            {!isOutOfStock && (mode !== 'edit' || basketPickupStore) && !(isProductABundle || isProductASet) && (
                <DeliveryOptions
                    product={product}
                    quantity={quantity}
                    basketPickupStore={basketPickupStore}
                    className="mt-6"
                />
            )}
            {/* @sfdc-extension-block-end SFDC_EXT_BOPIS */}

            {/* Quantity Selector - for non-set/bundle when not edit mode, or when showQuantityInEditMode in edit mode */}
            {showQuantity && (
                <ProductQuantityPicker
                    value={quantity.toString()}
                    onChange={setQuantity}
                    stockLevel={stockLevel}
                    isOutOfStock={isOutOfStock}
                    productName={product.name}
                    maxQuantity={maxQuantity}
                />
            )}

            {/* Product Bundle/Set Notice */}
            {(isProductASet || isProductABundle) && (
                <div className="bg-primary/10 border border-primary rounded-lg p-4">
                    <p className="text-sm text-primary">
                        {isProductASet ? t('productSetNotice') : t('productBundleNotice')}
                    </p>
                </div>
            )}
        </div>
    );
}
