import type { Meta, StoryObj } from '@storybook/react-vite';
import RegisterCustomerSelection from '../register-customer-selection';
import { action } from 'storybook/actions';
import { useEffect, useMemo, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';

const REGISTER_HARNESS_ATTR = 'data-register-harness';

function RegisterStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const logCheckboxChange = useMemo(() => action('register-checkbox-changed'), []);

    useEffect(() => {
        const isInsideHarness = (element: Element | null) => Boolean(element?.closest(`[${REGISTER_HARNESS_ATTR}]`));

        const handleChange = (event: Event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || !isInsideHarness(target)) {
                return;
            }

            if (target.type === 'checkbox') {
                logCheckboxChange({ checked: target.checked });
            }
        };

        document.addEventListener('change', handleChange, true);
        return () => {
            document.removeEventListener('change', handleChange, true);
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
        const canvas = within(canvasElement);

        // Check for checkbox
        const checkbox = await canvas.findByRole('checkbox', {}, { timeout: 5000 });
        await expect(checkbox).toBeInTheDocument();
        await expect(checkbox).not.toBeChecked();

        // Check for label - text is "Create an account for a faster checkout next time"
        const label = await canvas.findByText(/create an account for a faster checkout/i, {}, { timeout: 5000 });
        await expect(label).toBeInTheDocument();
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
State when customer opts to create an account.

### Features:
- Checkbox is checked
- Shows "Account will be created" in summary
- Calls onSaved callback with true
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Check for checkbox
        const checkbox = await canvas.findByRole('checkbox', {}, { timeout: 5000 });
        await expect(checkbox).toBeInTheDocument();

        // Check the checkbox
        await userEvent.click(checkbox);
        await expect(checkbox).toBeChecked();

        // Note: The component is always in editing mode (editing={true}),
        // so ToggleCardSummary is not visible. The summary text "Account will be created"
        // only appears when editing={false}, which is not the case in this component.
        // We verify the checkbox state change instead.
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
- Calls onSaved when checkbox changes
- Passes boolean value (true = create account, false = guest)
- Useful for tracking user preference
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Check for checkbox
        const checkbox = await canvas.findByRole('checkbox', {}, { timeout: 5000 });
        await expect(checkbox).toBeInTheDocument();

        // Toggle checkbox
        await userEvent.click(checkbox);
        await expect(checkbox).toBeChecked();

        // Toggle back - wait a bit for state update
        await userEvent.click(checkbox);
        await expect(checkbox).not.toBeChecked();
    },
};
