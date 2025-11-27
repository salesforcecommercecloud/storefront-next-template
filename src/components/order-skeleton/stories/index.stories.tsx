import type { Meta, StoryObj } from '@storybook/react-vite';
import OrderSkeleton from '../index';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

const meta: Meta<typeof OrderSkeleton> = {
    title: 'SKELETON/OrderSkeleton',
    component: OrderSkeleton,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'Skeleton component for order confirmation pages. Provides loading placeholders for order summary, shipping details, payment details, and action buttons.',
            },
        },
    },
    tags: ['autodocs'],
    argTypes: {},
};

export default meta;
type Story = StoryObj<typeof OrderSkeleton>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
