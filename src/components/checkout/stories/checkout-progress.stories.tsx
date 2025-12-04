import type { Meta, StoryObj } from '@storybook/react-vite';
import { CheckoutProgress } from '../checkout-progress';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { CHECKOUT_STEPS } from '../utils/checkout-context-types';

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
- Payment and Review are pending
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
- Review is pending
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

export const ReviewOrder: Story = {
    render: () => (
        <ProgressStoryHarness>
            <CheckoutProgress
                currentStep={CHECKOUT_STEPS.REVIEW_ORDER}
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
Final step - Review Order. All previous steps are completed.

### Features:
- All previous steps show checkmarks
- Review step is current
- Final step in checkout flow
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for Review step - use findAllByText since text appears multiple times
        const reviewElements = await canvas.findAllByText(/review/i, {}, { timeout: 5000 });
        await expect(reviewElements.length).toBeGreaterThan(0);
        await expect(reviewElements[0]).toBeInTheDocument();
    },
};

export const Mobile: Story = {
    ...ContactInfo,
    globals: {
        viewport: 'mobile2',
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

export const Tablet: Story = {
    ...ContactInfo,
    globals: {
        viewport: 'tablet',
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

export const Desktop: Story = {
    ...ContactInfo,
    globals: {
        viewport: 'desktop',
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
