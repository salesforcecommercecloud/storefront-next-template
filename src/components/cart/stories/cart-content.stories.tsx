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
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { action } from 'storybook/actions';
import { getTranslation } from '@/lib/i18next';

import { Info, Truck, Heart, Check, MapPin } from 'lucide-react';

import CartContent from '../cart-content';
import ProductItemsList from '@/components/product-items-list';
import OrderSummary from '@/components/order-summary';
import { RemoveItemButtonWithConfirmation } from '@/components/buttons/remove-item-button-with-confirmation';
import { CartItemEditButton } from '@/components/cart/cart-item-edit-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbSeparator,
    BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { isStandardProduct, isBonusProduct, type EnrichedProductItem } from '@/lib/product-utils';
import emptyBasket from '@/components/__mocks__/empty-basket';
import { basketWithOneItem } from '@/components/__mocks__/basket-with-dress';
import { mockStandardProductOrderable } from '@/components/__mocks__/standard-product';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;
        const { t } = getTranslation();

        const logRemove = action('remove-item');
        const logEdit = action('edit-item');
        const logQuantity = action('change-quantity');
        const logApplyPromo = action('apply-promo');
        const logCheckout = action('checkout');
        const logQtyIncrement = action('quantity-increment');
        const logQtyDecrement = action('quantity-decrement');
        const logRemoveDialogConfirm = action('remove-item-confirm');
        const logRemoveDialogCancel = action('remove-item-cancel');
        const logEmptyContinue = action('empty-continue-shopping');
        const logPromoToggle = action('order-promo-toggle');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const removeEl = target.closest('[data-testid^="remove-item-"]');
            if (removeEl) {
                const testId = removeEl.getAttribute('data-testid') || '';
                const itemId = testId.replace('remove-item-', '');
                logRemove({ itemId, testId });
            }

            const promoToggle = target.closest('a, button');
            const promoLabel = (promoToggle as HTMLElement | null)?.textContent?.trim() || '';
            if (promoToggle && /do you have a promo code\?/i.test(promoLabel)) {
                logPromoToggle({ label: promoLabel });
            }

            const editEl = target.closest('[data-testid^="edit-item-"]');
            if (editEl) {
                const testId = editEl.getAttribute('data-testid') || '';
                const itemId = testId.replace('edit-item-', '');
                event.preventDefault();
                event.stopImmediatePropagation();
                logEdit({ itemId, testId });
            }

            const decBtn = target.closest('[data-testid="quantity-decrement"]');
            if (decBtn) {
                const container = decBtn.closest('div');
                const input = container?.querySelector('input[type="number"]');
                const payload: Record<string, unknown> = { testId: 'quantity-decrement' };
                if (input instanceof HTMLInputElement) {
                    payload.value = String((Number(input.value) || 0) - 1);
                }
                logQtyDecrement(payload);
            }

            const incBtn = target.closest('[data-testid="quantity-increment"]');
            if (incBtn) {
                const container = incBtn.closest('div');
                const input = container?.querySelector('input[type="number"]');
                const payload: Record<string, unknown> = { testId: 'quantity-increment' };
                if (input instanceof HTMLInputElement) {
                    payload.value = String((Number(input.value) || 0) + 1);
                }
                logQtyIncrement(payload);
            }

            const checkoutLink = target.closest('a[href="/checkout"]');
            if (checkoutLink) {
                event.preventDefault();
                const href = checkoutLink.getAttribute('href');
                logCheckout({ href });
            }

            const emptyCartRoot = target.closest('[data-testid="sf-cart-empty"]');
            if (emptyCartRoot) {
                const continueLink = target.closest('a[href="/"]');
                if (continueLink) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    logEmptyContinue({ href: '/' });
                }
            }
        };

        const handleGlobalClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const dialogContainer = target.closest('[role="alertdialog"]');
            if (!dialogContainer) return;

            const button = target.closest('button');
            const label = button?.textContent?.trim() || '';
            const confirmText = t('removeItem:confirmAction');
            const cancelText = t('removeItem:cancelButton');

            if (label === confirmText) {
                event.stopImmediatePropagation();
                logRemoveDialogConfirm({ label });
                return;
            }

            if (label === cancelText) {
                logRemoveDialogCancel({ label });
            }
        };

        const handleSubmit = (event: Event) => {
            const form = event.target as HTMLFormElement | null;
            if (!form) return;
            if (form.matches('form[data-testid="promo-code-form"]')) {
                event.preventDefault();
                event.stopImmediatePropagation();
                const input = form.querySelector('input[name="code"], input');
                const code = input instanceof HTMLInputElement ? input.value : '';
                logApplyPromo({ code });
            }
        };

        const handleChange = (event: Event) => {
            const input = event.target as HTMLInputElement | null;
            if (!input) return;
            if (input.type === 'number') {
                logQuantity({ value: input.value });
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('submit', handleSubmit, true);
        root.addEventListener('change', handleChange, true);
        document.addEventListener('click', handleGlobalClick, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('submit', handleSubmit, true);
            root.removeEventListener('change', handleChange, true);
            document.removeEventListener('click', handleGlobalClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof CartContent> = {
    title: 'CART/CartContent',
    component: CartContent,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
The CartContent component displays the shopping cart with items or an empty state. It orchestrates multiple sub-components using a composed layout to provide a complete cart experience.

## Features

- **Conditional Rendering**: Shows empty cart state when no items, full cart when items exist
- **Responsive Layout**: Desktop grid (66% items, 33% summary) with stacked mobile layout
- **Component Composition**: Composes Breadcrumb, ProductItemsList, OrderSummary, and action render props
- **Data Integration**: Accepts basket, product mappings, promotion mappings, and bonus product data
- **Delivery / Pickup Fulfillment**: Supports delivery and pickup badges with dropdown selectors per item (BOPIS extension)
- **Item Actions**: Gift checkbox, Edit, Remove, and Add to Wishlist action row per product item via \`secondaryActions\` render prop
- **Delivery Actions**: Delivery/Pickup badge with dropdown menu per product item via \`deliveryActions\` render prop
- **Bonus Products**: Carousel and modal for bonus product selection tied to promotions
- **Mobile Optimization**: Stacked layout — OrderSummary appears first (non-collapsible), then product cards; inline quantity picker with label; touch-friendly action rows
- **Accessibility**: Semantic structure, ARIA labels, and test identifiers throughout

## Layout Behavior

- **Desktop**: Grid layout with product items on left (66%) and sticky OrderSummary on right (33%). Each product card shows image, name, attributes, delivery badge, price, quantity picker, and action row (gift checkbox + Edit/Remove/Add to Wishlist on one line)
- **Mobile**: Stacked layout — OrderSummary at top (non-collapsible), then product cards below. Each card shows image + name + delivery badge, then price, "each" unit price (if qty > 1), inline quantity picker, then stacked gift checkbox and action links
- **Empty State**: Shows CartEmpty component when basket has no items
- **Pickup + Delivery Split**: When BOPIS is active, pickup items are grouped in a separate card with store info and "Change Store" button; delivery items appear in their own card with a "Delivery (X of Y items)" header

## Product Item Layout (ProductItem component)

Each cart item uses a flex-based layout (not grid):
- **Image**: Linked product thumbnail (96px mobile, 112px desktop) with rounded corners
- **Details column**: Product name (line-clamped), variation attributes, promotions, mobile price/quantity, and action row
- **Desktop right column**: Delivery badge, price (with "each" breakdown), and quantity picker aligned right
- **Mobile**: Price, unit price, and quantity picker render inline below attributes; delivery badge appears next to product name

## Integration

This component integrates with:
- **Breadcrumb** — Home > Cart navigation at the top
- **ProductItemsList** — Renders cart items with \`secondaryActions\` and \`deliveryActions\` render props
- **OrderSummary** — Displays subtotal, shipping, tax, promotions, promo code form, and checkout CTA
- **CartEmpty** — Empty cart state with continue shopping and sign-in buttons
- **RemoveItemButtonWithConfirmation** — Remove item with confirmation dialog
- **CartItemEditButton** — Edit item variants (hidden for standard and bonus products)
- **CartQuantityPicker** — Quantity selector with stock level limits
- **CartPickup** (BOPIS extension) — Store info card for pickup items
- **CartDeliveryOption** (BOPIS extension) — Delivery/pickup fulfillment selector per item

## Story Variants

| Story | Description |
|-------|-------------|
| EmptyCart | Empty basket — shows CartEmpty component |
| CartWithItems | Single item with OrderSummary (shipping progress bar config) |
| CartWithPromotions | 2 items with qualified promotion, delivery badges, gift checkbox, action row |
| MobileLayout | Mobile viewport — OrderSummary first, then product card (stacked) |
| LargeOrder | 4 items with scrolling behavior |
| HighQuantityItem | Single item with quantity 10 — shows "each" price breakdown |
| MissingProductImage | Graceful fallback when product image data is missing |
| LongProductNames | Verifies text wrapping / line-clamp with very long names |
| CartWithPickupDelivery | 1 pickup + 2 delivery items in separate cards with store info |
                `,
            },
        },
    },
    argTypes: {
        basket: {
            description: 'Shopping basket data containing items, totals, and pricing information',
            control: 'object',
            table: {
                type: { summary: 'ShopperBasketsV2.schemas["Basket"] | undefined' },
            },
        },
        productsByItemId: {
            description: 'Mapping of item IDs to product details for enhanced display',
            control: 'object',
            table: {
                type: { summary: 'Record<string, ShopperProducts.schemas["Product"]>' },
            },
        },
        promotions: {
            description: 'Mapping of promotion IDs to promotion details',
            control: 'object',
            table: {
                type: { summary: 'Record<string, ShopperPromotionsTypes.Promotion>' },
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyCart: Story = {
    args: {
        basket: emptyBasket,
        productsByItemId: {},
    },
    parameters: {
        docs: {
            description: {
                story: `
Empty cart state when basket has no product items. Shows:
- CartEmpty component with empty cart message
- Continue shopping button
- Sign in button for guest users

This is the default state when a user has no items in their cart.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Wait for and verify empty cart state is shown
        const emptyCartContainer = canvasElement.querySelector('[data-testid="sf-cart-empty"]');
        await expect(emptyCartContainer).toBeInTheDocument();

        // Verify continue shopping button exists (using text since Button asChild with Link may not expose role correctly)
        const continueShoppingButton = await canvas.findByText(t('cart:empty.continueShopping'), {}, { timeout: 5000 });
        await expect(continueShoppingButton).toBeInTheDocument();
    },
};

// Single item for CartWithItems (matches DesktopWithShippingProgressBar spend-to-unlock totals)
const cartWithItemsBasketItems = [
    {
        itemId: 'item-1',
        productId: mockStandardProductOrderable.product.id,
        quantity: 1,
        price: 42,
        productName: mockStandardProductOrderable.product.name,
        priceAfterItemDiscount: 42,
    },
] as ShopperBasketsV2.schemas['ProductItem'][];

const cartWithItemsProductMap: Record<string, ShopperProducts.schemas['Product']> = {
    'item-1': mockStandardProductOrderable.product,
};

const cartWithItemsBasket: ShopperBasketsV2.schemas['Basket'] = {
    ...basketWithOneItem,
    productItems: cartWithItemsBasketItems,
    productSubTotal: 42,
    productTotal: 42,
    shippingTotal: 5.99,
    taxTotal: 3.36,
    orderTotal: 51.35,
};

// Two items for CartWithPromotions (matches DesktopWithItems qualified promotion totals)
const cartWithPromotionsBasketItems = [
    {
        itemId: 'promo-item-1',
        productId: mockStandardProductOrderable.product.id,
        quantity: 1,
        price: 45,
        productName: mockStandardProductOrderable.product.name,
        priceAfterItemDiscount: 45,
    },
    {
        itemId: 'promo-item-2',
        productId: mockStandardProductOrderable.product.id,
        quantity: 1,
        price: 30,
        productName: mockStandardProductOrderable.product.name,
        priceAfterItemDiscount: 30,
    },
] as ShopperBasketsV2.schemas['ProductItem'][];

const cartWithPromotionsProductMap: Record<string, ShopperProducts.schemas['Product']> = {
    'promo-item-1': mockStandardProductOrderable.product,
    'promo-item-2': mockStandardProductOrderable.product,
};

const cartWithPromotionsBasket: ShopperBasketsV2.schemas['Basket'] = {
    ...basketWithOneItem,
    productItems: cartWithPromotionsBasketItems,
    productSubTotal: 75,
    productTotal: 75,
    shippingTotal: 0,
    taxTotal: 6,
    orderTotal: 81,
};

// Cart secondary actions matching CartContent's pattern
const cartSecondaryActions = (product: EnrichedProductItem) => {
    if (!product.itemId) return undefined;
    const isBonusProd = isBonusProduct(product);
    const isStandardProd = isStandardProduct(product as ShopperProducts.schemas['Product']);
    const shouldShowEditButton = !isStandardProd && !isBonusProd;
    return (
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2">
                <Checkbox id={`gift-${product.itemId}`} />
                <Label htmlFor={`gift-${product.itemId}`} className="text-sm text-muted-foreground cursor-pointer">
                    This is a gift.
                </Label>
            </div>
            <div className="flex items-center gap-3 flex-nowrap">
                {shouldShowEditButton && <CartItemEditButton product={product} className="px-0" />}
                <RemoveItemButtonWithConfirmation itemId={product.itemId} className="px-0" />
                <button
                    type="button"
                    className="text-sm text-primary hover:underline flex items-center gap-1 whitespace-nowrap">
                    <Heart className="size-3.5" />
                    Add to Wishlist
                </button>
            </div>
        </div>
    );
};

// Pickup actions dropdown — "Pick Up in Store" selected
const cartPickupActions = (_product: EnrichedProductItem) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <button type="button" className="cursor-pointer">
                <Badge variant="secondary" className="text-xs font-medium gap-1 text-primary bg-primary/10">
                    <MapPin className="size-3" />
                    Pickup
                </Badge>
            </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 p-0">
            <DropdownMenuItem className="py-2.5 px-3 text-sm text-primary font-medium bg-primary/5 cursor-pointer">
                <Check className="size-4 text-primary" />
                Pick Up in Store
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-0" />
            <DropdownMenuItem className="py-2.5 px-3 text-sm text-foreground cursor-pointer">
                <span className="w-4" />
                Ship to Address
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
);

// Delivery actions dropdown — "Ship to Address" selected
const cartDeliveryActions = (_product: EnrichedProductItem) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <button type="button" className="cursor-pointer">
                <Badge variant="secondary" className="text-xs font-medium gap-1">
                    <Truck className="size-3" />
                    Delivery
                </Badge>
            </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 p-0">
            <DropdownMenuItem className="py-2.5 px-3 text-sm text-foreground cursor-pointer">
                <span className="w-4" />
                Pick Up in Store
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-0" />
            <DropdownMenuItem className="py-2.5 px-3 text-sm text-primary font-medium bg-primary/5 cursor-pointer">
                <Check className="size-4 text-primary" />
                Ship to Address
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
);

export const CartWithItems: Story = {
    args: {
        basket: cartWithItemsBasket,
        productsByItemId: cartWithItemsProductMap,
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with items composing ProductItemsList and OrderSummary (DesktopWithItems config). Shows:
- Cart title with item count
- Product items list reusing the same data as the ProductItemsList Default story
- Order summary with promo code form and checkout action
- Remove and edit buttons for each item
                `,
            },
        },
    },
    render: () => (
        <div className="flex-1 min-h-screen bg-background mb-10" data-testid="sf-cart-container">
            <div className="max-w-7xl mx-auto px-6">
                <Breadcrumb className="mb-6 mt-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">Home</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Cart</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="grid grid-cols-1 lg:grid-cols-[66%_1fr] lg:gap-11">
                    <div className="md:order-2 lg:order-1">
                        <div className="md:p-8 p-3 border border-border rounded-lg shadow-sm mb-3">
                            {/* Delivery header */}
                            <div className="flex items-start gap-2 mb-4">
                                <Info className="size-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-semibold">
                                        Delivery - {cartWithItemsBasketItems.length} out of{' '}
                                        {cartWithItemsBasketItems.length} items
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        478 Artisan Way, Somerville, MA 02145
                                    </div>
                                </div>
                            </div>
                            <ProductItemsList
                                productItems={cartWithItemsBasketItems}
                                productsByItemId={cartWithItemsProductMap}
                                secondaryActions={cartSecondaryActions}
                                deliveryActions={cartDeliveryActions}
                            />
                        </div>
                    </div>
                    <div className="hidden md:block md:order-1 lg:order-2">
                        <OrderSummary
                            basket={cartWithItemsBasket}
                            showCartItems={false}
                            isEstimate={true}
                            productsByItemId={cartWithItemsProductMap}
                            showPromoCodeForm={true}
                            showCheckoutAction={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for and verify cart container is rendered
        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();

        // Verify empty cart is not shown
        const emptyCart = canvasElement.querySelector('[data-testid="sf-cart-empty"]');
        await expect(emptyCart).not.toBeInTheDocument();

        // Verify cart title is present
        const cartTitle = await canvas.findByText(/cart/i, {}, { timeout: 5000 });
        await expect(cartTitle).toBeInTheDocument();

        // Verify product item is rendered
        const productItems = canvasElement.querySelectorAll('[data-testid^="sf-product-item-"]');
        await expect(productItems.length).toBeGreaterThanOrEqual(1);
    },
};

export const CartWithPromotions: Story = {
    args: {
        basket: cartWithPromotionsBasket,
        productsByItemId: cartWithPromotionsProductMap,
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with 2 items and a qualified promotion. Shows:
- Cart title with total item count
- Delivery header with address
- Product items list with 2 items and delivery badges
- Order summary with totals and checkout action
- Gift checkbox, Edit, Remove, and Add to Wishlist actions per item
                `,
            },
        },
    },
    render: () => (
        <div className="flex-1 min-h-screen bg-background mb-10" data-testid="sf-cart-container">
            <div className="max-w-7xl mx-auto px-6">
                <Breadcrumb className="mb-6 mt-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">Home</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Cart</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="grid grid-cols-1 lg:grid-cols-[66%_1fr] lg:gap-11">
                    <div className="md:order-2 lg:order-1">
                        <div className="md:p-8 p-3 border border-border rounded-lg shadow-sm mb-3">
                            {/* Delivery header */}
                            <div className="flex items-start gap-2 mb-4">
                                <Info className="size-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-semibold">
                                        Delivery - {cartWithPromotionsBasketItems.length} out of{' '}
                                        {cartWithPromotionsBasketItems.length} items
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        478 Artisan Way, Somerville, MA 02145
                                    </div>
                                </div>
                            </div>
                            <ProductItemsList
                                productItems={cartWithPromotionsBasketItems}
                                productsByItemId={cartWithPromotionsProductMap}
                                secondaryActions={cartSecondaryActions}
                                deliveryActions={cartDeliveryActions}
                            />
                        </div>
                    </div>
                    <div className="hidden md:block md:order-1 lg:order-2">
                        <OrderSummary
                            basket={cartWithPromotionsBasket}
                            showCartItems={false}
                            isEstimate={true}
                            productsByItemId={cartWithPromotionsProductMap}
                            showPromoCodeForm={true}
                            showCheckoutAction={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for and verify cart container is rendered
        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();

        // Verify cart title shows item count
        const cartTitle = await canvas.findByText(/cart/i, {}, { timeout: 5000 });
        await expect(cartTitle).toBeInTheDocument();

        // Verify 2 product items are rendered
        const productItems = canvasElement.querySelectorAll('[data-testid^="sf-product-item-"]');
        await expect(productItems.length).toBeGreaterThanOrEqual(2);
    },
};

export const MobileLayout: Story = {
    args: {
        basket: cartWithItemsBasket,
        productsByItemId: cartWithItemsProductMap,
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart layout optimized for mobile devices. Shows:
- Breadcrumb navigation (Home > Cart)
- Stacked layout with product card on top, order summary below (not collapsible)
- Delivery header, delivery badge, and action row
- Mobile-optimized spacing and touch targets
                `,
            },
        },
    },
    globals: {
        viewport: 'mobile2',
    },
    render: () => (
        <div className="flex-1 min-h-screen bg-background mb-10" data-testid="sf-cart-container">
            <div className="max-w-7xl mx-auto px-4">
                <Breadcrumb className="mb-6 mt-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">Home</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Cart</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="space-y-4">
                    <OrderSummary
                        basket={cartWithItemsBasket}
                        showCartItems={false}
                        isEstimate={true}
                        productsByItemId={cartWithItemsProductMap}
                        showPromoCodeForm={true}
                        showCheckoutAction={true}
                    />
                    <div className="p-3 border border-border rounded-lg shadow-sm">
                        {/* Delivery header */}
                        <div className="flex items-start gap-2 mb-4">
                            <Info className="size-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="text-sm font-semibold">
                                    Delivery - {cartWithItemsBasketItems.length} out of{' '}
                                    {cartWithItemsBasketItems.length} items
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    478 Artisan Way, Somerville, MA 02145
                                </div>
                            </div>
                        </div>
                        <ProductItemsList
                            productItems={cartWithItemsBasketItems}
                            productsByItemId={cartWithItemsProductMap}
                            secondaryActions={cartSecondaryActions}
                            deliveryActions={cartDeliveryActions}
                        />
                    </div>
                </div>
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();

        // Verify breadcrumb is present
        const breadcrumb = canvasElement.querySelector('[aria-label="breadcrumb"]');
        await expect(breadcrumb).toBeInTheDocument();
    },
};

// Large order mock data (4 items)
const largeOrderBasketItems = [
    {
        itemId: 'large-item-1',
        productId: mockStandardProductOrderable.product.id,
        quantity: 2,
        price: 45,
        productName: mockStandardProductOrderable.product.name,
        priceAfterItemDiscount: 90,
    },
    {
        itemId: 'large-item-2',
        productId: mockStandardProductOrderable.product.id,
        quantity: 1,
        price: 30,
        productName: mockStandardProductOrderable.product.name,
        priceAfterItemDiscount: 30,
    },
    {
        itemId: 'large-item-3',
        productId: mockStandardProductOrderable.product.id,
        quantity: 3,
        price: 25,
        productName: mockStandardProductOrderable.product.name,
        priceAfterItemDiscount: 75,
    },
    {
        itemId: 'large-item-4',
        productId: mockStandardProductOrderable.product.id,
        quantity: 1,
        price: 60,
        productName: mockStandardProductOrderable.product.name,
        priceAfterItemDiscount: 60,
    },
] as ShopperBasketsV2.schemas['ProductItem'][];

const largeOrderProductMap: Record<string, ShopperProducts.schemas['Product']> = {
    'large-item-1': mockStandardProductOrderable.product,
    'large-item-2': mockStandardProductOrderable.product,
    'large-item-3': mockStandardProductOrderable.product,
    'large-item-4': mockStandardProductOrderable.product,
};

const largeOrderBasket: ShopperBasketsV2.schemas['Basket'] = {
    ...basketWithOneItem,
    productItems: largeOrderBasketItems,
    productSubTotal: 255,
    productTotal: 255,
    shippingTotal: 0,
    taxTotal: 20.4,
    orderTotal: 275.4,
};

export const LargeOrder: Story = {
    args: {
        basket: largeOrderBasket,
        productsByItemId: largeOrderProductMap,
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with 4 items. Demonstrates:
- Scrolling behavior with many items
- Delivery header, delivery badges, and action rows for each item
- Order summary with totals
- Order summary with totals for a large order
                `,
            },
        },
    },
    render: () => (
        <div className="flex-1 min-h-screen bg-background mb-10" data-testid="sf-cart-container">
            <div className="max-w-7xl mx-auto px-6">
                <Breadcrumb className="mb-6 mt-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">Home</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Cart</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="grid grid-cols-1 lg:grid-cols-[66%_1fr] lg:gap-11">
                    <div className="md:order-2 lg:order-1">
                        <div className="md:p-8 p-3 border border-border rounded-lg shadow-sm mb-3">
                            <div className="flex items-start gap-2 mb-4">
                                <Info className="size-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-semibold">
                                        Delivery - {largeOrderBasketItems.length} out of {largeOrderBasketItems.length}{' '}
                                        items
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        478 Artisan Way, Somerville, MA 02145
                                    </div>
                                </div>
                            </div>
                            <ProductItemsList
                                productItems={largeOrderBasketItems}
                                productsByItemId={largeOrderProductMap}
                                secondaryActions={cartSecondaryActions}
                                deliveryActions={cartDeliveryActions}
                            />
                        </div>
                    </div>
                    <div className="hidden md:block md:order-1 lg:order-2">
                        <OrderSummary
                            basket={largeOrderBasket}
                            showCartItems={false}
                            isEstimate={true}
                            productsByItemId={largeOrderProductMap}
                            showPromoCodeForm={true}
                            showCheckoutAction={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();

        const cartTitle = await canvas.findByText(/cart/i, {}, { timeout: 5000 });
        await expect(cartTitle).toBeInTheDocument();

        // Verify 4 product items are rendered
        const productItems = canvasElement.querySelectorAll('[data-testid^="sf-product-item-"]');
        await expect(productItems.length).toBeGreaterThanOrEqual(4);
    },
};

// High quantity item mock data
const highQtyBasketItems = [
    {
        itemId: 'hq-item-1',
        productId: mockStandardProductOrderable.product.id,
        quantity: 10,
        price: 42,
        productName: mockStandardProductOrderable.product.name,
        priceAfterItemDiscount: 420,
    },
] as ShopperBasketsV2.schemas['ProductItem'][];

const highQtyProductMap: Record<string, ShopperProducts.schemas['Product']> = {
    'hq-item-1': mockStandardProductOrderable.product,
};

const highQtyBasket: ShopperBasketsV2.schemas['Basket'] = {
    ...basketWithOneItem,
    productItems: highQtyBasketItems,
    productSubTotal: 420,
    productTotal: 420,
    shippingTotal: 0,
    taxTotal: 33.6,
    orderTotal: 453.6,
};

export const HighQuantityItem: Story = {
    args: {
        basket: highQtyBasket,
        productsByItemId: highQtyProductMap,
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with a single item having high quantity (10). Shows:
- "each" price breakdown for quantity > 1
- Quantity picker with high value
- Delivery header, delivery badge, and action row

This demonstrates how the component handles items with high quantities.
                `,
            },
        },
    },
    render: () => (
        <div className="flex-1 min-h-screen bg-background mb-10" data-testid="sf-cart-container">
            <div className="max-w-7xl mx-auto px-6">
                <Breadcrumb className="mb-6 mt-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">Home</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Cart</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="grid grid-cols-1 lg:grid-cols-[66%_1fr] lg:gap-11">
                    <div className="md:order-2 lg:order-1">
                        <div className="md:p-8 p-3 border border-border rounded-lg shadow-sm mb-3">
                            <div className="flex items-start gap-2 mb-4">
                                <Info className="size-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-semibold">
                                        Delivery - {highQtyBasketItems.length} out of {highQtyBasketItems.length} items
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        478 Artisan Way, Somerville, MA 02145
                                    </div>
                                </div>
                            </div>
                            <ProductItemsList
                                productItems={highQtyBasketItems}
                                productsByItemId={highQtyProductMap}
                                secondaryActions={cartSecondaryActions}
                                deliveryActions={cartDeliveryActions}
                            />
                        </div>
                    </div>
                    <div className="hidden md:block md:order-1 lg:order-2">
                        <OrderSummary
                            basket={highQtyBasket}
                            showCartItems={false}
                            isEstimate={true}
                            productsByItemId={highQtyProductMap}
                            showPromoCodeForm={true}
                            showCheckoutAction={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();
    },
};

export const MissingProductImage: Story = {
    args: {
        basket: cartWithItemsBasket,
        productsByItemId: {},
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with missing product image data. Shows:
- Graceful handling of missing product details
- Fallback behavior when productsByItemId is empty
- Delivery header, delivery badges, and action row still render
- Component still renders correctly with the composed layout

This demonstrates the component's resilience to missing data.
                `,
            },
        },
    },
    render: () => (
        <div className="flex-1 min-h-screen bg-background mb-10" data-testid="sf-cart-container">
            <div className="max-w-7xl mx-auto px-6">
                <Breadcrumb className="mb-6 mt-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">Home</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Cart</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="grid grid-cols-1 lg:grid-cols-[66%_1fr] lg:gap-11">
                    <div className="md:order-2 lg:order-1">
                        <div className="md:p-8 p-3 border border-border rounded-lg shadow-sm mb-3">
                            {/* Delivery header */}
                            <div className="flex items-start gap-2 mb-4">
                                <Info className="size-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-semibold">
                                        Delivery - {cartWithItemsBasketItems.length} out of{' '}
                                        {cartWithItemsBasketItems.length} items
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        478 Artisan Way, Somerville, MA 02145
                                    </div>
                                </div>
                            </div>
                            <ProductItemsList
                                productItems={cartWithItemsBasketItems}
                                productsByItemId={{}}
                                secondaryActions={cartSecondaryActions}
                                deliveryActions={cartDeliveryActions}
                            />
                        </div>
                    </div>
                    <div className="hidden md:block md:order-1 lg:order-2">
                        <OrderSummary
                            basket={cartWithItemsBasket}
                            showCartItems={false}
                            isEstimate={true}
                            productsByItemId={{}}
                            showPromoCodeForm={true}
                            showCheckoutAction={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Wait for and verify cart container is rendered even without product details
        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();
    },
};

// Long product name mock data
const longNameBasketItems = [
    {
        itemId: 'long-item-1',
        productId: mockStandardProductOrderable.product.id,
        quantity: 1,
        price: 42,
        productName: 'Very Long Product Name That Should Wrap Properly In The Cart Display Area',
        priceAfterItemDiscount: 42,
    },
] as ShopperBasketsV2.schemas['ProductItem'][];

const longNameProductMap: Record<string, ShopperProducts.schemas['Product']> = {
    'long-item-1': {
        ...mockStandardProductOrderable.product,
        name: 'Very Long Product Name That Should Wrap Properly In The Cart Display Area',
    },
};

const longNameBasket: ShopperBasketsV2.schemas['Basket'] = {
    ...basketWithOneItem,
    productItems: longNameBasketItems,
    productSubTotal: 42,
    productTotal: 42,
    shippingTotal: 5.99,
    taxTotal: 3.36,
    orderTotal: 51.35,
};

export const LongProductNames: Story = {
    args: {
        basket: longNameBasket,
        productsByItemId: longNameProductMap,
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with items having very long product names. Shows:
- Text wrapping / line-clamp behavior
- Layout stability with long names
- Delivery header, delivery badge, and action row still render correctly

This verifies the component handles long product names gracefully.
                `,
            },
        },
    },
    render: () => (
        <div className="flex-1 min-h-screen bg-background mb-10" data-testid="sf-cart-container">
            <div className="max-w-7xl mx-auto px-6">
                <Breadcrumb className="mb-6 mt-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">Home</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Cart</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="grid grid-cols-1 lg:grid-cols-[66%_1fr] lg:gap-11">
                    <div className="md:order-2 lg:order-1">
                        <div className="md:p-8 p-3 border border-border rounded-lg shadow-sm mb-3">
                            <div className="flex items-start gap-2 mb-4">
                                <Info className="size-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-semibold">
                                        Delivery - {longNameBasketItems.length} out of {longNameBasketItems.length}{' '}
                                        items
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        478 Artisan Way, Somerville, MA 02145
                                    </div>
                                </div>
                            </div>
                            <ProductItemsList
                                productItems={longNameBasketItems}
                                productsByItemId={longNameProductMap}
                                secondaryActions={cartSecondaryActions}
                                deliveryActions={cartDeliveryActions}
                            />
                        </div>
                    </div>
                    <div className="hidden md:block md:order-1 lg:order-2">
                        <OrderSummary
                            basket={longNameBasket}
                            showCartItems={false}
                            isEstimate={true}
                            productsByItemId={longNameProductMap}
                            showPromoCodeForm={true}
                            showCheckoutAction={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();

        // Verify long product name is displayed
        const hasLongName = canvasElement.textContent?.toLowerCase().includes('very long product name');
        await expect(hasLongName).toBe(true);
    },
};

// Mixed pickup/delivery mock data (3 items: 1 pickup, 2 delivery)
const pickupDeliveryBasketItems = [
    {
        itemId: 'pd-item-1',
        productId: mockStandardProductOrderable.product.id,
        quantity: 1,
        price: 35,
        productName: mockStandardProductOrderable.product.name,
        priceAfterItemDiscount: 35,
    },
    {
        itemId: 'pd-item-2',
        productId: mockStandardProductOrderable.product.id,
        quantity: 1,
        price: 45,
        productName: mockStandardProductOrderable.product.name,
        priceAfterItemDiscount: 45,
    },
    {
        itemId: 'pd-item-3',
        productId: mockStandardProductOrderable.product.id,
        quantity: 2,
        price: 30,
        productName: mockStandardProductOrderable.product.name,
        priceAfterItemDiscount: 60,
    },
] as ShopperBasketsV2.schemas['ProductItem'][];

const pickupDeliveryProductMap: Record<string, ShopperProducts.schemas['Product']> = {
    'pd-item-1': mockStandardProductOrderable.product,
    'pd-item-2': mockStandardProductOrderable.product,
    'pd-item-3': mockStandardProductOrderable.product,
};

const pickupDeliveryBasket: ShopperBasketsV2.schemas['Basket'] = {
    ...basketWithOneItem,
    productItems: pickupDeliveryBasketItems,
    productSubTotal: 140,
    productTotal: 140,
    shippingTotal: 0,
    taxTotal: 11.2,
    orderTotal: 151.2,
};

// Split items by fulfillment type
const pickupItems = [pickupDeliveryBasketItems[0]] as ShopperBasketsV2.schemas['ProductItem'][];
const deliveryItems = pickupDeliveryBasketItems.slice(1);

export const CartWithPickupDelivery: Story = {
    args: {
        basket: pickupDeliveryBasket,
        productsByItemId: pickupDeliveryProductMap,
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with 3 items mixing pickup and delivery fulfillment. Shows:
- 1 item with "Pick Up in Store" selected (MapPin badge)
- 2 items with "Ship to Address" / Delivery selected (Truck badge)
- Each item's delivery badge opens a dropdown to switch fulfillment
- Breadcrumb, delivery header, action rows, and OrderSummary
                `,
            },
        },
    },
    render: () => (
        <div className="flex-1 min-h-screen bg-background mb-10" data-testid="sf-cart-container">
            <div className="max-w-7xl mx-auto px-6">
                <Breadcrumb className="mb-6 mt-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">Home</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Cart</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="grid grid-cols-1 lg:grid-cols-[66%_1fr] lg:gap-11">
                    <div className="md:order-2 lg:order-1 space-y-3">
                        {/* Pickup card */}
                        <div className="md:p-8 p-3 border border-border rounded-lg shadow-sm">
                            <div className="flex items-start justify-between gap-2 mb-4">
                                <div className="flex items-start gap-2">
                                    <MapPin className="size-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-sm font-semibold">
                                            Pickup in <span className="font-bold">Dorchester</span> -{' '}
                                            {pickupItems.length} out of {pickupItems.length} items available
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            26 District Avenue, Dorchester, MA 02125
                                        </div>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" className="whitespace-nowrap flex-shrink-0">
                                    Change Store
                                </Button>
                            </div>
                            <ProductItemsList
                                productItems={pickupItems}
                                productsByItemId={pickupDeliveryProductMap}
                                secondaryActions={cartSecondaryActions}
                                deliveryActions={cartPickupActions}
                            />
                        </div>
                        {/* Delivery card */}
                        <div className="md:p-8 p-3 border border-border rounded-lg shadow-sm">
                            <div className="flex items-start gap-2 mb-4">
                                <Info className="size-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="text-sm font-semibold">
                                        Delivery - {deliveryItems.length} out of {pickupDeliveryBasketItems.length}{' '}
                                        items
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        478 Artisan Way, Somerville, MA 02145
                                    </div>
                                </div>
                            </div>
                            <ProductItemsList
                                productItems={deliveryItems}
                                productsByItemId={pickupDeliveryProductMap}
                                secondaryActions={cartSecondaryActions}
                                deliveryActions={cartDeliveryActions}
                            />
                        </div>
                    </div>
                    <div className="hidden md:block md:order-1 lg:order-2">
                        <OrderSummary
                            basket={pickupDeliveryBasket}
                            showCartItems={false}
                            isEstimate={true}
                            productsByItemId={pickupDeliveryProductMap}
                            showPromoCodeForm={true}
                            showCheckoutAction={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();

        const cartTitle = await canvas.findByText(/cart/i, {}, { timeout: 5000 });
        await expect(cartTitle).toBeInTheDocument();

        // Verify 3 product items are rendered
        const productItems = canvasElement.querySelectorAll('[data-testid^="sf-product-item-"]');
        await expect(productItems.length).toBeGreaterThanOrEqual(3);
    },
};
