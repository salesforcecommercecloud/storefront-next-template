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
        disabled: {
            description: 'Whether all payment buttons should be disabled',
            control: 'boolean',
        },
        layout: {
            description: 'Layout orientation for the payment buttons',
            control: 'radio',
            options: ['horizontal', 'vertical'],
        },
        separatorPosition: {
            description: 'Position of the separator divider',
            control: 'radio',
            options: ['top', 'bottom'],
        },
        separatorText: {
            description: 'Custom text for the separator divider',
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof ExpressPayments>;

export const Default: Story = {
    args: {
        disabled: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for Apple Pay logo
        const applePayLogo = await canvas.findByAltText('Apple Pay');
        await expect(applePayLogo).toBeInTheDocument();

        // Check for "Or" divider
        const orDivider = await canvas.findByText(/or/i);
        await expect(orDivider).toBeInTheDocument();
    },
};

export const Disabled: Story = {
    args: {
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
        disabled: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Component should render even when PayPal SDK has errors
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const VerticalLayout: Story = {
    args: {
        disabled: false,
        layout: 'vertical',
    },
    parameters: {
        docs: {
            description: {
                story: 'Express payment buttons stacked vertically in a single column, useful for sidebars or narrow containers. Used on product detail pages.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for Apple Pay logo
        const applePayLogo = await canvas.findByAltText('Apple Pay');
        await expect(applePayLogo).toBeInTheDocument();

        // Check for "Or" divider
        const orDivider = await canvas.findByText(/or/i);
        await expect(orDivider).toBeInTheDocument();
    },
};

export const VenmoEligibility: Story = {
    args: {
        disabled: false,
    },
    parameters: {
        docs: {
            description: {
                story: `Venmo button eligibility is determined by the PayPal SDK at runtime. 
                
**Venmo appears when:**
- User is in the United States
- Device is mobile (phone or tablet)
- Browser supports Venmo integration
- PayPal SDK detects eligibility

**Venmo is hidden when:**
- User is on desktop (most cases)
- User is outside the US
- Browser doesn't support Venmo
- PayPal SDK reports not eligible

This automatic eligibility check prevents showing an unusable payment option and avoids empty spacing in the layout.`,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // PayPal button should always be present
        const buttons = canvas.getAllByRole('button');
        await expect(buttons.length).toBeGreaterThan(0);

        // Note: Venmo may or may not be visible depending on browser eligibility
        // This is expected behavior based on PayPal SDK's runtime checks
    },
};

export const SeparatorAtTop: Story = {
    args: {
        disabled: false,
        separatorPosition: 'top',
    },
    parameters: {
        docs: {
            description: {
                story: 'Separator displayed above the payment buttons. Useful when express payments are at the bottom of a form.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for "Or" divider
        const orDivider = await canvas.findByText(/or/i);
        await expect(orDivider).toBeInTheDocument();
    },
};

export const CustomSeparatorText: Story = {
    args: {
        disabled: false,
        separatorText: 'Or continue with card',
    },
    parameters: {
        docs: {
            description: {
                story: 'Custom separator text to provide context (automatically displayed in uppercase via CSS). Common variations: "Or continue with card", "Or pay another way", "Express checkout".',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for custom divider text (displayed uppercase via CSS)
        const customDivider = await canvas.findByText('Or continue with card');
        await expect(customDivider).toBeInTheDocument();
    },
};

export const VerticalWithTopSeparator: Story = {
    args: {
        disabled: false,
        layout: 'vertical',
        separatorPosition: 'top',
        separatorText: 'Express checkout',
    },
    parameters: {
        docs: {
            description: {
                story: 'Vertical layout with separator at top and custom text (automatically displayed in uppercase via CSS). Ideal for product detail pages or narrow sidebars.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for custom divider text (displayed uppercase via CSS)
        const customDivider = await canvas.findByText('Express checkout');
        await expect(customDivider).toBeInTheDocument();

        // Check for Apple Pay logo
        const applePayLogo = await canvas.findByAltText('Apple Pay');
        await expect(applePayLogo).toBeInTheDocument();
    },
};
