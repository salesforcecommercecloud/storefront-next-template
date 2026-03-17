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
import PayPalButton from '../paypal-button';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('paypal-button-click');

        const handleClick = () => {
            // Log clicks on the container or iframe overlays
            logClick({});
        };

        root.addEventListener('click', handleClick);
        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

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
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
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
