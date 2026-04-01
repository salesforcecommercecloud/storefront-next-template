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
import MyCart from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { checkoutWithMultipleItems, checkoutWithOneItem } from '@/components/__mocks__/checkout-data';
import { standardProd } from '@/components/__mocks__/standard-product-2';
import { CurrencyWrapper } from '@/test-utils/context-provider';
import { checkoutStrictA11yParameters } from '@/components/checkout/storybook/checkout-strict-a11y-parameters';

function MyCartStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('my-cart-click');
        const logToggle = action('my-cart-toggle');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const accordionTrigger = target.closest('[data-state]');
            if (accordionTrigger) {
                logToggle({ state: accordionTrigger.getAttribute('data-state') || '' });
            } else {
                logClick({ element: target.textContent?.trim() || '' });
            }
        };

        root.addEventListener('click', handleClick);
        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof MyCart> = {
    title: 'COMMON/My Cart',
    component: MyCart,
    tags: ['autodocs', 'interaction'],
    parameters: {
        ...checkoutStrictA11yParameters,
        layout: 'centered',
        docs: {
            description: {
                component: `
A collapsible cart component that displays cart items in an accordion format. Used on checkout pages to show cart contents separately from order summary.

### Features:
- Collapsible accordion
- Item count display
- Product items list
- Expandable/collapsible state
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <MyCartStoryHarness>
                <CurrencyWrapper currency="GBP">
                    <Story />
                </CurrencyWrapper>
            </MyCartStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof MyCart>;

// Create product map from standardProd
const productMap: Record<string, typeof standardProd> = {
    [standardProd.id]: standardProd,
};

export const Default: Story = {
    render: () => <MyCart basket={checkoutWithMultipleItems.cart} productMap={productMap} />,
    parameters: {
        docs: {
            story: `
My cart with multiple items, collapsed by default.

### Features:
- Multiple items
- Collapsed state
- Item count shown
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for cart title with item count
        const cartTitle = await canvas.findByText(/my cart/i, {}, { timeout: 5000 });
        await expect(cartTitle).toBeInTheDocument();
    },
};

export const Expanded: Story = {
    render: () => <MyCart basket={checkoutWithMultipleItems.cart} productMap={productMap} itemsExpanded={true} />,
    parameters: {
        docs: {
            story: `
My cart with items expanded by default.

### Features:
- Expanded state
- Items visible
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for cart title
        const cartTitle = await canvas.findByText(/my cart/i, {}, { timeout: 5000 });
        await expect(cartTitle).toBeInTheDocument();
    },
};

export const SingleItem: Story = {
    render: () => <MyCart basket={checkoutWithOneItem.cart} productMap={productMap} />,
    parameters: {
        docs: {
            story: `
My cart with a single item.

### Features:
- Single item
- Item count shows "1"
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for cart title
        const cartTitle = await canvas.findByText(/my cart/i, {}, { timeout: 5000 });
        await expect(cartTitle).toBeInTheDocument();
    },
};
