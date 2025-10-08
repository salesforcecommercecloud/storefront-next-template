/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ShopperProductsTypes } from 'commerce-sdk-isomorphic';
import { createRoutesStub } from 'react-router';
import ProductInfo from './product-info';

/**
 * The ProductInfo component displays comprehensive product details on the Product Detail Page (PDP).
 * It handles product variations, inventory status, pricing, and cart/wishlist actions.
 */
const meta: Meta<typeof ProductInfo> = {
    title: 'Components/Product View/Product Info',
    component: ProductInfo,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
The Product Info component is the main information panel on the Product Detail Page (PDP).

**Features:**
- **Product Details**: Name, description, and pricing
- **Variation Selection**: Color swatches and size selectors
- **Inventory Status**: Real-time stock information with visual badges
- **Quantity Picker**: Adjustable quantity with stock validation
- **Action Buttons**: Add to cart and wishlist functionality
- **Product Types**: Supports standard products, variants, sets, and bundles

**Variation Handling:**
- URL-aware swatch selection
- Automatic variant detection
- Disabled state for out-of-stock variants

**Inventory States:**
- In Stock (green badge)
- Pre-Order (blue badge)
- Back Order (orange badge)
- Out of Stock (red badge)
                `,
            },
        },
    },
    decorators: [
        (Story) => {
            const Stub = createRoutesStub([
                {
                    path: '/product/:productId',
                    Component: () => <Story />,
                },
            ]);
            return <Stub initialEntries={['/product/test-product']} />;
        },
    ],
    argTypes: {
        product: {
            description: 'Product data including inventory, variations, and pricing',
            control: false,
        },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Helper function to create mock product with variations
const createMockProduct = (overrides?: Partial<ShopperProductsTypes.Product>): ShopperProductsTypes.Product => ({
    id: 'test-product-123',
    name: 'Premium Cotton T-Shirt',
    shortDescription: 'Soft, breathable cotton t-shirt perfect for everyday wear',
    price: 29.99,
    priceMax: 29.99,
    inventory: {
        id: 'inv-123',
        ats: 50,
        orderable: true,
        backorderable: false,
        preorderable: false,
    },
    variationAttributes: [
        {
            id: 'color',
            name: 'Color',
            values: [
                { value: 'red', name: 'Red', orderable: true },
                { value: 'blue', name: 'Blue', orderable: true },
                { value: 'green', name: 'Green', orderable: true },
            ],
        },
        {
            id: 'size',
            name: 'Size',
            values: [
                { value: 'S', name: 'Small', orderable: true },
                { value: 'M', name: 'Medium', orderable: true },
                { value: 'L', name: 'Large', orderable: true },
                { value: 'XL', name: 'Extra Large', orderable: true },
            ],
        },
    ],
    imageGroups: [
        {
            viewType: 'swatch',
            variationAttributes: [
                {
                    id: 'color',
                    values: [{ value: 'red', name: 'Red' }],
                },
            ],
            images: [
                {
                    link: 'https://placehold.co/50x50/ff0000/ffffff?text=R',
                    disBaseLink: 'https://placehold.co/50x50/ff0000/ffffff?text=R',
                    alt: 'Red swatch',
                },
            ],
        },
        {
            viewType: 'swatch',
            variationAttributes: [
                {
                    id: 'color',
                    values: [{ value: 'blue', name: 'Blue' }],
                },
            ],
            images: [
                {
                    link: 'https://placehold.co/50x50/0000ff/ffffff?text=B',
                    disBaseLink: 'https://placehold.co/50x50/0000ff/ffffff?text=B',
                    alt: 'Blue swatch',
                },
            ],
        },
        {
            viewType: 'swatch',
            variationAttributes: [
                {
                    id: 'color',
                    values: [{ value: 'green', name: 'Green' }],
                },
            ],
            images: [
                {
                    link: 'https://placehold.co/50x50/00ff00/ffffff?text=G',
                    disBaseLink: 'https://placehold.co/50x50/00ff00/ffffff?text=G',
                    alt: 'Green swatch',
                },
            ],
        },
    ],
    ...overrides,
});

/**
 * Standard Product with Variations - Default state showing color and size options
 */
export const WithVariations: Story = {
    args: {
        product: createMockProduct(),
    },
};

/**
 * Simple Product - No variations, ready to add to cart immediately
 */
export const SimpleProduct: Story = {
    args: {
        product: createMockProduct({
            name: 'Classic White Sneakers',
            shortDescription: 'Timeless white sneakers for any occasion',
            price: 79.99,
            priceMax: 79.99,
            variationAttributes: [],
            imageGroups: [],
        }),
    },
};

/**
 * Product with Price Range - Shows "From" pricing for products with variants at different prices
 */
export const WithPriceRange: Story = {
    args: {
        product: createMockProduct({
            price: 29.99,
            priceMax: 49.99,
        }),
    },
};

/**
 * In Stock - Green badge indicating product is available
 */
export const InStock: Story = {
    args: {
        product: createMockProduct({
            variationAttributes: [],
            inventory: {
                id: 'inv-123',
                ats: 50,
                orderable: true,
                backorderable: false,
                preorderable: false,
            },
        }),
    },
};

/**
 * Low Stock - Product with limited inventory
 */
export const LowStock: Story = {
    args: {
        product: createMockProduct({
            variationAttributes: [],
            inventory: {
                id: 'inv-123',
                ats: 3,
                orderable: true,
                backorderable: false,
                preorderable: false,
            },
        }),
    },
};

/**
 * Pre-Order - Blue badge for pre-orderable items
 */
export const PreOrder: Story = {
    args: {
        product: createMockProduct({
            name: 'Upcoming Release Sneakers',
            shortDescription: 'Pre-order now for exclusive early access',
            variationAttributes: [],
            inventory: {
                id: 'inv-123',
                ats: 0,
                orderable: true,
                backorderable: false,
                preorderable: true,
            },
        }),
    },
};

/**
 * Back Order - Orange badge for back-orderable items
 */
export const BackOrder: Story = {
    args: {
        product: createMockProduct({
            name: 'Popular Denim Jacket',
            shortDescription: 'Currently on back order, ships in 2-3 weeks',
            variationAttributes: [],
            inventory: {
                id: 'inv-123',
                ats: 0,
                orderable: true,
                backorderable: true,
                preorderable: false,
            },
        }),
    },
};

/**
 * Out of Stock - Red badge when product is unavailable
 */
export const OutOfStock: Story = {
    args: {
        product: createMockProduct({
            name: 'Sold Out Limited Edition',
            shortDescription: 'This item is currently out of stock',
            variationAttributes: [],
            inventory: {
                id: 'inv-123',
                ats: 0,
                orderable: false,
                backorderable: false,
                preorderable: false,
            },
        }),
    },
};

/**
 * Product Set - Special handling for product sets (no add to cart)
 */
export const ProductSet: Story = {
    args: {
        product: createMockProduct({
            name: 'Summer Essentials Set',
            shortDescription: 'Complete summer wardrobe collection',
            type: { set: true },
            variationAttributes: [],
        }),
    },
};

/**
 * Product Bundle - Special handling for product bundles (no add to cart)
 */
export const ProductBundle: Story = {
    args: {
        product: createMockProduct({
            name: 'Workout Bundle',
            shortDescription: 'Everything you need for your fitness journey',
            type: { bundle: true },
            variationAttributes: [],
        }),
    },
};

/**
 * With Disabled Variants - Some color options are out of stock
 */
export const WithDisabledVariants: Story = {
    args: {
        product: createMockProduct({
            variationAttributes: [
                {
                    id: 'color',
                    name: 'Color',
                    values: [
                        { value: 'red', name: 'Red', orderable: true },
                        { value: 'blue', name: 'Blue', orderable: false }, // Out of stock
                        { value: 'green', name: 'Green', orderable: true },
                    ],
                },
                {
                    id: 'size',
                    name: 'Size',
                    values: [
                        { value: 'S', name: 'Small', orderable: true },
                        { value: 'M', name: 'Medium', orderable: false }, // Out of stock
                        { value: 'L', name: 'Large', orderable: true },
                    ],
                },
            ],
        }),
    },
};

/**
 * Without Short Description - Product with minimal information
 */
export const WithoutDescription: Story = {
    args: {
        product: createMockProduct({
            shortDescription: undefined,
            variationAttributes: [],
        }),
    },
};

/**
 * Color Only Variations - Product with only color variations
 */
export const ColorOnlyVariations: Story = {
    args: {
        product: createMockProduct({
            variationAttributes: [
                {
                    id: 'color',
                    name: 'Color',
                    values: [
                        { value: 'red', name: 'Red', orderable: true },
                        { value: 'blue', name: 'Blue', orderable: true },
                        { value: 'green', name: 'Green', orderable: true },
                    ],
                },
            ],
        }),
    },
};

/**
 * Size Only Variations - Product with only size variations
 */
export const SizeOnlyVariations: Story = {
    args: {
        product: createMockProduct({
            variationAttributes: [
                {
                    id: 'size',
                    name: 'Size',
                    values: [
                        { value: 'S', name: 'Small', orderable: true },
                        { value: 'M', name: 'Medium', orderable: true },
                        { value: 'L', name: 'Large', orderable: true },
                        { value: 'XL', name: 'Extra Large', orderable: true },
                    ],
                },
            ],
            imageGroups: [],
        }),
    },
};

/**
 * Long Product Name - Tests layout with lengthy product names
 */
export const LongProductName: Story = {
    args: {
        product: createMockProduct({
            name: 'Ultra Premium Organic Cotton Sustainable Eco-Friendly Long Sleeve Performance T-Shirt',
            variationAttributes: [],
        }),
    },
};

/**
 * Long Description - Tests layout with lengthy descriptions
 */
export const LongDescription: Story = {
    args: {
        product: createMockProduct({
            shortDescription:
                'This premium cotton t-shirt is crafted from the finest organic materials, designed for maximum comfort and durability. Perfect for everyday wear, special occasions, or athletic activities.',
            variationAttributes: [],
        }),
    },
};
