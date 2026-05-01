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
import { expect, within, userEvent } from 'storybook/test';
import { action } from 'storybook/actions';
import { waitForStorybookReady } from '@storybook/test-utils';
import Payment from '../payment';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { checkoutStrictA11yParameters } from '@/components/checkout/storybook/checkout-strict-a11y-parameters';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('payment-click');
        const logSubmit = action('payment-submit');
        const logEdit = action('payment-edit');
        const logInputFocus = action('payment-input-focus');

        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            const button = target.closest('button');
            const input = target.closest('input');
            if (button) {
                const label = (button.textContent || '').trim();
                logClick({ label });
                if (label.includes('Submit') || label.includes('Continue') || label.includes('Pay')) {
                    logSubmit({ section: 'payment' });
                } else if (label.includes('Edit')) {
                    logEdit({ section: 'payment' });
                }
            } else if (input) {
                const type = input.type;
                const placeholder = input.placeholder || '';
                logInputFocus({ inputType: type, placeholder });
            }
        };

        root.addEventListener('click', handleClick, true);
        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof Payment> = {
    component: Payment,
    title: 'CHECKOUT/Payment',
    tags: ['autodocs', 'interaction'],
    parameters: {
        ...checkoutStrictA11yParameters,
        layout: 'padded',
        docs: {
            description: {
                component: `
### Payment Component

This component handles the payment step of the checkout process, collecting payment information including card details and billing address. It supports both new payment entry and selection from saved payment methods.

**Key Features:**
- **Saved Payment Methods**: For logged-in customers, displays saved payment methods as radio options with view more/less functionality (shows 3 initially, expandable to all)
- **New Payment Entry**: Credit card input fields with validation and formatting (handled by CreditCardInputFields)
- **Save to Profile**: Optional checkbox to save payment method for future use (registered customers only)
- **Billing Address Management**: Toggle to use shipping address or enter separate billing address, with dropdown for selecting from saved addresses
- **Form Validation**: Uses react-hook-form with Zod schema validation for all payment fields
- **Toggle States**: Shows edit form when \`isEditing\` is true, summary view otherwise
- **Loading States**: Displays loading spinner and disabled state during submission
- **Error Handling**: Shows form-level errors via CheckoutErrorBanner and field-level validation messages
- **Basket Integration**: Pre-fills payment data from existing basket data

**Dependencies:**
- \`react-hook-form\`: Form state management and validation
- \`@hookform/resolvers/zod\`: Zod schema validation integration
- \`@/providers/basket\`: Access to current basket data
- \`@/hooks/checkout/use-customer-profile\`: Access to saved payment methods and addresses
- \`@/components/toggle-card\`: Toggle between edit and summary views
- \`@/lib/checkout-schemas\`: Payment validation schema
- \`CreditCardInputFields\`: Card input component with formatting and validation
- \`PaymentMethodsList\`: Radio list of saved payment methods
- \`SavedAddressesList\`: Dropdown for selecting saved billing addresses
                `,
            },
        },
    },
    // Decorator removed to allow global decorators (with all context providers) to work
    // decorators: [
    //     (Story: React.ComponentType) => {
    //         return (
    //             <div className="max-w-2xl mx-auto p-6">
    //                 <Story />
    //             </div>
    //         );
    //     },
    // ],
    argTypes: {
        onSubmit: {
            description: 'Callback function called when the form is submitted with valid payment data',
            table: {
                type: { summary: '(data: PaymentData) => void' },
            },
        },
        onEdit: {
            description: 'Callback function called when the edit button is clicked',
            table: {
                type: { summary: '() => void' },
            },
        },
        isLoading: {
            control: 'boolean',
            description: 'Whether the form is in a loading/submitting state',
            table: {
                defaultValue: { summary: 'false' },
            },
        },
        isCompleted: {
            control: 'boolean',
            description:
                'Whether this step has been completed (affects summary view display, but isEditing controls the actual toggle)',
            table: {
                defaultValue: { summary: 'false' },
            },
        },
        isEditing: {
            control: 'boolean',
            description:
                'Whether this step is currently being edited (shows form view when true, summary view when false)',
            table: {
                defaultValue: { summary: 'true' },
            },
        },
        disabled: {
            control: 'boolean',
            description: 'Disables the entire step (used for upcoming steps that should not be accessible yet)',
            table: {
                defaultValue: { summary: 'false' },
            },
        },
        showUseDifferentBilling: {
            control: 'boolean',
            description:
                'Whether to show the "Use different billing address" checkbox. When false, always uses separate billing.',
            table: {
                defaultValue: { summary: 'true' },
            },
        },
        hidePaymentSaveCheckbox: {
            control: 'boolean',
            description: 'Whether to hide the "Save payment to profile" checkbox for logged-in customers',
            table: {
                defaultValue: { summary: 'false' },
            },
        },
        paymentSubmissionRef: {
            description: 'Ref object used to access form data and set errors from parent checkout flow (internal use)',
            table: {
                type: { summary: 'MutableRefObject<PaymentSubmissionRef> | undefined' },
            },
        },
        actionData: {
            control: 'object',
            description: 'Action data containing form errors or success state from server action',
            table: {
                type: { summary: 'CheckoutActionData | undefined' },
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form interaction
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Test basic interactions
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        onSubmit: () => {
            action('submit-payment')();
        },
        onEdit: () => {
            action('edit-payment')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form interaction
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Test basic interactions
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
    },
};

export const WithExistingPayment: Story = {
    args: {
        onSubmit: () => {
            action('submit-payment')();
        },
        onEdit: () => {
            action('edit-payment')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form with existing payment information pre-filled from the basket data.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form interaction
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Test basic interactions
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
    },
};

export const LoadingState: Story = {
    args: {
        onSubmit: () => {
            action('submit-payment')();
        },
        onEdit: () => {
            action('edit-payment')();
        },
        isLoading: true,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form in a loading state with disabled inputs and loading button text.',
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // In loading state, elements should be disabled
        const buttons = canvas.queryAllByRole('button');

        // Verify loading state - buttons should be disabled
        if (buttons.length > 0) {
            const submitButton = buttons.find(
                (btn) => btn.textContent?.includes('Processing...') || btn.textContent?.includes('Loading')
            );
            if (submitButton) {
                void expect(submitButton).toBeDisabled();
                // Don't try to click disabled buttons
            }
        }

        // Verify component renders properly in loading state
        void expect(canvasElement).toBeInTheDocument();
    },
};

export const CompletedState: Story = {
    args: {
        onSubmit: () => {
            action('submit-payment')();
        },
        onEdit: () => {
            action('edit-payment')();
        },
        isLoading: false,
        isCompleted: true,
        isEditing: false,
        actionData: undefined,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the completed state with a summary view and edit button.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form interaction
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Test basic interactions
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
    },
};

export const WithValidationErrors: Story = {
    args: {
        onSubmit: () => {
            action('submit-payment')();
        },
        onEdit: () => {
            action('edit-payment')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: {
            step: 'payment',
            fieldErrors: {
                cardNumber: 'Please enter a valid card number',
                expiryDate: 'Please enter a valid expiry date',
                cvv: 'Please enter a valid CVV',
            },
        },
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form with field-level validation errors for payment fields.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
    },
};

export const WithBillingAddress: Story = {
    args: {
        onSubmit: () => {
            action('submit-payment')();
        },
        onEdit: () => {
            action('edit-payment')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form with billing address fields visible (when billing same as shipping is unchecked).',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form interaction
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Test basic interactions
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
    },
};

export const DisabledState: Story = {
    args: {
        onSubmit: () => {
            action('submit-payment')();
        },
        onEdit: () => {
            action('edit-payment')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: false,
        actionData: undefined,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the disabled state when neither editing nor completed (upcoming step).',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form interaction
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Test basic interactions
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
    },
};

export const MobileView: Story = {
    args: {
        onSubmit: () => {
            action('submit-payment')();
        },
        onEdit: () => {
            action('edit-payment')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the component optimized for mobile viewport.',
            },
        },
    },
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form interaction
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Test basic interactions
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
    },
};

export const TabletView: Story = {
    args: {
        onSubmit: () => {
            action('submit-payment')();
        },
        onEdit: () => {
            action('edit-payment')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the component optimized for tablet viewport.',
            },
        },
    },
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form interaction
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Test basic interactions
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
    },
};

export const DesktopView: Story = {
    args: {
        onSubmit: () => {
            action('submit-payment')();
        },
        onEdit: () => {
            action('edit-payment')();
        },
        isLoading: false,
        isCompleted: true,
        isEditing: false,
        actionData: undefined,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the component optimized for desktop viewport in completed state.',
            },
        },
    },
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test form interaction
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Test basic interactions
        if (inputs.length > 0) {
            await userEvent.click(inputs[0]);
        }
        if (buttons.length > 0) {
            await userEvent.click(buttons[0]);
        }
    },
};
