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
import CheckoutProvider from '../checkout-context';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, useContext, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { CheckoutContext, type CustomerProfile } from '../checkout-context-types';
import { Button } from '@/components/ui/button';
import { checkoutStrictA11yParameters } from '@/components/checkout/storybook/checkout-strict-a11y-parameters';

// Consumer component to demonstrate context usage
function CheckoutContextConsumer() {
    const context = useContext(CheckoutContext);

    if (!context) {
        return <div>No checkout context available</div>;
    }

    const { step, computedStep, editingStep, STEPS, goToNextStep, goToStep, exitEditMode } = context;

    const stepNames = {
        [STEPS.CONTACT_INFO]: 'Contact Info',
        [STEPS.PICKUP]: 'Pickup',
        [STEPS.SHIPPING_ADDRESS]: 'Shipping Address',
        [STEPS.SHIPPING_OPTIONS]: 'Shipping Options',
        [STEPS.PAYMENT]: 'Payment',
        [STEPS.PLACE_ORDER]: 'Place Order',
    };

    return (
        <div className="space-y-4 p-6 border rounded">
            <div>
                <h3 className="text-lg font-semibold mb-2">Checkout Context State</h3>
                <div className="space-y-2 text-sm">
                    <div>
                        <strong>Current Step:</strong> {stepNames[step]} ({step})
                    </div>
                    <div>
                        <strong>Computed Step:</strong> {stepNames[computedStep]} ({computedStep})
                    </div>
                    <div>
                        <strong>Editing Step:</strong> {editingStep !== null ? stepNames[editingStep] : 'None'} (
                        {editingStep !== null ? editingStep : 'null'})
                    </div>
                </div>
            </div>
            <div className="flex gap-2 flex-wrap">
                <Button onClick={goToNextStep} size="sm">
                    Go to Next Step
                </Button>
                <Button onClick={() => goToStep(STEPS.CONTACT_INFO)} size="sm" variant="outline">
                    Go to Contact Info
                </Button>
                <Button onClick={() => goToStep(STEPS.SHIPPING_ADDRESS)} size="sm" variant="outline">
                    Go to Shipping
                </Button>
                <Button onClick={() => goToStep(STEPS.PAYMENT)} size="sm" variant="outline">
                    Go to Payment
                </Button>
                <Button onClick={exitEditMode} size="sm" variant="outline">
                    Exit Edit Mode
                </Button>
            </div>
        </div>
    );
}

const CHECKOUT_CONTEXT_HARNESS_ATTR = 'data-checkout-context-harness';

function CheckoutContextStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logNextStep = useMemo(() => action('checkout-next-step'), []);
    const logGoToStep = useMemo(() => action('checkout-go-to-step'), []);
    const logExitEdit = useMemo(() => action('checkout-exit-edit'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) =>
            Boolean(element?.closest(`[${CHECKOUT_CONTEXT_HARNESS_ATTR}]`));

        const handleClick = (event: MouseEvent) => {
            const button = (event.target as HTMLElement | null)?.closest('button');
            if (!button || !(button instanceof HTMLButtonElement) || !isInsideHarness(button)) {
                return;
            }

            const buttonText = button.textContent?.trim() || '';
            if (buttonText.includes('Next Step')) {
                logNextStep({ buttonText });
            } else if (buttonText.includes('Go to')) {
                logGoToStep({ buttonText });
            } else if (buttonText.includes('Exit Edit')) {
                logExitEdit({ buttonText });
            }
        };

        document.addEventListener('click', handleClick, true);
        return () => {
            document.removeEventListener('click', handleClick, true);
        };
    }, [logNextStep, logGoToStep, logExitEdit]);

    return (
        <div
            ref={containerRef}
            {...{ [CHECKOUT_CONTEXT_HARNESS_ATTR]: 'true' }}
            className="w-full max-w-4xl mx-auto p-6">
            {children}
        </div>
    );
}

const meta: Meta<typeof CheckoutProvider> = {
    title: 'CHECKOUT/Checkout Context',
    component: CheckoutProvider,
    tags: ['autodocs', 'interaction'],
    parameters: {
        ...checkoutStrictA11yParameters,
        layout: 'padded',
        docs: {
            description: {
                component: `
CheckoutProvider is a context provider that manages the checkout flow state, including current step, editing state, and navigation between steps.

## Features

- **Step Management**: Tracks current step and computed step from basket
- **Edit Mode**: Manages which step is being edited
- **Navigation**: Provides functions to navigate between steps
- **Customer Profile**: Supports returning customer profiles
- **Basket Integration**: Computes step based on basket state

## Usage

\`\`\`tsx
import CheckoutProvider from '../checkout-context';
import { useCheckoutContext } from '../checkout-context-types';

function CheckoutPage() {
  return (
    <CheckoutProvider>
      <CheckoutForm />
    </CheckoutProvider>
  );
}

function CheckoutForm() {
  const { step, goToNextStep } = useCheckoutContext();
  // Use context...
}
\`\`\`
                `,
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof CheckoutProvider>;

export const Default: Story = {
    render: () => (
        <CheckoutContextStoryHarness>
            <CheckoutProvider shippingDefaultSet={Promise.resolve(undefined)}>
                <CheckoutContextConsumer />
            </CheckoutProvider>
        </CheckoutContextStoryHarness>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Default checkout context provider with no customer profile (guest user).

### Features:
- Starts at Contact Info step
- No editing step initially
- Navigation functions available
- Step computation based on basket
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for context display
        const currentStep = await canvas.findByText(/current step/i, {}, { timeout: 5000 });
        await expect(currentStep).toBeInTheDocument();

        // Check for navigation buttons
        const nextButton = await canvas.findByRole('button', { name: /go to next step/i }, { timeout: 5000 });
        await expect(nextButton).toBeInTheDocument();
    },
};

export const WithCustomerProfile: Story = {
    render: () => (
        <CheckoutContextStoryHarness>
            <CheckoutProvider
                shippingDefaultSet={Promise.resolve(undefined)}
                customerProfile={{
                    customer: {
                        id: 'test-customer-id',
                        email: 'test@example.com',
                        firstName: 'John',
                        lastName: 'Doe',
                    } as CustomerProfile['customer'],
                    addresses: [],
                    paymentInstruments: [],
                }}>
                <CheckoutContextConsumer />
            </CheckoutProvider>
        </CheckoutContextStoryHarness>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Checkout context provider with a returning customer profile.

### Features:
- Customer profile provided
- Step computation considers customer data
- Auto-population benefits for returning customers
- Different flow behavior than guest users
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for context display
        const currentStep = await canvas.findByText(/current step/i, {}, { timeout: 5000 });
        await expect(currentStep).toBeInTheDocument();
    },
};

export const WithNavigation: Story = {
    render: () => (
        <CheckoutContextStoryHarness>
            <CheckoutProvider shippingDefaultSet={Promise.resolve(undefined)}>
                <CheckoutContextConsumer />
            </CheckoutProvider>
        </CheckoutContextStoryHarness>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Checkout context with navigation interactions.

### Features:
- Go to next step functionality
- Go to specific step functionality
- Exit edit mode functionality
- Step state updates
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check for navigation buttons
        const nextButton = await canvas.findByRole('button', { name: /go to next step/i }, { timeout: 5000 });
        await expect(nextButton).toBeInTheDocument();

        const contactButton = await canvas.findByRole('button', { name: /go to contact info/i }, { timeout: 5000 });
        await expect(contactButton).toBeInTheDocument();
    },
};
