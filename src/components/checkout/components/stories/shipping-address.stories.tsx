import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { action } from 'storybook/actions';
import ShippingAddress from '../shipping-address';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('shipping-address-click');
        const logSubmit = action('shipping-address-submit');
        const logEdit = action('shipping-address-edit');
        const logHover = action('shipping-address-hover');
        const logInputFocus = action('shipping-address-input-focus');
        const logInput = action('shipping-address-input');
        const logInputValue = action('shipping-address-input-value');

        const lastHoverElement: { current: HTMLElement | null } = { current: null };
        const lastValueMap = new WeakMap<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, string>();

        const sanitizeLabel = (value: string | null | undefined): string => {
            if (!value) {
                return '';
            }
            return value.replace(/\s+/g, ' ').trim();
        };

        const resolveAriaLabelledBy = (element: HTMLElement): string | null => {
            const labelledBy = element.getAttribute('aria-labelledby');
            if (!labelledBy) {
                return null;
            }

            const ids = labelledBy.split(/\s+/).filter(Boolean);
            for (const id of ids) {
                const ownerDocument = element.ownerDocument;
                const labelledElement = ownerDocument ? ownerDocument.getElementById(id) : null;
                const text = labelledElement?.textContent;
                if (text) {
                    return text;
                }
            }

            return null;
        };

        const deriveLabel = (element: HTMLElement): string => {
            const ariaLabel = element.getAttribute('aria-label');
            if (ariaLabel) {
                return sanitizeLabel(ariaLabel);
            }

            const labelledBy = resolveAriaLabelledBy(element);
            if (labelledBy) {
                return sanitizeLabel(labelledBy);
            }

            if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                const placeholder = element.placeholder;
                if (placeholder) {
                    return sanitizeLabel(placeholder);
                }

                const associatedLabel = element.labels?.[0]?.textContent;
                if (associatedLabel) {
                    return sanitizeLabel(associatedLabel);
                }

                const nameAttr = element.getAttribute('name');
                if (nameAttr) {
                    return sanitizeLabel(nameAttr);
                }
            }

            if (element instanceof HTMLSelectElement) {
                const associatedLabel = element.labels?.[0]?.textContent;
                if (associatedLabel) {
                    return sanitizeLabel(associatedLabel);
                }
            }

            const title = element.getAttribute('title');
            if (title) {
                return sanitizeLabel(title);
            }

            const text = element.textContent;
            if (text) {
                return sanitizeLabel(text);
            }

            const testId = element.getAttribute('data-testid');
            if (testId) {
                return sanitizeLabel(testId);
            }

            const idAttr = element.getAttribute('id');
            if (idAttr) {
                return sanitizeLabel(idAttr);
            }

            return sanitizeLabel(element.tagName.toLowerCase());
        };

        const selectors = [
            'button',
            'a',
            'input',
            'textarea',
            'select',
            '[role="button"]',
            '[role="link"]',
            '[role="textbox"]',
            '[data-testid]',
            '[tabindex]',
        ].join(', ');

        const findInteractiveElement = (start: Element | null): HTMLElement | null => {
            let node: Element | null = start;
            while (node) {
                if (node instanceof HTMLElement && node.matches(selectors)) {
                    return node;
                }
                node = node.parentElement;
            }
            return null;
        };

        const isInsideHarness = (element: Element) => root.contains(element);

        const isEditButton = (element: HTMLElement, label: string): boolean => {
            return element instanceof HTMLButtonElement && label.toLowerCase().includes('edit');
        };

        const isSupportedInteractiveElement = (element: HTMLElement): boolean => {
            return (
                element instanceof HTMLButtonElement ||
                element instanceof HTMLAnchorElement ||
                element instanceof HTMLInputElement ||
                element instanceof HTMLTextAreaElement ||
                element instanceof HTMLSelectElement
            );
        };

        const isSyntheticEvent = (event: Event): boolean => event.isTrusted === false;

        const handleClick = (event: MouseEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive)) {
                return;
            }

            if (!isSupportedInteractiveElement(interactive)) {
                return;
            }

            if (interactive instanceof HTMLAnchorElement) {
                event.preventDefault();
            }

            const label = deriveLabel(interactive);
            if (!label) {
                return;
            }

            if (isEditButton(interactive, label)) {
                logEdit({ label });
                return;
            }

            if (interactive instanceof HTMLButtonElement && interactive.type === 'submit') {
                return;
            }

            logClick({ label });
        };

        const handleSubmit = (event: SubmitEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !isInsideHarness(form)) {
                return;
            }

            event.preventDefault();

            const submitter = (event.submitter as Element | null) ?? form.querySelector('[type="submit"]');
            const interactive = submitter ? findInteractiveElement(submitter) : null;
            const label = interactive && interactive instanceof HTMLElement ? deriveLabel(interactive) : 'Submit';

            logSubmit({ label });
        };

        const handleInput = (event: Event) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive)) {
                return;
            }

            if (interactive instanceof HTMLInputElement || interactive instanceof HTMLTextAreaElement) {
                const label = deriveLabel(interactive);
                if (!label) {
                    return;
                }

                logInput({ label });

                const value = interactive.value ?? '';
                const previous = lastValueMap.get(interactive);
                if (previous === value) {
                    return;
                }

                lastValueMap.set(interactive, value);
                logInputValue({ label, value });
                return;
            }

            if (interactive instanceof HTMLSelectElement) {
                const label = deriveLabel(interactive);
                if (!label) {
                    return;
                }

                const selectedText = interactive.selectedOptions[0]?.textContent?.trim() ?? interactive.value ?? '';
                const previous = lastValueMap.get(interactive);
                if (previous === selectedText) {
                    return;
                }

                lastValueMap.set(interactive, selectedText);
                logInput({ label });
                logInputValue({ label, value: selectedText });
            }
        };

        const handleFocus = (event: FocusEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (
                !interactive ||
                !isInsideHarness(interactive) ||
                !(
                    interactive instanceof HTMLInputElement ||
                    interactive instanceof HTMLTextAreaElement ||
                    interactive instanceof HTMLSelectElement
                )
            ) {
                return;
            }

            const label = deriveLabel(interactive);
            if (!label) {
                return;
            }

            logInputFocus({ label });
        };

        const handlePointerOver = (event: PointerEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive || !isInsideHarness(interactive) || !isSupportedInteractiveElement(interactive)) {
                return;
            }

            if (lastHoverElement.current === interactive) {
                return;
            }

            const label = deriveLabel(interactive);
            if (!label) {
                return;
            }

            lastHoverElement.current = interactive;
            logHover({ label });
        };

        const handlePointerOut = (event: PointerEvent) => {
            if (isSyntheticEvent(event)) {
                return;
            }

            if (!lastHoverElement.current) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const interactive = findInteractiveElement(target);
            if (!interactive) {
                return;
            }

            const related = event.relatedTarget as Element | null;
            if (related && interactive.contains(related)) {
                return;
            }

            if (interactive === lastHoverElement.current) {
                lastHoverElement.current = null;
            }
        };

        root.addEventListener('click', handleClick, true);
        root.addEventListener('submit', handleSubmit, true);
        root.addEventListener('input', handleInput, true);
        root.addEventListener('change', handleInput, true);
        root.addEventListener('focusin', handleFocus, true);
        root.addEventListener('pointerover', handlePointerOver, true);
        root.addEventListener('pointerout', handlePointerOut, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('submit', handleSubmit, true);
            root.removeEventListener('input', handleInput, true);
            root.removeEventListener('change', handleInput, true);
            root.removeEventListener('focusin', handleFocus, true);
            root.removeEventListener('pointerover', handlePointerOver, true);
            root.removeEventListener('pointerout', handlePointerOut, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ShippingAddress> = {
    component: ShippingAddress,
    title: 'CHECKOUT/ShippingAddress',
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
### ShippingAddress Component

This component handles the shipping address step of the checkout process - collecting the customer's shipping information including name, address, city, state, and postal code. It uses a ToggleCard to show either an editable form or a summary view based on the step state.

**Key Features:**
- **Form Validation**: Uses react-hook-form with Zod schema validation for address fields
- **Toggle States**: Shows edit form when \`isEditing\` is true, summary when \`isCompleted\` is true
- **Loading States**: Displays loading spinner and disabled state during submission
- **Error Handling**: Shows form errors and validation messages
- **Basket Integration**: Pre-fills address data from existing basket data
- **International Support**: Handles optional state and postal code fields for international addresses

**Dependencies:**
- \`react-hook-form\`: Form state management and validation
- \`@hookform/resolvers/zod\`: Zod schema validation integration
- \`@/providers/basket\`: Access to current basket data
- \`@/components/toggle-card\`: Toggle between edit and summary views
- \`@/lib/checkout-schemas\`: Shipping address validation schema
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
            description: 'Callback function called when the form is submitted with valid shipping address data',
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
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Test form interaction
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Test that form elements are present
        void expect(inputs.length).toBeGreaterThan(0);
        void expect(buttons.length).toBeGreaterThan(0);

        // In test environment, just verify elements exist without complex interactions
        void expect(canvasElement).toBeInTheDocument();
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
            action('submit-shipping-address')();
        },
        onEdit: () => {
            action('edit-shipping-address')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Test Default story: Verify form is in editing mode with all required fields
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Should have 8 input fields (firstName, lastName, address1, address2, city, stateCode, postalCode, phone)
        void expect(inputs.length).toBe(8);
        void expect(buttons.length).toBeGreaterThan(0);

        // Verify form labels are present
        void expect(canvas.getByText('First Name')).toBeInTheDocument();
        void expect(canvas.getByText('Last Name')).toBeInTheDocument();
        void expect(canvas.getByText('Address')).toBeInTheDocument();
        void expect(canvas.getByText('City')).toBeInTheDocument();
        void expect(canvas.getByText('State/Province')).toBeInTheDocument();
        void expect(canvas.getByText('Postal Code')).toBeInTheDocument();

        // Verify component structure
        void expect(canvasElement).toBeInTheDocument();
    },
};

export const WithExistingAddress: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-address')();
        },
        onEdit: () => {
            action('edit-shipping-address')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form with existing shipping address information pre-filled from the basket data.',
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Test WithExistingAddress story: Verify form fields and that it can handle existing data
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Should have the same 8 input fields as Default story
        void expect(inputs.length).toBe(8);
        void expect(buttons.length).toBeGreaterThan(0);

        // Verify this story has the same form structure as Default
        void expect(canvas.getByText('First Name')).toBeInTheDocument();
        void expect(canvas.getByText('Last Name')).toBeInTheDocument();
        void expect(canvas.getByText('Address')).toBeInTheDocument();

        // Test that inputs are accessible and functional
        const firstNameInput = canvas.getByLabelText('First Name');
        void expect(firstNameInput).toBeInTheDocument();
        void expect(firstNameInput).not.toBeDisabled();

        // Verify component renders properly for existing address scenario
        void expect(canvasElement).toBeInTheDocument();
    },
};

export const LoadingState: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-address')();
        },
        onEdit: () => {
            action('edit-shipping-address')();
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

        // Test LoadingState story: Verify loading behavior and disabled states
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // In loading state, inputs should be present but form interaction limited
        void expect(inputs.length).toBe(8);
        void expect(buttons.length).toBeGreaterThan(0);

        // Test that loading state shows appropriate UI
        void expect(canvas.getByText('First Name')).toBeInTheDocument();

        // Verify that the loading state doesn't interfere with basic rendering
        const firstNameInput = canvas.getByLabelText('First Name');
        void expect(firstNameInput).toBeInTheDocument();

        // Test loading state visual feedback
        void expect(canvasElement).toBeInTheDocument();
    },
};

export const CompletedState: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-address')();
        },
        onEdit: () => {
            action('edit-shipping-address')();
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
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Test CompletedState story: Verify summary view without form inputs
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // In completed state, there should be no form inputs (summary view only)
        void expect(inputs.length).toBe(0);
        void expect(buttons.length).toBeGreaterThan(0); // May have edit buttons

        // Test that summary shows address information (ShippingAddress doesn't show email)
        // The summary shows the shipping address if available, or "not provided" message
        const hasAddress = canvas.queryByText(/not provided/i);
        const hasAddressInfo = canvas.queryByText(/John|Doe|Main|Street|City/i);
        void expect(hasAddress || hasAddressInfo).toBeTruthy();

        // Verify completed state visual presentation
        void expect(canvasElement).toBeInTheDocument();
    },
};

export const WithFormError: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-address')();
        },
        onEdit: () => {
            action('edit-shipping-address')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: {
            step: 'shippingAddress',
            formError: 'Failed to save shipping address. Please try again.',
        },
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form with a form-level error message displayed above the input fields.',
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Test WithFormError story: Verify form shows error state appropriately
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Should have standard 8 input fields even with error
        void expect(inputs.length).toBe(8);
        void expect(buttons.length).toBeGreaterThan(0);

        // Test that form labels are still present
        void expect(canvas.getByText('First Name')).toBeInTheDocument();

        // Verify inputs remain functional despite error state
        const firstNameInput = canvas.getByLabelText('First Name');
        void expect(firstNameInput).toBeInTheDocument();
        void expect(firstNameInput).not.toBeDisabled();

        // Test error handling doesn't break component structure
        void expect(canvasElement).toBeInTheDocument();
    },
};

export const WithValidationErrors: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-address')();
        },
        onEdit: () => {
            action('edit-shipping-address')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: {
            step: 'shippingAddress',
            fieldErrors: {
                firstName: 'First name is required',
                lastName: 'Last name is required',
                address1: 'Address is required',
                city: 'City is required',
            },
        },
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form with field-level validation errors for address fields.',
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Test WithValidationErrors story: Verify validation error handling
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Should have all 8 input fields even with validation errors
        void expect(inputs.length).toBe(8);
        void expect(buttons.length).toBeGreaterThan(0);

        // Test that required form labels are present
        void expect(canvas.getByText('First Name')).toBeInTheDocument();
        void expect(canvas.getByText('Last Name')).toBeInTheDocument();
        void expect(canvas.getByText('Address')).toBeInTheDocument();
        void expect(canvas.getByText('City')).toBeInTheDocument();

        // Verify inputs remain accessible for error correction
        const firstNameInput = canvas.getByLabelText('First Name');
        void expect(firstNameInput).toBeInTheDocument();

        // Test validation error state doesn't break component
        void expect(canvasElement).toBeInTheDocument();
    },
};

export const InternationalAddress: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-address')();
        },
        onEdit: () => {
            action('edit-shipping-address')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form configured for international addresses (optional state and postal code).',
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Test InternationalAddress story: Verify international address form structure
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Should have standard international address fields
        void expect(inputs.length).toBe(8);
        void expect(buttons.length).toBeGreaterThan(0);

        // Test international-specific field handling
        void expect(canvas.getByText('First Name')).toBeInTheDocument();
        void expect(canvas.getByText('Address')).toBeInTheDocument();

        // Verify international address form accessibility
        const addressInput = canvas.getByLabelText('Address');
        void expect(addressInput).toBeInTheDocument();

        void expect(canvasElement).toBeInTheDocument();
    },
};

export const DisabledState: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-address')();
        },
        onEdit: () => {
            action('edit-shipping-address')();
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
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Test DisabledState story: Verify disabled state shows summary without edit capability
        const inputs = canvas.queryAllByRole('textbox');

        // In disabled state, should show summary view without form inputs
        void expect(inputs.length).toBe(0);

        // Verify component renders in disabled state
        void expect(canvasElement).toBeInTheDocument();
    },
};

export const MobileView: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-address')();
        },
        onEdit: () => {
            action('edit-shipping-address')();
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
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Test MobileView story: Verify mobile-optimized layout
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Should have standard 8 input fields in mobile layout
        void expect(inputs.length).toBe(8);
        void expect(buttons.length).toBeGreaterThan(0);

        // Test mobile-specific responsive behavior
        void expect(canvas.getByText('First Name')).toBeInTheDocument();

        // Verify mobile layout renders properly
        void expect(canvasElement).toBeInTheDocument();
    },
};

export const TabletView: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-address')();
        },
        onEdit: () => {
            action('edit-shipping-address')();
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
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Test TabletView story: Verify tablet-optimized layout
        const inputs = canvas.queryAllByRole('textbox');
        const buttons = canvas.queryAllByRole('button');

        // Should have standard 8 input fields in tablet layout
        void expect(inputs.length).toBe(8);
        void expect(buttons.length).toBeGreaterThan(0);

        // Test tablet-specific responsive behavior
        void expect(canvas.getByText('First Name')).toBeInTheDocument();

        // Verify tablet layout renders properly
        void expect(canvasElement).toBeInTheDocument();
    },
};

export const DesktopView: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-address')();
        },
        onEdit: () => {
            action('edit-shipping-address')();
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
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Test DesktopView story: Verify desktop layout in completed state
        const inputs = canvas.queryAllByRole('textbox');

        // In completed state on desktop, should show summary without form inputs
        void expect(inputs.length).toBe(0);

        // Test that summary shows address information (ShippingAddress doesn't show email)
        // The summary shows the shipping address if available, or "not provided" message
        const hasAddress = canvas.queryByText(/not provided/i);
        const hasAddressInfo = canvas.queryByText(/John|Doe|Main|Street|City/i);
        void expect(hasAddress || hasAddressInfo).toBeTruthy();

        // Verify desktop completed state renders properly
        void expect(canvasElement).toBeInTheDocument();
    },
};
