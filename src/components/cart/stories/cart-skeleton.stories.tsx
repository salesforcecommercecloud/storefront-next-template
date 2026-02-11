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
Skeleton component for the empty cart state. Provides loading placeholders that mirror the CartEmpty component layout.

## Features

- **Header Placeholder**: Skeleton for the cart page title
- **Item Skeletons**: Product image, details, and quantity controls
- **Summary Skeletons**: Order summary with promo and totals
- **Responsive Design**: Matches the cart layout across breakpoints

## Usage

Used as a loading fallback when the cart page is hydrating and the cart is empty.
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
Default skeleton state for guest users. Shows:

- Cart page title placeholder
- Product item skeletons with image and controls
- Order summary skeleton layout

This is the loading state shown before the actual empty cart content loads.
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
Skeleton state for guest users. Demonstrates:

- Cart page title placeholder
- Product item skeletons with image and controls
- Order summary skeleton layout
                `,
            },
        },
    },
    play: async ({ canvasElement, args }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-skeleton"]');
        await expect(container).toBeInTheDocument();

        if (args.productItemCount && args.productItemCount > 0) {
            const titleSkeleton = canvasElement.querySelector('.h-8.w-48');
            await expect(titleSkeleton).toBeInTheDocument();
            const imageSkeleton = canvasElement.querySelector('.aspect-square');
            await expect(imageSkeleton).toBeInTheDocument();
            const summaryTitle = canvasElement.querySelector('.h-7.w-28');
            await expect(summaryTitle).toBeInTheDocument();
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
Skeleton state for registered/logged-in users. Shows:

- Cart page title placeholder
- Product item skeletons with image and controls
- Order summary skeleton layout
                `,
            },
        },
    },
    play: async ({ canvasElement, args }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-skeleton"]');
        await expect(container).toBeInTheDocument();

        if (args.productItemCount && args.productItemCount > 0) {
            const titleSkeleton = canvasElement.querySelector('.h-8.w-48');
            await expect(titleSkeleton).toBeInTheDocument();
            const imageSkeleton = canvasElement.querySelector('.aspect-square');
            await expect(imageSkeleton).toBeInTheDocument();
            const promoButton = canvasElement.querySelector('.h-9.w-full');
            await expect(promoButton).toBeInTheDocument();
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
- Two action button skeletons (sign in + continue shopping)
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

export const MobileView: Story = {
    args: {
        isRegistered: false,
        productItemCount: 1,
    },
    parameters: {
        docs: {
            description: {
                story: `
Skeleton state on mobile devices. Demonstrates:

- Responsive card layout on small screens
- Proper spacing for mobile display
- Full-width button placeholders
                `,
            },
        },
    },
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-skeleton"]');
        await expect(container).toBeInTheDocument();
    },
};

export const TabletView: Story = {
    args: {
        isRegistered: false,
        productItemCount: 1,
    },
    parameters: {
        docs: {
            description: {
                story: `
Skeleton state on tablet devices. Shows:

- Medium screen layout optimization
- Balanced spacing and sizing
- Proper card proportions for tablet screens
                `,
            },
        },
    },
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-skeleton"]');
        await expect(container).toBeInTheDocument();
    },
};

export const DesktopView: Story = {
    args: {
        isRegistered: false,
        productItemCount: 1,
    },
    parameters: {
        docs: {
            description: {
                story: `
Skeleton state on desktop devices. Demonstrates:

- Large screen layout with centered card
- Optimal spacing and proportions
- Full desktop skeleton experience
                `,
            },
        },
    },
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-skeleton"]');
        await expect(container).toBeInTheDocument();
    },
};
