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
import CartSheet from '../cart-sheet';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { Button } from '@/components/ui/button';
import BasketProvider from '@/providers/basket';
import emptyBasket from '@/components/__mocks__/empty-basket';
import emptyBasketSnapshot from '@/components/__mocks__/empty-basket-snapshot';
import { basketWithOneItem } from '@/components/__mocks__/basket-with-dress';
import basketWithOneItemSnapshot from '@/components/__mocks__/basket-with-dress-snapshot';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';

function CartSheetStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClose = action('cart-sheet-close');
        const logCheckout = action('cart-sheet-checkout');
        const logContinueShopping = action('cart-sheet-continue-shopping');
        const logEditCart = action('cart-sheet-edit-cart');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            // Handle links (checkout and edit cart) - prevent navigation in Storybook
            const link = target.closest('a');
            if (link) {
                const linkText = link.textContent?.toLowerCase() || '';
                const href = link.getAttribute('href');

                // Prevent navigation for checkout link
                if (linkText.includes('checkout') || href === '/checkout') {
                    event.preventDefault();
                    event.stopPropagation();
                    logCheckout({});
                    return;
                }
                // Prevent navigation for edit cart link
                else if (linkText.includes('edit cart') || href === '/cart') {
                    // Only prevent if it's within the cart sheet dialog
                    const dialog = link.closest('[role="dialog"]');
                    if (dialog) {
                        event.preventDefault();
                        event.stopPropagation();
                        logEditCart({});
                        return;
                    }
                }
            }

            // Handle buttons
            const button = target.closest('button');
            if (button) {
                const buttonText = button.textContent?.toLowerCase() || '';
                if (buttonText.includes('continue') || buttonText.includes('shopping')) {
                    logContinueShopping({});
                } else if (button.getAttribute('aria-label')?.includes('close')) {
                    logClose({});
                }
            }
        };

        // Listen on document.body since the cart sheet is portaled there
        document.body.addEventListener('click', handleClick, true);
        // Also listen on root for any non-portaled interactions
        root.addEventListener('click', handleClick, true);

        return () => {
            document.body.removeEventListener('click', handleClick, true);
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof CartSheet> = {
    title: 'LAYOUT/Header/Cart Sheet',
    component: CartSheet,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Cart Sheet component that displays a mini cart flyout with cart contents.

### Features:
- Side sheet with cart items
- Cart item list with remove and edit actions
- Checkout button (primary)
- Continue Shopping button (secondary with light gray background)
- Optional View Cart button (ghost variant)
- Opens automatically when loaded
- Matches Odyssey Design System specifications

**Note**: This component uses \`useBasketWithProducts\` which loads product details via \`/resource/basket-products\`.
In Storybook, this route returns mock product data for demonstration purposes.
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <CartSheetStoryHarness>
                    <div className="p-8">
                        <Story />
                    </div>
                </CartSheetStoryHarness>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof CartSheet>;

export const Empty: Story = {
    decorators: [
        (Story) => (
            <BasketProvider basket={emptyBasket} snapshot={emptyBasketSnapshot}>
                <Story />
            </BasketProvider>
        ),
    ],
    render: () => (
        <CartSheet>
            <Button variant="ghost">Open Cart</Button>
        </CartSheet>
    ),
    parameters: {
        snapshot: false, // Skip snapshot test - Radix UI Sheet with empty state causes infinite loop in test environment
        docs: {
            story: `
Cart sheet with empty cart.

### Features:
- Empty cart message
- No footer buttons shown when cart is empty
            `,
        },
    },
    play: async ({ canvasElement: _canvasElement }) => {
        // Cart sheet renders in a portal, so check document.body
        const documentBody = within(document.body);

        // Wait a bit for the sheet to open
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check for cart sheet dialog
        const cartSheet = await documentBody.findByRole('dialog', { hidden: false }, { timeout: 5000 });
        await expect(cartSheet).toBeInTheDocument();

        // Check for empty cart message
        const emptyMessage = await documentBody.findByText(/your cart is empty/i, {}, { timeout: 5000 });
        await expect(emptyMessage).toBeInTheDocument();
    },
};

export const WithItems: Story = {
    decorators: [
        (Story) => (
            <BasketProvider basket={basketWithOneItem} snapshot={basketWithOneItemSnapshot}>
                <Story />
            </BasketProvider>
        ),
    ],
    render: () => (
        <CartSheet>
            <Button variant="ghost">Open Cart</Button>
        </CartSheet>
    ),
    parameters: {
        docs: {
            story: `
Cart sheet with items in cart.

### Features:
- Order summary with items
- Checkout button (primary)
- Continue Shopping button (secondary with light gray background)
            `,
        },
    },
    play: async ({ canvasElement: _canvasElement }) => {
        // Cart sheet renders in a portal, so check document.body
        const documentBody = within(document.body);

        // Wait a bit for the sheet to open and products to load
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check for cart sheet dialog
        const cartSheet = await documentBody.findByRole('dialog', { hidden: false }, { timeout: 5000 });
        await expect(cartSheet).toBeInTheDocument();

        // Check for checkout button
        const checkoutButton = await documentBody.findByRole('link', { name: /checkout/i }, { timeout: 5000 });
        await expect(checkoutButton).toBeInTheDocument();

        // Check for continue shopping button (now a Button component with secondary variant)
        const continueButton = await documentBody.findByRole(
            'button',
            { name: /continue shopping/i },
            { timeout: 5000 }
        );
        await expect(continueButton).toBeInTheDocument();
    },
};

export const Interactive: Story = {
    decorators: [
        (Story) => (
            <BasketProvider basket={basketWithOneItem} snapshot={basketWithOneItemSnapshot}>
                <Story />
            </BasketProvider>
        ),
    ],
    render: () => (
        <CartSheet>
            <Button variant="ghost">Open Cart</Button>
        </CartSheet>
    ),
    parameters: {
        docs: {
            story: `
Interactive cart sheet for testing user interactions.

### Features:
- Button interactions
- Sheet closing
            `,
        },
    },
    play: async ({ canvasElement: _canvasElement }) => {
        // Cart sheet renders in a portal, so check document.body
        const documentBody = within(document.body);

        // Wait for cart sheet to open and products to load
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Wait for cart sheet to open
        const cartSheet = await documentBody.findByRole('dialog', { hidden: false }, { timeout: 5000 });
        await expect(cartSheet).toBeInTheDocument();

        // Click continue shopping button (now a Button component)
        const continueButton = await documentBody.findByRole(
            'button',
            { name: /continue shopping/i },
            { timeout: 5000 }
        );
        await userEvent.click(continueButton);

        // Wait a bit for the sheet to close
        await new Promise((resolve) => setTimeout(resolve, 500));

        // The sheet should be closed (hidden)
        const closedSheet = documentBody.queryByRole('dialog', { hidden: true });
        // Sheet might still be in DOM but hidden, which is fine
        if (closedSheet) {
            await expect(closedSheet).toHaveAttribute('data-state', 'closed');
        }
    },
};

export const WithViewCartButton: Story = {
    decorators: [
        (Story) => {
            const configWithViewCart = {
                ...mockConfig,
                pages: {
                    ...mockConfig.pages,
                    cart: {
                        ...mockConfig.pages.cart,
                        miniCart: {
                            enableViewCartButton: true,
                        },
                    },
                },
            };
            return (
                <ConfigProvider config={configWithViewCart}>
                    <BasketProvider basket={basketWithOneItem} snapshot={basketWithOneItemSnapshot}>
                        <Story />
                    </BasketProvider>
                </ConfigProvider>
            );
        },
    ],
    render: () => (
        <CartSheet>
            <Button variant="ghost">Open Cart</Button>
        </CartSheet>
    ),
    parameters: {
        docs: {
            story: `
Cart sheet with View Cart button enabled via configuration.

### Features:
- Checkout button (primary)
- Continue Shopping button (secondary with light gray background)
- View Cart button (ghost variant, configurable via \`config.pages.cart.miniCart.enableViewCartButton\`)
            `,
        },
    },
    play: async ({ canvasElement: _canvasElement }) => {
        // Cart sheet renders in a portal, so check document.body
        const documentBody = within(document.body);

        // Wait for cart sheet to open and products to load
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check for cart sheet dialog
        const cartSheet = await documentBody.findByRole('dialog', { hidden: false }, { timeout: 5000 });
        await expect(cartSheet).toBeInTheDocument();

        // Check for View Cart button (ghost variant Button component wrapping a Link)
        const viewCartButton = await documentBody.findByRole('link', { name: /view cart/i }, { timeout: 5000 });
        await expect(viewCartButton).toBeInTheDocument();
        await expect(viewCartButton).toHaveAttribute('href', '/cart');
    },
};
