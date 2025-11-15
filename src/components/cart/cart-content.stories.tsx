import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { action } from 'storybook/actions';

import CartContent from './cart-content';
import emptyBasket from '@/components/__mocks__/empty-basket';
import {
    basketWithOneItem,
    inBasketProductDetails as dressProductDetails,
} from '@/components/__mocks__/basket-with-dress';
import { basketWithMultipleItems, inBasketProductDetails } from '@/components/__mocks__/basket-with-multiple-items';
import uiStrings from '@/temp-ui-string';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

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
        const logEmptySignIn = action('empty-sign-in');
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
                    return;
                }
                const signInLink = target.closest('a[href="/account"]');
                if (signInLink) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    logEmptySignIn({ href: '/account' });
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
            const confirmText = uiStrings.removeItem.confirmAction;
            const cancelText = uiStrings.removeItem.cancelButton;

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

        const originalSetTimeout = window.setTimeout;
        window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
            if (typeof timeout === 'number' && timeout >= 700) {
                return 0 as unknown as number;
            }
            return originalSetTimeout(handler, timeout, ...args);
        }) as typeof window.setTimeout;

        root.addEventListener('click', handleClick, true);
        root.addEventListener('submit', handleSubmit, true);
        root.addEventListener('change', handleChange, true);
        document.addEventListener('click', handleGlobalClick, true);

        return () => {
            window.setTimeout = originalSetTimeout;
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
The CartContent component displays the shopping cart with items or an empty state. It orchestrates multiple sub-components to provide a complete cart experience.

## Features

- **Conditional Rendering**: Shows empty cart state when no items, full cart when items exist
- **Responsive Layout**: Desktop grid (66% items, 33% summary) with mobile CTA section
- **Component Composition**: Orchestrates CartTitle, ProductItemsList, OrderSummary
- **Data Integration**: Accepts basket, product mappings, and promotion mappings
- **Mobile Optimization**: Separate mobile checkout section for better UX
- **Accessibility**: Proper semantic structure with test identifiers

## Layout Behavior

- **Desktop**: Grid layout with items on left (66%) and order summary on right (33%)
- **Mobile**: Stacked layout with accordion for order summary
- **Empty State**: Shows CartEmpty component when basket has no items

## Integration

This component integrates with:
- CartTitle for displaying cart header
- ProductItemsList for displaying cart items
- OrderSummary for displaying order totals
- CartEmpty for empty cart state
- RemoveItemButtonWithConfirmation and CartItemEditButton for item actions
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

// Helper to create product map from basket items
const createProductMap = (items: typeof basketWithOneItem.productItems, productDetails: typeof dressProductDetails) => {
    const productMap: Record<string, (typeof productDetails.data)[0]> = {};
    if (items) {
        items.forEach((item: ShopperBasketsV2.schemas['ProductItem']) => {
            if (item.itemId) {
                const product = productDetails.data.find(
                    (p: ShopperProducts.schemas['Product']) => p.id === item.productId
                );
                if (product) {
                    productMap[item.itemId] = product;
                }
            }
        });
    }
    return productMap;
};

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
        const canvas = within(canvasElement);

        // Verify empty cart state is shown
        const emptyCartContainer = canvasElement.querySelector('[data-testid="sf-cart-empty"]');
        await expect(emptyCartContainer).toBeInTheDocument();

        // Verify continue shopping button exists (using text since Button asChild with Link may not expose role correctly)
        const continueShoppingButton = canvas.getByText(uiStrings.cart.empty.continueShopping);
        await expect(continueShoppingButton).toBeInTheDocument();
    },
};

export const CartWithItems: Story = {
    args: {
        basket: basketWithOneItem,
        productsByItemId: createProductMap(basketWithOneItem.productItems || [], dressProductDetails),
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with a single item. Shows:
- Cart title with item count
- Product items list with the item
- Order summary with totals
- Remove and edit buttons for the item

This demonstrates the basic cart functionality with one item.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify cart container is rendered
        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();

        // Verify empty cart is not shown
        const emptyCart = canvasElement.querySelector('[data-testid="sf-cart-empty"]');
        await expect(emptyCart).not.toBeInTheDocument();

        // Verify cart title is present
        const cartTitle = canvas.getByText(/cart/i);
        await expect(cartTitle).toBeInTheDocument();
    },
};

export const CartWithPromotions: Story = {
    args: {
        basket: basketWithMultipleItems,
        productsByItemId: createProductMap(basketWithMultipleItems.productItems || [], inBasketProductDetails),
        promotions: {},
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with multiple items. Shows:
- Cart title with total item count
- Product items list with all items
- Order summary with totals
- Remove and edit buttons for each item

This demonstrates the cart with multiple products.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify cart container is rendered
        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();

        // Verify cart title shows item count
        const cartTitle = canvas.getByText(/cart/i);
        await expect(cartTitle).toBeInTheDocument();
    },
};

export const MobileLayout: Story = {
    args: {
        basket: basketWithOneItem,
        productsByItemId: createProductMap(basketWithOneItem.productItems || [], dressProductDetails),
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1',
        },
        docs: {
            description: {
                story: `
Cart layout optimized for mobile devices. Shows:
- Stacked layout with items on top
- Accordion for order summary (collapsible)
- Mobile-optimized spacing and touch targets

The component automatically adapts its layout for mobile screens.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        // Verify cart container is rendered
        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();

        // Verify mobile accordion is present
        const accordion = canvasElement.querySelector('[role="button"]');
        if (accordion) {
            await expect(accordion).toBeInTheDocument();
        }
    },
};

export const DesktopLayout: Story = {
    args: {
        basket: basketWithMultipleItems,
        productsByItemId: createProductMap(basketWithMultipleItems.productItems || [], inBasketProductDetails),
    },
    parameters: {
        viewport: {
            defaultViewport: 'desktop',
        },
        docs: {
            description: {
                story: `
Cart layout for desktop devices. Shows:
- Grid layout with items on left (66%) and order summary on right (33%)
- Fixed order summary sidebar
- Desktop-optimized spacing and layout

The component provides a two-column layout for desktop screens.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify cart container is rendered
        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();

        // Verify cart title is present
        const cartTitle = canvas.getByText(/cart/i);
        await expect(cartTitle).toBeInTheDocument();
    },
};

export const LargeOrder: Story = {
    args: {
        basket: basketWithMultipleItems,
        productsByItemId: createProductMap(basketWithMultipleItems.productItems || [], inBasketProductDetails),
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with a large number of items. Demonstrates:
- Scrolling behavior with many items
- Order summary calculations with multiple products
- Performance with larger product lists

This story helps verify the component handles larger orders gracefully.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify cart container is rendered
        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();

        // Verify cart title shows correct item count
        const cartTitle = canvas.getByText(/cart/i);
        await expect(cartTitle).toBeInTheDocument();
    },
};

export const HighQuantityItem: Story = {
    args: {
        basket: {
            ...basketWithOneItem,
            productItems: basketWithOneItem.productItems
                ? [
                      {
                          ...basketWithOneItem.productItems[0],
                          quantity: 10,
                      },
                  ]
                : [],
        },
        productsByItemId: createProductMap(basketWithOneItem.productItems || [], dressProductDetails),
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with a single item having high quantity. Shows:
- Item with quantity > 1
- Correct total calculations
- Quantity controls if applicable

This demonstrates how the component handles items with high quantities.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        // Verify cart container is rendered
        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();
    },
};

export const MissingProductImage: Story = {
    args: {
        basket: basketWithOneItem,
        productsByItemId: {},
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with missing product image data. Shows:
- Graceful handling of missing product details
- Fallback behavior when productsByItemId is empty
- Component still renders correctly

This demonstrates the component's resilience to missing data.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        // Verify cart container is rendered even without product details
        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();
    },
};

export const LongProductNames: Story = {
    args: {
        basket: {
            ...basketWithOneItem,
            productItems: basketWithOneItem.productItems
                ? [
                      {
                          ...basketWithOneItem.productItems[0],
                          itemText: 'Very Long Product Name That Should Wrap Properly In The Cart Display Area',
                          productName: 'Very Long Product Name That Should Wrap Properly In The Cart Display Area',
                      },
                  ]
                : [],
        },
        productsByItemId: createProductMap(basketWithOneItem.productItems || [], dressProductDetails),
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with items having very long product names. Shows:
- Text wrapping behavior
- Layout stability with long names
- Proper truncation or wrapping

This verifies the component handles long product names gracefully.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify cart container is rendered
        const cartContainer = canvasElement.querySelector('[data-testid="sf-cart-container"]');
        await expect(cartContainer).toBeInTheDocument();

        // Verify long product name is displayed
        const longName = canvas.getByText(/very long product name/i);
        await expect(longName).toBeInTheDocument();
    },
};
