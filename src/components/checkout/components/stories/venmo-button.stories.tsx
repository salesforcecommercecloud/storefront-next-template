import type { Meta, StoryObj } from '@storybook/react-vite';
import VenmoButton from '../venmo-button';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';

const meta: Meta<typeof VenmoButton> = {
    title: 'CHECKOUT/VenmoButton',
    component: VenmoButton,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Venmo button component that uses the official PayPal JavaScript SDK. Venmo is a funding source provided by the PayPal SDK and is typically only available on mobile devices in US markets.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        onApprove: {
            description: 'Callback invoked when payment is approved',
            action: 'onApprove',
        },
        disabled: {
            description: 'Whether the button should be disabled',
            control: 'boolean',
        },
    },
};

export default meta;
type Story = StoryObj<typeof VenmoButton>;

export const Default: Story = {
    args: {
        onApprove: action('onApprove'),
        disabled: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Component should render
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const Disabled: Story = {
    args: {
        onApprove: action('onApprove'),
        disabled: true,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Component should render even when disabled
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
