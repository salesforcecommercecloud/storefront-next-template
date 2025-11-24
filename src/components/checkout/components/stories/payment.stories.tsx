import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, userEvent } from 'storybook/test';
import { action } from 'storybook/actions';
import Payment from '../payment';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

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
        layout: 'padded',
        docs: {
            description: {
                component: `
### Payment Component

This component handles the payment step of the checkout process - collecting payment information including card details and billing address. It uses a ToggleCard to show either an editable form or a summary view based on the step state.

**Key Features:**
- **Form Validation**: Uses react-hook-form with Zod schema validation for payment fields
- **Card Formatting**: Automatically formats card numbers and expiry dates as user types
- **Card Type Detection**: Detects and displays card type (Visa, Mastercard, etc.)
- **Billing Address**: Option to use same billing address as shipping or enter separate billing details
- **Toggle States**: Shows edit form when \`isEditing\` is true, summary when \`isCompleted\` is true
- **Loading States**: Displays loading spinner and disabled state during submission
- **Error Handling**: Shows form errors and validation messages
- **Basket Integration**: Pre-fills payment data from existing basket data

**Dependencies:**
- \`react-hook-form\`: Form state management and validation
- \`@hookform/resolvers/zod\`: Zod schema validation integration
- \`@/providers/basket\`: Access to current basket data
- \`@/components/toggle-card\`: Toggle between edit and summary views
- \`@/lib/checkout-schemas\`: Payment validation schema
- \`@/lib/form-utils\`: Card number and expiry date formatting
- \`@/lib/payment-utils\`: Card type detection and formatting
- \`@/lib/card-icon-utils\`: Card type icons
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
        },
        onEdit: {
            description: 'Callback function called when the edit button is clicked',
        },
        isLoading: {
            control: 'boolean',
            description: 'Whether the form is in a loading/submitting state',
        },
        isCompleted: {
            control: 'boolean',
            description: 'Whether this step has been completed (shows summary view)',
        },
        isEditing: {
            control: 'boolean',
            description: 'Whether this step is currently being edited (shows form view)',
        },
        actionData: {
            control: 'object',
            description: 'Action data containing form errors or success state',
        },
    },
    play: async ({ canvasElement }) => {
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

export const WithFormError: Story = {
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
            formError: 'Failed to save payment information. Please try again.',
        },
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form with a form-level error message displayed above the input fields.',
            },
        },
    },
    play: async ({ canvasElement }) => {
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
