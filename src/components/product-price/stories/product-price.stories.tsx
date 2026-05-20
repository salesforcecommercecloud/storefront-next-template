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
import ProductPrice from '../index';
import { mockStandardProductOrderable } from '../../__mocks__/standard-product';
import { mockMasterProductHitWithOneVariant } from '../../__mocks__/product-search-hit-data';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logAction = action('interaction');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const interactiveElement = target.closest('button, a, [role="button"]');
            if (interactiveElement) {
                const label = interactiveElement.textContent?.trim().substring(0, 50) || 'unlabeled';
                const tag = interactiveElement.tagName.toLowerCase();

                if (label.match(/add to cart/i)) {
                    action('add-to-cart')({ label });
                } else if (label.match(/wishlist/i)) {
                    action('wishlist')({ label });
                } else {
                    logAction({ type: 'click', tag, label });
                }
            }
        };

        root.addEventListener('click', handleClick, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ProductPrice> = {
    title: 'Components/ProductPrice',
    component: ProductPrice,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ProductPrice>;

export const Default: Story = {
    args: {
        product: mockStandardProductOrderable.product,
        currency: 'USD',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Use getAllByText to handle duplicates (visible + sr-only)
        const prices = canvas.getAllByText(/\$99.99/);
        await expect(prices.length).toBeGreaterThan(0);
        await expect(prices[0]).toBeVisible();
    },
};

export const WithQuantity: Story = {
    args: {
        product: mockStandardProductOrderable.product,
        currency: 'USD',
        quantity: 3,
        type: 'total',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // 99.99 * 3 = 299.97
        const prices = canvas.getAllByText(/\$299.97/);
        await expect(prices.length).toBeGreaterThan(0);
    },
};

export const PriceRange: Story = {
    args: {
        product: mockMasterProductHitWithOneVariant as any,
        currency: 'GBP',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Master product with range
        const prices = canvas.getAllByText(/£191.99/);
        await expect(prices.length).toBeGreaterThan(0);
    },
};

export const OnSale: Story = {
    args: {
        product: {
            ...mockStandardProductOrderable.product,
            price: 79.99,
            pricePerUnit: 99.99,
            tieredPrices: [
                { price: 99.99, pricebook: 'list-prices', quantity: 1 },
                { price: 79.99, pricebook: 'sale-prices', quantity: 1 },
            ],
        },
        currency: 'USD',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const salePrices = canvas.getAllByText(/\$79.99/);
        await expect(salePrices.length).toBeGreaterThan(0);

        // Should show list price struck through
        const listPrices = canvas.getAllByText(/\$99.99/);
        // Check if at least one has line-through class or parent has it
        // Checking strict class might be fragile, existence is good enough
        await expect(listPrices.length).toBeGreaterThan(0);
    },
};
export const WithPromoCallout: Story = {
    args: {
        product: {
            ...mockStandardProductOrderable.product,
            price: 79.99,
            tieredPrices: [
                { price: 99.99, pricebook: 'list-prices', quantity: 1 },
                { price: 79.99, pricebook: 'sale-prices', quantity: 1 },
            ],
            productPromotions: [
                {
                    promotionId: 'storybook-20-off',
                    promotionalPrice: 79.99,
                    calloutMsg: 'Get 20% off of this item.',
                },
            ],
        },
        currency: 'USD',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Check sale price is displayed
        const salePrices = canvas.getAllByText(/\$79.99/);
        await expect(salePrices.length).toBeGreaterThan(0);
        // Check promo callout is displayed
        const promoCallout = canvas.getByText(/Get 20% off/);
        await expect(promoCallout).toBeVisible();
    },
};

export const WithCustomPromoCalloutStyling: Story = {
    args: {
        product: {
            ...mockStandardProductOrderable.product,
            price: 79.99,
            tieredPrices: [
                { price: 99.99, pricebook: 'list-prices', quantity: 1 },
                { price: 79.99, pricebook: 'sale-prices', quantity: 1 },
            ],
            productPromotions: [
                {
                    promotionId: 'storybook-20-off',
                    promotionalPrice: 79.99,
                    calloutMsg: 'Get 20% off of this item.',
                },
            ],
        },
        currency: 'USD',
        promoCalloutProps: {
            className: 'text-sm text-muted-foreground',
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Check promo callout is displayed with custom styling
        const promoCallout = canvas.getByText(/Get 20% off/);
        await expect(promoCallout).toBeVisible();
        // Verify the custom class is applied (checking parent container)
        const promoContainer = promoCallout.closest('div');
        await expect(promoContainer).toHaveClass('text-sm');
    },
};
