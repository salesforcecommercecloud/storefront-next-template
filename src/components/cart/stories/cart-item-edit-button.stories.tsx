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
import { CartItemEditButton } from '../cart-item-edit-button';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { action } from 'storybook/actions';
import { useState, useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { inBasketProductDetails } from '@/components/__mocks__/basket-with-dress';
import { Badge } from '@/components/ui/badge';
import QuantityPicker from '@/components/quantity-picker/quantity-picker';
import { Info, ShoppingCart } from 'lucide-react';

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
A lightweight text button that opens a modal for editing cart items (size, color, quantity, etc.). Renders as a plain \`<button>\` styled with the \`primary\` design token to match the blue action-link pattern used across the cart.

## Features

- **Primary blue styling**: Uses \`text-primary\` with \`hover:text-primary/80\` for a consistent blue action-link appearance
- **Modal integration**: Opens \`CartItemEditModal\` on click, passing product data, current quantity, and item ID
- **Accessible**: Provides a dynamic \`aria-label\` combining the action text and the product name (e.g. "Edit Solid Cylinder")
- **Customisable**: Accepts an optional \`className\` prop to override or extend styles
- **Responsive text**: \`text-xs\` on mobile, \`text-sm\` on \`md\`+ breakpoints

## Usage

\`\`\`tsx
import { CartItemEditButton } from '@/components/cart/cart-item-edit-button';

// Inside a cart item row, alongside Remove and Add to Wishlist
<div className="flex gap-3 items-center">
  <CartItemEditButton product={item} />
  <button className="text-xs md:text-sm text-primary ...">Remove</button>
  <button className="text-xs md:text-sm text-primary ...">Add to Wishlist</button>
</div>
\`\`\`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| \`product\` | \`ProductItem & Partial<Product>\` | — | Cart line item with optional product details (name, variants) |
| \`className\` | \`string\` | \`''\` | Additional CSS classes appended to the button |

## Stories

| Story | Description |
|-------|-------------|
| **WithCustomStyling** | Standalone button with extra class overrides |
| **InCartItem** | Full cart-item row showing the button alongside Remove, Add to Wishlist, quantity picker, delivery badge, and "This is a gift" checkbox |
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

/**
 * Wrapper for QuantityPicker to manage state in the story
 */
function StoryQuantityPicker() {
    const [qty, setQty] = useState('1');
    return <QuantityPicker value={qty} onChange={(strVal) => setQty(strVal)} min={1} productName="Solid Cylinder" />;
}

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
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs text-muted-foreground">Quantity:</span>
                                <StoryQuantityPicker />
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
                                <CartItemEditButton
                                    product={
                                        inBasketProductDetails as ShopperBasketsV2.schemas['ProductItem'] &
                                            Partial<ShopperProducts.schemas['Product']>
                                    }
                                />
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
                        <div>
                            <span className="block text-sm text-muted-foreground mb-2 text-right">Quantity:</span>
                            <StoryQuantityPicker />
                        </div>
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
CartItemEditButton integrated into a full cart item layout matching the reference design:

### Layout Features:
- **Delivery header**: Info icon with delivery count and shipping address
- **Product image**: Rounded thumbnail linking to product
- **Product details**: Name, variant (size), description (desktop), price
- **Action row**: "This is a gift" checkbox, Edit / Remove / Add to Wishlist links in primary blue
- **Responsive**: Mobile shows price and quantity inline; desktop shows right column with delivery badge, price, and quantity stepper
- **Reuses components**: Badge, QuantityPicker, CartItemEditButton

### Use Cases:
- Cart item lists
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

        // Test wishlist button is present
        const wishlistButton = await canvas.findByRole('button', { name: /wishlist/i });
        await expect(wishlistButton).toBeInTheDocument();
    },
};
