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
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

import CartSkeleton from '../cart-skeleton';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logRender = action('cart-skeleton-render');
        logRender({});
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof CartSkeleton> = {
    title: 'SKELETON/CartSkeleton',
    component: CartSkeleton,
    tags: ['autodocs', 'interaction'],
    args: {
        productItemCount: 1,
    },
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: `
Skeleton loading state for the CartContent component. Mirrors the cart page layout with placeholder elements while data is being fetched.

## Features

- **Breadcrumb Placeholder**: Skeleton for Home > Cart breadcrumb navigation
- **Product Item Skeletons**: Flex-based layout matching ProductItem — image thumbnail, name, variation attributes, delivery badge, price, quantity picker, and action row (gift checkbox + Edit/Remove/Add to Wishlist)
- **Order Summary Skeleton**: Card matching OrderSummary layout — summary rows, separator, estimated total, promo code accordion, checkout button, and payment method icons
- **Responsive Design**: Desktop shows grid (66% items + 33% summary); mobile shows stacked layout
- **Empty State**: Shows CartEmptySkeleton with icon, message, and action button placeholders

## Layout Matching

The skeleton mirrors the CartContent composed layout:
- **Desktop**: Breadcrumb → Grid with product items card (left) and OrderSummary card (right, sticky)
- **Mobile**: Breadcrumb → Product items card (OrderSummary hidden on mobile in skeleton)
- **Product Item**: Image (24×24 mobile, 28×28 desktop) + details column + desktop right column (delivery badge, price, quantity)
- **Actions Row**: Gift checkbox skeleton + Edit/Remove/Add to Wishlist link skeletons
                `,
            },
        },
    },
    argTypes: {
        isRegistered: {
            control: 'boolean',
            description: 'Whether the user is registered/logged in.',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'false' },
            },
        },
        productItemCount: {
            control: 'number',
            description: 'Number of item skeletons to render.',
            table: {
                type: { summary: 'number' },
                defaultValue: { summary: '1' },
            },
        },
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof CartSkeleton>;

export const Default: Story = {
    args: {
        isRegistered: false,
        productItemCount: 1,
    },
    parameters: {
        docs: {
            description: {
                story: `
Default skeleton state with 1 product item. Shows:

- Breadcrumb placeholder (Home > Cart)
- Product item skeleton with flex layout (image, details, delivery badge, price, quantity, actions)
- Order summary skeleton card with totals, promo code, checkout button, and payment icons

This is the loading state shown before the cart data loads.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-skeleton"]');
        await expect(container).toBeInTheDocument();
    },
};

export const GuestUser: Story = {
    args: {
        isRegistered: false,
        productItemCount: 1,
    },
    parameters: {
        docs: {
            description: {
                story: `
Skeleton state for guest users with 1 product item. Verifies:

- Breadcrumb, product item, and order summary skeletons render
- Product image skeleton has rounded-none class
- Order summary checkout button skeleton is present
                `,
            },
        },
    },
    play: async ({ canvasElement, args }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-skeleton"]');
        await expect(container).toBeInTheDocument();

        if (args.productItemCount && args.productItemCount > 0) {
            // Breadcrumb skeleton
            const breadcrumb = canvasElement.querySelector('.my-6');
            await expect(breadcrumb).toBeInTheDocument();
            // Product image skeleton
            const imageSkeleton = canvasElement.querySelector('.aspect-square');
            await expect(imageSkeleton).toBeInTheDocument();
        } else {
            const emptyCard = canvasElement.querySelector('.max-w-md.mx-auto');
            await expect(emptyCard).toBeInTheDocument();
        }
    },
};

export const RegisteredUser: Story = {
    args: {
        isRegistered: true,
        productItemCount: 1,
    },
    parameters: {
        docs: {
            description: {
                story: `
Skeleton state for registered/logged-in users with 1 product item. Shows:

- Breadcrumb, product item, and order summary skeletons
- Same layout as guest user (registration only affects empty cart state)
                `,
            },
        },
    },
    play: async ({ canvasElement, args }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-skeleton"]');
        await expect(container).toBeInTheDocument();

        if (args.productItemCount && args.productItemCount > 0) {
            const breadcrumb = canvasElement.querySelector('.my-6');
            await expect(breadcrumb).toBeInTheDocument();
            const imageSkeleton = canvasElement.querySelector('.aspect-square');
            await expect(imageSkeleton).toBeInTheDocument();
        } else {
            const emptyCard = canvasElement.querySelector('.max-w-md.mx-auto');
            await expect(emptyCard).toBeInTheDocument();
        }
    },
};

export const EmptyCartGuest: Story = {
    args: {
        isRegistered: false,
        productItemCount: 0,
    },
    parameters: {
        docs: {
            description: {
                story: `
Empty cart skeleton for guest users. Shows:

- Centered card with icon placeholder
- Message text placeholders
- Action button skeleton (start shopping)
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-empty-skeleton"]');
        await expect(container).toBeInTheDocument();
        const emptyCard = canvasElement.querySelector('.max-w-md.mx-auto');
        await expect(emptyCard).toBeInTheDocument();
        const buttonSkeletons = canvasElement.querySelectorAll('.h-9.w-full');
        await expect(buttonSkeletons.length).toBe(2);
    },
};

export const EmptyCartRegistered: Story = {
    args: {
        isRegistered: true,
        productItemCount: 0,
    },
    parameters: {
        docs: {
            description: {
                story: `
Empty cart skeleton for registered/logged-in users. Shows:

- Centered card with icon placeholder
- Message text placeholders
- Single action button skeleton (continue shopping only)
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-empty-skeleton"]');
        await expect(container).toBeInTheDocument();
        const emptyCard = canvasElement.querySelector('.max-w-md.mx-auto');
        await expect(emptyCard).toBeInTheDocument();
        const buttonSkeletons = canvasElement.querySelectorAll('.h-9.w-full');
        await expect(buttonSkeletons.length).toBe(1);
    },
};

export const MultipleItems: Story = {
    args: {
        isRegistered: false,
        productItemCount: 3,
    },
    parameters: {
        docs: {
            description: {
                story: `
Skeleton with 3 product items. Demonstrates:

- Multiple product item skeletons stacked in the items card
- Each item has the full flex layout (image, details, delivery badge, price, quantity, actions)
- Order summary skeleton remains the same regardless of item count
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-skeleton"]');
        await expect(container).toBeInTheDocument();
        // Should have 3 product image skeletons
        const imageSkeletons = canvasElement.querySelectorAll('.aspect-square');
        await expect(imageSkeletons.length).toBe(3);
    },
};
