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
import CartQuantityPicker from '../cart-quantity-picker';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { Badge } from '@/components/ui/badge';
import { Info, ShoppingCart } from 'lucide-react';

const QUANTITY_PICKER_HARNESS_ATTR = 'data-quantity-picker-harness';

function QuantityPickerStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logChange = useMemo(() => action('quantity-changed'), []);
    const logIncrement = useMemo(() => action('quantity-incremented'), []);
    const logDecrement = useMemo(() => action('quantity-decremented'), []);
    const logBlur = useMemo(() => action('quantity-blurred'), []);
    const logRemoveConfirm = useMemo(() => action('remove-item-confirmed'), []);
    const logRemoveCancel = useMemo(() => action('remove-item-cancelled'), []);
    const logHover = useMemo(() => action('quantity-picker-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) =>
            Boolean(element?.closest(`[${QUANTITY_PICKER_HARNESS_ATTR}]`));

        const handleChange = (event: Event) => {
            const input = event.target as HTMLInputElement | null;
            if (!input || input.type !== 'number' || !isInsideHarness(input)) {
                return;
            }
            logChange({ value: input.value, itemId: input.closest('[data-testid]')?.getAttribute('data-testid') });
        };

        const handleClick = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !isInsideHarness(button)) {
                return;
            }

            const testId = button.getAttribute('data-testid');
            if (testId === 'quantity-increment') {
                logIncrement({});
            } else if (testId === 'quantity-decrement') {
                logDecrement({});
            }

            // Check for remove confirmation dialog buttons
            const dialog = button.closest('[role="alertdialog"]');
            if (dialog) {
                const label = button.textContent?.trim() || '';
                if (label.toLowerCase().includes('remove') || label.toLowerCase().includes('yes')) {
                    logRemoveConfirm({ label });
                } else if (
                    label.toLowerCase().includes('keep') ||
                    label.toLowerCase().includes('no') ||
                    label.toLowerCase().includes('cancel')
                ) {
                    logRemoveCancel({ label });
                }
            }
        };

        const handleBlur = (event: Event) => {
            const input = event.target as HTMLInputElement | null;
            if (!input || input.type !== 'number' || !isInsideHarness(input)) {
                return;
            }
            logBlur({ value: input.value });
        };

        const handleMouseOver = (event: MouseEvent) => {
            const element = (event.target as HTMLElement | null)?.closest('button, input');
            if (!element || !isInsideHarness(element)) {
                return;
            }
            const related = event.relatedTarget as HTMLElement | null;
            if (related && element.contains(related)) {
                return;
            }
            const label = (element.getAttribute('aria-label') ?? element.getAttribute('data-testid') ?? '').trim();
            if (!label) {
                return;
            }
            logHover({ label });
        };

        document.addEventListener('change', handleChange, true);
        document.addEventListener('click', handleClick, true);
        document.addEventListener('blur', handleBlur, true);
        document.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            document.removeEventListener('change', handleChange, true);
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('blur', handleBlur, true);
            document.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, [logChange, logIncrement, logDecrement, logBlur, logRemoveConfirm, logRemoveCancel, logHover]);

    return (
        <ConfigProvider config={mockConfig}>
            <div ref={containerRef} {...{ [QUANTITY_PICKER_HARNESS_ATTR]: 'true' }}>
                {children}
            </div>
        </ConfigProvider>
    );
}

const meta: Meta<typeof CartQuantityPicker> = {
    title: 'CART/Cart Quantity Picker',
    component: CartQuantityPicker,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A cart-specific quantity picker that wraps the base \`QuantityPicker\` with API integration, debounced updates, stock validation, and remove-item confirmation.

## Design

Renders a right-aligned "Quantity:" label above a compact stepper control. The stepper uses a single \`border border-input rounded-none\` wrapper with flush −/+ buttons and a borderless numeric input — matching the reference cart item design.

## Features

- **Single-border stepper**: Clean picker with \`−\` and \`+\` buttons inside one rounded border
- **Right-aligned label**: "Quantity:" text in \`text-sm text-muted-foreground\` aligned right above the picker
- **Debounced API calls**: Configurable delay (default from \`config.pages.cart.quantityUpdateDebounce\`) prevents request spam
- **Stock validation**: Warns when quantity exceeds available stock with a destructive-coloured message
- **Remove confirmation**: Shows a \`ConfirmationDialog\` when quantity is set to 0
- **Optimistic updates**: UI updates immediately; rolls back on API failure
- **Loading state**: Disables the picker while the fetcher is submitting

## Usage

\`\`\`tsx
import CartQuantityPicker from '@/components/cart/cart-quantity-picker';

// In a cart item row — right column on desktop
<div className="hidden md:flex flex-col items-end">
  <CartQuantityPicker
    value={item.quantity.toString()}
    itemId={item.itemId}
    stockLevel={item.stockLevel}
  />
</div>
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`value\` | \`string\` | — | Current quantity as a string |
| \`itemId\` | \`string\` | — | Cart item ID used for API calls |
| \`className\` | \`string\` | \`undefined\` | Additional CSS classes on the wrapper |
| \`debounceDelay\` | \`number\` | From config | Override the default debounce (ms) |
| \`stockLevel\` | \`number\` | \`undefined\` | Available stock for validation |
| \`max\` | \`number\` | \`undefined\` | Hard maximum (e.g. bonus product limit) |
| \`disabled\` | \`boolean\` | \`false\` | Locks the picker (bonus / read-only items) |

## Stories

| Story | Description |
|-------|-------------|
| **Default** | Standard picker with value 1 |
| **HighQuantity** | Picker pre-set to 10 |
| **WithStockLevel** | Picker with stock-level validation (stock = 10) |
| **Disabled** | Fully disabled state |
| **WithCustomDebounce** | Shorter 500 ms debounce |
| **InCartItem** | Full cart-item row with delivery header, product details, action links, and the picker in the desktop right column |
                `,
            },
        },
    },
    argTypes: {
        value: {
            control: 'text',
            description: 'Current quantity value as string',
            table: {
                type: { summary: 'string' },
            },
        },
        itemId: {
            control: 'text',
            description: 'Cart item ID for API calls',
            table: {
                type: { summary: 'string' },
            },
        },
        className: {
            control: 'text',
            description: 'Custom className for styling',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: 'undefined' },
            },
        },
        debounceDelay: {
            control: 'number',
            description: 'Debounce delay in milliseconds',
            table: {
                type: { summary: 'number' },
                defaultValue: { summary: 'From config' },
            },
        },
        stockLevel: {
            control: 'number',
            description: 'Stock level for validation',
            table: {
                type: { summary: 'number' },
                defaultValue: { summary: 'undefined' },
            },
        },
        disabled: {
            control: 'boolean',
            description: 'Disable quantity picker',
            table: {
                type: { summary: 'boolean' },
                defaultValue: { summary: 'false' },
            },
        },
    },
    args: {
        value: '1',
        itemId: 'item-123',
        className: undefined,
        stockLevel: undefined,
        disabled: false,
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <QuantityPickerStoryHarness>
                        <Story {...(context.args as Record<string, unknown>)} />
                    </QuantityPickerStoryHarness>
                );

                if (inRouter) {
                    return content;
                }

                const router = createMemoryRouter(
                    [
                        {
                            path: '/',
                            element: content,
                        },
                    ],
                    { initialEntries: ['/'] }
                );

                return <RouterProvider router={router} />;
            };

            return <RouterWrapper />;
        },
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        value: '1',
        itemId: 'item-123',
    },
    parameters: {
        docs: {
            description: {
                story: `
The default CartQuantityPicker shows standard quantity selection:

### Features:
- **Quantity input**: Number input with current quantity
- **Increment button**: Button to increase quantity
- **Decrement button**: Button to decrease quantity
- **Label**: "Quantity" label above input
- **Standard behavior**: Default debounce and validation

### Use Cases:
- Standard cart item quantity management
- Single item quantity updates
- Most common quantity scenarios
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test quantity input is present (use input type to avoid matching button labels)
        const quantityInput = canvasElement.querySelector('input[type="number"]') as HTMLInputElement;
        await expect(quantityInput).toBeInTheDocument();
        await expect(quantityInput).toHaveValue(1);

        // Test increment button is present
        const incrementButton = await canvas.findByRole('button', { name: /increment/i }, { timeout: 5000 });
        await expect(incrementButton).toBeInTheDocument();

        // Test decrement button is present
        const decrementButton = await canvas.findByRole('button', { name: /decrement/i }, { timeout: 5000 });
        await expect(decrementButton).toBeInTheDocument();
    },
};

export const HighQuantity: Story = {
    args: {
        value: '10',
        itemId: 'item-123',
    },
    parameters: {
        docs: {
            description: {
                story: `
CartQuantityPicker with high quantity value:

### High Quantity Features:
- **Quantity display**: Shows current high quantity
- **Increment available**: Can still increase if stock allows
- **Decrement available**: Can decrease quantity
- **Same functionality**: All features work the same

### Use Cases:
- Items with multiple quantities
- Bulk purchases
- High quantity scenarios
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test quantity input shows high value (use input type to avoid matching button labels)
        const quantityInput = canvasElement.querySelector('input[type="number"]') as HTMLInputElement;
        await expect(quantityInput).toBeInTheDocument();
        await expect(quantityInput).toHaveValue(10);
    },
};

export const WithStockLevel: Story = {
    args: {
        value: '5',
        itemId: 'item-123',
        stockLevel: 10,
    },
    parameters: {
        docs: {
            description: {
                story: `
CartQuantityPicker with stock level validation:

### Stock Validation Features:
- **Stock limit**: Validates against available stock
- **Error messages**: Shows warning if exceeds stock
- **Stock-aware**: Prevents ordering more than available
- **Validation feedback**: Clear error messages

### Use Cases:
- Limited stock items
- Stock validation
- Inventory management
- Stock-aware quantity selection
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test quantity input is present (use input type to avoid matching button labels)
        const quantityInput = canvasElement.querySelector('input[type="number"]') as HTMLInputElement;
        await expect(quantityInput).toBeInTheDocument();
        await expect(quantityInput).toHaveValue(5);
    },
};

export const AtStockLimit: Story = {
    args: {
        value: '10',
        itemId: 'item-123',
        stockLevel: 10,
    },
    parameters: {
        docs: {
            description: {
                story: `
CartQuantityPicker at the stock limit:

### Stock Limit Features:
- **Increment disabled**: Cannot increase beyond available stock
- **Stock message**: Shows "Maximum stock reached" when at the limit
- **Decrement available**: Can still decrease quantity
- **Clear feedback**: Shopper understands why they cannot add more

### Use Cases:
- Items at maximum available quantity
- Allocation-limited products
- Stock-constrained items
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test quantity input shows stock level value
        const quantityInput = canvasElement.querySelector('input[type="number"]') as HTMLInputElement;
        await expect(quantityInput).toBeInTheDocument();
        await expect(quantityInput).toHaveValue(10);

        // Test increment button is disabled at stock limit
        const incrementButton = await canvas.findByRole('button', { name: /increment/i }, { timeout: 5000 });
        await expect(incrementButton).toBeDisabled();

        // Test "Maximum stock reached" message is shown
        const stockMessage = await canvas.findByRole('alert');
        await expect(stockMessage).toBeInTheDocument();
        await expect(stockMessage).toHaveTextContent('Maximum stock reached');
    },
};

export const Disabled: Story = {
    args: {
        value: '1',
        itemId: 'item-123',
        disabled: true,
    },
    parameters: {
        docs: {
            description: {
                story: `
CartQuantityPicker in disabled state:

### Disabled Features:
- **Input disabled**: Cannot change quantity
- **Buttons disabled**: Increment/decrement disabled
- **Visual feedback**: Clear disabled appearance
- **Use case**: For bonus products or locked items

### Use Cases:
- Bonus products
- Locked items
- Read-only quantities
- Disabled state scenarios
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test quantity input is disabled (use input type to avoid matching button labels)
        const quantityInput = canvasElement.querySelector('input[type="number"]') as HTMLInputElement;
        await expect(quantityInput).toBeInTheDocument();
        await expect(quantityInput).toBeDisabled();
    },
};

export const WithCustomDebounce: Story = {
    args: {
        value: '3',
        itemId: 'item-123',
        debounceDelay: 500,
    },
    parameters: {
        chromatic: { disableSnapshot: true },
        docs: {
            description: {
                story: `
CartQuantityPicker with custom debounce delay:

### Custom Debounce Features:
- **Faster updates**: Shorter debounce delay (500ms)
- **Quick response**: Updates sooner after user stops typing
- **Custom timing**: Configurable debounce behavior
- **Same functionality**: All other features work the same

### Use Cases:
- Faster update requirements
- Custom debounce timing
- Performance optimization
- Custom update behavior
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test quantity input is present (use input type to avoid matching button labels)
        const quantityInput = canvasElement.querySelector('input[type="number"]') as HTMLInputElement;
        await expect(quantityInput).toBeInTheDocument();
        await expect(quantityInput).toHaveValue(3);
    },
};

export const InCartItem: Story = {
    render: () => (
        <div className="flex justify-center w-full">
            <div className="bg-card rounded-none shadow-md p-4 md:p-8 w-full max-w-3xl">
                {/* Delivery Header */}
                <div className="flex items-start gap-2 mb-6">
                    <Info className="w-5 h-5 text-foreground mt-1 shrink-0" />
                    <div>
                        <h2 className="text-lg md:text-xl font-medium text-foreground">Delivery - 1 out of 1 items</h2>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1">
                            478 Artisan Way, Somerville, MA 02145
                        </p>
                    </div>
                </div>

                {/* Cart Item Row */}
                <div className="flex gap-4 md:gap-6 py-4 px-4 md:px-6">
                    {/* Product Image */}
                    <a
                        className="flex-shrink-0 w-20 h-20 md:w-28 md:h-28 bg-muted rounded-none overflow-hidden block hover:opacity-90 transition-opacity"
                        href="#"
                        onClick={(e) => e.preventDefault()}>
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ShoppingCart className="w-10 h-10" />
                        </div>
                    </a>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                            <a
                                className="text-sm md:text-base font-medium line-clamp-2 text-foreground hover:underline flex-1"
                                href="#"
                                onClick={(e) => e.preventDefault()}>
                                Solid Cylinder
                            </a>
                            {/* Mobile delivery badge */}
                            <div className="md:hidden flex-shrink-0">
                                <Badge variant="secondary" className="rounded-none gap-1">
                                    <ShoppingCart className="w-3 h-3" />
                                    Delivery
                                </Badge>
                            </div>
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground mb-2">
                            <span>Size: M</span>
                        </div>
                        <p className="hidden md:block text-sm text-muted-foreground mb-3">
                            Robust cylindrical form with timeless appeal.
                        </p>

                        {/* Mobile price & quantity */}
                        <div className="md:hidden">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-semibold text-foreground">$59.00</span>
                            </div>
                            <div className="mb-2">
                                <CartQuantityPicker value="2" itemId="item-123" stockLevel={10} />
                            </div>
                        </div>

                        {/* Actions row */}
                        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3">
                            <label className="flex items-center gap-2 text-xs md:text-sm text-foreground cursor-pointer">
                                <input
                                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                                    type="checkbox"
                                />
                                <span>This is a gift.</span>
                            </label>
                            <div className="flex gap-3 items-center">
                                <button
                                    className="text-xs md:text-sm text-primary hover:text-primary/80 font-medium focus:outline-none focus:ring-2 focus:ring-primary rounded"
                                    aria-label="Edit Solid Cylinder">
                                    Edit
                                </button>
                                <button
                                    className="text-xs md:text-sm text-primary hover:text-primary/80 font-medium focus:outline-none focus:ring-2 focus:ring-primary rounded"
                                    aria-label="Remove Solid Cylinder from cart">
                                    Remove
                                </button>
                                <button
                                    className="text-xs md:text-sm text-primary hover:text-primary/80 font-medium focus:outline-none focus:ring-2 focus:ring-primary rounded"
                                    aria-label="Add Solid Cylinder to wishlist">
                                    Add to Wishlist
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Desktop right column: delivery badge, price, quantity */}
                    <div className="hidden md:flex flex-col items-end flex-shrink-0 min-w-[140px]">
                        <div className="mb-2">
                            <Badge variant="secondary" className="rounded-none gap-1">
                                <ShoppingCart className="w-3 h-3" />
                                Delivery
                            </Badge>
                        </div>
                        <div className="text-right mb-4">
                            <span className="text-lg font-semibold text-foreground">$59.00</span>
                        </div>
                        <CartQuantityPicker value="2" itemId="item-123" stockLevel={10} />
                    </div>
                </div>
            </div>
        </div>
    ),
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                story: `
CartQuantityPicker integrated into a full cart item layout matching the reference design:

### Layout Features:
- **Delivery header**: Info icon with delivery count and shipping address
- **Product image**: Rounded thumbnail linking to product
- **Product details**: Name, variant (size), description (desktop), price
- **Action row**: "This is a gift" checkbox, Edit / Remove / Add to Wishlist links in primary blue
- **Responsive**: Mobile shows price and quantity inline; desktop shows right column with delivery badge, price, and quantity stepper
- **Reuses components**: Badge, CartQuantityPicker

### Use Cases:
- Cart item lists
- Cart content pages
- Shopping cart interfaces
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Test quantity input is present in cart item (use input type to avoid matching button labels)
        const quantityInput = canvasElement.querySelector('input[type="number"]') as HTMLInputElement;
        await expect(quantityInput).toBeInTheDocument();
        await expect(quantityInput).toHaveValue(2);
    },
};
