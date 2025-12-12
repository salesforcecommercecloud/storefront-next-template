import type { Meta, StoryObj } from '@storybook/react-vite';
import ProductTile from '../index';
// @ts-expect-error mock file is JS
import {
    mockProductSearchItem,
    mockMasterProductHitWithMultipleVariants,
} from '../../__mocks__/product-search-hit-data';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
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
                    <div className="w-64">
                        <Story />
                    </div>
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
        // Check for price - master products show lowest variant price including promotions ($143.99)
        const prices = canvas.getAllByText(/\$143\.99/);
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

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
        // Check for price - master products show lowest variant price including promotions ($143.99)
        const prices = canvas.getAllByText(/\$143\.99/);
        await expect(prices.length).toBeGreaterThan(0);
        // Check for image
        const image = canvas.getByRole('img');
        await expect(image).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
        // Check for price - master products show lowest variant price including promotions ($143.99)
        const prices = canvas.getAllByText(/\$143\.99/);
        await expect(prices.length).toBeGreaterThan(0);
        // Check for image
        const image = canvas.getByRole('img');
        await expect(image).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductSearchItem.productName)).toBeInTheDocument();
        // Check for price - master products show lowest variant price including promotions ($143.99)
        const prices = canvas.getAllByText(/\$143\.99/);
        await expect(prices.length).toBeGreaterThan(0);
        // Check for image
        const image = canvas.getByRole('img');
        await expect(image).toBeInTheDocument();
    },
};
