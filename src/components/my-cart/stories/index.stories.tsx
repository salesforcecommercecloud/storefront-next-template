import type { Meta, StoryObj } from '@storybook/react-vite';
import MyCart from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { checkoutWithMultipleItems, checkoutWithOneItem } from '@/components/__mocks__/checkout-data';
import { standardProd } from '@/components/__mocks__/standard-product-2';

function MyCartStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('my-cart-click');
        const logToggle = action('my-cart-toggle');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const accordionTrigger = target.closest('[data-state]');
            if (accordionTrigger) {
                logToggle({ state: accordionTrigger.getAttribute('data-state') || '' });
            } else {
                logClick({ element: target.textContent?.trim() || '' });
            }
        };

        root.addEventListener('click', handleClick);
        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof MyCart> = {
    title: 'COMMON/My Cart',
    component: MyCart,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A collapsible cart component that displays cart items in an accordion format. Used on checkout pages to show cart contents separately from order summary.

### Features:
- Collapsible accordion
- Item count display
- Product items list
- Expandable/collapsible state
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <MyCartStoryHarness>
                <Story />
            </MyCartStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof MyCart>;

// Create product map from standardProd
const productMap: Record<string, typeof standardProd> = {
    [standardProd.id]: standardProd,
};

export const Default: Story = {
    render: () => <MyCart basket={checkoutWithMultipleItems.cart} productMap={productMap} />,
    parameters: {
        docs: {
            story: `
My cart with multiple items, collapsed by default.

### Features:
- Multiple items
- Collapsed state
- Item count shown
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for cart title with item count
        const cartTitle = await canvas.findByText(/my cart/i, {}, { timeout: 5000 });
        await expect(cartTitle).toBeInTheDocument();
    },
};

export const Expanded: Story = {
    render: () => <MyCart basket={checkoutWithMultipleItems.cart} productMap={productMap} itemsExpanded={true} />,
    parameters: {
        docs: {
            story: `
My cart with items expanded by default.

### Features:
- Expanded state
- Items visible
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for cart title
        const cartTitle = await canvas.findByText(/my cart/i, {}, { timeout: 5000 });
        await expect(cartTitle).toBeInTheDocument();
    },
};

export const SingleItem: Story = {
    render: () => <MyCart basket={checkoutWithOneItem.cart} productMap={productMap} />,
    parameters: {
        docs: {
            story: `
My cart with a single item.

### Features:
- Single item
- Item count shows "1"
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for cart title
        const cartTitle = await canvas.findByText(/my cart/i, {}, { timeout: 5000 });
        await expect(cartTitle).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for cart title with item count
        const cartTitle = await canvas.findByText(/my cart/i, {}, { timeout: 5000 });
        await expect(cartTitle).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for cart title with item count
        const cartTitle = await canvas.findByText(/my cart/i, {}, { timeout: 5000 });
        await expect(cartTitle).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for cart title with item count
        const cartTitle = await canvas.findByText(/my cart/i, {}, { timeout: 5000 });
        await expect(cartTitle).toBeInTheDocument();
    },
};
