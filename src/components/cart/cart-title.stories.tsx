import type { Meta, StoryObj } from '@storybook/react-vite';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

import { expect, within } from 'storybook/test';
import CartTitle from './cart-title';
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
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify cart title with zero quantity items displays correctly
        const cartTitle = canvas.getByText('Cart (0 items)');
        void expect(cartTitle).toBeInTheDocument();
        void expect(cartTitle.tagName.toLowerCase()).toBe('h1');
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
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify empty cart title displays correctly
        const cartTitle = canvas.getByText('Cart (0 items)');
        void expect(cartTitle).toBeInTheDocument();
        void expect(cartTitle.tagName.toLowerCase()).toBe('h1');
    },
};

export const SingleItem: Story = {
    args: {
        basket: basketWithOneItem,
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with a single item. This shows:

- "Cart (1 item)" text display
- Proper singular form for one item
- Correct quantity calculation from productItems
- Clean typography for single item state
                `,
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify single item cart title displays correctly
        const cartTitle = canvas.getByText('Cart (1 item)');
        void expect(cartTitle).toBeInTheDocument();
        void expect(cartTitle.tagName.toLowerCase()).toBe('h1');
    },
};

export const MultipleItems: Story = {
    args: {
        basket: basketWithMultipleItems,
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with multiple items. This demonstrates:

- "Cart (X items)" text display where X is the total count
- Proper plural form for multiple items
- Quantity summation across all product items
- Dynamic count calculation from basket data

The basket contains multiple products with different quantities, and the component correctly sums them up.
                `,
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify multiple items cart title displays correctly
        const cartTitle = canvas.getByText(/Cart \(\d+ items\)/);
        void expect(cartTitle).toBeInTheDocument();
        void expect(cartTitle.tagName.toLowerCase()).toBe('h1');
        void expect(cartTitle.textContent).toMatch(/Cart \(\d+ items\)/);
    },
};

export const MobileView: Story = {
    args: {
        basket: basketWithOneItem,
    },
    parameters: {
        viewport: {
            defaultViewport: 'mobile1',
        },
        docs: {
            description: {
                story: `
Cart title on mobile devices. This shows:

- Responsive typography (text-xl on mobile)
- Touch-friendly text sizing
- Proper mobile layout and spacing
- Optimized readability on small screens
                `,
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify mobile cart title displays correctly
        const cartTitle = canvas.getByText('Cart (1 item)');
        void expect(cartTitle).toBeInTheDocument();
        void expect(cartTitle.tagName.toLowerCase()).toBe('h1');
    },
};

export const TabletView: Story = {
    args: {
        basket: basketWithMultipleItems,
    },
    parameters: {
        viewport: {
            defaultViewport: 'tablet',
        },
        docs: {
            description: {
                story: `
Cart title on tablet devices. This demonstrates:

- Medium screen typography
- Balanced text sizing for tablet viewing
- Proper spacing and layout
- Optimal readability on medium screens
                `,
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify tablet cart title displays correctly
        const cartTitle = canvas.getByText(/Cart \(\d+ items\)/);
        void expect(cartTitle).toBeInTheDocument();
        void expect(cartTitle.tagName.toLowerCase()).toBe('h1');
    },
};

export const DesktopView: Story = {
    args: {
        basket: basketWithMultipleItems,
    },
    parameters: {
        viewport: {
            defaultViewport: 'desktop',
        },
        docs: {
            description: {
                story: `
Cart title on desktop devices. This shows:

- Large screen typography (text-2xl on desktop)
- Optimal text sizing for desktop viewing
- Proper spacing and layout
- Enhanced readability on large screens
                `,
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify desktop cart title displays correctly
        const cartTitle = canvas.getByText(/Cart \(\d+ items\)/);
        void expect(cartTitle).toBeInTheDocument();
        void expect(cartTitle.tagName.toLowerCase()).toBe('h1');
    },
};

export const WithZeroQuantityItems: Story = {
    args: {
        basket: {
            ...basketWithOneItem,
            productItems: [
                {
                    ...basketWithOneItem.productItems[0],
                    quantity: 0, // Zero quantity item
                },
                {
                    ...basketWithOneItem.productItems[0],
                    itemId: 'test-item-2',
                    quantity: 2, // Normal quantity item
                },
            ],
        },
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with items that have zero quantities. This demonstrates:

- Proper handling of zero quantity items
- Correct summation (0 + 2 = 2 items)
- "Cart (2 items)" text display
- Edge case handling for malformed data
                `,
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify cart title with zero quantity items displays correctly
        const cartTitle = canvas.getByText('Cart (2 items)');
        void expect(cartTitle).toBeInTheDocument();
        void expect(cartTitle.tagName.toLowerCase()).toBe('h1');
    },
};

export const WithUndefinedQuantities: Story = {
    args: {
        basket: {
            ...basketWithOneItem,
            productItems: [
                {
                    ...basketWithOneItem.productItems[0],
                    quantity: undefined, // Undefined quantity
                },
                {
                    ...basketWithOneItem.productItems[0],
                    itemId: 'test-item-2',
                    quantity: 3, // Normal quantity item
                },
            ],
        },
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with items that have undefined quantities. This shows:

- Proper handling of undefined quantity values
- Correct summation (0 + 3 = 3 items, undefined treated as 0)
- "Cart (3 items)" text display
- Robust error handling for missing data
                `,
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify cart title with undefined quantities displays correctly
        const cartTitle = canvas.getByText('Cart (3 items)');
        void expect(cartTitle).toBeInTheDocument();
        void expect(cartTitle.tagName.toLowerCase()).toBe('h1');
    },
};

export const WithMissingProductItems: Story = {
    args: {
        basket: {
            ...emptyBasket,
            productItems: undefined, // Missing productItems array
        },
    },
    parameters: {
        docs: {
            description: {
                story: `
Cart with missing productItems array. This demonstrates:

- Graceful handling of missing productItems
- Fallback to zero count
- "Cart (0 items)" text display
- Robust error handling for malformed basket data
                `,
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify cart title with zero quantity items displays correctly
        const cartTitle = canvas.getByText('Cart (0 items)');
        void expect(cartTitle).toBeInTheDocument();
        void expect(cartTitle.tagName.toLowerCase()).toBe('h1');
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
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Verify cart title with large item count displays correctly
        const cartTitle = canvas.getByText('Cart (99 items)');
        void expect(cartTitle).toBeInTheDocument();
        void expect(cartTitle.tagName.toLowerCase()).toBe('h1');
    },
};
