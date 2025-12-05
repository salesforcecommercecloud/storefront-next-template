/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

'use client';

// React
import { type ReactElement, type ChangeEvent, useMemo, useState } from 'react';

// React Router
import { Link } from 'react-router';

// Commerce SDK
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

// Components
import { Badge } from '@/components/ui/badge';

// Hooks
import { useItemFetcher } from '@/hooks/use-item-fetcher';
import { useCartQuantityUpdate } from '@/hooks/use-cart-quantity-update';
import { useConfig } from '@/config';
import { useTranslation } from 'react-i18next';

// Utils
import { formatCurrency } from '@/lib/currency';
import { findImageGroupBy } from '@/lib/image-groups-utils';
import { getDisplayVariationValues } from '@/lib/product-utils';

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
 */
interface MiniCartItemProps {
    /** Combined basket item and product data */
    product: MiniCartItemProduct;
    /** Optional callback when item is removed */
    onRemove?: () => void;
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
export default function MiniCartItem({ product, onRemove }: MiniCartItemProps): ReactElement {
    const config = useConfig();
    const { t: tMiniCart } = useTranslation('miniCart');
    const { t: tActionCard } = useTranslation('actionCard');
    const { t: tRemoveItem } = useTranslation('removeItem');

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

    // Get display variation values using the helper function (following template pattern)
    const displayVariationValues = useMemo(
        () => getDisplayVariationValues(product?.variationAttributes, product?.variationValues),
        [product?.variationAttributes, product?.variationValues]
    );

    // Calculate pricing
    const originalPrice = product.price || 0;
    const salePrice = product.priceAfterItemDiscount || originalPrice;
    const hasSavings = originalPrice > salePrice;

    // Check for promotions
    const hasPromotions = product?.priceAdjustments && product.priceAdjustments.length > 0;

    // State for custom quantity input mode
    const [isCustomInput, setIsCustomInput] = useState(false);
    const [customValue, setCustomValue] = useState('');

    /**
     * Handle quantity change from dropdown
     * Switches to custom input mode when "Custom" option is selected
     */
    const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;

        if (value === 'custom') {
            setIsCustomInput(true);
            setCustomValue(String(quantity));
            return;
        }

        const newQuantity = parseInt(value, 10);
        handleQuantityChange(String(newQuantity), newQuantity);
    };

    /**
     * Handle click to enter custom input mode when quantity is already > 10
     * This allows users to edit their custom quantity value directly
     */
    const handleEnterCustomMode = () => {
        setIsCustomInput(true);
        setCustomValue(String(quantity));
    };

    /**
     * Handle custom input value change
     */
    const handleCustomInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setCustomValue(e.target.value);
    };

    /**
     * Handle custom input blur - validates and applies the custom quantity
     */
    const handleCustomInputBlur = () => {
        const newQuantity = parseInt(customValue, 10);

        // Validate input
        if (isNaN(newQuantity) || newQuantity < 1) {
            // Reset to current quantity on invalid input
            setCustomValue(String(quantity));
            setIsCustomInput(false);
            return;
        }

        handleQuantityChange(String(newQuantity), newQuantity);
        setIsCustomInput(false);
    };

    /**
     * Handle keyboard events in custom input
     * Enter - Apply the value
     * Escape - Cancel and return to dropdown
     */
    const handleCustomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleCustomInputBlur();
        } else if (e.key === 'Escape') {
            setCustomValue(String(quantity));
            setIsCustomInput(false);
        }
    };

    // Generate quantity options (1-10)
    const maxQuantity = config.pages.cart.maxQuantityPerItem || 10;
    const quantityOptions = Array.from({ length: Math.min(maxQuantity, 10) }, (_, i) => i + 1);

    // Build product URL for linking to PDP
    const productUrl = product.productId ? `/product/${product.productId}` : undefined;

    return (
        <div className="flex gap-4" data-testid="mini-cart-item">
            {/* Product Image */}
            <div className="flex-shrink-0 w-20 h-20 bg-muted rounded">
                {image ? (
                    productUrl ? (
                        <Link to={productUrl} className="block w-full h-full">
                            <img
                                src={`${image.disBaseLink || image.link}?sw=160&q=60`}
                                alt={image.alt || product?.productName || 'Product'}
                                className="w-full h-full object-cover rounded"
                            />
                        </Link>
                    ) : (
                        <img
                            src={`${image.disBaseLink || image.link}?sw=160&q=60`}
                            alt={image.alt || product?.productName || 'Product'}
                            className="w-full h-full object-cover rounded"
                        />
                    )
                ) : (
                    <div className="w-full h-full bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                        {tMiniCart('noImage')}
                    </div>
                )}
            </div>

            {/* Left side content */}
            <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex gap-4 justify-between mb-2">
                    <div className="flex-1 min-w-0">
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
                            <div className="text-sm text-muted-foreground mt-1">
                                {Object.entries(displayVariationValues).map(([name, value]) => (
                                    <div key={name}>
                                        {name}: {value}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right side content */}
                    <div className="flex-shrink-0 text-right">
                        {hasSavings ? (
                            <>
                                <div className="text-base text-muted-foreground line-through">
                                    {formatCurrency(originalPrice)}
                                </div>
                                <div className="text-base font-semibold text-foreground">
                                    {formatCurrency(salePrice)}
                                </div>
                                {hasPromotions && (
                                    <Badge variant="default" className="mt-1 text-xs px-2 py-0.5">
                                        {tMiniCart('promotionApplied')}
                                    </Badge>
                                )}
                            </>
                        ) : (
                            <div className="text-base font-semibold text-foreground">{formatCurrency(salePrice)}</div>
                        )}
                    </div>
                </div>

                {/* Quantity Selector */}
                <div className="mb-2">
                    <label htmlFor={`quantity-${product.itemId}`} className="block text-sm text-foreground mb-1">
                        {tMiniCart('quantityLabel')}
                    </label>
                    {isCustomInput ? (
                        <input
                            type="number"
                            value={customValue}
                            onChange={handleCustomInputChange}
                            onBlur={handleCustomInputBlur}
                            onKeyDown={handleCustomInputKeyDown}
                            min="1"
                            className="w-full border border-border rounded px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            aria-label={tMiniCart('customQuantityAriaLabel')}
                            autoFocus
                        />
                    ) : Number(quantity) > 10 ? (
                        // Show custom quantity display with edit button when quantity > 10
                        <div className="flex items-center gap-2">
                            <div className="flex-1 border border-border rounded px-2 py-1.5 text-sm bg-background">
                                {quantity}
                            </div>
                            <button
                                type="button"
                                onClick={handleEnterCustomMode}
                                className="text-sm text-primary hover:underline"
                                aria-label={tMiniCart('editQuantityAriaLabel')}>
                                {tActionCard('edit')}
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <select
                                id={`quantity-${product.itemId}`}
                                value={quantity}
                                onChange={handleSelectChange}
                                className="w-full border border-border rounded px-2 py-1.5 pr-8 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                                aria-label={tMiniCart('quantityAriaLabel')}>
                                {quantityOptions.map((num) => (
                                    <option key={num} value={num}>
                                        {num}
                                    </option>
                                ))}
                                <option value="custom">{tMiniCart('customOption')}</option>
                            </select>
                            {/* Custom dropdown arrow */}
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <svg
                                    className="w-4 h-4 text-muted-foreground"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                                    />
                                </svg>
                            </div>
                        </div>
                    )}
                </div>

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
