import type { Meta, StoryObj } from '@storybook/react-vite';
import { CartItemEditButton } from '../cart-item-edit-button';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { inBasketProductDetails } from '@/components/__mocks__/basket-with-dress';

const EDIT_BUTTON_HARNESS_ATTR = 'data-edit-button-harness';

function EditButtonStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logClick = useMemo(() => action('edit-button-clicked'), []);
    const logModalOpen = useMemo(() => action('edit-modal-opened'), []);
    const logHover = useMemo(() => action('edit-button-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${EDIT_BUTTON_HARNESS_ATTR}]`));

        const handleClick = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button[data-testid^="edit-item-"]');
            if (!button || !(button instanceof HTMLButtonElement) || !isInsideHarness(button)) {
                return;
            }
            const testId = button.getAttribute('data-testid') || '';
            const itemId = testId.replace('edit-item-', '');
            logClick({ itemId, testId });
            logModalOpen({ itemId });
        };

        const handleMouseOver = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button[data-testid^="edit-item-"]');
            if (!button || !(button instanceof HTMLButtonElement) || !isInsideHarness(button)) {
                return;
            }
            const related = event.relatedTarget as HTMLElement | null;
            if (related && button.contains(related)) {
                return;
            }
            const label = (button.getAttribute('aria-label') ?? button.textContent ?? '').trim();
            if (!label) {
                return;
            }
            logHover({ label });
        };

        document.addEventListener('click', handleClick, true);
        document.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, [logClick, logModalOpen, logHover]);

    return (
        <div ref={containerRef} {...{ [EDIT_BUTTON_HARNESS_ATTR]: 'true' }}>
            {children}
        </div>
    );
}

const meta: Meta<typeof CartItemEditButton> = {
    title: 'CART/Cart Item Edit Button',
    component: CartItemEditButton,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A button component that opens a modal for editing cart items. This component provides a consistent way to edit cart items with product details, variants, and quantity.

## Features

- **Edit Button**: Link-styled button that opens edit modal
- **Modal Integration**: Opens CartItemEditModal when clicked
- **Product Context**: Passes product data to modal
- **Consistent Styling**: Matches RemoveItemButtonWithConfirmation styling
- **Accessibility**: Proper ARIA attributes and keyboard support

## Usage

The CartItemEditButton is used in:
- Cart item lists
- Product item components
- Cart content displays
- Any context where cart items need editing

\`\`\`tsx
import { CartItemEditButton } from '../cart-item-edit-button';

function CartItem({ product }) {
  return (
    <div>
      {/* product display */}
      <CartItemEditButton product={product} />
    </div>
  );
}
\`\`\`

## Props

| Prop | Type | Description |
|------|------|-------------|
| \`product\` | \`ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>\` | The cart item product to edit |
| \`className\` | \`string\` | Optional additional CSS classes |

## Behavior

- **Click**: Opens CartItemEditModal with product details
- **Modal State**: Manages modal open/close state internally
- **Product Data**: Passes product, quantity, and itemId to modal
- **Styling**: Uses link variant button for consistency
                `,
            },
        },
    },
    argTypes: {
        product: {
            control: 'object',
            description: 'The cart item product to edit',
            table: {
                type: {
                    summary: "ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>",
                },
            },
        },
        className: {
            control: 'text',
            description: 'Optional additional CSS classes',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: "''" },
            },
        },
    },
    args: {
        product: inBasketProductDetails as ShopperBasketsV2.schemas['ProductItem'] &
            Partial<ShopperProducts.schemas['Product']>,
        className: '',
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            const RouterWrapper = (): ReactElement => {
                const inRouter = useInRouterContext();
                const content = (
                    <EditButtonStoryHarness>
                        <Story {...(context.args as Record<string, unknown>)} />
                    </EditButtonStoryHarness>
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
        product: inBasketProductDetails as ShopperBasketsV2.schemas['ProductItem'] &
            Partial<ShopperProducts.schemas['Product']>,
    },
    parameters: {
        docs: {
            description: {
                story: `
The default CartItemEditButton shows a standard edit button:

### Features:
- **Edit button**: Link-styled button with "Edit" text
- **Product data**: Uses product from cart item
- **Modal integration**: Opens edit modal on click
- **Standard styling**: Matches other cart action buttons

### Use Cases:
- Standard cart item editing
- Product variant changes
- Quantity updates
- Most common edit scenarios
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test edit button is present
        const editButton = await canvas.findByRole('button', { name: /edit/i });
        await expect(editButton).toBeInTheDocument();
        await expect(editButton).not.toBeDisabled();

        // Test button has correct test id
        const testId = editButton.getAttribute('data-testid');
        await expect(testId).toContain('edit-item-');
    },
};

export const WithCustomStyling: Story = {
    args: {
        product: inBasketProductDetails as ShopperBasketsV2.schemas['ProductItem'] &
            Partial<ShopperProducts.schemas['Product']>,
        className: 'text-blue-600 hover:text-blue-700 font-medium',
    },
    parameters: {
        docs: {
            description: {
                story: `
CartItemEditButton with custom styling:

### Custom Styling Features:
- **Blue color**: Custom blue text color
- **Hover effect**: Darker blue on hover
- **Font weight**: Medium font weight
- **Maintains functionality**: All edit features work the same

### Use Cases:
- Brand-specific styling
- Custom color schemes
- Design system integration
- Enhanced visual appeal
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test edit button is present with custom styling
        const editButton = await canvas.findByRole('button', { name: /edit/i });
        await expect(editButton).toBeInTheDocument();
        await expect(editButton).not.toBeDisabled();
    },
};

export const WithHighQuantity: Story = {
    args: {
        product: {
            ...inBasketProductDetails,
            quantity: 5,
        } as ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>,
    },
    parameters: {
        docs: {
            description: {
                story: `
CartItemEditButton for items with high quantity:

### High Quantity Features:
- **Quantity display**: Shows current quantity in modal
- **Quantity editing**: Can adjust quantity in modal
- **Same functionality**: All edit features work the same
- **Quantity context**: Modal shows current quantity

### Use Cases:
- Items with multiple quantities
- Bulk item editing
- Quantity adjustments
- High quantity scenarios
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test edit button is present
        const editButton = await canvas.findByRole('button', { name: /edit/i });
        await expect(editButton).toBeInTheDocument();
        await expect(editButton).not.toBeDisabled();
    },
};

export const WithVariants: Story = {
    args: {
        product: {
            ...inBasketProductDetails,
            itemText: 'Premium Cotton T-Shirt - Red, Medium',
            variationValues: {
                color: 'red',
                size: 'M',
            },
        } as ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>,
    },
    parameters: {
        docs: {
            description: {
                story: `
CartItemEditButton for items with product variants:

### Variant Features:
- **Variant display**: Shows selected variants in modal
- **Variant editing**: Can change variants in modal
- **Variant context**: Modal shows current variant selections
- **Same functionality**: All edit features work with variants

### Use Cases:
- Products with color/size options
- Variant changes
- Product configuration
- Variant-specific editing
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test edit button is present
        const editButton = await canvas.findByRole('button', { name: /edit/i });
        await expect(editButton).toBeInTheDocument();
        await expect(editButton).not.toBeDisabled();
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
                    <div className="flex gap-4 mt-4">
                        <CartItemEditButton
                            product={
                                inBasketProductDetails as ShopperBasketsV2.schemas['ProductItem'] &
                                    Partial<ShopperProducts.schemas['Product']>
                            }
                        />
                        <button className="text-sm text-destructive hover:text-destructive/80">Remove</button>
                    </div>
                </div>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: `
CartItemEditButton integrated into a cart item display:

### Integration Features:
- **Cart item layout**: Button in cart item context
- **Action buttons**: Edit and remove buttons together
- **Visual hierarchy**: Clear action placement
- **Consistent styling**: Matches cart item design

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
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test edit button is present in cart item
        const editButton = await canvas.findByRole('button', { name: /edit/i });
        await expect(editButton).toBeInTheDocument();

        // Test remove button is also present
        const removeButton = await canvas.findByRole('button', { name: /remove/i });
        await expect(removeButton).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test edit button is present
        const editButton = await canvas.findByRole('button', { name: /edit/i });
        await expect(editButton).toBeInTheDocument();
        await expect(editButton).not.toBeDisabled();

        // Test button has correct test id
        const testId = editButton.getAttribute('data-testid');
        await expect(testId).toContain('edit-item-');
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test edit button is present
        const editButton = await canvas.findByRole('button', { name: /edit/i });
        await expect(editButton).toBeInTheDocument();
        await expect(editButton).not.toBeDisabled();

        // Test button has correct test id
        const testId = editButton.getAttribute('data-testid');
        await expect(testId).toContain('edit-item-');
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test edit button is present
        const editButton = await canvas.findByRole('button', { name: /edit/i });
        await expect(editButton).toBeInTheDocument();
        await expect(editButton).not.toBeDisabled();

        // Test button has correct test id
        const testId = editButton.getAttribute('data-testid');
        await expect(testId).toContain('edit-item-');
    },
};
