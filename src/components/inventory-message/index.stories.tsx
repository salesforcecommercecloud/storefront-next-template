/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import InventoryMessage from './index';

/**
 * The InventoryMessage component displays inventory status messages for products.
 * It supports four different states: In Stock, Pre-Order, Back Order, and Out of Stock.
 * Each state has its own color scheme and messaging.
 */
const meta: Meta<typeof InventoryMessage> = {
    title: 'Components/Inventory Message',
    component: InventoryMessage,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
The Inventory Message component displays real-time inventory status for products on the Product Detail Page (PDP).

**Features:**
- **In Stock**: Green badge indicating product availability
- **Pre-Order**: Blue badge for pre-orderable items
- **Back Order**: Orange badge for back-orderable items  
- **Out of Stock**: Red badge when product is unavailable

The component uses variant inventory when available, falling back to product-level inventory.
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <div className="p-8">
                <Story />
            </div>
        ),
    ],
    argTypes: {
        product: {
            description: 'Product data containing inventory information',
            control: false,
        },
        currentVariant: {
            description: 'Current variant if product has variations',
            control: false,
        },
        className: {
            description: 'Additional CSS classes to apply',
            control: 'text',
        },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Helper function to create mock product data
const createMockProduct = (inventory: Partial<ShopperProductsTypes.Inventory>): ShopperProductsTypes.Product => ({
    id: 'test-product-123',
    name: 'Test Product',
    inventory: inventory as ShopperProductsTypes.Inventory,
});

// Helper function to create mock variant data
const createMockVariant = (inventory: Partial<ShopperProductsTypes.Inventory>): ShopperProductsTypes.Variant => ({
    productId: 'test-variant-123',
    inventory: inventory as ShopperProductsTypes.Inventory,
});

/**
 * In Stock - Green badge indicating product is available for immediate purchase
 */
export const InStock: Story = {
    args: {
        product: createMockProduct({
            orderable: true,
            ats: 10,
            backorderable: false,
            preorderable: false,
        }),
    },
};

/**
 * In Stock with High Inventory - Same as in stock but with higher quantity
 */
export const InStockHighInventory: Story = {
    args: {
        product: createMockProduct({
            orderable: true,
            ats: 100,
            backorderable: false,
            preorderable: false,
        }),
    },
};

/**
 * Pre-Order - Blue badge indicating item is available for pre-order
 */
export const PreOrder: Story = {
    args: {
        product: createMockProduct({
            orderable: true,
            preorderable: true,
            ats: 0,
            backorderable: false,
        }),
    },
};

/**
 * Back Order - Orange badge indicating item can be back-ordered
 */
export const BackOrder: Story = {
    args: {
        product: createMockProduct({
            orderable: true,
            backorderable: true,
            ats: 0,
            preorderable: false,
        }),
    },
};

/**
 * Out of Stock - Red badge indicating product is unavailable
 */
export const OutOfStock: Story = {
    args: {
        product: createMockProduct({
            orderable: false,
            ats: 0,
            backorderable: false,
            preorderable: false,
        }),
    },
};

/**
 * Out of Stock with Product Name - Shows product name in the message
 */
export const OutOfStockWithName: Story = {
    args: {
        product: {
            ...createMockProduct({
                orderable: false,
                ats: 0,
                backorderable: false,
                preorderable: false,
            }),
            name: 'Blue Cotton T-Shirt',
        },
    },
};

/**
 * With Variant - Uses variant inventory instead of product inventory
 */
export const WithVariant: Story = {
    args: {
        product: createMockProduct({
            orderable: true,
            ats: 100,
            backorderable: false,
            preorderable: false,
        }),
        currentVariant: createMockVariant({
            orderable: false,
            ats: 0,
            backorderable: false,
            preorderable: false,
        }),
    },
};

/**
 * Variant Pre-Order - Variant is available for pre-order while product shows in stock
 */
export const VariantPreOrder: Story = {
    args: {
        product: createMockProduct({
            orderable: true,
            ats: 50,
            backorderable: false,
            preorderable: false,
        }),
        currentVariant: createMockVariant({
            orderable: true,
            preorderable: true,
            ats: 0,
            backorderable: false,
        }),
    },
};

/**
 * Variant Back Order - Variant is available for back-order
 */
export const VariantBackOrder: Story = {
    args: {
        product: createMockProduct({
            orderable: true,
            ats: 50,
            backorderable: false,
            preorderable: false,
        }),
        currentVariant: createMockVariant({
            orderable: true,
            backorderable: true,
            ats: 0,
            preorderable: false,
        }),
    },
};

/**
 * No Inventory Data - Component returns null when inventory data is missing
 */
export const NoInventoryData: Story = {
    args: {
        product: {
            id: 'test-product-no-inventory',
            name: 'Product Without Inventory',
        } as ShopperProductsTypes.Product,
    },
};

/**
 * Custom Class Name - Demonstrates adding custom styling
 */
export const WithCustomClassName: Story = {
    args: {
        product: createMockProduct({
            orderable: true,
            ats: 10,
            backorderable: false,
            preorderable: false,
        }),
        className: 'shadow-lg',
    },
};

/**
 * All States Side by Side - Visual comparison of all inventory states
 */
export const AllStates: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="text-sm font-semibold mb-2">In Stock</h3>
                <InventoryMessage
                    product={createMockProduct({
                        orderable: true,
                        ats: 10,
                        backorderable: false,
                        preorderable: false,
                    })}
                />
            </div>
            <div>
                <h3 className="text-sm font-semibold mb-2">Pre-Order</h3>
                <InventoryMessage
                    product={createMockProduct({
                        orderable: true,
                        preorderable: true,
                        ats: 0,
                        backorderable: false,
                    })}
                />
            </div>
            <div>
                <h3 className="text-sm font-semibold mb-2">Back Order</h3>
                <InventoryMessage
                    product={createMockProduct({
                        orderable: true,
                        backorderable: true,
                        ats: 0,
                        preorderable: false,
                    })}
                />
            </div>
            <div>
                <h3 className="text-sm font-semibold mb-2">Out of Stock</h3>
                <InventoryMessage
                    product={{
                        ...createMockProduct({
                            orderable: false,
                            ats: 0,
                            backorderable: false,
                            preorderable: false,
                        }),
                        name: 'Premium Sneakers',
                    }}
                />
            </div>
        </div>
    ),
};
