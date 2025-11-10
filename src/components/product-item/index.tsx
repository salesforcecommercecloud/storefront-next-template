'use client';

// React
import { useMemo, type ReactElement } from 'react';

// React Router
import { Link } from 'react-router';

// Commerce SDK
import type { ShopperBasketsTypes, ShopperProductsTypes, ShopperPromotionsTypes } from 'commerce-sdk-isomorphic';

// Components
import PromoPopover from '@/components/promo-popover';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/spinner';
import { Typography } from '@/components/typography';
import CartQuantityPicker from '@/components/cart/cart-quantity-picker';
import BundledProductItems from './bundled-product-items';
// TODO: uncomment after integrate gift basket api
// import { Checkbox } from '@/components/ui/checkbox';
// import { Label } from '@/components/ui/label';

// Hooks
import { useItemFetcherLoading } from '@/hooks/use-item-fetcher';

// Utils
import { formatCurrency } from '@/lib/currency';
import { findImageGroupBy } from '@/lib/image-groups-utils';
import { createProductUrl, getDisplayVariationValues } from '@/lib/product-utils';
import { cn } from '@/lib/utils';

// Constants
import uiStrings from '@/temp-ui-string';

/**
 * Basket item data enriched with product details
 */
type Item = ShopperBasketsTypes.ProductItem & Partial<ShopperProductsTypes.Product>;

/**
 * ProductItemVariantImage component that renders product images with fallback
 *
 * @param props - Component props
 * @param props.product - Product data containing image information
 * @param props.className - Optional CSS class name
 * @returns JSX element with product image or placeholder
 */
function ProductItemVariantImage({
    productItem,
    className = '',
}: {
    productItem: Item;
    className?: string;
    width?: string;
}): ReactElement {
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

    return (
        <div className={cn('bg-muted rounded flex-shrink-0', className)}>
            {image ? (
                <img
                    src={`${image.disBaseLink || image.link}?sw=160&q=60`}
                    alt={image.alt || productItem?.productName || productItem?.name || 'Product image'}
                    className="w-full h-full object-cover rounded"
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
function ProductItemVariantName({ productItem }: { productItem: Item }): ReactElement {
    if (!productItem) {
        return <div className="text-sm font-medium">{uiStrings.cart.product?.defaultName || 'Product Name'}</div>;
    }

    const productId = productItem?.master?.masterId || productItem?.id;
    const productName =
        productItem?.productName || productItem?.name || uiStrings.cart.product?.defaultName || 'Product Name';

    const isBonusProduct = Boolean(productItem?.bonusProductLineItem);
    return (
        <div className="mb-4 flex items-center gap-2 min-w-0">
            {isBonusProduct && (
                <Badge variant="default" role="status" aria-label={uiStrings.product.bonusProductAriaLabel}>
                    {uiStrings.product.bonusProduct}
                </Badge>
            )}
            <Typography variant="h2" className="text-xl min-w-0 flex-1">
                <Link
                    to={createProductUrl(productId)}
                    className="text-foreground hover:text-primary block truncate"
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
function ProductItemVariantAttributes({
    productItem,
    displayVariant = 'default',
    promotions,
}: {
    productItem: Item;
    displayVariant?: 'default' | 'summary';
    promotions?: Record<string, ShopperPromotionsTypes.Promotion>;
}): ReactElement {
    // Memoize expensive calculations
    const displayVariationValues = useMemo(
        () => getDisplayVariationValues(productItem?.variationAttributes, productItem?.variationValues),
        [productItem?.variationAttributes, productItem?.variationValues]
    );

    const productPromotions = useMemo(
        () =>
            (productItem.priceAdjustments
                ?.map((adjustment) => (adjustment.promotionId ? promotions?.[adjustment.promotionId] : undefined))
                .filter(Boolean) as ShopperPromotionsTypes.Promotion[]) || [],
        [productItem.priceAdjustments, promotions]
    );

    const hasPromotions = productPromotions.length > 0;
    const hasItemDiscount =
        productItem.priceAfterItemDiscount &&
        productItem.priceAfterItemDiscount > 0 &&
        productItem.priceAfterItemDiscount !== productItem.price;
    const isBonusProduct = Boolean(productItem?.bonusProductLineItem);
    return (
        <div>
            {/* Quantity - only show in summary variant */}
            {displayVariant === 'summary' && (
                <div className="text-sm text-muted-foreground">
                    {uiStrings.cart.attributes.quantity} {productItem.quantity || 1}
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
                        {uiStrings.cart.attributes.promotions}{' '}
                        <span className="text-success font-medium">
                            {/*TODO: adjust this after we have i18n set up*/}
                            {hasItemDiscount &&
                                formatCurrency(
                                    productItem?.priceAdjustments?.reduce((acc, adj) => acc + (adj.price ?? 0), 0) ?? 0
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
 * ProductItemVariantPrice component that displays product pricing information
 *
 * @param props - Component props
 * @param props.product - Product data containing price information
 * @param props.baseDirection - Layout direction for price display
 * @param props.isBonusProduct - Whether this is a bonus product (shows $0.00 with strikethrough original)
 * @returns JSX element with formatted price information
 */
function ProductItemVariantPrice({
    productItem,
    baseDirection = 'column',
}: {
    productItem: Item;
    baseDirection?: 'row' | 'column';
}): ReactElement {
    if (!productItem) {
        return <div className="text-xl font-medium">{formatCurrency(0)}</div>;
    }

    const price = productItem?.priceAfterItemDiscount ?? 0;
    const pricePerUnit = Number(productItem?.pricePerUnit);
    const isBonusProduct = Boolean(productItem?.bonusProductLineItem);

    // For bonus products, show strikethrough original price and $0.00
    if (isBonusProduct) {
        if (baseDirection === 'row') {
            return (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {pricePerUnit > 0 && (
                            <div className="text-md text-muted-foreground line-through">
                                {formatCurrency(pricePerUnit)}
                            </div>
                        )}
                        <div className="text-xl font-medium">{formatCurrency(0)}</div>
                    </div>
                </div>
            );
        }
        return (
            <div className="space-y-1">
                {pricePerUnit > 0 && (
                    <div className="text-md text-muted-foreground line-through">{formatCurrency(pricePerUnit)}</div>
                )}
                <div className="text-xl font-medium">{formatCurrency(0)}</div>
            </div>
        );
    }

    // Regular product pricing
    if (baseDirection === 'row') {
        return (
            <div className="flex items-center justify-between">
                <div className="text-xl font-medium">{formatCurrency(price)}</div>
                {pricePerUnit && pricePerUnit !== price && (
                    <div className="text-md text-muted-foreground">{formatCurrency(pricePerUnit)} each</div>
                )}
            </div>
        );
    }
    return (
        <div className="space-y-1">
            <div className="text-xl font-medium">{formatCurrency(price)}</div>
            {pricePerUnit && pricePerUnit !== price && (
                <div className="text-md text-muted-foreground">{formatCurrency(pricePerUnit)} each</div>
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
 * @property {Record<string, ShopperPromotionsTypes.Promotion>} [promotions] - Promotions data by ID
 * @property {function} [primaryAction] - Render prop function to create primary actions
 * @property {function} [secondaryActions] - Render prop function to create secondary actions
 */
interface ProductItemProps {
    productItem: Item | undefined;
    displayVariant?: 'default' | 'summary';
    promotions?: Record<string, ShopperPromotionsTypes.Promotion>;
    primaryAction?: (productItem: Item) => ReactElement | undefined;
    secondaryActions?: (productItem: Item) => ReactElement | undefined;
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
}: ProductItemProps): ReactElement {
    // Track loading state for all fetchers related to this item
    const isItemFetcherLoading = useItemFetcherLoading(productItem?.itemId);

    // Guard against undefined or null product
    if (!productItem || typeof productItem !== 'object') {
        return <div data-testid="product-item-error">Product data not available</div>;
    }

    // Check if this is a bonus product
    const isBonusProduct = Boolean(productItem?.bonusProductLineItem);
    const baseDirection = isBonusProduct ? 'row' : 'column';

    // Summary variant - compact display for product summary
    if (displayVariant === 'summary') {
        return (
            <div
                className="grid md:grid-cols-[160px_1fr] grid-cols-[80px_1fr] gap-5"
                data-testid={`sf-product-item-summary-${productItem?.productId || productItem?.id}`}>
                <div>
                    <ProductItemVariantImage productItem={productItem} className="w-20" />
                </div>
                <div className="flex-1 space-y-1">
                    <ProductItemVariantName productItem={productItem} />
                    {productItem.bundledProducts && productItem.bundledProducts.length > 0 && (
                        <BundledProductItems bundledProducts={productItem.bundledProducts} />
                    )}
                    <ProductItemVariantAttributes
                        productItem={productItem}
                        displayVariant={displayVariant}
                        promotions={promotions}
                    />
                    {/*TODO: Replace this with ProductPrice*/}
                    <ProductItemVariantPrice productItem={productItem} baseDirection="row" />
                </div>
            </div>
        );
    }
    // Default variant - full product item with card styling
    return (
        <div className="relative" data-testid={`sf-product-item-${productItem?.productId || productItem?.id}`}>
            <Card className="p-0 border border-none shadow-none">
                <CardContent className="px-3 py-4 md:px-6 md:py-7 relative overflow-hidden">
                    <div className="grid md:grid-cols-[160px_1fr] grid-cols-[80px_1fr] gap-5 min-w-0">
                        <div className="flex-shrink-0">
                            {/* Product Image */}
                            <ProductItemVariantImage productItem={productItem} className="md:w-40 w-20" />
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

                                    {!isBonusProduct && (
                                        <div className="min-w-0">
                                            {primaryAction && (
                                                <div data-testid="mobile-primary-action">
                                                    {primaryAction(productItem)}
                                                </div>
                                            )}
                                            {secondaryActions && secondaryActions(productItem)}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right md:hidden" data-testid="mobile-product-price">
                                    {/*TODO: Replace this with ProductPrice*/}
                                    <ProductItemVariantPrice productItem={productItem} />
                                </div>

                                <div className="grid gap-4 justify-items-end flex-shrink-0">
                                    {/* Quantity Display/Selector */}
                                    <CartQuantityPicker
                                        value={String(productItem.quantity)}
                                        itemId={productItem.itemId || ''}
                                        stockLevel={productItem.inventory?.ats}
                                        disabled={isBonusProduct}
                                    />
                                    <div className="self-end">
                                        <div className="text-right hidden md:block" data-testid="desktop-product-price">
                                            <ProductItemVariantPrice
                                                productItem={productItem}
                                                baseDirection={baseDirection}
                                            />
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
                            {productItem?.showInventoryMessage && (
                                <div className="text-destructive font-semibold text-sm break-words">
                                    {productItem?.inventoryMessage}
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
