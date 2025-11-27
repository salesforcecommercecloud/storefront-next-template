import type { Meta, StoryObj } from '@storybook/react-vite';
import PayPalSDKButton from '../paypal-sdk-button';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';

const meta: Meta<typeof PayPalSDKButton> = {
    title: 'CHECKOUT/PayPalSDKButton',
    component: PayPalSDKButton,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Generic PayPal SDK button component that serves as a base for all PayPal SDK-based payment buttons (PayPal, Venmo, etc.). Uses the PayPal SDK to render authentic payment buttons.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        config: {
            description: 'Configuration for the PayPal SDK button including styling and funding source',
            control: 'object',
        },
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
type Story = StoryObj<typeof PayPalSDKButton>;

const defaultConfig = {
    style: {
        layout: 'horizontal',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
        height: 48,
        tagline: false,
    },
    errorPrefix: 'PayPal error:',
};

export const Default: Story = {
    args: {
        config: defaultConfig,
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
        config: defaultConfig,
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

export const VerticalLayout: Story = {
    args: {
        config: {
            ...defaultConfig,
            style: {
                ...defaultConfig.style,
                layout: 'vertical',
            },
        },
        onApprove: action('onApprove'),
        disabled: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const WithTagline: Story = {
    args: {
        config: {
            ...defaultConfig,
            style: {
                ...defaultConfig.style,
                tagline: true,
            },
        },
        onApprove: action('onApprove'),
        disabled: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
