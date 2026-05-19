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
Skeleton loading state for the CartContent component. Mirrors the cart page layout — including the
mobile fixed-bottom checkout bar and the desktop OrderSummary card — so the skeleton occupies the
same space as the resolved page on every breakpoint.

## Layout

- **Mobile (< md)**: Page heading, item card with each line's image + details + price + qty + gift
  row, and a fixed-bottom bar that mirrors the real Order Summary accordion + checkout button.
- **md+**: Same item card on the right (lg ordering), with the desktop OrderSummary card on the
  left at lg breakpoint. The desktop card mirrors the real OrderSummary layout: heading, totals,
  promo code accordion trigger, checkout button and four payment-method icons.
- **Empty state**: Full-width \`bg-background\` panel inside \`section-container\`, single icon,
  title, single message, and a single CTA button — matches \`cart-empty.tsx\` exactly.
                `,
            },
        },
    },
    argTypes: {
        productItemCount: {
            control: 'number',
            description: 'Number of item skeletons to render. `0` (or undefined) renders the empty-cart skeleton.',
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
        productItemCount: 1,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-skeleton"]');
        await expect(container).toBeInTheDocument();

        const titleSkeleton = canvasElement.querySelector('.h-10.w-48');
        await expect(titleSkeleton).toBeInTheDocument();
        const imageSkeleton = canvasElement.querySelector('.aspect-square');
        await expect(imageSkeleton).toBeInTheDocument();
    },
};

export const EmptyCart: Story = {
    args: {
        productItemCount: 0,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-empty-skeleton"]');
        await expect(container).toBeInTheDocument();
        const emptyPanel = canvasElement.querySelector('.bg-background.p-8');
        await expect(emptyPanel).toBeInTheDocument();
        // Real cart-empty.tsx renders a single button for both guests and registered shoppers.
        const button = canvasElement.querySelector('.h-9.rounded-md');
        await expect(button).toBeInTheDocument();
    },
};

export const MultipleItems: Story = {
    args: {
        productItemCount: 3,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.querySelector('[data-testid="sf-cart-skeleton"]');
        await expect(container).toBeInTheDocument();
        const imageSkeletons = canvasElement.querySelectorAll('.aspect-square');
        await expect(imageSkeletons.length).toBe(3);
    },
};
