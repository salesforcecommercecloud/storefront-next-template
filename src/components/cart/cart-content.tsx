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
import { useState, useEffect, lazy, Suspense, type ReactElement } from 'react';

// Commerce SDK
import type { ShopperBasketsV2, ShopperProducts, ShopperPromotions } from '@salesforce/storefront-next-runtime/scapi';

// Components
import ProductItemsList from '@/components/product-items-list';
import { RemoveItemButtonWithConfirmation } from '@/components/buttons/remove-item-button-with-confirmation';
import { CartItemEditButton } from '@/components/cart/cart-item-edit-button';
import CartEmpty from './cart-empty';
import CartTitle from './cart-title';
import OrderSummary from '@/components/order-summary';
import { OrderSummaryMobileAccordion } from '@/components/order-summary/mobile-heading';
import { Link } from '@/components/link';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/typography';
import { useTranslation } from 'react-i18next';
import { useBasketUpdater } from '@/providers/basket';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import CartPickup from '@/extensions/bopis/components/cart-pickup';
import { getFirstPickupStore, filterPickupProductItems } from '@/extensions/bopis/lib/basket-utils';
import { usePickup } from '@/extensions/bopis/context/pickup-context';
import CartDeliveryOption from '@/extensions/bopis/components/delivery-options/cart-delivery-option';
// @sfdc-extension-block-end SFDC_EXT_BOPIS
import { UITarget } from '@/targets/ui-target';

// utils
import { isStandardProduct, isBonusProduct, isRuleBasedPromotion, type EnrichedProductItem } from '@/lib/product-utils';

const LazyBonusProductSelection = lazy(() => import('@/components/cart/bonus-product-selection'));
const LazyBonusProductModal = lazy(() =>
    import('@/components/bonus-product-modal').then((m) => ({ default: m.BonusProductModal }))
);
const LazyCartItemAddToWishlistButton = lazy(() =>
    import('@/components/cart/cart-item-add-to-wishlist-button').then((m) => ({
        default: m.CartItemAddToWishlistButton,
    }))
);

/**
 * Props for the CartContent component
 *
 * @interface CartContentProps
 * @property {ShopperBasketsV2.schemas['Basket'] | undefined} basket - The basket data from the loader
 * @property {Record<string, ShopperProducts.schemas['Product']>} [productsByItemId] - Item ID to product mapping
 * @property {Record<string, ShopperPromotions.schemas['Promotion']>} [promotions] - Promotion ID to promotion mapping
 * @property {string[]} [wishlistProductIds] - Product IDs in the shopper wishlist (from cart loader) for line-level wishlist state after refresh
 */
interface CartContentProps {
    basket: ShopperBasketsV2.schemas['Basket'] | undefined;
    productsByItemId: Record<string, ShopperProducts.schemas['Product']>;
    bonusProductsById: Record<string, ShopperProducts.schemas['Product']>;
    promotions?: Record<string, ShopperPromotions.schemas['Promotion']>;
    wishlistProductIds?: readonly string[];
}

/**
 * CartContent component that displays the shopping cart with items or empty state
 *
 * Features:
 * - Conditional rendering: Empty cart state when no items, full cart when items exist
 * - Responsive layout: Desktop grid (66% items, 33% summary) with mobile CTA section
 * - Component composition: Orchestrates CartTitle, ProductItemsList
 * - Data integration: Accepts basket, product mappings, and promotion mappings
 * - Mobile optimization: Separate mobile checkout section for better UX
 * - Accessibility: Proper semantic structure with test identifiers
 *
 * @param props - Component props
 * @returns JSX element representing the cart content
 */
export default function CartContent({
    basket,
    productsByItemId,
    bonusProductsById,
    promotions,
    wishlistProductIds = [],
}: CartContentProps): ReactElement {
    const { t } = useTranslation('cart');
    // @sfdc-extension-line SFDC_EXT_BOPIS
    const { t: tBopis } = useTranslation('extBopis');

    // Calculate total item count for page heading
    const totalItems = basket?.productItems?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) || 0;
    const pageHeading = t('itemCount', { count: totalItems });

    // TEMPORARY: State to facilitate bonus product modal development
    const [bonusModalOpen, setBonusModalOpen] = useState(false);
    const [selectedBonusProduct, setSelectedBonusProduct] = useState<{
        productId: string;
        productName: string;
        promotionId: string;
        bonusDiscountLineItemId: string;
        maxBonusItems: number;
    } | null>(null);

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const pickup = usePickup();
    const store = getFirstPickupStore(basket, pickup?.pickupStores);
    const pickupItems = filterPickupProductItems(basket);
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    // Sync cart page loader basket into basket context
    const updateBasket = useBasketUpdater();
    useEffect(() => {
        if (basket?.basketId) {
            updateBasket(basket);
        }
    }, [basket, updateBasket]);

    // Check if cart is empty using the basket prop from loader data
    if (!basket?.productItems?.length) {
        return <CartEmpty isRegistered={false} />;
    }

    let deliveryItems = basket?.productItems || [];

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    // Only filter pickup items from delivery if we have a store to render them in the pickup section
    // If no store exists, render all items as delivery items
    const pickupShipmentId = new Set(basket?.shipments?.filter((s) => s.c_fromStoreId).map((s) => s.shipmentId));
    deliveryItems = store
        ? basket.productItems.filter((item) => item.shipmentId && !pickupShipmentId.has(item.shipmentId))
        : deliveryItems;
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    // TEMPORARY: Logic to facilitate bonus product modal - extract bonus product data
    const bonusDiscountItems = basket?.bonusDiscountLineItems || [];

    // TEMPORARY: Handler to facilitate bonus product modal - open modal with selected product
    const handleBonusProductSelect = (
        productId: string,
        productName: string,
        promotionId: string,
        bonusDiscountLineItemId: string,
        maxBonusItems: number
    ) => {
        setSelectedBonusProduct({ productId, productName, promotionId, bonusDiscountLineItemId, maxBonusItems });
        setBonusModalOpen(true);
    };

    // Render prop function for cart-specific secondary actions
    const cartSecondaryActions = (product: EnrichedProductItem) => {
        // Return undefined if no itemId - this will hide the buttons in the UI
        if (!product.itemId) {
            return undefined;
        }

        const isBonusProd = isBonusProduct(product);
        const isStandardProd = isStandardProduct(product);
        const shouldShowEditButton = !isStandardProd && !isBonusProd;
        const shouldShowWishlist = !isBonusProd;

        return (
            <div className="flex gap-2">
                <RemoveItemButtonWithConfirmation itemId={product.itemId} className="pl-0" />
                {shouldShowEditButton && <CartItemEditButton product={product} className="pl-0" />}
                {shouldShowWishlist && (
                    <Suspense fallback={null}>
                        <LazyCartItemAddToWishlistButton
                            product={product}
                            wishlistProductIds={wishlistProductIds}
                            className="pl-0"
                        />
                    </Suspense>
                )}
            </div>
        );
    };

    // Per-line pickup vs delivery (BOPIS). Defined only inside the extension block so a
    // storefront that strips SFDC_EXT_BOPIS does not reference CartDeliveryOption after its import is removed.
    let cartDeliveryActions: ((product: EnrichedProductItem) => ReactElement) | undefined = undefined;
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    cartDeliveryActions = (product: EnrichedProductItem) => (
        <CartDeliveryOption key={product.itemId || product.productId} product={product} />
    );
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    return (
        <div className="flex-1 min-h-screen bg-background mb-10 md:mb-10 pb-32 md:pb-0" data-testid="sf-cart-container">
            <div className="section-container">
                <Typography variant="h1" as="h1" className="mb-6">
                    {pageHeading}
                </Typography>

                {/* Mobile Order Summary - visible only on mobile */}
                <div className="md:hidden mb-3">
                    <div className="bg-background border-t border-border shadow-none fixed bottom-0 left-0 right-0 z-50">
                        <OrderSummaryMobileAccordion basket={basket} defaultExpanded={false}>
                            <OrderSummary
                                basket={basket}
                                showCartItems={false}
                                showHeading={false}
                                isEstimate={true}
                                productsByItemId={productsByItemId}
                                showPromoCodeForm={true}
                                showCheckoutAction={false}
                                className="border-none shadow-none rounded-none !py-0 [--cart-summary-px:1rem]"
                            />
                        </OrderSummaryMobileAccordion>
                        <div className="px-[var(--cart-summary-px)] py-4">
                            <Button asChild className="w-full text-sm">
                                <Link to="/checkout">{t('checkout.continueToCheckout')}</Link>
                            </Button>
                            <UITarget targetId="sfcc.cart.payments.expressCheckout" />
                        </div>
                    </div>
                    <UITarget targetId="sfcc.cart.bnpl.message" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[66%_1fr] lg:gap-11">
                    <div className="md:order-2 lg:order-1">
                        {/* @sfdc-extension-block-start SFDC_EXT_BOPIS */}
                        {/* Group store info cards with their product items */}
                        {pickupItems.length > 0 && store && (
                            <div key={store.id} className="md:p-8 p-3 border border-border rounded-none mb-3">
                                <CartPickup
                                    store={store}
                                    pickupCount={pickupItems.length}
                                    totalCount={basket?.productItems?.length ?? 0}
                                />
                                <div className="mt-4">
                                    <ProductItemsList
                                        promotions={promotions}
                                        productItems={pickupItems}
                                        productsByItemId={productsByItemId}
                                        bonusDiscountLineItems={bonusDiscountItems}
                                        secondaryActions={cartSecondaryActions}
                                        deliveryActions={cartDeliveryActions}
                                        isPickup={true}
                                    />
                                </div>
                            </div>
                        )}
                        {/* @sfdc-extension-block-end SFDC_EXT_BOPIS */}
                        {/* Show delivery items if any exist */}
                        {deliveryItems.length > 0 && (
                            <div className="md:p-8 p-3 border border-muted-foreground/10 rounded-none mb-3">
                                <CartTitle basket={basket} deliveryCount={deliveryItems.length} />
                                {/* @sfdc-extension-block-start SFDC_EXT_BOPIS */}
                                {pickupItems.length > 0 && (
                                    <h2 className="text-lg font-semibold mb-4">
                                        {tBopis('cart.deliveryItemsHeading', {
                                            deliveryCount: deliveryItems.length,
                                            count: basket?.productItems?.length ?? 0,
                                        })}
                                    </h2>
                                )}
                                {/* @sfdc-extension-block-end SFDC_EXT_BOPIS */}
                                <ProductItemsList
                                    promotions={promotions}
                                    productItems={deliveryItems}
                                    productsByItemId={productsByItemId}
                                    bonusDiscountLineItems={bonusDiscountItems}
                                    secondaryActions={cartSecondaryActions}
                                    deliveryActions={cartDeliveryActions}
                                />
                            </div>
                        )}
                    </div>
                    <div className="hidden md:block md:order-1 lg:order-2">
                        <OrderSummary
                            basket={basket}
                            showCartItems={false}
                            isEstimate={true}
                            productsByItemId={productsByItemId}
                            showPromoCodeForm={true}
                            showCheckoutAction={true}
                        />
                        <UITarget targetId="sfcc.cart.bnpl.message" />
                    </div>
                </div>

                {/* Bonus Product Carousels - one per bonusDiscountLineItem (lazy chunks reduce cart script size for Lighthouse) */}
                {bonusDiscountItems.length > 0 && (
                    <Suspense fallback={null}>
                        {bonusDiscountItems.map((bonusItem, index) => {
                            const isRuleBased = isRuleBasedPromotion(bonusItem);
                            if (!isRuleBased && (!bonusItem.bonusProducts || bonusItem.bonusProducts.length === 0)) {
                                return null;
                            }
                            const promotion = bonusItem.promotionId ? promotions?.[bonusItem.promotionId] : undefined;
                            const promotionName = promotion?.calloutMsg || promotion?.name;
                            return (
                                <div key={bonusItem.id || index} className="mt-6">
                                    <LazyBonusProductSelection
                                        bonusDiscountLineItem={bonusItem}
                                        bonusProductsById={bonusProductsById}
                                        basket={basket}
                                        promotionName={promotionName}
                                        onProductSelect={(productId, productName, requiresModal) => {
                                            if (requiresModal) {
                                                handleBonusProductSelect(
                                                    productId,
                                                    productName,
                                                    bonusItem.promotionId || '',
                                                    bonusItem.id || '',
                                                    bonusItem.maxBonusItems || 0
                                                );
                                            }
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </Suspense>
                )}

                {selectedBonusProduct &&
                    (() => {
                        // Group all bonusDiscountLineItems for this promotion
                        const bonusDiscountSlots = (basket?.bonusDiscountLineItems || [])
                            .filter((item) => item.promotionId === selectedBonusProduct.promotionId)
                            .map((item) => {
                                // Count how many bonus products are already in this specific slot
                                // by filtering productItems that link to this bonusDiscountLineItemId
                                const matchingProductItems = (basket?.productItems || []).filter(
                                    (productItem) =>
                                        productItem.bonusProductLineItem &&
                                        productItem.bonusDiscountLineItemId === item.id
                                );

                                const bonusProductsInSlot = matchingProductItems.reduce(
                                    (sum, productItem) => sum + (productItem.quantity || 0),
                                    0
                                );

                                return {
                                    id: item.id || '',
                                    maxBonusItems: item.maxBonusItems || 0,
                                    bonusProductsSelected: bonusProductsInSlot,
                                };
                            });

                        // Calculate total max quantity across all slots (remaining capacity)
                        const totalMaxQuantity = bonusDiscountSlots.reduce(
                            (total, slot) => total + (slot.maxBonusItems - slot.bonusProductsSelected),
                            0
                        );

                        return (
                            <Suspense fallback={null}>
                                <LazyBonusProductModal
                                    open={bonusModalOpen}
                                    onOpenChange={setBonusModalOpen}
                                    productId={selectedBonusProduct.productId}
                                    productName={selectedBonusProduct.productName}
                                    promotionId={selectedBonusProduct.promotionId}
                                    bonusDiscountLineItemId={selectedBonusProduct.bonusDiscountLineItemId}
                                    bonusDiscountSlots={bonusDiscountSlots}
                                    maxQuantity={totalMaxQuantity}
                                />
                            </Suspense>
                        );
                    })()}
            </div>
        </div>
    );
}
