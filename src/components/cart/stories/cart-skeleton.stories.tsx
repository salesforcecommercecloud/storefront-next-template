import type { Meta, StoryObj } from '@storybook/react-vite';
import CartSkeleton from '../cart-skeleton';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

const meta: Meta<typeof CartSkeleton> = {
    title: 'SKELETON/CartSkeleton',
    component: CartSkeleton,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'Skeleton component for the cart page. Provides loading placeholders for cart items, order summary, and action buttons.',
            },
        },
    },
    tags: ['autodocs'],
    argTypes: {},
};

export default meta;
type Story = StoryObj<typeof CartSkeleton>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
