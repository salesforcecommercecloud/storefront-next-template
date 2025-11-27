import type { Meta, StoryObj } from '@storybook/react-vite';
import AccountAddressesSkeleton from '../index';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

const meta: Meta<typeof AccountAddressesSkeleton> = {
    title: 'SKELETON/AccountAddressesSkeleton',
    component: AccountAddressesSkeleton,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Skeleton component for the account addresses page content. Matches the structure of the actual addresses page with a grid of address cards.',
            },
        },
    },
    tags: ['autodocs'],
    argTypes: {},
};

export default meta;
type Story = StoryObj<typeof AccountAddressesSkeleton>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
