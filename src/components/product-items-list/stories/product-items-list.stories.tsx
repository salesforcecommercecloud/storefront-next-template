import type { Meta, StoryObj } from '@storybook/react-vite';
import ProductItemsList from '../index';
// @ts-expect-error mock file is JS
import { mockStandardProductOrderable } from '../../__mocks__/standard-product';
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

const meta: Meta<typeof ProductItemsList> = {
    title: 'Components/ProductItemsList',
    component: ProductItemsList,
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
type Story = StoryObj<typeof ProductItemsList>;

// Mock basket items
const basketItems = [
    {
        itemId: 'item-1',
        productId: mockStandardProductOrderable.product.id,
        quantity: 1,
        price: 99.99,
        productName: mockStandardProductOrderable.product.name,
        priceAfterItemDiscount: 99.99,
        image: {
            alt: 'Product Image',
            url: 'https://via.placeholder.com/150',
        },
    },
    {
        itemId: 'item-2',
        productId: mockStandardProductOrderable.product.id, // Reusing same product for simplicity
        quantity: 2,
        price: 99.99,
        productName: mockStandardProductOrderable.product.name,
        priceAfterItemDiscount: 99.99,
    },
] as any[];

const productsByItemId = {
    'item-1': mockStandardProductOrderable.product,
    'item-2': mockStandardProductOrderable.product,
} as any;

export const Default: Story = {
    args: {
        productItems: basketItems,
        productsByItemId,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Should have 2 items
        const items = canvas.getAllByTestId(/sf-product-item-/);
        await expect(items).toHaveLength(2);
    },
};

export const SummaryVariant: Story = {
    args: {
        productItems: basketItems,
        productsByItemId,
        variant: 'summary',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const items = canvas.getAllByTestId(/sf-product-item-summary-/);
        await expect(items).toHaveLength(2);
    },
};

export const WithActions: Story = {
    args: {
        productItems: basketItems,
        productsByItemId,
        primaryAction: (item) => <button className="text-destructive">Remove {item.itemId}</button>,

        secondaryActions: (_item) => <button className="text-primary">Edit</button>,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Remove item-1')).toBeInTheDocument();
        await expect(canvas.getByText('Remove item-2')).toBeInTheDocument();
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
        // Should have 2 items
        const items = canvas.getAllByTestId(/sf-product-item-/);
        await expect(items).toHaveLength(2);
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
        // Should have 2 items
        const items = canvas.getAllByTestId(/sf-product-item-/);
        await expect(items).toHaveLength(2);
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
        // Should have 2 items
        const items = canvas.getAllByTestId(/sf-product-item-/);
        await expect(items).toHaveLength(2);
    },
};
