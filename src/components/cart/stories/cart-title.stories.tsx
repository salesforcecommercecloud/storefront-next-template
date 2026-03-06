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
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import CartTitle from '../cart-title';
import emptyBasket from '@/components/__mocks__/empty-basket';
import { basketWithOneItem } from '@/components/__mocks__/basket-with-dress';
import { basketWithMultipleItems } from '@/components/__mocks__/basket-with-multiple-items';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('cart-title-click');
        const logHover = action('cart-title-hover');

        const isInsideHarness = (element: Element) => root.contains(element);

        const deriveLabel = (element: HTMLElement): string => {
            const ariaLabel = element.getAttribute('aria-label')?.trim();
            if (ariaLabel) {
                return ariaLabel;
            }

            const text = element.textContent?.replace(/\s+/g, ' ').trim();
            if (text) {
                return text;
            }

            const title = element.getAttribute('title')?.trim();
            if (title) {
                return title;
            }

            const testId = element.getAttribute('data-testid')?.trim();
            return testId ?? '';
        };

        const findInteractiveElement = (start: Element | null): HTMLElement | null => {
            if (!start) {
                return null;
            }

            const selectors = [
                'button',
                'a',
                '[role="button"]',
                'input',
                'textarea',
                'select',
                '[data-testid]',
                '[tabindex]',
                'h1',
                'h2',
                'h3',
                'h4',
                'h5',
                'h6',
            ].join(', ');
            const match = start.closest(selectors);
            if (match instanceof HTMLElement) {
                return match;
            }

            if (start instanceof HTMLElement) {
                return start;
            }

            return start.parentElement ? findInteractiveElement(start.parentElement) : null;
        };

        let lastHoverElement: HTMLElement | null = null;

        const handleClick = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive)) {
                return;
            }

            const label = deriveLabel(interactive);
            if (!label) {
                return;
            }

            logClick({ label });
        };

        const handlePointerOver = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive) || interactive === lastHoverElement) {
                return;
            }

            const label = deriveLabel(interactive);
            if (!label) {
                return;
            }

            lastHoverElement = interactive;
            logHover({ label });
        };

        const handlePointerOut = (event: PointerEvent) => {
            if (!lastHoverElement) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive || interactive !== lastHoverElement) {
                return;
            }

            const related = event.relatedTarget as Element | null;
            if (related && lastHoverElement.contains(related)) {
                return;
            }

            lastHoverElement = null;
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('pointerover', handlePointerOver, true);
        root.addEventListener('pointerout', handlePointerOut, true);

        return () => {
            lastHoverElement = null;
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('pointerover', handlePointerOver, true);
            root.removeEventListener('pointerout', handlePointerOut, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof CartTitle> = {
    title: 'CART/CartTitle',
    component: CartTitle,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
The CartTitle component displays the cart item count with proper pluralization and formatting. It provides a clear, accessible title for the shopping cart page.

## Features

- **Dynamic Item Count**: Calculates total items by summing quantities from all product items
- **Proper Pluralization**: Uses different text for zero, one, and multiple items
- **UI String Integration**: Uses internationalized strings from the UI strings system
- **Edge Case Handling**: Gracefully handles missing or undefined data
- **Accessibility**: Uses semantic h1 heading with proper typography
- **Responsive Typography**: Adapts text size for different screen sizes

## Text Variations

- **Zero Items**: "Cart (0 items)"
- **One Item**: "Cart (1 item)" 
- **Multiple Items**: "Cart (X items)" where X is the total count

## Edge Cases Handled

- Missing or undefined productItems array
- Items with undefined or null quantities
- Empty basket scenarios
- Malformed basket data

## Usage

This component is typically used at the top of cart pages to provide users with a clear indication of how many items are in their cart. It integrates with the CartContent component and uses the same basket data.

## Props

- **basket**: Shopping basket data containing productItems array with quantities
                `,
            },
        },
    },
    argTypes: {
        basket: {
            description: 'Shopping basket data containing productItems array with quantities',
            control: 'object',
            table: {
                type: { summary: 'ShopperBasketsV2.schemas["Basket"]' },
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Verify cart title with zero quantity items displays correctly
        const cartTitle = await canvas.findByText('Cart (0 items)');
        await expect(cartTitle).toBeInTheDocument();
        await expect(cartTitle.tagName.toLowerCase()).toBe('h1');
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

export const EmptyCart: Story = {
    args: {
        basket: emptyBasket,
    },
    parameters: {
        docs: {
            description: {
                story: `
Empty cart state showing zero items. This demonstrates:

- "Cart (0 items)" text display
- Proper handling of empty productItems array
- Zero count pluralization
- Clean, minimal appearance for empty state
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Verify empty cart title displays correctly
        const cartTitle = await canvas.findByText('Cart (0 items)');
        await expect(cartTitle).toBeInTheDocument();
        void expect(cartTitle.tagName.toLowerCase()).toBe('h1');
    },
};

/**
 * Single item and multiple items combined - demonstrates both pluralization states
 */
export const SingleAndMultipleItems: Story = {
    render: () => (
        <div className="flex flex-col gap-8">
            <div>
                <p className="text-sm text-muted-foreground mb-2">Single item:</p>
                <CartTitle basket={basketWithOneItem} />
            </div>
            <div>
                <p className="text-sm text-muted-foreground mb-2">Multiple items:</p>
                <CartTitle basket={basketWithMultipleItems} />
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Single item ("Cart (1 item)") and multiple items ("Cart (X items)") - demonstrates pluralization for both states.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        await expect(canvas.getByText('Cart (1 item)')).toBeInTheDocument();
        const multiTitle = canvas.getByText(/Cart \(\d+ items\)/);
        await expect(multiTitle).toBeInTheDocument();
    },
};

export const LargeItemCount: Story = {
    args: {
        basket: {
            ...basketWithOneItem,
            productItems: [
                {
                    ...basketWithOneItem.productItems[0],
                    quantity: 99, // Large quantity
                },
            ],
        },
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with a large item count. This shows:

- "Cart (99 items)" text display
- Proper handling of large numbers
- Correct pluralization for high quantities
- Typography scaling with longer text
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Verify cart title with large item count displays correctly
        const cartTitle = await canvas.findByText('Cart (99 items)');
        await expect(cartTitle).toBeInTheDocument();
        void expect(cartTitle.tagName.toLowerCase()).toBe('h1');
    },
};
