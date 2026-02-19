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
import { useMemo, type ReactElement } from 'react';

// React Router
import { Link } from 'react-router';

// Commerce SDK
import type { ShopperBasketsV2, ShopperProducts, ShopperPromotions } from '@salesforce/storefront-next-runtime/scapi';

// Components
import PromoPopover from '@/components/promo-popover';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/spinner';
import { Typography } from '@/components/typography';
import CartQuantityPicker from '@/components/cart/cart-quantity-picker';
import BundledProductItems from './bundled-product-items';
import ProductPrice from '../product-price';
// TODO: uncomment after integrate gift basket api
// import { Checkbox } from '@/components/ui/checkbox';
// import { Label } from '@/components/ui/label';

// Hooks
import { useItemFetcherLoading } from '@/hooks/use-item-fetcher';
import { useCurrency } from '@/providers/currency';
import { useConfig } from '@/config';

// Utils
import { formatCurrency } from '@/lib/currency';
import { findImageGroupBy } from '@/lib/image-groups-utils';
import { createProductUrl, getDisplayVariationValues, type EnrichedProductItem } from '@/lib/product-utils';
import { cn } from '@/lib/utils';
import { toImageUrl } from '@/lib/dynamic-image';
import { useTranslation } from 'react-i18next';

/**
 * ProductItemVariantImage component that renders product images with fallback
 *
 * @param props - Component props
 * @param props.product - Product data containing image information
 * @param props.className - Optional CSS class name
 * @returns JSX element with product image or placeholder
 */
export function ProductItemVariantImage({
    productItem,
    className = '',
}: {
    productItem: EnrichedProductItem;
    className?: string;
    width?: string;
}): ReactElement {
    const config = useConfig();

    if (!productItem) {
        return (
            <div className={cn('bg-muted rounded flex-shrink-0 w-16', className)}>
                <div className="w-full h-full bg-muted rounded" />
            </div>
        );
    }

    // Find the 'small' images in the variant's image groups based on variationValues and pick the first one
    const imageGroup = findImageGroupBy(productItem?.imageGroups, {
        viewType: 'small',
        selectedVariationAttributes: productItem?.variationValues,
    });
    const image = imageGroup?.images?.[0];
    const optimizedImageUrl = toImageUrl({ image, config }) || '';

    return (
        <div
            className={cn(
                'bg-muted rounded flex-shrink-0 flex items-center justify-center aspect-square overflow-hidden',
                className
            )}>
            {image ? (
                <img
                    src={optimizedImageUrl}
                    alt={image.alt || productItem?.productName || productItem?.name || 'Product image'}
                    className="h-full w-full object-contain"
                />
            ) : (
                <div className="w-full h-full bg-muted rounded" />
            )}
        </div>
    );
}

/**
 * ProductItemVariantName component that renders product name as a link
 *
 * @param props - Component props
 * @param props.product - Product data containing name and ID information
 * @returns JSX element with product name link
 */
export function ProductItemVariantName({ productItem }: { productItem: EnrichedProductItem }): ReactElement {
    const { t: tCart } = useTranslation('cart');
    const { t: tProduct } = useTranslation('product');
    if (!productItem) {
        return <div className="text-sm font-medium">{tCart('product.defaultName') || 'Product Name'}</div>;
    }

    const productId = productItem?.master?.masterId || productItem?.id;
    const productName = productItem?.productName || productItem?.name || tCart('product.defaultName') || 'Product Name';

    const isBonusProduct = Boolean(productItem?.bonusProductLineItem);
    return (
        <div className="mb-4 flex items-start gap-2 min-w-0">
            {isBonusProduct && (
                <Badge variant="default" role="status" aria-label={tProduct('bonusProductAriaLabel')}>
                    {tProduct('bonusProduct')}
                </Badge>
            )}
            <Typography variant="h2" className="text-xl min-w-0 flex-1 leading-tight">
                <Link
                    to={createProductUrl(productId)}
                    className="text-foreground hover:text-primary block break-words"
                    title={productName}>
                    {productName}
                </Link>
            </Typography>
        </div>
    );
}

/**
 * ProductItemVariantAttributes component that displays product variation attributes
 *
 * @param props - Component props
 * @param props.product - Product data containing variation information
 * @param props.displayVariant - Display variant to control quantity display
 * @param props.promotions - Promotions data by ID
 * @returns JSX element with variation attributes or fallback
 */
export function ProductItemVariantAttributes({
    productItem,
    displayVariant = 'default',
    promotions,
}: {
    productItem: EnrichedProductItem;
    displayVariant?: 'default' | 'summary';
    promotions?: Record<string, ShopperPromotions.schemas['Promotion']>;
}): ReactElement {
    const { t, i18n } = useTranslation('cart');
    const currency = useCurrency();
    // Memoize expensive calculations
    const displayVariationValues = useMemo(
        () => getDisplayVariationValues(productItem?.variationAttributes, productItem?.variationValues),
        [productItem?.variationAttributes, productItem?.variationValues]
    );

    const productPromotions = useMemo(
        () =>
            (productItem.priceAdjustments
                ?.map((adjustment) => (adjustment.promotionId ? promotions?.[adjustment.promotionId] : undefined))
                .filter(Boolean) as ShopperPromotions.schemas['Promotion'][]) || [],
        [productItem.priceAdjustments, promotions]
    );

    const hasPromotions = productPromotions.length > 0;
    const hasItemDiscount =
        productItem.priceAfterItemDiscount !== undefined &&
        productItem.priceAfterItemDiscount > 0 &&
        productItem.priceAfterItemDiscount !== productItem.price;
    const isBonusProduct = Boolean(productItem?.bonusProductLineItem);
    return (
        <div>
            {/* Quantity - only show in summary variant */}
            {displayVariant === 'summary' && (
                <div className="text-sm text-muted-foreground">
                    {t('attributes.quantity')} {productItem.quantity || 1}
                </div>
            )}

            {/* Variation Attributes */}
            {Object.keys(displayVariationValues).length > 0 && (
                <div className="text-sm text-muted-foreground space-y-1 mb-1">
                    {Object.entries(displayVariationValues).map(([name, value]) => (
                        <div key={name}>
                            {name}: {value}
                        </div>
                    ))}
                </div>
            )}

            {/* Promotions Info */}
            {(hasPromotions || hasItemDiscount) && !isBonusProduct && (
                <div className="flex items-center gap-2 mb-1 ">
                    <span className="text-sm text-muted-foreground">
                        {t('attributes.promotions')}{' '}
                        <span className="text-success font-medium">
                            {hasItemDiscount &&
                                formatCurrency(
                                    productItem?.priceAdjustments?.reduce((acc, adj) => acc + (adj.price ?? 0), 0) ?? 0,
                                    i18n.language,
                                    currency
                                )}
                        </span>
                    </span>
                    <div className="flex items-center">
                        <PromoPopover>
                            <div className="space-y-2">
                                {productPromotions.map((promotion) => (
                                    <div
                                        key={promotion.id}
                                        className="text-sm"
                                        // the data comes from BM, which assuming it is safe to use
                                        // eslint-disable-next-line react/no-danger
                                        dangerouslySetInnerHTML={{ __html: promotion.calloutMsg || '' }}
                                    />
                                ))}
                            </div>
                        </PromoPopover>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Props for the ProductItem component
 *
 * @interface ProductItemProps
 * @property {Product | undefined} product - Combined basket item and product data
 * @property {'default' | 'summary'} [displayVariant] - Display variant: 'default' for full, 'summary' for compact
 * @property {Record<string, ShopperPromotions.schemas['Promotion']>} [promotions] - Promotions data by ID
 * @property {function} [primaryAction] - Render prop function to create primary actions
 * @property {function} [secondaryActions] - Render prop function to create secondary actions
 */
interface ProductItemProps {
    productItem: EnrichedProductItem | undefined;
    displayVariant?: 'default' | 'summary';
    promotions?: Record<string, ShopperPromotions.schemas['Promotion']>;
    primaryAction?: (productItem: EnrichedProductItem) => ReactElement | undefined;
    secondaryActions?: (productItem: EnrichedProductItem) => ReactElement | undefined;
    deliveryActions?: (productItem: EnrichedProductItem) => ReactElement | undefined;
    bonusDiscountLineItems?: ShopperBasketsV2.schemas['BonusDiscountLineItem'][];
    maxBonusQuantity?: number;
}

/**
 * ProductItem component that displays individual product information in cart or summary views
 *
 * This component handles:
 * - Product image display with fallback
 * - Product name as clickable link
 * - Variation attributes display
 * - Price formatting and display
 * - Primary and secondary actions
 * - Responsive layout for mobile/desktop
 * - Summary and default display variants
 * - Loading states with skeleton overlay
 *
 * @param props - Component props
 * @returns JSX element representing the product item
 */
function ProductItem({
    productItem,
    displayVariant = 'default',
    promotions,
    primaryAction,
    secondaryActions,
    deliveryActions,
    bonusDiscountLineItems,
    maxBonusQuantity,
}: ProductItemProps): ReactElement {
    // Track loading state for all fetchers related to this item
    const isItemFetcherLoading = useItemFetcherLoading(productItem?.itemId);
    // Get currency from context (automatically derived from locale)
    const currency = useCurrency();
    const { i18n } = useTranslation();

    // Check if this is a bonus product
    const isBonusProduct = Boolean(productItem?.bonusProductLineItem);

    // Determine if this is a choice-based bonus product by checking bonusDiscountLineItems
    // Must be called before any early returns (React Hooks rules)
    const isChoiceBasedBonusProduct = useMemo(() => {
        if (!productItem || !isBonusProduct || !productItem.bonusDiscountLineItemId || !bonusDiscountLineItems) {
            return false;
        }
        const matchingLineItem = bonusDiscountLineItems.find((item) => item.id === productItem.bonusDiscountLineItemId);
        // Choice-based bonus products have a bonusProducts array in the discount line item
        return Boolean(matchingLineItem?.bonusProducts && matchingLineItem.bonusProducts.length > 0);
    }, [productItem, isBonusProduct, bonusDiscountLineItems]);

    const isAutoBonusProduct = isBonusProduct && !isChoiceBasedBonusProduct;

    if (!productItem || typeof productItem !== 'object') {
        return <div data-testid="product-item-error">Product data not available</div>;
    }

    // Summary variant - compact display for product summary
    if (displayVariant === 'summary') {
        return (
            <div
                className="grid md:grid-cols-[112px_1fr] grid-cols-[72px_1fr] gap-4"
                data-testid={`sf-product-item-summary-${productItem?.productId || productItem?.id}`}>
                <div className="flex items-center justify-center">
                    <ProductItemVariantImage productItem={productItem} className="w-16" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                    <ProductItemVariantName productItem={productItem} />
                    {productItem.bundledProducts && productItem.bundledProducts.length > 0 && (
                        <BundledProductItems bundledProducts={productItem.bundledProducts} />
                    )}
                    <ProductItemVariantAttributes
                        productItem={productItem}
                        displayVariant={displayVariant}
                        promotions={promotions}
                    />
                    <ProductPrice
                        type="unit"
                        product={productItem as ShopperProducts.schemas['Product']}
                        currency={currency}
                        labelForA11y={productItem?.productName}
                        currentPriceProps={{
                            className: 'text-card-foreground text-right font-semibold text-sm leading-none relative',
                        }}
                        listPriceProps={{
                            className: 'text-muted-foreground text-right text-sm leading-none relative',
                        }}
                        className="text-sm"
                    />
                </div>
            </div>
        );
    }
    // Default variant - full product item with card styling
    return (
        <div className="relative" data-testid={`sf-product-item-${productItem?.productId || productItem?.id}`}>
            <Card className="p-0 border border-none shadow-none">
                <CardContent className="px-3 py-4 md:px-6 md:py-7 relative overflow-hidden">
                    <div className="grid md:grid-cols-[140px_1fr] grid-cols-[72px_1fr] gap-5 min-w-0">
                        <div className="flex-shrink-0 flex items-center justify-center">
                            {/* Product Image */}
                            <ProductItemVariantImage productItem={productItem} className="md:w-32 w-16" />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 space-y-3 min-w-0">
                            <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6 min-w-0">
                                <div className="min-w-0">
                                    <ProductItemVariantName productItem={productItem} />
                                    {productItem.bundledProducts && (
                                        <BundledProductItems bundledProducts={productItem.bundledProducts} />
                                    )}
                                    <ProductItemVariantAttributes
                                        productItem={productItem}
                                        displayVariant={displayVariant}
                                        promotions={promotions}
                                    />

                                    <Typography variant="product-description" className="break-words">
                                        {productItem?.shortDescription}
                                    </Typography>

                                    <div className="min-w-0">
                                        {!isAutoBonusProduct && primaryAction && (
                                            <div data-testid="mobile-primary-action">{primaryAction(productItem)}</div>
                                        )}
                                        {!isAutoBonusProduct && secondaryActions && secondaryActions(productItem)}
                                    </div>
                                </div>
                                <div className="text-right md:hidden" data-testid="mobile-product-price">
                                    <div className="font-semibold text-base">
                                        <ProductPrice
                                            type="total"
                                            product={productItem as ShopperProducts.schemas['Product']}
                                            quantity={productItem.quantity ?? 1}
                                            currency={currency}
                                            labelForA11y={productItem?.productName}
                                            className="text-card-foreground text-right font-semibold text-sm leading-none relative"
                                            currentPriceProps={{
                                                className:
                                                    'text-card-foreground text-right font-semibold text-sm leading-none relative',
                                            }}
                                            listPriceProps={{
                                                className:
                                                    'text-muted-foreground text-right text-xs leading-none relative',
                                            }}
                                            promoCalloutProps={{
                                                className: 'text-sm text-muted-foreground',
                                            }}
                                        />
                                    </div>
                                    {(productItem.quantity ?? 1) > 1 && (
                                        <div className="text-muted-foreground text-sm">
                                            {formatCurrency(
                                                (productItem.priceAfterItemDiscount ?? productItem.price ?? 0) /
                                                    (productItem.quantity ?? 1),
                                                i18n.language,
                                                currency
                                            )}{' '}
                                            each
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-4 justify-items-end flex-shrink-0">
                                    {/* Delivery Actions */}
                                    {deliveryActions?.(productItem)}

                                    {/* Quantity Display/Selector */}
                                    <CartQuantityPicker
                                        value={String(productItem.quantity)}
                                        itemId={productItem.itemId || ''}
                                        stockLevel={productItem.inventory?.ats}
                                        max={isBonusProduct ? maxBonusQuantity : undefined}
                                        disabled={isAutoBonusProduct}
                                    />
                                    <div className="self-end">
                                        <div className="text-right hidden md:block" data-testid="desktop-product-price">
                                            <div className="font-semibold text-base">
                                                <ProductPrice
                                                    type="total"
                                                    product={productItem as ShopperProducts.schemas['Product']}
                                                    quantity={productItem.quantity ?? 1}
                                                    currency={currency}
                                                    labelForA11y={productItem?.productName}
                                                    currentPriceProps={{
                                                        className:
                                                            'text-card-foreground text-lg text-right font-semibold leading-none relative',
                                                    }}
                                                    listPriceProps={{
                                                        className:
                                                            'text-muted-foreground text-right text-sm leading-none relative',
                                                    }}
                                                    promoCalloutProps={{
                                                        className: 'text-sm text-muted-foreground',
                                                    }}
                                                />
                                            </div>
                                            {(productItem.quantity ?? 1) > 1 && (
                                                <div className="text-muted-foreground text-sm">
                                                    {formatCurrency(
                                                        (productItem.priceAfterItemDiscount ?? productItem.price ?? 0) /
                                                            (productItem.quantity ?? 1),
                                                        i18n.language,
                                                        currency
                                                    )}{' '}
                                                    each
                                                </div>
                                            )}
                                        </div>
                                        {/*Comment out since this is not integrated with api yet*/}
                                        {/*<div className="text-sm flex items-center gap-3">*/}
                                        {/*    <Checkbox id="isGift" />*/}
                                        {/*    <Label htmlFor="isGift">This is a gift</Label>*/}
                                        {/*    <a*/}
                                        {/*        className="text-primary"*/}
                                        {/*        href="https://https://developer.salesforce.com/docs/commerce/commerce-api/references">*/}
                                        {/*        Learn more*/}
                                        {/*    </a>*/}
                                        {/*</div>*/}
                                    </div>
                                </div>
                            </div>

                            {/* Inventory Message */}
                            {Boolean(productItem?.showInventoryMessage) && (
                                <div className="text-destructive font-semibold text-sm break-words">
                                    {productItem?.inventoryMessage as string}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Loading Spinner Overlay */}
                    {isItemFetcherLoading && (
                        <div
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 pointer-events-none flex items-center justify-center"
                            data-testid={`sf-product-item-loading-${productItem.productId || productItem.id}`}>
                            <Spinner size="lg" />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default ProductItem;
