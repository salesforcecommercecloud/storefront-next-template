import type { Meta, StoryObj } from '@storybook/react-vite';
import ProductItem from '../index';
// @ts-expect-error mock file is JS
import { mockStandardProductOrderable } from '../../__mocks__/standard-product';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';

// We need to mock useItemFetcherLoading.
// Since we can't easily mock imports in stories without test-runner hooks,
// we will assume it returns false by default (which it should if no fetchers are active).

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

const meta: Meta<typeof ProductItem> = {
    title: 'Components/ProductItem',
    component: ProductItem,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
    },
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <ActionLogger>
                    <div className="max-w-2xl mx-auto">
                        <Story />
                    </div>
                </ActionLogger>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ProductItem>;

// Create a mock product item from the standard product mock
const mockProductItem = {
    ...mockStandardProductOrderable.product,
    itemId: 'test-item-id',
    quantity: 1,
    price: 99.99,
    priceAfterItemDiscount: 99.99,
    productName: mockStandardProductOrderable.product.name,
    shortDescription: mockStandardProductOrderable.product.shortDescription,
};

export const Default: Story = {
    args: {
        productItem: mockProductItem,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductItem.productName)).toBeInTheDocument();
        const prices = canvas.getAllByText(/\$99.99/);
        await expect(prices.length).toBeGreaterThan(0);
    },
};

export const SummaryVariant: Story = {
    args: {
        productItem: mockProductItem,
        displayVariant: 'summary',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText(mockProductItem.productName)).toBeInTheDocument();
        // Summary variant is more compact
    },
};

export const WithActions: Story = {
    args: {
        productItem: mockProductItem,
        primaryAction: () => <button className="text-destructive">Remove</button>,
        secondaryActions: () => <button className="text-primary">Edit</button>,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Remove')).toBeInTheDocument();
        await expect(canvas.getByText('Edit')).toBeInTheDocument();
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
        await expect(canvas.getByText(mockProductItem.productName)).toBeInTheDocument();
        const prices = canvas.getAllByText(/\$99.99/);
        await expect(prices.length).toBeGreaterThan(0);
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
        await expect(canvas.getByText(mockProductItem.productName)).toBeInTheDocument();
        const prices = canvas.getAllByText(/\$99.99/);
        await expect(prices.length).toBeGreaterThan(0);
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
        await expect(canvas.getByText(mockProductItem.productName)).toBeInTheDocument();
        const prices = canvas.getAllByText(/\$99.99/);
        await expect(prices.length).toBeGreaterThan(0);
    },
};
