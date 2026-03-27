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
import RegisterCustomerSelection from '../register-customer-selection';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { checkoutStrictA11yParameters } from '@/components/checkout/storybook/checkout-strict-a11y-parameters';

const REGISTER_HARNESS_ATTR = 'data-register-harness';

function RegisterStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logCheckboxChange = useMemo(() => action('register-checkbox-changed'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${REGISTER_HARNESS_ATTR}]`));

        const handleClick = (event: Event) => {
            const target = event.target as Element;
            const checkbox = target.closest('[role="checkbox"]');
            if (!checkbox || !isInsideHarness(checkbox)) {
                return;
            }
            logCheckboxChange({ checked: checkbox.getAttribute('aria-checked') !== 'true' });
        };

        document.addEventListener('click', handleClick, true);
        return () => {
            document.removeEventListener('click', handleClick, true);
        };
    }, [logCheckboxChange]);

    return (
        <div ref={containerRef} {...{ [REGISTER_HARNESS_ATTR]: 'true' }} className="w-full max-w-2xl mx-auto p-6">
            {children}
        </div>
    );
}

const meta: Meta<typeof RegisterCustomerSelection> = {
    title: 'CHECKOUT/Register Customer Selection',
    component: RegisterCustomerSelection,
    tags: ['autodocs', 'interaction'],
    parameters: {
        ...checkoutStrictA11yParameters,
        layout: 'padded',
        docs: {
            description: {
                component: `
A component that allows customers to opt-in to creating an account during checkout for faster future checkouts.

## Features

- **Checkbox Selection**: Toggle to create account or continue as guest
- **Toggle Card UI**: Uses ToggleCard component for consistent styling
- **Callback Support**: Notifies parent when selection changes
- **Summary View**: Shows current selection state

## Usage

\`\`\`tsx
import RegisterCustomerSelection from '../register-customer-selection';

function PaymentStep() {
  const handleSaved = (shouldCreateAccount: boolean) => {
    // Handle account creation preference
  };

  return <RegisterCustomerSelection onSaved={handleSaved} />;
}
\`\`\`
                `,
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof RegisterCustomerSelection>;

export const Default: Story = {
    render: () => (
        <RegisterStoryHarness>
            <RegisterCustomerSelection />
        </RegisterStoryHarness>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Default state - checkbox is unchecked, customer will continue as guest.

### Features:
- Checkbox is unchecked by default
- Shows "Continue as guest" in summary
- ToggleCard in edit mode
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const checkbox = await canvas.findByRole('checkbox', {}, { timeout: 5000 });
        await expect(checkbox).toBeInTheDocument();
        await expect(checkbox).not.toBeChecked();

        const label = await canvas.findByText(/save for future use/i, {}, { timeout: 5000 });
        await expect(label).toBeInTheDocument();

        const description = await canvas.findByText(/create an account for a faster checkout/i, {}, { timeout: 5000 });
        await expect(description).toBeInTheDocument();
    },
};

export const Checked: Story = {
    render: () => (
        <RegisterStoryHarness>
            <RegisterCustomerSelection onSaved={action('account-creation-selected')} />
        </RegisterStoryHarness>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Interactive story demonstrating the checkbox click behavior.

### Features:
- Clicking checkbox triggers the registration validation flow
- Component handles missing basket context gracefully
- Checkbox and label remain interactive after click
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const checkbox = await canvas.findByRole('checkbox', {}, { timeout: 5000 });
        await expect(checkbox).toBeInTheDocument();
        await expect(checkbox).not.toBeChecked();

        await userEvent.click(checkbox);

        await expect(checkbox).toBeInTheDocument();
        const label = await canvas.findByText(/save for future use/i, {}, { timeout: 5000 });
        await expect(label).toBeInTheDocument();
    },
};

export const WithCallback: Story = {
    render: () => (
        <RegisterStoryHarness>
            <RegisterCustomerSelection onSaved={action('register-callback')} />
        </RegisterStoryHarness>
    ),
    parameters: {
        docs: {
            description: {
                story: `
Component with callback function to handle account creation preference.

### Features:
- Clicking checkbox triggers onSaved callback
- Component handles the full registration validation flow
- Checkbox remains interactive after the flow completes
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const checkbox = await canvas.findByRole('checkbox', {}, { timeout: 5000 });
        await expect(checkbox).toBeInTheDocument();
        await expect(checkbox).not.toBeChecked();

        await userEvent.click(checkbox);

        await expect(checkbox).toBeInTheDocument();
        const label = await canvas.findByText(/save for future use/i, {}, { timeout: 5000 });
        await expect(label).toBeInTheDocument();
    },
};
