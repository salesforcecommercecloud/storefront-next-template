// React
import { type ReactElement } from 'react';

// Commerce SDK
import type { ShopperBasketsV2, ShopperProducts, ShopperPromotions } from '@salesforce/storefront-next-runtime/scapi';

// Components
import ProductItemsList from '@/components/product-items-list';
import { RemoveItemButtonWithConfirmation } from '@/components/buttons/remove-item-button-with-confirmation';
import { CartItemEditButton } from '@/components/cart/cart-item-edit-button';
import CartEmpty from './cart-empty';
import CartTitle from './cart-title';
import OrderSummary from '@/components/order-summary';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
// @sfdc-extension-block-start SFDC_EXT_BOPIS
import PickupStoreInfo from '@/extensions/bopis/components/pickup-store-info';
import { usePickup } from '@/extensions/bopis/context/pickup-context';
import { getStoreIdsFromBasket, filterPickupProductItems } from '@/extensions/bopis/lib/basket-utils';
import { getPickupStoreFromMap } from '@/extensions/bopis/lib/store-utils';
// @sfdc-extension-block-end SFDC_EXT_BOPIS

import tempUiString from '@/temp-ui-string';

// utils
import { isStandardProduct } from '@/lib/product-utils';

/**
 * Props for the CartContent component
 *
 * @interface CartContentProps
 * @property {ShopperBasketsV2.schemas['Basket'] | undefined} basket - The basket data from the loader
 * @property {Record<string, ShopperProducts.schemas['Product']>} [productsByItemId] - Item ID to product mapping
 * @property {Record<string, ShopperPromotions.schemas['Promotion']>} [promotions] - Promotion ID to promotion mapping
 */
interface CartContentProps {
    basket: ShopperBasketsV2.schemas['Basket'] | undefined;
    productsByItemId: Record<string, ShopperProducts.schemas['Product']>;
    promotions?: Record<string, ShopperPromotions.schemas['Promotion']>;
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
export default function CartContent({ basket, productsByItemId, promotions }: CartContentProps): ReactElement {
    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    const pickup = usePickup();
    const pickupBasketItems = pickup?.pickupBasketItems;
    const store = getPickupStoreFromMap(getStoreIdsFromBasket(basket)[0], pickup?.pickupStores);
    const pickupItems = filterPickupProductItems(basket, pickupBasketItems);
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    // Check if cart is empty using the basket prop from loader data
    if (!basket?.productItems?.length) {
        return <CartEmpty isRegistered={false} />;
    }

    let deliveryItems = basket?.productItems || [];

    // @sfdc-extension-block-start SFDC_EXT_BOPIS
    // Only filter pickup items from delivery if we have a store to render them in the pickup section
    // If no store exists, render all items as delivery items
    deliveryItems = store
        ? deliveryItems.filter((item) => !item.productId || !pickupBasketItems?.has(item.productId))
        : deliveryItems;
    // @sfdc-extension-block-end SFDC_EXT_BOPIS

    // Render prop function for cart-specific secondary actions
    const cartSecondaryActions = (
        product: ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>
    ) => {
        // Return undefined if no itemId - this will hide the buttons in the UI
        if (!product.itemId) return undefined;

        // Decide if Edit should be shown based on product type. Do not show edit buttons for standard products.
        const productDetails = product;
        const isStandardProd = productDetails && isStandardProduct(productDetails);

        return (
            <div className="flex gap-2">
                <RemoveItemButtonWithConfirmation itemId={product.itemId} className="pl-0" />
                {!isStandardProd && <CartItemEditButton product={product} className="pl-0" />}
            </div>
        );
    };

    return (
        <div className="flex-1 min-h-screen bg-background mb-10" data-testid="sf-cart-container">
            <div className="max-w-7xl mx-auto px-6">
                <CartTitle basket={basket} />

                {/* Mobile Order Summary Accordion - visible only on mobile */}
                <div className="md:hidden mb-3">
                    <Accordion type="single" collapsible className="border rounded-md bg-card px-5 py=3">
                        <AccordionItem value="order-summary">
                            <AccordionTrigger className="text-xl">
                                {tempUiString.cart.summary.showOrderSummary}
                            </AccordionTrigger>
                            <AccordionContent>
                                <OrderSummary
                                    basket={basket}
                                    showCartItems={false}
                                    isEstimate={true}
                                    productsByItemId={productsByItemId}
                                    showPromoCodeForm={true}
                                    showCheckoutAction={true}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[66%_1fr] lg:gap-11">
                    <div className="md:order-2 lg:order-1">
                        {/* @sfdc-extension-block-start SFDC_EXT_BOPIS */}
                        {/* Group store info cards with their product items */}
                        {pickupItems.length > 0 && store && (
                            <div key={store.id} className="md:p-8 p-3 border border-border rounded-lg shadow-sm mb-3">
                                <PickupStoreInfo store={store} />
                                <div className="mt-4">
                                    <ProductItemsList
                                        promotions={promotions}
                                        productItems={pickupItems}
                                        productsByItemId={productsByItemId}
                                        secondaryActions={cartSecondaryActions}
                                    />
                                </div>
                            </div>
                        )}
                        {/* @sfdc-extension-block-end SFDC_EXT_BOPIS */}
                        {/* Show delivery items if any exist */}
                        {deliveryItems.length > 0 && (
                            <div className="md:p-8 p-3 border border-border rounded-lg shadow-sm mb-3">
                                <ProductItemsList
                                    promotions={promotions}
                                    productItems={deliveryItems}
                                    productsByItemId={productsByItemId}
                                    secondaryActions={cartSecondaryActions}
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
                    </div>
                </div>
            </div>
        </div>
    );
}
