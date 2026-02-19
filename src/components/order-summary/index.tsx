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

// Third-party
import { ShoppingCart, Lock } from 'lucide-react';
import { Link } from 'react-router';

// Commerce SDK
import type { ShopperBasketsV2, ShopperOrders, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

/** Basket or Order – OrderSummary displays totals for both (e.g. cart and order details). */
export type OrderSummaryBasket = ShopperBasketsV2.schemas['Basket'] | ShopperOrders.schemas['Order'];

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
import { useTranslation } from 'react-i18next';
import PromoPopover from '@/components/promo-popover';
import { useCurrency } from '@/providers/currency';
import { UITarget } from '@/targets/ui-target';

/**
 * Props for the OrderSummary component
 *
 * @interface OrderSummaryProps
 * @property {OrderSummaryBasket} basket - The basket or order containing items and totals (cart or order details)
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
 *
 * Note : OrderSummary accepts both Basket and Order, make sure you pass other props accordingly.
 * Eg If you pass Order as basket, make sure you pass showPromoCodeForm, showCartItems as false etc.
 */
interface OrderSummaryProps {
    basket: OrderSummaryBasket;
    showPromoCodeForm?: boolean;
    showCartItems?: boolean;
    showHeading?: boolean;
    itemsExpanded?: boolean;
    isEstimate?: boolean;
    productsByItemId?: Record<string, ShopperProducts.schemas['Product']>;
    onEditCart?: () => void;
    showCheckoutAction?: boolean;
    onSelectBonusProducts?: () => void;
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
    onSelectBonusProducts,
}: {
    basket: ShopperBasketsV2.schemas['Basket'];
    productsByItemId?: Record<string, ShopperProducts.schemas['Product']>;
    itemsExpanded?: boolean;
    onEditCart?: () => void;
    onSelectBonusProducts?: () => void;
}): ReactElement {
    const { t } = useTranslation('cart');
    const totalItems = basket?.productItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) || 0;

    const getItemCountText = (count: number): string => {
        if (count === 0) return t('items.itemsInCart.zero');
        if (count === 1) return t('items.itemsInCart.one');
        return t('items.itemsInCart.other', { count });
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
                        {/* Cart summary sidebar */}
                        <ProductItemsList
                            productItems={basket.productItems}
                            productsByItemId={productsByItemId}
                            variant="summary"
                            basket={basket}
                            onSelectBonusProducts={onSelectBonusProducts}
                        />
                        {/* Edit Cart link: navigates to cart page with optional callback */}
                        <Link
                            to="/cart"
                            onClick={onEditCart}
                            className={buttonVariants({ variant: 'link', className: 'w-full justify-center' })}>
                            {t('items.editCart')}
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
    onSelectBonusProducts,
}: OrderSummaryProps): ReactElement {
    const { t, i18n } = useTranslation('cart');
    const currency = useCurrency();

    const hasBasketId = 'basketId' in basket && basket.basketId;
    const hasOrderNo = 'orderNo' in basket && basket.orderNo;
    if (!hasBasketId && !hasOrderNo) {
        return <div>{t('summary.noBasketData')}</div>;
    }

    const shippingItem = basket.shippingItems?.[0];
    const hasShippingPromos = (shippingItem?.priceAdjustments?.length ?? 0) > 0;

    const renderShippingInfo = () => {
        if (basket.shippingTotal === 0) {
            return <span className="text-primary font-medium">{t('summary.shippingFree')}</span>;
        } else if (typeof basket.shippingTotal === 'number' && basket.shippingTotal > 0) {
            return <span>{formatCurrency(basket.shippingTotal, i18n.language, currency)}</span>;
        } else {
            return <span className="text-muted-foreground">{t('summary.shippingTbd')}</span>;
        }
    };

    return (
        <Card>
            <CardContent className="p-6">
                <div className="space-y-5" data-testid="sf-order-summary">
                    {showHeading && (
                        <>
                            <UITarget targetId="checkout.myCart.header.before" />
                            <Typography variant="h4" as="h3" id="order-summary-heading">
                                {t('summary.orderSummary')}
                            </Typography>
                        </>
                    )}

                    <div className="space-y-4" role="region" aria-labelledby="order-summary-heading">
                        {/* Cart Items Accordion */}
                        {showCartItems && (
                            <CartItemsSummary
                                basket={basket}
                                productsByItemId={productsByItemId}
                                itemsExpanded={itemsExpanded}
                                onEditCart={onEditCart}
                                onSelectBonusProducts={onSelectBonusProducts}
                            />
                        )}

                        {/* Order Summary Details */}
                        <div className="space-y-4 text-sm">
                            {/* Subtotal */}
                            <UITarget targetId="orderSummary.subtotal.before" />
                            <UITarget targetId="orderSummary.subtotal">
                                <div className="flex justify-between items-center">
                                    <span>{t('summary.subtotal')}</span>
                                    <span>{formatCurrency(basket?.productSubTotal ?? 0, i18n.language, currency)}</span>
                                </div>
                            </UITarget>
                            <UITarget targetId="orderSummary.subtotal.after" />

                            {/* Order Price Adjustments */}
                            <UITarget targetId="orderSummary.adjustments.before" />
                            <UITarget targetId="orderSummary.adjustments">
                                {basket.orderPriceAdjustments?.map((adjustment) => (
                                    <div
                                        key={adjustment.priceAdjustmentId}
                                        className="flex justify-between items-center">
                                        <span>{adjustment.itemText}</span>
                                        <span className="text-success text-sm font-semibold">
                                            {formatCurrency(adjustment.price ?? 0, i18n.language, currency)}
                                        </span>
                                    </div>
                                ))}
                            </UITarget>
                            <UITarget targetId="orderSummary.adjustments.after" />

                            {/* Shipping */}
                            <UITarget targetId="orderSummary.shipping.before" />
                            <UITarget targetId="orderSummary.shipping">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center">
                                        <span>
                                            {t('summary.shipping')}
                                            {hasShippingPromos && (
                                                <span className="ml-1 text-sm text-muted-foreground">
                                                    {t('summary.shippingPromotionApplied')}
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
                            </UITarget>
                            <UITarget targetId="orderSummary.shipping.after" />

                            {/* Tax */}
                            <UITarget targetId="orderSummary.tax.before" />
                            <UITarget targetId="orderSummary.tax">
                                <div className="flex justify-between items-center">
                                    <span>{t('summary.tax')}</span>
                                    {typeof basket.taxTotal === 'number' && basket.taxTotal >= 0 ? (
                                        <span>{formatCurrency(basket.taxTotal, i18n.language, currency)}</span>
                                    ) : (
                                        <span className="text-muted-foreground">{t('summary.taxTbd')}</span>
                                    )}
                                </div>
                            </UITarget>
                            <UITarget targetId="orderSummary.tax.after" />
                        </div>

                        {/* Total */}
                        <UITarget targetId="orderSummary.total.before" />
                        <UITarget targetId="orderSummary.total">
                            <div className="space-y-4 w-full text-sm">
                                <div className="flex w-full justify-between items-center">
                                    <span className="font-bold">
                                        {isEstimate ? t('summary.estimatedTotal') : t('summary.orderTotal')}
                                    </span>
                                    <span className="font-bold">
                                        {formatCurrency(
                                            basket?.orderTotal || basket?.productTotal || 0,
                                            i18n.language,
                                            currency
                                        )}
                                    </span>
                                </div>
                            </div>
                        </UITarget>
                        <UITarget targetId="orderSummary.total.after" />

                        {/* Promo Code Form */}
                        <UITarget targetId="orderSummary.promoCode.before" />
                        <UITarget targetId="orderSummary.promoCode">
                            {showPromoCodeForm ? <PromoCodeForm basket={basket} /> : <Separator className="w-full" />}
                        </UITarget>
                        <UITarget targetId="orderSummary.promoCode.after" />

                        {/* Checkout Action */}
                        {showCheckoutAction && (
                            <>
                                <Button asChild className="w-full mt-6 mb-4">
                                    <Link to="/checkout">
                                        {t('checkout.proceedToCheckout')}
                                        <Lock className="ml-2 w-4 h-4" aria-label={t('checkout.secure')} />
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
