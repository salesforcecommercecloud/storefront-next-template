import type { Meta, StoryObj } from '@storybook/react-vite';
import CartSheet from '../cart-sheet';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { Button } from '@/components/ui/button';
import BasketProvider from '@/providers/basket';
import emptyBasket from '@/components/__mocks__/empty-basket';
import { basketWithOneItem } from '@/components/__mocks__/basket-with-dress';

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
Cart Sheet component that displays a side sheet with cart contents.

### Features:
- Side sheet with cart items
- Order summary
- Checkout and continue shopping buttons
- Opens automatically when loaded
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <CartSheetStoryHarness>
                <div className="p-8">
                    <Story />
                </div>
            </CartSheetStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof CartSheet>;

export const Empty: Story = {
    render: () => (
        <BasketProvider value={emptyBasket}>
            <CartSheet>
                <Button variant="ghost">Open Cart</Button>
            </CartSheet>
        </BasketProvider>
    ),
    parameters: {
        docs: {
            story: `
Cart sheet with empty cart.

### Features:
- Empty cart message
- Checkout and continue shopping buttons
            `,
        },
    },
    play: async ({ canvasElement: _canvasElement }) => {
        // Cart sheet renders in a portal, so check document.body
        const documentBody = within(document.body);

        // Check for cart sheet dialog
        const cartSheet = await documentBody.findByRole('dialog', { hidden: false }, { timeout: 5000 });
        await expect(cartSheet).toBeInTheDocument();

        // Check for checkout button
        const checkoutButton = await documentBody.findByRole('link', { name: /checkout/i }, { timeout: 5000 });
        await expect(checkoutButton).toBeInTheDocument();
    },
};

export const WithItems: Story = {
    render: () => (
        <BasketProvider value={basketWithOneItem}>
            <CartSheet>
                <Button variant="ghost">Open Cart</Button>
            </CartSheet>
        </BasketProvider>
    ),
    parameters: {
        docs: {
            story: `
Cart sheet with items in cart.

### Features:
- Order summary with items
- Checkout and continue shopping buttons
            `,
        },
    },
    play: async ({ canvasElement: _canvasElement }) => {
        // Cart sheet renders in a portal, so check document.body
        const documentBody = within(document.body);

        // Check for cart sheet dialog
        const cartSheet = await documentBody.findByRole('dialog', { hidden: false }, { timeout: 5000 });
        await expect(cartSheet).toBeInTheDocument();

        // Check for checkout button
        const checkoutButton = await documentBody.findByRole('link', { name: /checkout/i }, { timeout: 5000 });
        await expect(checkoutButton).toBeInTheDocument();

        // Check for continue shopping button
        const continueButton = await documentBody.findByRole(
            'button',
            { name: /continue shopping/i },
            { timeout: 5000 }
        );
        await expect(continueButton).toBeInTheDocument();
    },
};

export const Interactive: Story = {
    render: () => (
        <BasketProvider value={basketWithOneItem}>
            <CartSheet>
                <Button variant="ghost">Open Cart</Button>
            </CartSheet>
        </BasketProvider>
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

        // Wait for cart sheet to open
        const cartSheet = await documentBody.findByRole('dialog', { hidden: false }, { timeout: 5000 });
        await expect(cartSheet).toBeInTheDocument();

        // Click continue shopping button
        const continueButton = await documentBody.findByRole(
            'button',
            { name: /continue shopping/i },
            { timeout: 5000 }
        );
        await userEvent.click(continueButton);

        // Wait a bit for the sheet to close
        await new Promise((resolve) => setTimeout(resolve, 300));

        // The sheet should be closed (hidden)
        const closedSheet = documentBody.queryByRole('dialog', { hidden: true });
        // Sheet might still be in DOM but hidden, which is fine
        if (closedSheet) {
            await expect(closedSheet).toHaveAttribute('data-state', 'closed');
        }
    },
};
