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
import { CheckoutProgress } from '../checkout-progress';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { CHECKOUT_STEPS } from '../utils/checkout-context-types';
import { checkoutStrictA11yParameters } from '@/components/checkout/storybook/checkout-strict-a11y-parameters';

const PROGRESS_HARNESS_ATTR = 'data-progress-harness';

function ProgressStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logStepClick = useMemo(() => action('progress-step-clicked'), []);
    const logHover = useMemo(() => action('progress-step-hovered'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${PROGRESS_HARNESS_ATTR}]`));

        const handleClick = (event: MouseEvent) => {
            const target = (event.target as HTMLElement | null)?.closest('[role="button"], button, a');
            if (!target || !(target instanceof HTMLElement) || !isInsideHarness(target)) {
                return;
            }

            const stepText = target.textContent?.trim() || '';
            logStepClick({ stepText });
        };

        const handleMouseOver = (event: MouseEvent) => {
            const target = (event.target as HTMLElement | null)?.closest('[role="button"], button, a');
            if (!target || !(target instanceof HTMLElement) || !isInsideHarness(target)) {
                return;
            }

            const related = event.relatedTarget as HTMLElement | null;
            if (related && target.contains(related)) {
                return;
            }

            const stepText = target.textContent?.trim() || '';
            if (stepText) {
                logHover({ stepText });
            }
        };

        document.addEventListener('click', handleClick, true);
        document.addEventListener('mouseover', handleMouseOver, true);
        return () => {
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('mouseover', handleMouseOver, true);
        };
    }, [logStepClick, logHover]);

    return (
        <div ref={containerRef} {...{ [PROGRESS_HARNESS_ATTR]: 'true' }} className="w-full max-w-4xl mx-auto p-6">
            {children}
        </div>
    );
}

const meta: Meta<typeof CheckoutProgress> = {
    title: 'CHECKOUT/Checkout Progress',
    component: CheckoutProgress,
    tags: ['autodocs', 'interaction'],
    parameters: {
        ...checkoutStrictA11yParameters,
        layout: 'padded',
        docs: {
            description: {
                component: `
A progress indicator component that displays the checkout flow steps. Shows current step, completed steps, and pending steps with visual indicators.

## Features

- **Step Visualization**: Shows all checkout steps with status indicators
- **Current Step Highlighting**: Highlights the current active step
- **Completed Steps**: Shows checkmarks for completed steps
- **Responsive Design**: Horizontal layout on mobile, vertical on desktop
- **Visual Connectors**: Lines connecting steps to show flow

## Usage

\`\`\`tsx
import { CheckoutProgress } from '../checkout-progress';
import { CHECKOUT_STEPS } from '../utils/checkout-context-types';

function CheckoutPage() {
  return (
    <CheckoutProgress
      currentStep={CHECKOUT_STEPS.SHIPPING_ADDRESS}
      completedSteps={[CHECKOUT_STEPS.CONTACT_INFO]}
    />
  );
}
\`\`\`
                `,
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof CheckoutProgress>;

export const ContactInfo: Story = {
    render: () => (
        <ProgressStoryHarness>
            <CheckoutProgress currentStep={CHECKOUT_STEPS.CONTACT_INFO} completedSteps={[]} />
        </ProgressStoryHarness>
    ),
    parameters: {
        docs: {
            description: {
                story: `
First step of checkout - Contact Info. No steps completed yet.

### Features:
- Contact Info step is current (highlighted)
- All other steps are pending
- Step 1 indicator shown
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for Contact Info step - use findAllByText since text appears multiple times
        const contactInfoElements = await canvas.findAllByText(/contact info/i, {}, { timeout: 5000 });
        await expect(contactInfoElements.length).toBeGreaterThan(0);
        await expect(contactInfoElements[0]).toBeInTheDocument();
    },
};

export const ShippingAddress: Story = {
    render: () => (
        <ProgressStoryHarness>
            <CheckoutProgress
                currentStep={CHECKOUT_STEPS.SHIPPING_ADDRESS}
                completedSteps={[CHECKOUT_STEPS.CONTACT_INFO]}
            />
        </ProgressStoryHarness>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Second step - Shipping Address. Contact Info is completed.

### Features:
- Contact Info shows checkmark (completed)
- Shipping Address is current (highlighted)
- Remaining steps are pending
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for Shipping step - use findAllByText since text appears multiple times
        const shippingElements = await canvas.findAllByText(/shipping/i, {}, { timeout: 5000 });
        await expect(shippingElements.length).toBeGreaterThan(0);
        await expect(shippingElements[0]).toBeInTheDocument();
    },
};

export const ShippingOptions: Story = {
    render: () => (
        <ProgressStoryHarness>
            <CheckoutProgress
                currentStep={CHECKOUT_STEPS.SHIPPING_OPTIONS}
                completedSteps={[CHECKOUT_STEPS.CONTACT_INFO, CHECKOUT_STEPS.SHIPPING_ADDRESS]}
            />
        </ProgressStoryHarness>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Third step - Shipping Options. Contact Info and Shipping Address are completed.

### Features:
- First two steps show checkmarks
- Delivery step is current
- Payment and Place Order are pending
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for Delivery step - use findAllByText since text appears multiple times
        const deliveryElements = await canvas.findAllByText(/delivery/i, {}, { timeout: 5000 });
        await expect(deliveryElements.length).toBeGreaterThan(0);
        await expect(deliveryElements[0]).toBeInTheDocument();
    },
};

export const Payment: Story = {
    render: () => (
        <ProgressStoryHarness>
            <CheckoutProgress
                currentStep={CHECKOUT_STEPS.PAYMENT}
                completedSteps={[
                    CHECKOUT_STEPS.CONTACT_INFO,
                    CHECKOUT_STEPS.SHIPPING_ADDRESS,
                    CHECKOUT_STEPS.SHIPPING_OPTIONS,
                ]}
            />
        </ProgressStoryHarness>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Fourth step - Payment. All previous steps are completed.

### Features:
- First three steps show checkmarks
- Payment step is current
- Place Order is pending
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for Payment step - use findAllByText since text appears multiple times
        const paymentElements = await canvas.findAllByText(/payment/i, {}, { timeout: 5000 });
        await expect(paymentElements.length).toBeGreaterThan(0);
        await expect(paymentElements[0]).toBeInTheDocument();
    },
};

export const PlaceOrder: Story = {
    render: () => (
        <ProgressStoryHarness>
            <CheckoutProgress
                currentStep={CHECKOUT_STEPS.PLACE_ORDER}
                completedSteps={[
                    CHECKOUT_STEPS.CONTACT_INFO,
                    CHECKOUT_STEPS.SHIPPING_ADDRESS,
                    CHECKOUT_STEPS.SHIPPING_OPTIONS,
                    CHECKOUT_STEPS.PAYMENT,
                ]}
            />
        </ProgressStoryHarness>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Final step - Place Order. All previous steps are completed.

### Features:
- All previous steps show checkmarks
- Place Order step is current
- Final step in checkout flow
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for Place Order step - use findAllByText since text appears multiple times
        const placeOrderElements = await canvas.findAllByText(/place order/i, {}, { timeout: 5000 });
        await expect(placeOrderElements.length).toBeGreaterThan(0);
        await expect(placeOrderElements[0]).toBeInTheDocument();
    },
};
