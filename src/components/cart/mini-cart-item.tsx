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

// React
import { type ReactElement, useMemo } from 'react';

// React Router
import { Link } from 'react-router';

// Commerce SDK
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

// Hooks
import { useItemFetcher } from '@/hooks/use-item-fetcher';
import { useCartQuantityUpdate } from '@/hooks/use-cart-quantity-update';
import { useConfig } from '@/config';
import { useTranslation } from 'react-i18next';

// Utils
import { findImageGroupBy } from '@/lib/image-groups-utils';
import { getDisplayVariationValues } from '@/lib/product-utils';
import { useCurrency } from '@/providers/currency';
import { toImageUrl } from '@/lib/dynamic-image';
import ProductPrice from '@/components/product-price';
import PromoCallout from '@/components/product-price/promo-callout';
import { Typography } from '@/components/typography';
import QuantityPicker from '@/components/quantity-picker/quantity-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import { ShoppingCart } from 'lucide-react';

/**
 * Basket item data enriched with product details for mini cart display
 */
type MiniCartItemProduct = ShopperBasketsV2.schemas['ProductItem'] &
    Partial<ShopperProducts.schemas['Product']> & {
        isProductUnavailable?: boolean;
    };

/**
 * Props for the MiniCartItem component
 *
 * @interface MiniCartItemProps
 * @property {MiniCartItemProduct} product - Combined basket item and product data
 * @property {function} [onRemove] - Optional callback when item is removed
 * @property {ReactElement} [bonusProductSlot] - Optional bonus product selection card to display
 */
interface MiniCartItemProps {
    /** Combined basket item and product data */
    product: MiniCartItemProduct;
    /** Optional callback when item is removed */
    onRemove?: () => void;
    /** Optional bonus product selection card to display in right section */
    bonusProductSlot?: ReactElement;
}

/**
 * MiniCartItem component for displaying products in the mini cart slideout
 *
 * This component handles:
 * - Product image display with variation-specific images
 * - Product name and variation attributes (color, size, etc.)
 * - Price display with savings indicators and promotion badges
 * - Quantity selection with dropdown (1-10) and custom input option
 * - Remove item functionality
 * - Responsive layout with product details on left and price on right
 *
 * Features:
 * - Debounced quantity updates to prevent API spam
 * - Fallback display for products without full details loaded
 * - Custom quantity input for values beyond 1-10
 * - Keyboard navigation support (Enter to confirm, Escape to cancel)
 * - Optimistic UI updates for better user experience
 *
 * @param props - Component props
 * @returns JSX element representing a mini cart item
 *
 * @example
 * ```tsx
 * <MiniCartItem
 *   product={enrichedProductItem}
 *   onRemove={handleRemove}
 * />
 * ```
 */
export default function MiniCartItem({ product, onRemove, bonusProductSlot }: MiniCartItemProps): ReactElement {
    const config = useConfig();
    const { t: tMiniCart, i18n } = useTranslation('miniCart');
    const { t: tRemoveItem } = useTranslation('removeItem');
    const currency = useCurrency();
    const productAltFallback = tMiniCart('productAltFallback') || 'Product';

    const fetcher = useItemFetcher({
        itemId: product.itemId || '',
        componentName: 'mini-cart-item',
    });

    const { quantity, handleQuantityChange } = useCartQuantityUpdate({
        itemId: product.itemId || '',
        initialValue: product.quantity || 1,
        fetcher,
    });

    // Find the product image for the current variation
    const imageGroup = findImageGroupBy(product?.imageGroups, {
        viewType: 'small',
        selectedVariationAttributes: product?.variationValues,
    });
    const image = imageGroup?.images?.[0];
    const optimizedImageUrl = toImageUrl({ image, config }) || '';

    // Get display variation values using the helper function (following template pattern)
    const displayVariationValues = useMemo(
        () => getDisplayVariationValues(product?.variationAttributes, product?.variationValues),
        [product?.variationAttributes, product?.variationValues]
    );

    // Build product URL for linking to PDP
    const productUrl = product.productId ? `/product/${product.productId}` : undefined;

    return (
        <div className="flex gap-4" data-testid="mini-cart-item">
            {/* Product Image */}
            <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 bg-muted rounded-lg overflow-hidden transition-all duration-500">
                {image ? (
                    productUrl ? (
                        <Link to={productUrl} className="block w-full h-full">
                            <img
                                src={optimizedImageUrl}
                                alt={image.alt || product?.productName || productAltFallback}
                                className="w-full h-full object-cover"
                            />
                        </Link>
                    ) : (
                        <img
                            src={optimizedImageUrl}
                            alt={image.alt || product?.productName || productAltFallback}
                            className="w-full h-full object-cover"
                        />
                    )
                ) : (
                    <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-xs">
                        {tMiniCart('noImage')}
                    </div>
                )}
            </div>

            {/* Product details */}
            <div className="flex-1 min-w-0 flex flex-col">
                {/* Product name + Delivery badge */}
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                        {productUrl ? (
                            <Link to={productUrl} className="hover:underline">
                                <h3 className="text-base font-semibold text-foreground line-clamp-2">
                                    {product.productName}
                                </h3>
                            </Link>
                        ) : (
                            <h3 className="text-base font-semibold text-foreground line-clamp-2">
                                {product.productName}
                            </h3>
                        )}
                        {Object.keys(displayVariationValues).length > 0 && (
                            <div className="mt-1 space-y-0.5">
                                {Object.entries(displayVariationValues).map(([name, value]) => (
                                    <Typography
                                        key={name}
                                        variant="body-small"
                                        className="text-muted-foreground inline-block w-full">
                                        <span>{name}: </span>
                                        <span>{value}</span>
                                    </Typography>
                                ))}
                            </div>
                        )}
                    </div>
                    <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                        <ShoppingCart className="w-3 h-3" />
                        {tMiniCart('delivery')}
                    </Badge>
                </div>

                {/* Price + Savings */}
                <div className="mb-2">
                    <ProductPrice
                        product={product}
                        currency={currency}
                        quantity={1}
                        type="unit"
                        labelForA11y={product.productName || productAltFallback}
                        currentPriceProps={{
                            className: 'text-base font-semibold text-foreground',
                        }}
                        listPriceProps={{
                            className: 'text-base',
                        }}
                        promoCalloutProps={{
                            className: 'hidden',
                        }}
                    />
                    {(() => {
                        const discount = product.priceAdjustments?.reduce((acc, adj) => acc + (adj.price ?? 0), 0) ?? 0;
                        return discount < 0 ? (
                            <Badge className="mt-1 bg-primary/10 text-primary border-transparent text-xs">
                                {tMiniCart('saved', {
                                    amount: formatCurrency(discount, i18n.language, currency),
                                })}
                            </Badge>
                        ) : null;
                    })()}
                </div>

                {/* Quantity Picker */}
                <div className="mb-2 flex items-center gap-2">
                    <Label
                        htmlFor={`quantity-${product.itemId}`}
                        className="text-sm font-normal text-foreground shrink-0">
                        {tMiniCart('quantityLabel')}
                    </Label>
                    <QuantityPicker
                        value={String(quantity)}
                        onChange={handleQuantityChange}
                        min={1}
                        productName={product.productName}
                    />
                </div>

                {/* Show promotional message after quantity */}
                <PromoCallout product={product} className="text-sm text-primary mb-2" />

                {/* Bonus Product Selection Card */}
                {bonusProductSlot && <div className="mt-3">{bonusProductSlot}</div>}

                <button
                    onClick={onRemove}
                    className="text-sm text-primary hover:underline text-left"
                    type="button"
                    aria-label={tMiniCart('removeItemAriaLabel')}>
                    {tRemoveItem('button')}
                </button>
            </div>
        </div>
    );
}
