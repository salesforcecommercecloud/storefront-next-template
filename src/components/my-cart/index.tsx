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

// Commerce SDK
import type { ShopperBasketsV2, ShopperProducts, ShopperPromotions } from '@salesforce/storefront-next-runtime/scapi';

// Components
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import PromoPopover from '@/components/promo-popover';
import { UITarget } from '@/targets/ui-target';
import ProductPrice from '@/components/product-price';
import { useTranslation } from 'react-i18next';

// Hooks
import { useCurrency } from '@/providers/currency';
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
 * @property {boolean} [itemsExpanded]
 */
interface MyCartProps {
    basket: ShopperBasketsV2.schemas['Basket'];
    productMap?: Record<string, ShopperProducts.schemas['Product']>;
    promotions?: Record<string, ShopperPromotions.schemas['Promotion']>;
    itemsExpanded?: boolean;
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
export default function MyCart({
    basket,
    productMap = {},
    promotions = {},
    itemsExpanded = false,
}: MyCartProps): ReactElement {
    const { t } = useTranslation('checkout');
    const { t: tCart } = useTranslation('cart');
    const { i18n } = useTranslation();
    const currency = useCurrency();
    const config = useConfig();
    const totalItems = basket?.productItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) || 0;

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

            // Resolve promotions: use item's priceAdjustments, or fall back to shipment-level item (SCAPI may only set them there)
            const adjustmentsSource =
                (item.priceAdjustments?.length ?? 0) > 0
                    ? item
                    : basket?.shipments?.flatMap((s) => s.productItems ?? []).find((si) => si.itemId === item.itemId);
            const priceAdjustments = adjustmentsSource?.priceAdjustments ?? item.priceAdjustments;
            const productPromotions =
                (priceAdjustments
                    ?.map((adjustment) => (adjustment.promotionId ? promotions[adjustment.promotionId] : undefined))
                    .filter(Boolean) as ShopperPromotions.schemas['Promotion'][]) || [];
            const hasPromotions = productPromotions.length > 0;
            const effectiveItem = adjustmentsSource ?? item;
            const hasItemDiscount =
                effectiveItem.priceAfterItemDiscount !== undefined &&
                effectiveItem.priceAfterItemDiscount > 0 &&
                effectiveItem.priceAfterItemDiscount !== effectiveItem.price;
            const isBonusProduct = Boolean(item?.bonusProductLineItem);

            // Calculate savings for badge (use effective item for discount-aware fields)
            const basePrice = effectiveItem.basePrice ?? effectiveItem.price ?? 0;
            const priceAfterDiscount = effectiveItem.priceAfterItemDiscount ?? effectiveItem.price ?? 0;
            const savings = basePrice - priceAfterDiscount;
            const hasSavings = savings > 0;

            return (
                <Card
                    key={item.itemId || `item-${index}`}
                    className="px-4 py-3 md:px-6 md:py-4 border border-border rounded-lg"
                    data-testid={`my-cart-item-${item.productId ?? index}`}>
                    <div className="flex gap-3 md:gap-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                            <div className="w-16 h-16 md:w-24 md:h-24 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
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
                            <Link
                                to={createProductUrl(productId)}
                                className="text-sm md:text-base font-semibold text-foreground hover:text-primary block mb-1 md:mb-2">
                                {productName}
                            </Link>

                            {/* Variation Attributes */}
                            <div className="space-y-0.5 md:space-y-1 text-xs md:text-sm text-muted-foreground">
                                {Object.entries(displayVariationValues).map(([name, value]) => (
                                    <div key={name}>
                                        {name}: {value}
                                    </div>
                                ))}
                            </div>

                            {/* Promotions (same pattern as ProductItem) */}
                            {(hasPromotions || hasItemDiscount) && !isBonusProduct && (
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs md:text-sm text-muted-foreground">
                                        {tCart('attributes.promotions')}{' '}
                                        {hasItemDiscount && (
                                            <span className="text-success font-medium">
                                                {formatCurrency(
                                                    priceAdjustments?.reduce((acc, adj) => acc + (adj.price ?? 0), 0) ??
                                                        0,
                                                    i18n.language,
                                                    currency
                                                )}
                                            </span>
                                        )}
                                    </span>
                                    <div className="flex items-center">
                                        <PromoPopover>
                                            <div className="space-y-2">
                                                {productPromotions.map((promotion) => (
                                                    <div key={promotion.id} className="text-sm space-y-0.5">
                                                        {promotion.name && (
                                                            <div className="font-medium text-foreground">
                                                                {promotion.name}
                                                            </div>
                                                        )}
                                                        {promotion.calloutMsg ? (
                                                            <div
                                                                className={
                                                                    promotion.name ? 'text-muted-foreground' : ''
                                                                }
                                                                // the data comes from BM, which assuming it is safe to use
                                                                // eslint-disable-next-line react/no-danger
                                                                dangerouslySetInnerHTML={{
                                                                    __html: promotion.calloutMsg,
                                                                }}
                                                            />
                                                        ) : (
                                                            !promotion.name &&
                                                            promotion.id && (
                                                                <div className="text-muted-foreground">
                                                                    {promotion.id}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </PromoPopover>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Price Section */}
                        <div className="flex-shrink-0 text-right">
                            <ProductPrice
                                product={enrichedProduct}
                                currency={currency}
                                type="unit"
                                labelForA11y={productName}
                                currentPriceProps={{
                                    className: 'text-sm md:text-base font-semibold text-foreground',
                                }}
                                listPriceProps={{
                                    className: 'text-sm md:text-base text-muted-foreground line-through',
                                }}
                                hidePromo
                            />
                            {hasSavings && (
                                <Badge variant="default" className="mt-1 md:mt-2">
                                    {t('myCart.saved', { amount: formatCurrency(savings, i18n.language, currency) })}
                                </Badge>
                            )}
                        </div>
                    </div>
                </Card>
            );
        });
    }, [basket?.productItems, basket?.shipments, productMap, promotions, currency, i18n.language, config, t, tCart]);

    return (
        <Accordion
            type="single"
            collapsible
            className="w-full"
            defaultValue={itemsExpanded ? 'my-cart-items' : undefined}>
            <AccordionItem value="my-cart-items" className="border-none">
                <UITarget targetId="myCart.header.before" />
                <AccordionTrigger className="text-left hover:no-underline py-4 md:py-5" data-testid="my-cart-toggle">
                    <span className="text-base md:text-lg font-semibold text-foreground">
                        {t('myCart.title')} ({totalItems})
                    </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                    <div className="flex flex-col gap-6 md:gap-10">{productItems}</div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
