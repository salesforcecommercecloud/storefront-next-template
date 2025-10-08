'use client';

// React
import { useMemo, type ReactElement } from 'react';

// React Router
import { Link } from 'react-router';

// Commerce SDK
import type { ShopperBasketsTypes, ShopperProductsTypes, ShopperPromotionsTypes } from 'commerce-sdk-isomorphic';

// Components
import PromoPopover from '@/components/promo-popover';
import { Typography } from '@/components/typography';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/spinner';
import CartQuantityPicker from '@/components/cart/cart-quantity-picker';

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
 * Combined product type that merges basket item data with product details
 */
type Product = ShopperBasketsTypes.ProductItem & Partial<ShopperProductsTypes.Product>;

/**
 * ProductItemVariantImage component that renders product images with fallback
 *
 * @param props - Component props
 * @param props.product - Product data containing image information
 * @param props.className - Optional CSS class name
 * @param props.width - Optional width specification
 * @returns JSX element with product image or placeholder
 */
function ProductItemVariantImage({
    product,
    className = '',
    width,
}: {
    product: Product;
    className?: string;
    width?: string;
}): ReactElement {
    if (!product) {
        return (
            <div className={cn('bg-muted rounded flex-shrink-0', width ? `w-[${width}]` : 'w-16 sm:w-20', className)}>
                <div className="w-full h-full bg-muted rounded" />
            </div>
        );
    }

    // Find the 'small' images in the variant's image groups based on variationValues and pick the first one
    const imageGroup = findImageGroupBy(product?.imageGroups, {
        viewType: 'small',
        selectedVariationAttributes: product?.variationValues,
    });
    const image = imageGroup?.images?.[0];

    return (
        <div className={cn('bg-muted rounded flex-shrink-0', width ? `w-[${width}]` : 'w-16 sm:w-20', className)}>
            {image ? (
                <img
                    src={`${image.disBaseLink || image.link}?sw=80&q=60`}
                    alt={image.alt || product?.productName || product?.name || 'Product image'}
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
function ProductItemVariantName({ product }: { product: Product }): ReactElement {
    if (!product) {
        return <div className="text-sm font-medium">{uiStrings.cart.product?.defaultName || 'Product Name'}</div>;
    }

    const productId = product?.master?.masterId || product?.id;
    const productName = product?.productName || product?.name || uiStrings.cart.product?.defaultName || 'Product Name';

    return (
        <Typography variant="h3" as="h3" className="text-sm font-medium">
            <Link to={createProductUrl(productId)} className="text-foreground hover:text-primary">
                {productName}
            </Link>
        </Typography>
    );
}

/**
 * ProductItemVariantAttributes component that displays product variation attributes
 *
 * @param props - Component props
 * @param props.product - Product data containing variation information
 * @param props.displayVariant - Display variant to control quantity display
 * @param props.promotionMap - Promotions data by ID
 * @returns JSX element with variation attributes or fallback
 */
function ProductItemVariantAttributes({
    product,
    displayVariant = 'default',
    promotionMap,
}: {
    product: Product;
    displayVariant?: 'default' | 'summary';
    promotionMap?: Record<string, ShopperPromotionsTypes.Promotion>;
}): ReactElement {
    // Memoize expensive calculations
    const displayVariationValues = useMemo(
        () => getDisplayVariationValues(product?.variationAttributes, product?.variationValues),
        [product?.variationAttributes, product?.variationValues]
    );

    const productPromotions = useMemo(
        () =>
            (product.priceAdjustments
                ?.map((adjustment) => (adjustment.promotionId ? promotionMap?.[adjustment.promotionId] : undefined))
                .filter(Boolean) as ShopperPromotionsTypes.Promotion[]) || [],
        [product.priceAdjustments, promotionMap]
    );

    const hasPromotions = productPromotions.length > 0;
    const hasItemDiscount = product.priceAfterItemDiscount && product.priceAfterItemDiscount !== product.price;
    return (
        <div className="space-y-1">
            {/* Quantity - only show in summary variant */}
            {displayVariant === 'summary' && (
                <div className="text-sm text-muted-foreground">
                    {uiStrings.cart.attributes.quantity} {product.quantity || 1}
                </div>
            )}

            {/* Variation Attributes */}
            {Object.keys(displayVariationValues).length > 0 && (
                <div className="text-sm text-muted-foreground space-y-1">
                    {Object.entries(displayVariationValues).map(([name, value]) => (
                        <div key={name}>
                            {name}: {value}
                        </div>
                    ))}
                </div>
            )}

            {/* Promotions Info */}
            {(hasPromotions || hasItemDiscount) && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">
                        {uiStrings.cart.attributes.promotions}{' '}
                        <span className="text-success font-medium">
                            {/*TODO: adjust this after we have i18n set up*/}
                            {hasItemDiscount &&
                                formatCurrency(
                                    product?.priceAdjustments?.reduce((acc, adj) => acc + (adj.price ?? 0), 0) ?? 0
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
 * @returns JSX element with formatted price information
 */
function ProductItemVariantPrice({
    product,
    baseDirection = 'column',
}: {
    product: Product;
    baseDirection?: 'row' | 'column';
}): ReactElement {
    if (!product) {
        return <div className="text-sm font-medium">{formatCurrency(0)}</div>;
    }

    const price = product?.priceAfterItemDiscount ?? 0;
    const pricePerUnit = product?.pricePerUnit;
    const quantity = product?.quantity || 1;

    if (baseDirection === 'row') {
        return (
            <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                    {formatCurrency(pricePerUnit || price)} {quantity}
                </span>
                <span className="text-sm font-medium">{formatCurrency(price)}</span>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <div className="text-sm font-medium">{formatCurrency(price)}</div>
            {pricePerUnit && pricePerUnit !== price && (
                <div className="text-xs text-muted-foreground">{formatCurrency(pricePerUnit)} each</div>
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
 * @property {Record<string, ShopperPromotionsTypes.Promotion>} [promotionMap] - Promotions data by ID
 * @property {function} [primaryAction] - Render prop function to create primary actions
 * @property {function} [secondaryActions] - Render prop function to create secondary actions
 */
interface ProductItemProps {
    product: Product | undefined;
    displayVariant?: 'default' | 'summary';
    promotionMap?: Record<string, ShopperPromotionsTypes.Promotion>;
    primaryAction?: (product: Product) => ReactElement | undefined;
    secondaryActions?: (product: Product) => ReactElement | undefined;
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
    product,
    displayVariant = 'default',
    promotionMap,
    primaryAction,
    secondaryActions,
}: ProductItemProps): ReactElement {
    // Track loading state for all fetchers related to this item
    const isItemFetcherLoading = useItemFetcherLoading(product?.itemId);

    // Guard against undefined or null product
    if (!product || typeof product !== 'object') {
        return <div data-testid="product-item-error">Product data not available</div>;
    }

    // Summary variant - compact display for product summary
    if (displayVariant === 'summary') {
        return (
            <div
                className="flex items-start"
                data-testid={`sf-product-item-summary-${product?.productId || product?.id}`}>
                <ProductItemVariantImage product={product} width="80px" className="mr-2" />
                <div className="flex-1 space-y-1">
                    <ProductItemVariantName product={product} />
                    <ProductItemVariantAttributes
                        product={product}
                        displayVariant={displayVariant}
                        promotionMap={promotionMap}
                    />
                    <ProductItemVariantPrice product={product} baseDirection="row" />
                </div>
            </div>
        );
    }

    // Default variant - full product item with card styling
    return (
        <div className="relative" data-testid={`sf-product-item-${product?.productId || product?.id}`}>
            <Card className="border border-border shadow-sm">
                <CardContent className="p-4 relative">
                    <div className="flex items-start">
                        {/* Product Image */}
                        <ProductItemVariantImage product={product} className="mr-4 sm:mr-6" />

                        {/* Product Details */}
                        <div className="flex-1 space-y-3">
                            <div className="space-y-1">
                                <ProductItemVariantName product={product} />
                                <ProductItemVariantAttributes
                                    product={product}
                                    displayVariant={displayVariant}
                                    promotionMap={promotionMap}
                                />
                                {/* Mobile Price */}
                                <div className="sm:hidden mt-2">
                                    <ProductItemVariantPrice product={product} />
                                </div>

                                <div className="space-y-2">
                                    {/* Quantity Selector */}
                                    <CartQuantityPicker
                                        value={String(product.quantity)}
                                        itemId={product.itemId || ''}
                                        stockLevel={product.inventory?.ats}
                                        className="w-fit"
                                    />
                                    {secondaryActions && secondaryActions(product)}
                                </div>
                            </div>

                            {/* Inventory Message */}
                            {product?.showInventoryMessage && (
                                <div className="text-destructive font-semibold text-sm">
                                    {product?.inventoryMessage}
                                </div>
                            )}
                        </div>

                        {/* Desktop Price and Actions */}
                        <div className="hidden sm:block ml-4">
                            <div className="space-y-2">
                                <ProductItemVariantPrice product={product} />
                                {primaryAction && (
                                    <div data-testid="desktop-primary-action">{primaryAction(product)}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile Actions */}
                    <div className="sm:hidden flex items-center justify-between mt-4">
                        {primaryAction && (
                            <div className="w-full" data-testid="mobile-primary-action">
                                {primaryAction(product)}
                            </div>
                        )}
                    </div>

                    {/* Loading Spinner Overlay */}
                    {isItemFetcherLoading && (
                        <div
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 pointer-events-none flex items-center justify-center"
                            data-testid={`sf-product-item-loading-${product.productId || product.id}`}>
                            <Spinner size="lg" />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default ProductItem;
