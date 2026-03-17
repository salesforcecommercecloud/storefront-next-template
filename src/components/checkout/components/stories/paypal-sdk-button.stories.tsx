/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import PayPalSDKButton from '../paypal-sdk-button';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { type PayPalSDKButtonConfig } from '@/hooks/use-paypal-sdk-button';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('paypal-sdk-button-click');

        const handleClick = () => {
            logClick({});
        };

        root.addEventListener('click', handleClick);
        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

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
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
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

const defaultConfig: PayPalSDKButtonConfig = {
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
