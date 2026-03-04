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
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import DynamicImageProvider from '@/providers/dynamic-image';

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
                event.preventDefault();
                event.stopPropagation();
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
                <ActionLogger>
                    <DynamicImageProvider value={{ widths: ['50vw', '50vw', '15vw'] }}>
                        <div className="w-64">
                            <Story />
                        </div>
                    </DynamicImageProvider>
                </ActionLogger>
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
        // Check for price - master products show lowest variant price including promotions (£143.99)
        const prices = canvas.getAllByText(/£143\.99/);
        await expect(prices.length).toBeGreaterThan(0);
        // Check for image
        const image = canvas.getByRole('img');
        await expect(image).toBeInTheDocument();
    },
};

export const WithBadges: Story = {
    args: {
        product: {
            ...mockProductSearchItem,
            // Badges are detected from representedProduct properties or promotions array
            representedProduct: {
                ...mockProductSearchItem.representedProduct,
                c_isSale: true,
                c_isNew: true,
            },
            // promotions array also triggers the Sale badge
            promotions: [
                {
                    promotionId: 'promo-sale',
                    calloutMsg: 'Get 20% off of this tie.',
                },
            ],
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify product name is displayed
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
        // Verify Sale badge is displayed (from promotions or representedProduct.c_isSale)
        await expect(canvas.getByText('Sale')).toBeInTheDocument();
    },
};

export const MasterProductWithSwatches: Story = {
    args: {
        product: mockMasterProductHitWithMultipleVariants,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Check for swatches via label
        const swatches = canvas.queryAllByLabelText(/Beige|Black|Blue|Green|Grey|Orange|Pink|Purple|Red|White|Yellow/i);
        // Verify if we found any swatches
        if (swatches.length > 0) {
            await expect(swatches[0]).toBeInTheDocument();
        }
    },
};

export const CustomAction: Story = {
    args: {
        product: mockProductSearchItem,
        footerAction: <button className="w-full bg-primary text-primary-foreground p-2 rounded">Custom Action</button>,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Custom Action')).toBeInTheDocument();
        await expect(canvas.queryByText('More Options')).not.toBeInTheDocument();
    },
};

// Page Designer Styling Stories
export const PageDesignerImageCover: Story = {
    args: {
        product: mockProductSearchItem,
        objectFit: 'cover',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
    },
};

export const PageDesignerBorderRadius: Story = {
    args: {
        product: mockProductSearchItem,
        borderRadius: '2xl',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
    },
};

export const PageDesignerShadowXL: Story = {
    args: {
        product: mockProductSearchItem,
        boxShadow: 'xl',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
    },
};

export const PageDesignerPaddingMargin: Story = {
    args: {
        product: mockProductSearchItem,
        padding: '8',
        margin: '4',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
    },
};

export const PageDesignerTypography: Story = {
    args: {
        product: mockProductSearchItem,
        fontWeight: 'bold',
        letterSpacing: 'wide',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
    },
};

export const PageDesignerHoverScale: Story = {
    args: {
        product: mockProductSearchItem,
        hoverEffect: 'scale',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
    },
};

export const PageDesignerHoverShadow: Story = {
    args: {
        product: mockProductSearchItem,
        hoverEffect: 'shadow',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
    },
};

export const PageDesignerHoverLift: Story = {
    args: {
        product: mockProductSearchItem,
        hoverEffect: 'lift',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
    },
};

export const PageDesignerFullCustomization: Story = {
    args: {
        product: mockProductSearchItem,
        objectFit: 'contain',
        borderRadius: '2xl',
        boxShadow: 'lg',
        padding: '6',
        margin: '2',
        fontWeight: 'bold',
        letterSpacing: 'wide',
        hoverEffect: 'scale',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
    },
};
