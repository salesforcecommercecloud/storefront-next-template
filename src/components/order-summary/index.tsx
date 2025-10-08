// React
import { useEffect, type ReactElement } from 'react';

// Third-party
import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router';

// Commerce SDK
import type { ShopperBasketsTypes, ShopperProductsTypes } from 'commerce-sdk-isomorphic';

// Components
import { Typography } from '@/components/typography';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ProductItemsList from '@/components/product-items-list';
import PromoCodeForm from '@/components/promo-code-form';
import { useToast } from '@/components/toast';

// Hooks
import { usePromoCodeActions } from '@/hooks/use-promo-code-actions';

// Utils
import { formatCurrency } from '@/lib/currency';
import { FETCHER_STATES } from '@/lib/fetcher-states';
import uiStrings from '@/temp-ui-string';
import PromoPopover from '@/components/promo-popover';

/**
 * Props for the OrderSummary component
 *
 * @interface OrderSummaryProps
 * @property {ShopperBasketsTypes.Basket} basket - The shopping basket containing items and totals
 * @property {boolean} [showPromoCodeForm] - Whether to display the promo code form
 * @property {boolean} [showCartItems] - Whether to display the cart items accordion
 * @property {boolean} [showHeading] - Whether to display the "Order Summary" heading
 * @property {boolean} [itemsExpanded] - Whether the cart items accordion should be expanded by default
 * @property {boolean} [isEstimate] - Whether to show "Est." prefix for totals
 * @property {Record<string, ShopperProductsTypes.Product>} [productMap] - Optional product ID to product
 *   details mapping
 * @property {() => void} [onEditCart] - Optional callback function called when the "Edit Cart" button is clicked.
 *   If not provided, the component will navigate to '/cart' using the default navigation behavior.
 *   This is useful for custom actions like closing a cart sheet before navigation.
 */
interface OrderSummaryProps {
    basket: ShopperBasketsTypes.Basket;
    showPromoCodeForm?: boolean;
    showCartItems?: boolean;
    showHeading?: boolean;
    itemsExpanded?: boolean;
    isEstimate?: boolean;
    productMap?: Record<string, ShopperProductsTypes.Product>;
    onEditCart?: () => void;
}

/**
 * Cart Items Summary component that displays cart items in a collapsible accordion
 *
 * This component renders:
 * - A collapsible accordion showing item count with shopping cart icon
 * - Product items list in summary variant
 * - Edit cart button for navigation
 *
 * @param props - Component props
 * @param {ShopperBasketsTypes.Basket} props.basket - The shopping basket containing product items
 * @param {Record<string, ShopperProductsTypes.Product>} [props.productMap] - Optional product details mapping
 * @param {boolean} [props.itemsExpanded] - Whether the accordion should be expanded by default
 * @param {() => void} [props.onEditCart] - Optional callback for "Edit Cart" button click. If not provided, navigates to '/cart'
 * @returns JSX element representing the cart items summary accordion
 */
function CartItemsSummary({
    basket,
    productMap = {},
    itemsExpanded = false,
    onEditCart,
}: {
    basket: ShopperBasketsTypes.Basket;
    productMap?: Record<string, ShopperProductsTypes.Product>;
    itemsExpanded?: boolean;
    onEditCart?: () => void;
}): ReactElement {
    const totalItems = basket?.productItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) || 0;

    // TODO: use react-intl to get the item count text
    const getItemCountText = (count: number): string => {
        if (count === 0) return uiStrings.cart.items.itemsInCart.zero;
        if (count === 1) return uiStrings.cart.items.itemsInCart.one;
        return uiStrings.cart.items.itemsInCart.other.replace('{count}', count.toString());
    };

    return (
        <Accordion type="single" collapsible className="w-full" defaultValue={itemsExpanded ? 'cart-items' : undefined}>
            <AccordionItem value="cart-items">
                <AccordionTrigger className="text-left">
                    <span className="flex-1 text-left text-base text-primary">
                        <ShoppingCart className="inline mr-2 w-4 h-4" />
                        {getItemCountText(totalItems)}
                    </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 py-4">
                    <div className="space-y-5">
                        <ProductItemsList
                            productItems={basket.productItems}
                            productMap={productMap}
                            variant="summary"
                        />
                        {/* Edit Cart link: navigates to cart page with optional callback */}
                        <Link
                            to="/cart"
                            onClick={onEditCart}
                            className={buttonVariants({ variant: 'link', className: 'w-full justify-center' })}>
                            {uiStrings.cart.items.editCart}
                        </Link>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}

/**
 * OrderSummary component that displays a comprehensive order summary with cart items, totals, and promo codes
 *
 * This component provides a complete order summary including:
 * - Order summary heading with item count
 * - Collapsible cart items accordion with product details
 * - Promo code form for applying discounts
 * - Order totals breakdown (subtotal, tax, shipping, total)
 * - Applied promo codes with removal functionality
 * - Loading states and error handling
 *
 * The component handles:
 * - Promo code application and removal
 * - Toast notifications for promo code actions
 * - Responsive layout and conditional rendering
 * - Integration with cart store and product data
 *
 * Used by CartSummarySection component (see cart-summary-section.tsx for usage example)
 *
 * @param props - Component props
 * @returns JSX element representing the complete order summary
 */
export default function OrderSummary({
    basket,
    showPromoCodeForm = false,
    showCartItems = true,
    showHeading = true,
    itemsExpanded = false,
    isEstimate = false,
    productMap = {},
    onEditCart,
}: OrderSummaryProps): ReactElement {
    const { removePromoCode, removeFetcher } = usePromoCodeActions(basket?.basketId);
    const { addToast } = useToast();
    useEffect(() => {
        if (removeFetcher.data) {
            if (removeFetcher.data.success) {
                addToast(uiStrings.cart.promoCode.removeSuccessMessage, 'success');
            } else if (removeFetcher.data.error) {
                addToast(removeFetcher.data.error, 'error');
            }
        }
        // we do not need `updateBasket` and `addToast` in the dependency array
        // because they are not likely to change once initialized
        // linting is being cautious and warn about it, but we don't need to follow it
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [removeFetcher.data]);

    if (!basket?.basketId && !basket?.orderNo) {
        return <div>{uiStrings.cart.summary.noBasketData}</div>;
    }

    const shippingItem = basket.shippingItems?.[0];
    const hasShippingPromos = (shippingItem?.priceAdjustments?.length ?? 0) > 0;

    const renderShippingInfo = () => {
        if (basket.shippingTotal === 0) {
            return <span className="text-primary font-medium">{uiStrings.cart.summary.shippingFree}</span>;
        } else if (typeof basket.shippingTotal === 'number' && basket.shippingTotal > 0) {
            return <span>{formatCurrency(basket.shippingTotal)}</span>;
        } else {
            return <span className="text-muted-foreground">{uiStrings.cart.summary.shippingTbd}</span>;
        }
    };

    return (
        <Card>
            <CardContent className="p-6">
                <div className="space-y-5" data-testid="sf-order-summary">
                    {showHeading && (
                        <Typography variant="h2" as="h2" className={`font-bold pt-1`} id="order-summary-heading">
                            {uiStrings.cart.summary.orderSummary}
                        </Typography>
                    )}

                    <div className="space-y-4" role="region" aria-labelledby="order-summary-heading">
                        {/* Cart Items Accordion */}
                        {showCartItems && (
                            <CartItemsSummary
                                basket={basket}
                                productMap={productMap}
                                itemsExpanded={itemsExpanded}
                                onEditCart={onEditCart}
                            />
                        )}

                        {/* Order Summary Details */}
                        <div className="space-y-4">
                            {/* Subtotal */}
                            <div className="flex justify-between items-center">
                                <span className="font-bold">{uiStrings.cart.summary.subtotal}</span>
                                <span className="font-bold">{formatCurrency(basket?.productSubTotal ?? 0)}</span>
                            </div>

                            {/* Order Price Adjustments */}
                            {basket.orderPriceAdjustments?.map((adjustment) => (
                                <div key={adjustment.priceAdjustmentId} className="flex justify-between items-center">
                                    <span>{adjustment.itemText}</span>
                                    <span className="text-success">{formatCurrency(adjustment.price ?? 0)}</span>
                                </div>
                            ))}

                            {/* Shipping */}
                            <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <span>
                                        {uiStrings.cart.summary.shipping}
                                        {hasShippingPromos && (
                                            <span className="ml-1 text-sm text-muted-foreground">
                                                {uiStrings.cart.summary.shippingPromotionApplied}
                                            </span>
                                        )}
                                    </span>
                                    {hasShippingPromos && (
                                        <PromoPopover className="ml-1">
                                            {shippingItem?.priceAdjustments?.map((adjustment) => (
                                                <div key={adjustment.priceAdjustmentId} className="text-sm">
                                                    {adjustment.itemText}
                                                </div>
                                            ))}
                                        </PromoPopover>
                                    )}
                                </div>
                                {renderShippingInfo()}
                            </div>

                            {/* Tax */}
                            <div className="flex justify-between items-center">
                                <span>{uiStrings.cart.summary.tax}</span>
                                {typeof basket.taxTotal === 'number' && basket.taxTotal >= 0 ? (
                                    <span>{formatCurrency(basket.taxTotal)}</span>
                                ) : (
                                    <span className="text-muted-foreground">{uiStrings.cart.summary.taxTbd}</span>
                                )}
                            </div>
                        </div>

                        {/* Promo Code Form */}
                        {showPromoCodeForm ? (
                            <PromoCodeForm basketId={basket?.basketId} />
                        ) : (
                            <Separator className="w-full" />
                        )}

                        {/* Total */}
                        <div className="space-y-4 w-full">
                            <div className="flex w-full justify-between items-center">
                                <span className="font-bold">
                                    {isEstimate
                                        ? uiStrings.cart.summary.estimatedTotal
                                        : uiStrings.cart.summary.orderTotal}
                                </span>
                                <span className="font-bold">
                                    {formatCurrency(basket?.orderTotal || basket?.productTotal || 0)}
                                </span>
                            </div>

                            {/* Applied Promotions */}
                            {(basket.couponItems?.length ?? 0) > 0 && (
                                <div className="p-4 border border-border rounded bg-background">
                                    <p className="font-medium mb-2">{uiStrings.cart.promoCode.promotionsApplied}</p>
                                    <div className="space-y-2">
                                        {basket.couponItems?.map((item) => (
                                            <div key={item.couponItemId} className="flex items-center">
                                                <span className="flex-1 text-sm text-foreground">{item.code}</span>
                                                {!basket.orderNo && (
                                                    <Button
                                                        variant="link"
                                                        size="sm"
                                                        disabled={removeFetcher.state === FETCHER_STATES.SUBMITTING}
                                                        className="cursor-pointer text-destructive hover:text-destructive/80 p-0 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                                        onClick={() => {
                                                            if (item.couponItemId) {
                                                                removePromoCode(item.couponItemId);
                                                            }
                                                        }}>
                                                        {removeFetcher.state === FETCHER_STATES.SUBMITTING
                                                            ? uiStrings.cart.promoCode.removing
                                                            : uiStrings.cart.promoCode.remove}
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
