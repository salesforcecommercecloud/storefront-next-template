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
import CartBadgeIcon from '../cart-badge-icon';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function CartBadgeIconStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logRender = action('cart-badge-icon-render');

        // Log when component renders
        logRender({});

        return () => {
            // Cleanup if needed
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof CartBadgeIcon> = {
    title: 'LAYOUT/Header/Cart Badge Icon',
    component: CartBadgeIcon,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Cart Badge Icon component that displays a shopping cart icon with item count badge.

### Features:
- Shopping cart icon
- Badge showing number of items
- Accessible markup
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <CartBadgeIconStoryHarness>
                <div className="p-8 flex items-center justify-between gap-2">
                    <Story />
                </div>
            </CartBadgeIconStoryHarness>
        ),
    ],
    argTypes: {
        numberOfItems: {
            description: 'Number of items in the cart',
            control: { type: 'number', min: 0, max: 99 },
        },
    },
};

export default meta;
type Story = StoryObj<typeof CartBadgeIcon>;

export const Default: Story = {
    args: {
        numberOfItems: 0,
    },
    parameters: {
        docs: {
            story: `
Default cart badge icon with zero items.

### Features:
- Shopping cart icon
- Badge showing 0 items
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for shopping cart icon
        const cartIcon = await canvas.findByTestId('shopping-cart-icon', {}, { timeout: 5000 });
        await expect(cartIcon).toBeInTheDocument();

        // Check for badge
        const badge = await canvas.findByTestId('shopping-cart-badge', {}, { timeout: 5000 });
        await expect(badge).toBeInTheDocument();
        await expect(badge).toHaveTextContent('0');
    },
};

export const WithItems: Story = {
    args: {
        numberOfItems: 5,
    },
    parameters: {
        docs: {
            story: `
Cart badge icon with items in cart.

### Features:
- Shopping cart icon
- Badge showing 5 items
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for shopping cart icon
        const cartIcon = await canvas.findByTestId('shopping-cart-icon', {}, { timeout: 5000 });
        await expect(cartIcon).toBeInTheDocument();

        // Check for badge with correct count
        const badge = await canvas.findByTestId('shopping-cart-badge', {}, { timeout: 5000 });
        await expect(badge).toBeInTheDocument();
        await expect(badge).toHaveTextContent('5');
    },
};

export const WithManyItems: Story = {
    args: {
        numberOfItems: 99,
    },
    parameters: {
        docs: {
            story: `
Cart badge icon with many items (edge case).

### Features:
- Shopping cart icon
- Badge showing 99 items
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for shopping cart icon
        const cartIcon = await canvas.findByTestId('shopping-cart-icon', {}, { timeout: 5000 });
        await expect(cartIcon).toBeInTheDocument();

        // Check for badge with correct count
        const badge = await canvas.findByTestId('shopping-cart-badge', {}, { timeout: 5000 });
        await expect(badge).toBeInTheDocument();
        await expect(badge).toHaveTextContent('99');
    },
};
