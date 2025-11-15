// React
import { type ReactElement } from 'react';

// Third-party
import { ShoppingCart, Lock } from 'lucide-react';
import { Link } from 'react-router';

// Commerce SDK
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

// Components
import { Typography } from '@/components/typography';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ProductItemsList from '@/components/product-items-list';
import PromoCodeForm from '@/components/promo-code-form';
import { VisaIcon, MastercardIcon, AmexIcon, DiscoverIcon } from '@/components/icons';

// Utils
import { formatCurrency } from '@/lib/currency';
import uiStrings from '@/temp-ui-string';
import PromoPopover from '@/components/promo-popover';

/**
 * Props for the OrderSummary component
 *
 * @interface OrderSummaryProps
 * @property {ShopperBasketsV2.schemas['Basket']} basket - The shopping basket containing items and totals
 * @property {boolean} [showPromoCodeForm] - Whether to display the promo code form
 * @property {boolean} [showCartItems] - Whether to display the cart items accordion
 * @property {boolean} [showHeading] - Whether to display the "Order Summary" heading
 * @property {boolean} [itemsExpanded] - Whether the cart items accordion should be expanded by default
 * @property {boolean} [isEstimate] - Whether to show "Est." prefix for totals
 * @property {Record<string, ShopperProducts.schemas['Product']>} [productsByItemId] - Optional item ID to product
 *   details mapping
 * @property {() => void} [onEditCart] - Optional callback function called when the "Edit Cart" button is clicked.
 *   If not provided, the component will navigate to '/cart' using the default navigation behavior.
 *   This is useful for custom actions like closing a cart sheet before navigation.
 * @property {boolean} [showCheckoutAction] - Whether to display the checkout button and payment icons
 */
interface OrderSummaryProps {
    basket: ShopperBasketsV2.schemas['Basket'];
    showPromoCodeForm?: boolean;
    showCartItems?: boolean;
    showHeading?: boolean;
    itemsExpanded?: boolean;
    isEstimate?: boolean;
    productsByItemId?: Record<string, ShopperProducts.schemas['Product']>;
    onEditCart?: () => void;
    showCheckoutAction?: boolean;
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
 * @param {ShopperBasketsV2.schemas['Basket']} props.basket - The shopping basket containing product items
 * @param {Record<string, ShopperProducts.schemas['Product']>} [props.productsByItemId] - Optional item ID to product mapping
 * @param {boolean} [props.itemsExpanded] - Whether the accordion should be expanded by default
 * @param {() => void} [props.onEditCart] - Optional callback for "Edit Cart" button click. If not provided, navigates to '/cart'
 * @returns JSX element representing the cart items summary accordion
 */
function CartItemsSummary({
    basket,
    productsByItemId = {},
    itemsExpanded = false,
    onEditCart,
}: {
    basket: ShopperBasketsV2.schemas['Basket'];
    productsByItemId?: Record<string, ShopperProducts.schemas['Product']>;
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
                            productsByItemId={productsByItemId}
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
    productsByItemId = {},
    onEditCart,
    showCheckoutAction,
}: OrderSummaryProps): ReactElement {
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
                        <Typography variant="h4" as="h3" id="order-summary-heading">
                            {uiStrings.cart.summary.orderSummary}
                        </Typography>
                    )}

                    <div className="space-y-4" role="region" aria-labelledby="order-summary-heading">
                        {/* Cart Items Accordion */}
                        {showCartItems && (
                            <CartItemsSummary
                                basket={basket}
                                productsByItemId={productsByItemId}
                                itemsExpanded={itemsExpanded}
                                onEditCart={onEditCart}
                            />
                        )}

                        {/* Order Summary Details */}
                        <div className="space-y-4 text-sm">
                            {/* Subtotal */}
                            <div className="flex justify-between items-center">
                                <span>{uiStrings.cart.summary.subtotal}</span>
                                <span>{formatCurrency(basket?.productSubTotal ?? 0)}</span>
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

                        {/* Total */}
                        <div className="space-y-4 w-full text-sm">
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
                        </div>

                        {/* Promo Code Form */}
                        {showPromoCodeForm ? <PromoCodeForm basket={basket} /> : <Separator className="w-full" />}

                        {/* Checkout Action */}
                        {showCheckoutAction && (
                            <>
                                <Button asChild className="w-full mt-6 mb-4">
                                    <Link to="/checkout">
                                        {uiStrings.cart.checkout.proceedToCheckout}
                                        <Lock className="ml-2 w-4 h-4" aria-label={uiStrings.cart.checkout.secure} />
                                    </Link>
                                </Button>

                                <div className="flex justify-center">
                                    <VisaIcon width={40} height={32} className="mr-2" />
                                    <MastercardIcon width={40} height={32} className="mr-2" />
                                    <AmexIcon width={40} height={32} className="mr-2" />
                                    <DiscoverIcon width={40} height={32} className="mr-2" />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
