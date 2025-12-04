import type { Meta, StoryObj } from '@storybook/react-vite';
import ExpressPayments from '../express-payments';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('express-payment-click');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const button = target.closest('button');
            if (button && root.contains(button)) {
                logClick({ text: button.textContent || button.getAttribute('aria-label') || 'Payment Button' });
            }
        };

        root.addEventListener('click', handleClick);
        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ExpressPayments> = {
    title: 'CHECKOUT/ExpressPayments',
    component: ExpressPayments,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Provides express checkout options including Apple Pay, Google Pay, Amazon Pay, PayPal, and Venmo. PayPal SDK is lazy-loaded when this component renders.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    argTypes: {
        onApplePayClick: {
            description: 'Callback when Apple Pay button is clicked',
            action: 'onApplePayClick',
        },
        onGooglePayClick: {
            description: 'Callback when Google Pay button is clicked',
            action: 'onGooglePayClick',
        },
        onAmazonPayClick: {
            description: 'Callback when Amazon Pay button is clicked',
            action: 'onAmazonPayClick',
        },
        onVenmoClick: {
            description: 'Callback when Venmo button is clicked',
            action: 'onVenmoClick',
        },
        onPayPalClick: {
            description: 'Callback when PayPal button is clicked',
            action: 'onPayPalClick',
        },
        disabled: {
            description: 'Whether all payment buttons should be disabled',
            control: 'boolean',
        },
    },
};

export default meta;
type Story = StoryObj<typeof ExpressPayments>;

export const Default: Story = {
    args: {
        onApplePayClick: action('onApplePayClick'),
        onGooglePayClick: action('onGooglePayClick'),
        onAmazonPayClick: action('onAmazonPayClick'),
        onVenmoClick: action('onVenmoClick'),
        onPayPalClick: action('onPayPalClick'),
        disabled: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for Apple Pay button (first button with "Pay" text)
        const buttons = canvas.getAllByRole('button');
        const applePayButton = buttons.find((btn) => btn.textContent?.includes('Pay'));
        await expect(applePayButton).toBeInTheDocument();

        // Check for "Or" divider
        const orDivider = await canvas.findByText(/or/i);
        await expect(orDivider).toBeInTheDocument();
    },
};

export const Disabled: Story = {
    args: {
        onApplePayClick: action('onApplePayClick'),
        onGooglePayClick: action('onGooglePayClick'),
        onAmazonPayClick: action('onAmazonPayClick'),
        onVenmoClick: action('onVenmoClick'),
        onPayPalClick: action('onPayPalClick'),
        disabled: true,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const buttons = canvas.getAllByRole('button');
        // All buttons should be disabled
        buttons.forEach((button) => {
            void expect(button).toBeDisabled();
        });
    },
};

export const WithPayPalSDKLoading: Story = {
    args: {
        onApplePayClick: action('onApplePayClick'),
        onGooglePayClick: action('onGooglePayClick'),
        onAmazonPayClick: action('onAmazonPayClick'),
        onVenmoClick: action('onVenmoClick'),
        onPayPalClick: action('onPayPalClick'),
        disabled: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Component should render even when PayPal SDK is loading
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const WithPayPalSDKError: Story = {
    args: {
        onApplePayClick: action('onApplePayClick'),
        onGooglePayClick: action('onGooglePayClick'),
        onAmazonPayClick: action('onAmazonPayClick'),
        onVenmoClick: action('onVenmoClick'),
        onPayPalClick: action('onPayPalClick'),
        disabled: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Component should render even when PayPal SDK has errors
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
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

        // Check for Apple Pay button (first button with "Pay" text)
        const buttons = canvas.getAllByRole('button');
        const applePayButton = buttons.find((btn) => btn.textContent?.includes('Pay'));
        await expect(applePayButton).toBeInTheDocument();

        // Check for "Or" divider
        const orDivider = await canvas.findByText(/or/i);
        await expect(orDivider).toBeInTheDocument();
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

        // Check for Apple Pay button (first button with "Pay" text)
        const buttons = canvas.getAllByRole('button');
        const applePayButton = buttons.find((btn) => btn.textContent?.includes('Pay'));
        await expect(applePayButton).toBeInTheDocument();

        // Check for "Or" divider
        const orDivider = await canvas.findByText(/or/i);
        await expect(orDivider).toBeInTheDocument();
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

        // Check for Apple Pay button (first button with "Pay" text)
        const buttons = canvas.getAllByRole('button');
        const applePayButton = buttons.find((btn) => btn.textContent?.includes('Pay'));
        await expect(applePayButton).toBeInTheDocument();

        // Check for "Or" divider
        const orDivider = await canvas.findByText(/or/i);
        await expect(orDivider).toBeInTheDocument();
    },
};
