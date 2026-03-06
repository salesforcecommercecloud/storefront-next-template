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
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

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
A cart-specific quantity picker component that wraps the base QuantityPicker with cart-specific logic including API integration, debouncing, and error handling.

## Features

- **Quantity Input**: Number input for quantity with increment/decrement buttons
- **Debounced Updates**: Prevents API spam with configurable debounce delay
- **Stock Validation**: Validates quantity against stock levels
- **Error Handling**: Shows error messages and rolls back on failure
- **Remove Confirmation**: Shows confirmation dialog when quantity is set to 0
- **Optimistic Updates**: Updates UI immediately for better UX
- **Loading States**: Disables input during API calls

## Usage

The CartQuantityPicker is used in:
- Cart item lists
- Shopping cart pages
- Cart item editing
- Quantity management

\`\`\`tsx
import CartQuantityPicker from '../cart-quantity-picker';

function CartItem({ item }) {
  return (
    <div>
      <CartQuantityPicker
        value={item.quantity.toString()}
        itemId={item.itemId}
        stockLevel={item.stockLevel}
      />
    </div>
  );
}
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`value\` | \`string\` | - | Current quantity value as string |
| \`itemId\` | \`string\` | - | Cart item ID for API calls |
| \`className\` | \`string\` | \`undefined\` | Custom className for styling |
| \`debounceDelay\` | \`number\` | From config | Debounce delay in milliseconds |
| \`stockLevel\` | \`number\` | \`undefined\` | Stock level for validation |
| \`disabled\` | \`boolean\` | \`false\` | Disable quantity picker |

## Behavior

- **Debouncing**: Waits for user to stop typing before making API call
- **Stock Validation**: Warns if quantity exceeds available stock
- **Remove Confirmation**: Asks for confirmation when setting quantity to 0
- **Error Rollback**: Reverts to previous value if API call fails
- **Loading State**: Disables input during submission
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
        <div className="w-full max-w-2xl p-4 border rounded-lg">
            <div className="flex items-start gap-4">
                <div className="w-24 h-24 bg-muted rounded" />
                <div className="flex-1">
                    <h3 className="font-semibold text-lg">Premium Cotton T-Shirt</h3>
                    <p className="text-sm text-muted-foreground">Blue, Large</p>
                    <p className="text-lg font-bold mt-2">$29.99</p>
                    <div className="mt-4">
                        <CartQuantityPicker value="2" itemId="item-123" stockLevel={10} />
                    </div>
                </div>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: `
CartQuantityPicker integrated into a cart item display:

### Integration Features:
- **Cart item layout**: Quantity picker in cart item context
- **Product context**: Shows quantity for specific product
- **Stock awareness**: Includes stock level validation
- **Visual hierarchy**: Clear quantity control placement

### Use Cases:
- Cart item lists
- Product item displays
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
