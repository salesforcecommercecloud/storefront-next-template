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

import { CartInventoryErrorBanner } from '../cart-inventory-error-banner';
import type { CartInventoryIssue } from '@/lib/cart/inventory-validation';

const meta: Meta<typeof CartInventoryErrorBanner> = {
    title: 'CART/CartInventoryErrorBanner',
    component: CartInventoryErrorBanner,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
Displays a global error banner when cart items exceed available inventory. Shows a friendly message prompting users to adjust quantities or remove items before continuing to checkout.

## Features

- **Friendly Error Message**: Single-line message explaining the inventory issue
- **Destructive Variant**: Uses Alert destructive variant with AlertCircle icon
- **Accessibility**: Includes role="alert" and aria-live="polite" for screen readers
- **Conditional Rendering**: Returns null when no inventory issues exist

## Usage

Typically displayed above the checkout button when cart-wide inventory validation fails. The banner is linked to the disabled checkout button via aria-describedby.
                `,
            },
        },
    },
    argTypes: {
        issues: {
            control: 'object',
            description: 'Array of cart items exceeding inventory',
            table: {
                type: { summary: 'CartInventoryIssue[]' },
            },
        },
        className: {
            control: 'text',
            description: 'Optional CSS classes',
            table: {
                type: { summary: 'string' },
            },
        },
        id: {
            control: 'text',
            description:
                'ID for ARIA linking (use distinct IDs for mobile/desktop: cart-inventory-error-mobile, cart-inventory-error-desktop)',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: 'cart-inventory-error' },
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof CartInventoryErrorBanner>;

const mockIssues: CartInventoryIssue[] = [
    {
        itemId: 'item-1',
        productId: 'prod-1',
        productName: 'Striped Silk Tie',
        requestedQuantity: 10,
        availableStock: 3,
        isPickup: false,
    },
];

const mockMultipleIssues: CartInventoryIssue[] = [
    {
        itemId: 'item-1',
        productId: 'prod-1',
        productName: 'Striped Silk Tie',
        requestedQuantity: 10,
        availableStock: 3,
        isPickup: false,
    },
    {
        itemId: 'item-2',
        productId: 'prod-2',
        productName: 'Leather Wallet',
        requestedQuantity: 5,
        availableStock: 0,
        isPickup: false,
    },
];

const mockPickupIssue: CartInventoryIssue[] = [
    {
        itemId: 'item-1',
        productId: 'prod-1',
        productName: 'Striped Silk Tie',
        requestedQuantity: 8,
        availableStock: 2,
        isPickup: true,
        storeId: 'store-123',
    },
];

export const Default: Story = {
    args: {
        issues: mockIssues,
    },
    parameters: {
        docs: {
            description: {
                story: `
Default banner with a single inventory issue. Shows:

- AlertCircle icon
- Friendly error message: "Some items exceed available stock. Please adjust quantities or remove items to continue."
- Destructive variant styling (red/error colors)
- Accessible alert role and aria-live attributes
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const alert = canvasElement.querySelector('[role="alert"]');
        await expect(alert).toBeInTheDocument();
        await expect(alert).toHaveAttribute('aria-live', 'polite');
        const message = canvasElement.textContent;
        await expect(message).toContain('Some items exceed available stock');
    },
};

export const MultipleIssues: Story = {
    args: {
        issues: mockMultipleIssues,
    },
    parameters: {
        docs: {
            description: {
                story: `
Banner with multiple inventory issues. The message remains the same regardless of the number of items with issues — the banner doesn't list individual products, just prompts the user to adjust their cart.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const alert = canvasElement.querySelector('[role="alert"]');
        await expect(alert).toBeInTheDocument();
        const message = canvasElement.textContent;
        await expect(message).toContain('Some items exceed available stock');
    },
};

export const PickupInventoryIssue: Story = {
    args: {
        issues: mockPickupIssue,
    },
    parameters: {
        docs: {
            description: {
                story: `
Banner for a BOPIS (Buy Online Pick-up In Store) item exceeding store inventory. The message is the same for both delivery and pickup items — the banner doesn't distinguish between the two in its messaging.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const alert = canvasElement.querySelector('[role="alert"]');
        await expect(alert).toBeInTheDocument();
        const message = canvasElement.textContent;
        await expect(message).toContain('Some items exceed available stock');
    },
};

export const NoIssues: Story = {
    args: {
        issues: [],
    },
    parameters: {
        docs: {
            description: {
                story: `
When there are no inventory issues, the banner returns null and renders nothing. This ensures the banner only appears when there's an actual problem.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const alert = canvasElement.querySelector('[role="alert"]');
        await expect(alert).not.toBeInTheDocument();
    },
};

export const WithCustomClassName: Story = {
    args: {
        issues: mockIssues,
        className: 'mb-4',
    },
    parameters: {
        docs: {
            description: {
                story: `
Banner with custom className prop for additional spacing or styling. Useful when positioning the banner within the cart layout (e.g., adding bottom margin before the checkout button).
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const alert = canvasElement.querySelector('[role="alert"]');
        await expect(alert).toBeInTheDocument();
        await expect(alert).toHaveClass('mb-4');
    },
};

export const WithCustomId: Story = {
    args: {
        issues: mockIssues,
        id: 'custom-inventory-error',
    },
    parameters: {
        docs: {
            description: {
                story: `
Banner with custom ID for ARIA linking. The checkout button uses aria-describedby to link to this banner, creating an accessible relationship between the disabled button and the error message.
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const alert = canvasElement.querySelector('[role="alert"]');
        await expect(alert).toBeInTheDocument();
        await expect(alert).toHaveAttribute('id', 'custom-inventory-error');
    },
};
