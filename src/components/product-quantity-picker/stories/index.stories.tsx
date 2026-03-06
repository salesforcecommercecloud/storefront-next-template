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
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';

import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import ProductQuantityPicker from '../index';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInc = action('pqp-increment');
        const logDec = action('pqp-decrement');
        const logChange = action('pqp-change');
        const logBlur = action('pqp-blur');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const inc = target.closest('[data-testid="quantity-increment"], button[aria-label*="Increase"]');
            if (inc) {
                const input = inc.closest('div')?.querySelector('input[type="number"]') as HTMLInputElement | null;
                logInc({ value: input?.value });
                event.preventDefault();
                return;
            }
            const dec = target.closest('[data-testid="quantity-decrement"], button[aria-label*="Decrease"]');
            if (dec) {
                const input = dec.closest('div')?.querySelector('input[type="number"]') as HTMLInputElement | null;
                logDec({ value: input?.value });
                event.preventDefault();
            }
        };

        const handleChange = (event: Event) => {
            const input = event.target as HTMLInputElement | null;
            if (!input || input.type !== 'number') return;
            logChange({ value: input.value });
        };

        const handleBlur = (event: Event) => {
            const input = event.target as HTMLInputElement | null;
            if (!input || input.type !== 'number') return;
            logBlur({ value: input.value });
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('change', handleChange, true);
        root.addEventListener('blur', handleBlur, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('blur', handleBlur, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ProductQuantityPicker> = {
    title: 'PRODUCTS/Product Quantity Picker',
    component: ProductQuantityPicker,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'A product-specific quantity picker component that wraps the base QuantityPicker with product-specific logic including stock level warnings, validation, and inventory messages.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        value: {
            description: 'Current quantity value as string',
            control: 'text',
        },
        onChange: {
            description: 'Callback when quantity changes',
            action: 'onChange',
        },
        className: {
            description: 'Custom className for styling',
            control: 'text',
        },
        stockLevel: {
            description: 'Stock level for displaying stock message',
            control: 'number',
        },
        isOutOfStock: {
            description: 'Whether the product is out of stock',
            control: 'boolean',
        },
        productName: {
            description: 'Product name for inventory messages',
            control: 'text',
        },
        disabled: {
            description: 'Whether the picker is disabled',
            control: 'boolean',
        },
        isBundle: {
            description: 'Whether this is a bundle product',
            control: 'boolean',
        },
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
type Story = StoryObj<typeof ProductQuantityPicker>;

export const Default: Story = {
    args: {
        value: '1',
        productName: 'Classic T-Shirt',
        stockLevel: 50,
        isOutOfStock: false,
        disabled: false,
        isBundle: false,
        onChange: (_quantity: number) => {
            // Intentionally empty for story testing
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Basic test - just verify component renders
        void expect(canvasElement).toBeInTheDocument();
        void expect(canvasElement.children.length).toBeGreaterThan(0);
    },
};

export const WithStockWarning: Story = {
    args: {
        value: '1',
        productName: 'Limited Edition Jacket',
        stockLevel: 3,
        isOutOfStock: false,
        disabled: false,
        isBundle: false,
        onChange: (_quantity: number) => {
            // Intentionally empty for story testing
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test that quantity input shows correct value
        const quantityInput = canvas.getByDisplayValue('1');
        void expect(quantityInput).toBeInTheDocument();

        // Test that increment and decrement buttons are present
        const incrementButton = canvas.getByRole('button', { name: /increment quantity for/i });
        const decrementButton = canvas.getByRole('button', { name: /decrement quantity for/i });
        void expect(incrementButton).toBeInTheDocument();
        void expect(decrementButton).toBeInTheDocument();

        // Test that buttons are enabled (in test environment with mocked onChange)
        void expect(incrementButton).not.toBeDisabled();
        // Note: decrement button state depends on component logic
    },
};

export const OutOfStock: Story = {
    args: {
        value: '1',
        productName: 'Sold Out Product',
        stockLevel: 0,
        isOutOfStock: true,
        disabled: true,
        isBundle: false,
        onChange: (_quantity: number) => {
            // Intentionally empty for story testing
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Test that quantity input shows correct value
        const quantityInput = within(canvasElement).getByDisplayValue('1');
        void expect(quantityInput).toBeInTheDocument();

        // Test that increment and decrement buttons are present but disabled
        const incrementButton = within(canvasElement).getByRole('button', { name: /increment quantity for/i });
        const decrementButton = within(canvasElement).getByRole('button', { name: /decrement quantity for/i });
        void expect(incrementButton).toBeInTheDocument();
        void expect(decrementButton).toBeInTheDocument();

        // When disabled=true, both buttons should be disabled
        void expect(incrementButton).toBeDisabled();
        void expect(decrementButton).toBeDisabled();
    },
};

export const BundleProduct: Story = {
    args: {
        value: '1',
        productName: 'Gift Bundle Set',
        stockLevel: 5,
        isOutOfStock: false,
        disabled: false,
        isBundle: true,
        onChange: (_quantity: number) => {
            // Intentionally empty for story testing
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Test that quantity input shows correct value
        const quantityInput = within(canvasElement).getByDisplayValue('1');
        void expect(quantityInput).toBeInTheDocument();

        // Test that increment and decrement buttons are present
        const incrementButton = within(canvasElement).getByRole('button', { name: /increment quantity for/i });
        const decrementButton = within(canvasElement).getByRole('button', { name: /decrement quantity for/i });
        void expect(incrementButton).toBeInTheDocument();
        void expect(decrementButton).toBeInTheDocument();

        // Test that buttons are enabled for bundle product (in test environment)
        void expect(incrementButton).not.toBeDisabled();
        // Note: decrement button state depends on component logic
    },
};

export const BundleWithLowStock: Story = {
    args: {
        value: '1',
        productName: 'Premium Gift Bundle',
        stockLevel: 2,
        isOutOfStock: false,
        disabled: false,
        isBundle: true,
        onChange: (_quantity: number) => {
            // Intentionally empty for story testing
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Test that quantity input shows correct value
        const quantityInput = within(canvasElement).getByDisplayValue('1');
        void expect(quantityInput).toBeInTheDocument();

        // Test that increment and decrement buttons are present
        const incrementButton = within(canvasElement).getByRole('button', { name: /increment quantity for/i });
        const decrementButton = within(canvasElement).getByRole('button', { name: /decrement quantity for/i });
        void expect(incrementButton).toBeInTheDocument();
        void expect(decrementButton).toBeInTheDocument();

        // When value is 1 and min=1, decrement button should be disabled
        // Increment button is enabled
        void expect(incrementButton).not.toBeDisabled();
        void expect(decrementButton).toBeDisabled();
    },
};

export const Disabled: Story = {
    args: {
        value: '1',
        productName: 'Unavailable Product',
        stockLevel: 10,
        isOutOfStock: false,
        disabled: true,
        isBundle: false,
        onChange: (_quantity: number) => {
            // Intentionally empty for story testing
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Test that quantity input shows correct value
        const quantityInput = within(canvasElement).getByDisplayValue('1');
        void expect(quantityInput).toBeInTheDocument();

        // Test that increment and decrement buttons are present but disabled
        const incrementButton = within(canvasElement).getByRole('button', { name: /increment quantity for/i });
        const decrementButton = within(canvasElement).getByRole('button', { name: /decrement quantity for/i });
        void expect(incrementButton).toBeInTheDocument();
        void expect(decrementButton).toBeInTheDocument();

        // When disabled=true, both buttons should be disabled
        void expect(incrementButton).toBeDisabled();
        void expect(decrementButton).toBeDisabled();
    },
};

export const HighStock: Story = {
    args: {
        value: '1',
        productName: 'Popular Item',
        stockLevel: 1000,
        isOutOfStock: false,
        disabled: false,
        isBundle: false,
        onChange: (_quantity: number) => {
            // Intentionally empty for story testing
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Test that quantity input shows correct value
        const quantityInput = within(canvasElement).getByDisplayValue('1');
        void expect(quantityInput).toBeInTheDocument();

        // Test that increment and decrement buttons are present
        const incrementButton = within(canvasElement).getByRole('button', { name: /increment quantity for/i });
        const decrementButton = within(canvasElement).getByRole('button', { name: /decrement quantity for/i });
        void expect(incrementButton).toBeInTheDocument();
        void expect(decrementButton).toBeInTheDocument();

        // When value is 1 and min=1, decrement button should be disabled
        // Increment button is enabled
        void expect(incrementButton).not.toBeDisabled();
        void expect(decrementButton).toBeDisabled();
    },
};

export const CustomStyling: Story = {
    args: {
        value: '1',
        productName: 'Styled Product',
        stockLevel: 25,
        isOutOfStock: false,
        disabled: false,
        isBundle: false,
        className: 'border-2 border-primary rounded-lg p-4',
        onChange: (_quantity: number) => {
            // Intentionally empty for story testing
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Test that quantity input shows correct value
        const quantityInput = within(canvasElement).getByDisplayValue('1');
        void expect(quantityInput).toBeInTheDocument();

        // Test that increment and decrement buttons are present
        const incrementButton = within(canvasElement).getByRole('button', { name: /increment quantity for/i });
        const decrementButton = within(canvasElement).getByRole('button', { name: /decrement quantity for/i });
        void expect(incrementButton).toBeInTheDocument();
        void expect(decrementButton).toBeInTheDocument();

        // When value is 1 and min=1, decrement button should be disabled
        // Increment button is enabled
        void expect(incrementButton).not.toBeDisabled();
        void expect(decrementButton).toBeDisabled();
    },
};
