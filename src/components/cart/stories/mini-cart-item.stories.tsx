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
import MiniCartItem from '../mini-cart-item';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent, waitFor } from 'storybook/test';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';

function MiniCartItemStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logRemove = action('remove-item');
        const logQuantityChange = action('quantity-change');
        const logCustomInput = action('custom-quantity-input');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const removeButton = target.closest('button[aria-label*="Remove"]');
            if (removeButton) {
                event.preventDefault();
                logRemove({});
            }
        };

        const handleChange = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            if (target instanceof HTMLSelectElement) {
                const value = target.value;
                logQuantityChange({ value });
            }

            if (target instanceof HTMLInputElement && target.type === 'number') {
                const value = target.value;
                logCustomInput({ value });
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('change', handleChange, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('change', handleChange, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof MiniCartItem> = {
    title: 'CART/Mini Cart Item',
    component: MiniCartItem,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
MiniCartItem component displays a product in the mini cart flyout with full interaction support.

## Features

- **Product Display**: Product image, name (bold), and variation attributes (color/size)
- **Pricing**: Original and sale pricing with savings indicators and promotion badges
- **Quantity Selection**: Dropdown selector (1-10) with custom input option for higher quantities
- **Item Actions**: Remove link for cart item deletion
- **Responsive Layout**: Compact layout optimized for flyout matching Figma design
- **Debounced Updates**: Quantity changes are debounced to prevent API spam
- **Keyboard Support**: Enter to confirm, Escape to cancel in custom input mode

## Usage

This component is used within the mini cart slideout (CartSheet) to display individual cart items.
It integrates with the cart management system and handles quantity updates and item removal.

## Props

- **product**: Combined basket item and product data (MiniCartItemProduct)
- **onRemove**: Optional callback when item is removed from cart

## Integration

Integrates with:
- useItemFetcher for cart operations
- useCartQuantityUpdate for debounced quantity updates
- useConfig for cart configuration (debounce delay, max quantity)
- getDisplayVariationValues for proper attribute display
                `,
            },
        },
    },
    argTypes: {
        product: {
            description: 'Combined basket item and product data with images, pricing, and variations',
            control: 'object',
            table: {
                type: { summary: 'MiniCartItemProduct' },
            },
        },
        onRemove: {
            description: 'Optional callback function called when the remove button is clicked',
            action: 'remove',
            table: {
                type: { summary: '() => void' },
            },
        },
    },
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <MiniCartItemStoryHarness>
                    <div className="max-w-md">
                        <Story />
                    </div>
                </MiniCartItemStoryHarness>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof MiniCartItem>;

const mockProduct = {
    itemId: '1',
    productId: 'prod-1',
    productName: 'Product Name',
    quantity: 1,
    basePrice: 20.0, // List price (original price before discount)
    price: 20.0, // Unit price
    priceAfterItemDiscount: 15.0, // Final price after discount (for quantity 1, this is the discounted unit price)
    variationValues: {
        color: 'Grey',
        size: 'XL',
    },
    variationAttributes: [
        {
            id: 'color',
            name: 'Color',
            values: [{ value: 'Grey', name: 'Grey' }],
        },
        {
            id: 'size',
            name: 'Size',
            values: [{ value: 'XL', name: 'XL' }],
        },
    ],
    imageGroups: [
        {
            viewType: 'small',
            images: [
                {
                    link: 'https://via.placeholder.com/160',
                    alt: 'Product image',
                },
            ],
        },
    ],
};

export const WithSavings: Story = {
    args: {
        product: mockProduct,
        onRemove: action('remove-clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Product with sale pricing showing savings. Demonstrates:
- Strikethrough original price
- Sale price display
- Promotion badge when applicable
- Savings indicator
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for product name to be displayed (use findBy to wait for async loading)
        const productName = await canvas.findByText('Product Name');
        await expect(productName).toBeInTheDocument();

        // Verify variation attributes are shown
        const colorAttr = await canvas.findByText((content, element) => {
            return element?.textContent === 'Color: Grey';
        });
        await expect(colorAttr).toBeInTheDocument();
        const sizeAttr = await canvas.findByText((content, element) => {
            return element?.textContent === 'Size: XL';
        });
        await expect(sizeAttr).toBeInTheDocument();

        // Verify pricing is displayed
        // ProductPrice renders prices in Typography components, so we check the container text content
        await waitFor(() => {
            const priceContainer = canvasElement.querySelector('[data-testid="mini-cart-item"]');
            expect(priceContainer).toBeInTheDocument();
            const priceText = priceContainer?.textContent || '';
            expect(priceText).toContain('$20.00'); // List price (strikethrough)
            expect(priceText).toContain('$15.00'); // Current price
        });

        // Verify quantity selector
        const quantityLabel = await canvas.findByText('Quantity:');
        await expect(quantityLabel).toBeInTheDocument();
        const quantitySelect = await canvas.findByLabelText('Quantity');
        await expect(quantitySelect).toBeInTheDocument();
        await expect(quantitySelect).toHaveValue('1');

        // Verify remove button
        const removeButton = await canvas.findByRole('button', { name: /remove item/i });
        await expect(removeButton).toBeInTheDocument();
    },
};

export const WithoutSavings: Story = {
    args: {
        product: {
            ...mockProduct,
            price: 15.0,
            priceAfterItemDiscount: 15.0,
        },
        onRemove: action('remove-clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Product at regular price with no savings. Shows:
- Single price display (no strikethrough)
- No promotion badge
- Clean pricing layout
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for product name to be displayed (use findBy to wait for async loading)
        const productName = await canvas.findByText('Product Name');
        await expect(productName).toBeInTheDocument();

        // Verify only sale price is shown (no strikethrough)
        // ProductPrice renders prices in Typography components, so we check the container text content
        await waitFor(() => {
            const priceContainer = canvasElement.querySelector('[data-testid="mini-cart-item"]');
            expect(priceContainer).toBeInTheDocument();
            const priceText = priceContainer?.textContent || '';
            expect(priceText).toContain('$15.00'); // Current price
        });

        // Verify no savings badge
        const savingsBadge = canvas.queryByText(/Saved/);
        await expect(savingsBadge).not.toBeInTheDocument();
    },
};

export const WithoutImage: Story = {
    args: {
        product: {
            ...mockProduct,
            imageGroups: [],
        },
        onRemove: action('remove-clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Product without image showing placeholder. Demonstrates:
- Fallback placeholder when image data is missing
- Graceful handling of missing image groups
- "No image" text indicator
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for product name to be displayed (use findBy to wait for async loading)
        const productName = await canvas.findByText('Product Name');
        await expect(productName).toBeInTheDocument();

        // Verify placeholder is shown
        const placeholder = await canvas.findByText('No image');
        await expect(placeholder).toBeInTheDocument();
    },
};

export const LongProductName: Story = {
    args: {
        product: {
            ...mockProduct,
            productName: 'This is a very long product name that should be truncated to prevent layout issues',
        },
        onRemove: action('remove-clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Product with long name showing text truncation. Shows:
- Line clamping with line-clamp-2
- Layout stability with long product names
- Proper text wrapping behavior
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for long product name to be displayed
        // Use getByRole to find the heading element specifically, avoiding screen reader text
        const longName = await canvas.findByRole('heading', {
            name: /this is a very long product name/i,
        });
        await expect(longName).toBeInTheDocument();
    },
};

export const HigherQuantity: Story = {
    args: {
        product: {
            ...mockProduct,
            quantity: 5,
        },
        onRemove: action('remove-clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Product with quantity greater than 1. Demonstrates:
- Dropdown showing selected quantity (5)
- Quantity options from 1-10
- Custom option for higher quantities
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for quantity selector (use findBy to wait for async loading)
        const quantitySelect = await canvas.findByLabelText('Quantity');
        await expect(quantitySelect).toBeInTheDocument();
        await expect(quantitySelect).toHaveValue('5');
    },
};

export const OnlyColor: Story = {
    args: {
        product: {
            ...mockProduct,
            variationValues: {
                color: 'Blue',
            },
            variationAttributes: [
                {
                    id: 'color',
                    name: 'Color',
                    values: [{ value: 'Blue', name: 'Blue' }],
                },
            ],
        },
        onRemove: action('remove-clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Product with only color variation. Shows:
- Single variation attribute (color only)
- No size attribute displayed
- Proper handling of partial variation data
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for color attribute (use findBy to wait for async loading)
        const colorAttr = await canvas.findByText((content, element) => {
            return (
                element?.textContent === 'Color: Blue' &&
                element?.className?.includes('inline-block') &&
                element?.className?.includes('w-full')
            );
        });
        await expect(colorAttr).toBeInTheDocument();

        // Verify size attribute is not shown
        const sizeAttr = canvas.queryByText(/Size:/);
        await expect(sizeAttr).not.toBeInTheDocument();
    },
};

export const OnlySize: Story = {
    args: {
        product: {
            ...mockProduct,
            variationValues: {
                size: 'M',
            },
            variationAttributes: [
                {
                    id: 'size',
                    name: 'Size',
                    values: [{ value: 'M', name: 'M' }],
                },
            ],
        },
        onRemove: action('remove-clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Product with only size variation. Shows:
- Single variation attribute (size only)
- No color attribute displayed
- Proper handling of partial variation data
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for size attribute (use findBy to wait for async loading)
        const sizeAttr = await canvas.findByText((content, element) => {
            return (
                element?.textContent === 'Size: M' &&
                element?.className?.includes('inline-block') &&
                element?.className?.includes('w-full')
            );
        });
        await expect(sizeAttr).toBeInTheDocument();

        // Verify color attribute is not shown
        const colorAttr = canvas.queryByText(/Color:/);
        await expect(colorAttr).not.toBeInTheDocument();
    },
};

export const CustomQuantity: Story = {
    args: {
        product: {
            ...mockProduct,
            quantity: 15,
        },
        onRemove: action('remove-clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Product with custom quantity greater than 10. Demonstrates:
- Custom quantity display showing the actual quantity value
- Edit button to modify the quantity
- Different UI from standard dropdown when quantity > 10
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for product name to be displayed (use findBy to wait for async loading)
        const productName = await canvas.findByText('Product Name');
        await expect(productName).toBeInTheDocument();

        // Verify the quantity display shows 15 (when quantity > 10, dropdown is replaced with display + edit button)
        const quantityDisplay = await canvas.findByText('15');
        await expect(quantityDisplay).toBeInTheDocument();

        // Verify edit button is shown for custom quantities
        const editButton = await canvas.findByRole('button', { name: /edit quantity/i });
        await expect(editButton).toBeInTheDocument();
    },
};

export const Interactive: Story = {
    args: {
        product: mockProduct,
        onRemove: action('remove-clicked'),
    },
    parameters: {
        docs: {
            description: {
                story: `
Interactive mini cart item for testing user interactions. Demonstrates:
- Quantity selector interaction
- Switch to custom input mode
- Remove button click
- Action logging for all interactions
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for quantity selector (use findBy to wait for async loading)
        const quantitySelect = await canvas.findByLabelText('Quantity');
        await userEvent.selectOptions(quantitySelect, '3');
        await expect(quantitySelect).toHaveValue('3');

        // Test switching to custom input
        await userEvent.selectOptions(quantitySelect, 'custom');

        // Wait for custom input to appear
        const customInput = await canvas.findByLabelText('Custom quantity');
        await expect(customInput).toBeInTheDocument();
    },
};
