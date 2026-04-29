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
import ProductTile from '../index';
import {
    mockProductSearchItem,
    mockMasterProductHitWithMultipleVariants,
    // @ts-expect-error mock file is JS
} from '../../__mocks__/product-search-hit-data';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig, mockLocale } from '@/test-utils/config';
import { expect, waitFor, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';

const mockSite = mockConfig.commerce.sites[0];
import DynamicImageProvider from '@/providers/dynamic-image';
import { ProductTileProvider } from '../context';

const meta: Meta<typeof ProductTile> = {
    title: 'Components/ProductTile',
    component: ProductTile,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <SiteProvider site={mockSite} locale={mockLocale} language="en-GB" currency="GBP">
                    <DynamicImageProvider value={{ widths: ['50vw', '50vw', '15vw'] }}>
                        <ProductTileProvider>
                            <div className="w-64">
                                <Story />
                            </div>
                        </ProductTileProvider>
                    </DynamicImageProvider>
                </SiteProvider>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ProductTile>;

export const Default: Story = {
    args: {
        product: mockProductSearchItem,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
        const image = canvas.getByRole('img');
        await expect(image).toBeInTheDocument();
    },
};

export const WithBadges: Story = {
    args: {
        product: {
            ...mockProductSearchItem,
            representedProduct: {
                ...mockProductSearchItem.representedProduct,
                c_isSale: true,
                c_isNew: true,
            },
            promotions: [
                {
                    promotionId: 'promo-sale',
                    calloutMsg: 'Get 20% off.',
                },
            ],
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
        await expect(canvas.getByText('Sale')).toBeInTheDocument();
    },
};

export const WithSwatches: Story = {
    args: {
        product: mockMasterProductHitWithMultipleVariants,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockMasterProductHitWithMultipleVariants.productName)).toBeInTheDocument();

        // Swatches are decorative/visual-only (aria-hidden) — verify via DOM queries
        let swatchContainer: Element | null = null;
        await waitFor(() => {
            swatchContainer = canvasElement.querySelector('[aria-label="Available colors"]');
            expect(swatchContainer).not.toBeNull();
        });
        await expect(swatchContainer).not.toBeNull();

        // Both colour swatch links are present
        const swatchLinks = swatchContainer!.querySelectorAll('a');
        await expect(swatchLinks.length).toBe(2);

        // Each swatch renders its image (both colours have swatch imageGroups in the mock)
        const swatchImages = swatchContainer!.querySelectorAll('img');
        await expect(swatchImages.length).toBe(2);

        // No overflow indicator — 2 swatches ≤ default maxSwatches (5)
        await expect(canvasElement.querySelector('[title*=" more"]')).toBeNull();
    },
};

export const WithSwatchOverflow: Story = {
    args: {
        product: mockMasterProductHitWithMultipleVariants,
        maxSwatches: 1,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        let swatchContainer: Element | null = null;
        await waitFor(() => {
            swatchContainer = canvasElement.querySelector('[aria-label="Available colors"]');
            expect(swatchContainer).not.toBeNull();
        });
        await expect(swatchContainer).not.toBeNull();

        // Only 1 colour swatch link (exclude the overflow "+N more" link)
        const swatchLinks = swatchContainer!.querySelectorAll('a[aria-label*=" in "]');
        await expect(swatchLinks.length).toBe(1);

        // Overflow indicator shows "+1" for the remaining colour
        const overflow = canvasElement.querySelector('[title="+1 more"]');
        await expect(overflow).not.toBeNull();
    },
};

export const WithPickupAvailable: Story = {
    args: {
        product: mockProductSearchItem,
        showPickupAvailable: true,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
        // Pickup indicator is visual-only (aria-hidden) — verify via DOM
        const pickupIndicator = canvasElement.querySelector('[data-testid="pickup-available-indicator"]');
        await expect(pickupIndicator).not.toBeNull();
    },
};

export const WithWishlist: Story = {
    args: {
        product: mockProductSearchItem,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // WishlistButton is inside aria-hidden="true" (visual/mouse only — keyboard reaches wishlist via PDP)
        const wishlistButton = canvasElement.querySelector('[aria-label="Add to Wishlist"]');
        await expect(wishlistButton).not.toBeNull();
    },
};

export const WithQuickAdd: Story = {
    args: {
        product: mockProductSearchItem,
        quickAddLabel: 'Quick Add',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
        await expect(canvas.getByText('Quick Add')).toBeInTheDocument();
    },
};

export const WithStoreName: Story = {
    args: {
        product: mockProductSearchItem,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Store name comes from config.global.branding.name ('Test Store').
        await expect(canvas.getByText('Test Store')).toBeInTheDocument();
    },
};

export const WithTopCategory: Story = {
    args: {
        product: mockProductSearchItem,
        topCategoryName: 'Men',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // DOM text is 'Men'; uppercase is applied via CSS class
        await expect(canvas.getByText('Men')).toBeInTheDocument();
    },
};

export const FullFeatured: Story = {
    args: {
        product: {
            ...mockMasterProductHitWithMultipleVariants,
            representedProduct: {
                ...mockMasterProductHitWithMultipleVariants?.representedProduct,
                c_isNew: true,
            },
        },
        showPickupAvailable: true,
        quickAddLabel: 'Quick Add',
        topCategoryName: 'Men',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockMasterProductHitWithMultipleVariants.productName)).toBeInTheDocument();
        // Pickup indicator is inside aria-hidden="true" — query via testid
        const pickupIndicator = canvasElement.querySelector('[data-testid="pickup-available-indicator"]');
        await expect(pickupIndicator).not.toBeNull();
        await expect(canvas.getByText('Test Store')).toBeInTheDocument();
        await expect(canvas.getByText('Men')).toBeInTheDocument();
    },
};
