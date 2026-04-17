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
import { useMemo, type ReactElement } from 'react';
import { Link } from '@/components/link';
import { Truck } from 'lucide-react';

// Commerce SDK
import type { ShopperBasketsV2, ShopperProducts, ShopperPromotions } from '@salesforce/storefront-next-runtime/scapi';

// Components
import { UITarget } from '@/targets/ui-target';
import ProductPrice from '@/components/product-price';
import { useTranslation } from 'react-i18next';

// Hooks
import { useSite } from '@salesforce/storefront-next-runtime/site-context';
import { useConfig } from '@salesforce/storefront-next-runtime/config';

// Utils
import { formatCurrency } from '@/lib/currency';
import { findImageGroupBy } from '@/lib/image-groups-utils';
import { createProductUrl, getDisplayVariationValues } from '@/lib/product-utils';
import { toImageUrl } from '@/lib/dynamic-image';

/**
 * Props for the MyCart component
 *
 * @interface MyCartProps
 * @property {ShopperBasketsV2.schemas['Basket']} basket
 * @property {Record<string, ShopperProducts.schemas['Product']>} [productMap]
 * @property {Record<string, ShopperPromotions.schemas['Promotion']>} [promotions]
 */
interface MyCartProps {
    basket: ShopperBasketsV2.schemas['Basket'];
    productMap?: Record<string, ShopperProducts.schemas['Product']>;
    promotions?: Record<string, ShopperPromotions.schemas['Promotion']>;
}

/**
 * MyCart component that displays cart items in a collapsible accordion
 *
 * This component renders:
 * - A collapsible accordion showing item count
 * - Product items in individual cards
 * - Product image, name, attributes, and price with savings
 *
 * Used on checkout page to display cart items separately from order summary
 *
 * @param props - Component props
 * @returns JSX element representing the my cart component
 */
export default function MyCart({ basket, productMap = {} }: MyCartProps): ReactElement {
    const { t } = useTranslation('checkout');
    const { t: tCart } = useTranslation('cart');
    const { i18n } = useTranslation();
    const { currency } = useSite();
    const config = useConfig();
    const productItems = useMemo(() => {
        return (basket?.productItems || []).map((item, index) => {
            const productData = item.itemId ? productMap[item.itemId] : undefined;
            const productName = item.productName || productData?.name || 'Product';
            const productId = productData?.master?.masterId || productData?.id || item.productId;

            // Combine basket item with product data
            const enrichedProduct = {
                ...productData,
                ...item,
            } as ShopperProducts.schemas['Product'] & ShopperBasketsV2.schemas['ProductItem'];

            // Get product image
            const imageGroup = findImageGroupBy(productData?.imageGroups, {
                viewType: 'small',
                selectedVariationAttributes: item.variationValues,
            });
            const image = imageGroup?.images?.[0];
            const imageUrl = toImageUrl({ image, config }) || '';

            // Get variation attributes
            const displayVariationValues = getDisplayVariationValues(item.variationAttributes, item.variationValues);

            // Resolve effective item: use item's priceAdjustments source, or fall back to shipment-level item
            const adjustmentsSource =
                (item.priceAdjustments?.length ?? 0) > 0
                    ? item
                    : basket?.shipments?.flatMap((s) => s.productItems ?? []).find((si) => si.itemId === item.itemId);
            const effectiveItem = adjustmentsSource ?? item;

            // Calculate savings for badge (use effective item for discount-aware fields)
            const basePrice = effectiveItem.basePrice ?? effectiveItem.price ?? 0;
            const priceAfterDiscount = effectiveItem.priceAfterItemDiscount ?? effectiveItem.price ?? 0;
            const savings = basePrice - priceAfterDiscount;
            const hasSavings = savings > 0;

            return (
                <div
                    key={item.itemId || `item-${index}`}
                    className="py-4"
                    data-testid={`my-cart-item-${item.productId ?? index}`}>
                    <div className="flex gap-3 md:gap-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-muted overflow-hidden flex items-center justify-center">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt={image?.alt || productName}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-muted" />
                                )}
                            </div>
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                                <Link
                                    to={createProductUrl(productId)}
                                    className="text-sm font-semibold text-foreground hover:text-primary">
                                    {productName}
                                </Link>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Truck className="size-3" />
                                        {t('myCart.delivery')}
                                    </span>
                                    {hasSavings && (
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {t('myCart.saved', {
                                                amount: formatCurrency(savings, i18n.language, currency),
                                            })}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Variation Attributes */}
                            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                                {Object.entries(displayVariationValues).map(([name, value]) => (
                                    <div key={name}>
                                        {name}: {value}
                                    </div>
                                ))}
                            </div>

                            {/* Price */}
                            <div className="mt-1">
                                <ProductPrice
                                    product={enrichedProduct}
                                    currency={currency}
                                    type="unit"
                                    labelForA11y={productName}
                                    currentPriceProps={{
                                        className: 'text-sm font-semibold text-foreground',
                                    }}
                                    listPriceProps={{
                                        className: 'text-sm text-muted-foreground line-through',
                                    }}
                                    hidePromo
                                />
                            </div>

                            {/* Quantity */}
                            <div className="mt-0.5 text-xs text-muted-foreground">
                                {tCart('attributes.quantity')} {item.quantity}
                            </div>
                        </div>
                    </div>
                </div>
            );
        });
    }, [basket?.productItems, basket?.shipments, productMap, currency, i18n.language, config, t, tCart]);

    return (
        <div className="w-full">
            <UITarget targetId="myCart.header.before" />
            <div
                data-testid="my-cart-toggle"
                className="divide-y divide-border -mx-[var(--cart-divider-extend,0px)] [&>*]:px-[var(--cart-divider-extend,0px)]">
                {productItems}
            </div>
        </div>
    );
}
