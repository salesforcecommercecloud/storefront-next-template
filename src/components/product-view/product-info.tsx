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
import { useConfig } from '@/config';
import ProductPrice from '../product-price';
import { isProductSet, isProductBundle } from '@/lib/product-utils';
import ProductFeatures from './product-features';
import { DEFAULT_PRODUCT_FEATURES_CONFIG } from '@/config/product-features';
import InventoryMessage from '../inventory-message';
import { useCurrentVariant } from '@/hooks/product/use-current-variant';
import { useTranslation } from 'react-i18next';
// @sfdc-extension-line SFDC_EXT_BOPIS
import DeliveryOptions from '@/extensions/bopis/components/delivery-options/delivery-options';

type ProductInfoBaseProps = {
    product: ShopperProducts.schemas['Product'];
    hideVariantSelection?: boolean;
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
}: ProductInfoProps): ReactElement {
    const config = useConfig();
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

    return (
        <div className="grid gap-4">
            {/* Desktop Product Title - hidden on mobile */}
            <div className="hidden md:block">
                <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
                {product.shortDescription && (
                    <p className="mt-2 text-lg text-muted-foreground">{product.shortDescription}</p>
                )}
            </div>

            {/* Price - show unit price on PDP */}
            <div>
                <ProductPrice
                    type="unit"
                    product={product}
                    quantity={quantity}
                    currency={currency}
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
                // When hideVariantSelection is true, only show the selected swatch (read-only)
                const swatchesToShow = hideVariantSelection
                    ? values.filter((v) => v.value === selectedValue?.value)
                    : values;

                const swatches = swatchesToShow.map((value) => {
                    const { href, name: valueName, image, value: swatchValue, orderable } = value;
                    const swatchImageUrl = (image && toImageUrl({ image, config })) || '';
                    const content = image ? (
                        <div
                            className="w-full h-full bg-cover bg-center bg-no-repeat rounded-full"
                            style={{ backgroundImage: swatchImageUrl ? `url(${swatchImageUrl})` : undefined }}
                            aria-label={image.alt || valueName}
                        />
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
                            shape={id === 'color' ? 'circle' : 'square'}>
                            {content}
                        </Swatch>
                    );
                });
                return (
                    <SwatchGroup
                        key={id}
                        value={swatchMode === 'uncontrolled' ? selectedValue?.value : variationValues?.[id]}
                        displayName={selectedValue?.name || ''}
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

            {/* Quantity Selector - Only for non-set/bundle products and not when opened from cart page */}
            {!isProductASet && !isProductABundle && mode !== 'edit' && (
                <ProductQuantityPicker
                    value={quantity.toString()}
                    onChange={setQuantity}
                    stockLevel={stockLevel}
                    isOutOfStock={isOutOfStock}
                    productName={product.name}
                    maxQuantity={maxQuantity}
                />
            )}

            {/* Product Features - Only shown if longDescription is different from shortDescription */}
            {product.longDescription && product.longDescription !== product.shortDescription && (
                <ProductFeatures
                    product={product}
                    delimiter={DEFAULT_PRODUCT_FEATURES_CONFIG.delimiter}
                    htmlFragmentClassName={DEFAULT_PRODUCT_FEATURES_CONFIG.htmlFragmentClassName}
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
