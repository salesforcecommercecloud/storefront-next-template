import type { Meta, StoryObj } from '@storybook/react-vite';
import PayPalButton from '../paypal-button';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';

const meta: Meta<typeof PayPalButton> = {
    title: 'CHECKOUT/PayPalButton',
    component: PayPalButton,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'PayPal button component that uses the official PayPal JavaScript SDK. Renders an authentic PayPal button with proper branding.',
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
type Story = StoryObj<typeof PayPalButton>;

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
