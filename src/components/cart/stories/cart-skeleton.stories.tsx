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
