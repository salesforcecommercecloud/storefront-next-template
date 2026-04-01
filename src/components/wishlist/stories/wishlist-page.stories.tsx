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
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import type { ShopperCustomers, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { WishlistPageContent, WishlistSkeleton } from '../wishlist-page';
import { masterProduct } from '@/components/__mocks__/master-variant-product';
import { standardProd } from '@/components/__mocks__/standard-product-2';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { CurrencyProvider } from '@/providers/currency';
import { mockConfig } from '@/test-utils/config';

// -- Mock product data --

const outOfStockProduct: ShopperProducts.schemas['Product'] = {
    ...standardProd,
    id: 'out-of-stock-prod',
    name: 'Vintage Leather Bag',
    inventory: {
        ats: 0,
        backorderable: false,
        id: 'inventory_m',
        orderable: false,
        preorderable: false,
        stockLevel: 0,
    },
};

const onSaleProduct: ShopperProducts.schemas['Product'] = {
    ...standardProd,
    id: 'on-sale-prod',
    name: 'Weekend Travel Duffel',
    price: 49.99,
    pricePerUnit: 49.99,
    tieredPrices: [
        { price: 49.99, pricebook: 'usd-m-sale-prices', quantity: 1 },
        { price: 99.99, pricebook: 'usd-m-list-prices', quantity: 1 },
    ],
};

// -- Wishlist items --

const variantWishlistItem: ShopperCustomers.schemas['CustomerProductListItem'] = {
    id: 'item-variant',
    productId: '640188017041M',
    priority: 0,
    public: false,
    quantity: 1,
};

const standardWishlistItem: ShopperCustomers.schemas['CustomerProductListItem'] = {
    id: 'item-standard',
    productId: standardProd.id,
    priority: 0,
    public: false,
    quantity: 1,
};

const outOfStockWishlistItem: ShopperCustomers.schemas['CustomerProductListItem'] = {
    id: 'item-out-of-stock',
    productId: 'out-of-stock-prod',
    priority: 0,
    public: false,
    quantity: 1,
};

const onSaleWishlistItem: ShopperCustomers.schemas['CustomerProductListItem'] = {
    id: 'item-on-sale',
    productId: 'on-sale-prod',
    priority: 0,
    public: false,
    quantity: 1,
};

// -- Products map --

const productsByProductId: Record<string, ShopperProducts.schemas['Product']> = {
    '640188017041M': masterProduct,
    [standardProd.id]: standardProd,
    'out-of-stock-prod': outOfStockProduct,
    'on-sale-prod': onSaleProduct,
};

// -- Meta --

const meta: Meta<typeof WishlistPageContent> = {
    title: 'ACCOUNT/Wishlist Page',
    component: WishlistPageContent,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
Full client-side content for the My Wishlist page.

**Features:**
- Displays saved wishlist items with sort and filter controls
- Sort by: Recently Added, Name (A-Z), Price Low→High, Price High→Low
- Filter by: All Items, In Stock, Out of Stock, On Sale
- Optimistic item removal with sessionStorage persistence
- Empty state with heart icon when no items saved
- "No items match" message when active filter excludes all items
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <CurrencyProvider value="USD">
                    <Story />
                </CurrencyProvider>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof WishlistPageContent>;

// -- Stories --

export const Default: Story = {
    name: 'Default (mixed items)',
    args: {
        items: [variantWishlistItem, standardWishlistItem, outOfStockWishlistItem, onSaleWishlistItem],
        productsByProductId,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Page header
        await expect(canvas.getByRole('heading', { level: 1 })).toBeInTheDocument();

        // Sort and filter controls
        const selects = canvas.getAllByRole('combobox');
        await expect(selects).toHaveLength(2);
        await expect(selects[0]).toHaveValue('recently-added');
        await expect(selects[1]).toHaveValue('all');

        // All four items render
        await expect(canvas.getByText(masterProduct.name as string)).toBeInTheDocument();
        await expect(canvas.getByText(standardProd.name as string)).toBeInTheDocument();
        await expect(canvas.getByText('Vintage Leather Bag')).toBeInTheDocument();
        await expect(canvas.getByText('Weekend Travel Duffel')).toBeInTheDocument();
    },
};

export const Empty: Story = {
    name: 'Empty wishlist',
    args: {
        items: [],
        productsByProductId: {},
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Empty state heart icon (svg)
        await expect(canvas.getByRole('heading', { level: 3 })).toBeInTheDocument();

        // No sort/filter controls
        await expect(canvas.queryAllByRole('combobox')).toHaveLength(0);
    },
};

export const SingleItem: Story = {
    name: 'Single item',
    args: {
        items: [standardWishlistItem],
        productsByProductId: { [standardProd.id]: standardProd },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText(standardProd.name as string)).toBeInTheDocument();
        // Sort/filter still present for a single item
        await expect(canvas.getAllByRole('combobox')).toHaveLength(2);
    },
};

// -- Skeleton story --

const skeletonMeta: Meta<typeof WishlistSkeleton> = {
    title: 'ACCOUNT/Wishlist Page/Skeleton',
    component: WishlistSkeleton,
    tags: ['autodocs'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'Loading skeleton displayed while product details stream from the server.',
            },
        },
    },
};

// Export skeleton as a named story under the same file
// Storybook only uses the default export's meta, so Skeleton is grouped under the main title
export const Skeleton: StoryObj<typeof WishlistSkeleton> = {
    name: 'Skeleton',
    render: () => <WishlistSkeleton />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Skeleton renders the page heading
        await expect(canvas.getByRole('heading', { level: 1 })).toBeInTheDocument();
    },
};

// Suppress unused variable warning — skeletonMeta is defined for documentation reference
void skeletonMeta;
