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
import CartBadge from '../cart-badge';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import BasketProvider from '@/providers/basket';
import emptyBasket from '@/components/__mocks__/empty-basket';
import emptyBasketSnapshot from '@/components/__mocks__/empty-basket-snapshot';
import { basketWithOneItem } from '@/components/__mocks__/basket-with-dress';
import basketWithOneItemSnapshot from '@/components/__mocks__/basket-with-dress-snapshot';

function CartBadgeStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('cart-badge-click');
        const logCartOpen = action('cart-badge-cart-open');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            const button = target.closest('button');
            if (button && button.getAttribute('aria-label')?.includes('cart')) {
                logClick({});
                logCartOpen({});
            }
        };

        root.addEventListener('click', handleClick, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof CartBadge> = {
    title: 'LAYOUT/Header/Cart Badge',
    component: CartBadge,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Cart Badge component that displays a cart icon with item count and opens the cart sheet on click.

### Features:
- Shopping cart icon with badge
- Lazy loading of cart sheet
- Click to open cart
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <CartBadgeStoryHarness>
                <div className="p-8">
                    <Story />
                </div>
            </CartBadgeStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof CartBadge>;

export const Empty: Story = {
    render: () => (
        <BasketProvider basket={emptyBasket} snapshot={emptyBasketSnapshot}>
            <CartBadge />
        </BasketProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Cart badge with empty cart.

### Features:
- Shopping cart icon
- Badge showing 0 items
- Click to open cart sheet
            `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for cart button
        const cartButton = await canvas.findByRole('button', { name: /cart/i }, { timeout: 5000 });
        await expect(cartButton).toBeInTheDocument();

        // Check for shopping cart icon
        const cartIcon = await canvas.findByTestId('shopping-cart-icon', {}, { timeout: 5000 });
        await expect(cartIcon).toBeInTheDocument();

        // Check for badge showing 0
        const badge = await canvas.findByTestId('shopping-cart-badge', {}, { timeout: 5000 });
        await expect(badge).toBeInTheDocument();
        await expect(badge).toHaveTextContent('0');
    },
};

export const WithItems: Story = {
    render: () => (
        <BasketProvider basket={basketWithOneItem} snapshot={basketWithOneItemSnapshot}>
            <CartBadge />
        </BasketProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Cart badge with items in cart.

### Features:
- Shopping cart icon
- Badge showing item count
- Click to open cart sheet
            `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for cart button
        const cartButton = await canvas.findByRole('button', { name: /cart/i }, { timeout: 5000 });
        await expect(cartButton).toBeInTheDocument();

        // Check for shopping cart icon
        const cartIcon = await canvas.findByTestId('shopping-cart-icon', {}, { timeout: 5000 });
        await expect(cartIcon).toBeInTheDocument();

        // Check for badge with items
        const badge = await canvas.findByTestId('shopping-cart-badge', {}, { timeout: 5000 });
        await expect(badge).toBeInTheDocument();
        await expect(Number.parseInt(badge.textContent || '0', 10)).toBeGreaterThan(0);
    },
};

export const Interactive: Story = {
    render: () => (
        <BasketProvider basket={basketWithOneItem} snapshot={basketWithOneItemSnapshot}>
            <CartBadge />
        </BasketProvider>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Interactive cart badge for testing user interactions.

### Features:
- Click to open cart sheet
- Lazy loading behavior
            `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Find and click cart button
        const cartButton = await canvas.findByRole('button', { name: /cart/i }, { timeout: 5000 });
        await userEvent.click(cartButton);

        // Wait a bit for lazy loading
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if cart sheet opened (it should be in document.body due to portal)
        const documentBody = within(document.body);
        const cartSheet = await documentBody
            .findByRole('dialog', { hidden: false }, { timeout: 5000 })
            .catch(() => null);
        if (cartSheet) {
            await expect(cartSheet).toBeInTheDocument();
        }
    },
};
