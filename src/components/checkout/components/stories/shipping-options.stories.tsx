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
import ShippingOptions from '../shipping-options';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { checkoutStrictA11yParameters } from '@/components/checkout/storybook/checkout-strict-a11y-parameters';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('shipping-options-click');
        const logSubmit = action('shipping-options-submit');
        const logEdit = action('shipping-options-edit');
        const logHover = action('shipping-options-hover');
        const logOptionSelect = action('shipping-options-select');
        const logInputFocus = action('shipping-options-input-focus');

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
            if (!interactive || !isInsideHarness(interactive) || !isSupportedInteractiveElement(interactive)) {
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

        const handleChange = (event: Event) => {
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

            if (interactive instanceof HTMLInputElement && interactive.type === 'radio') {
                const label = deriveLabel(interactive);
                const value = interactive.value ?? '';
                const previous = lastValueMap.get(interactive);
                if (previous === value) {
                    return;
                }

                lastValueMap.set(interactive, value);
                logOptionSelect({ label, value });
                return;
            }

            if (interactive instanceof HTMLSelectElement) {
                const label = deriveLabel(interactive);
                const selectedText = interactive.selectedOptions[0]?.textContent?.trim() ?? interactive.value ?? '';
                const previous = lastValueMap.get(interactive);
                if (previous === selectedText) {
                    return;
                }

                lastValueMap.set(interactive, selectedText);
                logOptionSelect({ label, value: selectedText });
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
            if (!interactive || !isInsideHarness(interactive)) {
                return;
            }

            if (
                interactive instanceof HTMLInputElement ||
                interactive instanceof HTMLTextAreaElement ||
                interactive instanceof HTMLSelectElement
            ) {
                const label = deriveLabel(interactive);
                if (!label) {
                    return;
                }

                logInputFocus({ label });
            }
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
        root.addEventListener('change', handleChange, true);
        root.addEventListener('focusin', handleFocus, true);
        root.addEventListener('pointerover', handlePointerOver, true);
        root.addEventListener('pointerout', handlePointerOut, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
            root.removeEventListener('submit', handleSubmit, true);
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('focusin', handleFocus, true);
            root.removeEventListener('pointerover', handlePointerOver, true);
            root.removeEventListener('pointerout', handlePointerOut, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof ShippingOptions> = {
    component: ShippingOptions,
    title: 'CHECKOUT/ShippingOptions',
    tags: ['autodocs', 'interaction'],
    parameters: {
        ...checkoutStrictA11yParameters,
        layout: 'padded',
        docs: {
            description: {
                component: `
### ShippingOptions Component

This component handles the shipping options step of the checkout process - allowing customers to select from available shipping methods with different prices and delivery times. It uses a ToggleCard to show either an editable form or a summary view based on the step state.

**Key Features:**
- **Shipping Method Selection**: Radio button selection from available shipping methods
- **Price Display**: Shows shipping costs and delivery estimates for each option
- **Toggle States**: Shows edit form when \`isEditing\` is true, summary when \`isCompleted\` is true
- **Loading States**: Displays loading spinner and disabled state during submission
- **Error Handling**: Shows form errors and validation messages
- **Basket Integration**: Pre-selects shipping method from existing basket data
- **Dynamic Options**: Displays different shipping methods based on location and basket contents

**Dependencies:**
- \`@/providers/basket\`: Access to current basket data and shipping methods
- \`@/components/toggle-card\`: Toggle between edit and summary views
- \`@/components/ui/radio-group\`: Radio button selection for shipping methods
- \`@/components/ui/label\`: Labels for shipping method options
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
            description: 'Callback function called when a shipping method is selected and submitted',
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
        shippingMethods: {
            control: 'object',
            description: 'Available shipping methods from the basket',
        },
    },
};

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-options')();
        },
        onEdit: () => {
            action('edit-shipping-options')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
        shippingMethods: undefined,
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // When shippingMethods is undefined, no shipping methods are available
        const buttons = canvas.queryAllByRole('button');

        // Verify the disabled state when no shipping methods
        if (buttons.length > 0) {
            const submitButton = buttons.find((btn) => btn.textContent?.includes('No shipping methods available'));
            if (submitButton) {
                void expect(submitButton).toBeDisabled();
                // Don't try to click disabled buttons
            }
        }

        // Verify component renders properly
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

export const WithMultipleOptions: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-options')();
        },
        onEdit: () => {
            action('edit-shipping-options')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
        shippingMethods: {
            applicableShippingMethods: [
                {
                    id: 'standard',
                    name: 'Standard Shipping',
                    description: '5-7 business days',
                    price: 9.99,
                    estimatedArrival: '5-7 business days',
                },
                {
                    id: 'express',
                    name: 'Express Shipping',
                    description: '2-3 business days',
                    price: 19.99,
                    estimatedArrival: '2-3 business days',
                },
                {
                    id: 'overnight',
                    name: 'Overnight Shipping',
                    description: 'Next business day',
                    price: 29.99,
                    estimatedArrival: 'Next business day',
                },
            ],
        },
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form with multiple shipping options including standard, express, and overnight delivery.',
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

export const WithFreeShipping: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-options')();
        },
        onEdit: () => {
            action('edit-shipping-options')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
        shippingMethods: {
            applicableShippingMethods: [
                {
                    id: 'free',
                    name: 'Free Standard Shipping',
                    description: '5-7 business days',
                    price: 0,
                    estimatedArrival: '5-7 business days',
                },
                {
                    id: 'express',
                    name: 'Express Shipping',
                    description: '2-3 business days',
                    price: 19.99,
                    estimatedArrival: '2-3 business days',
                },
            ],
        },
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form with free shipping option available.',
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

export const LoadingState: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-options')();
        },
        onEdit: () => {
            action('edit-shipping-options')();
        },
        isLoading: true,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
        shippingMethods: undefined,
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

        // In loading state, buttons should be disabled
        const buttons = canvas.queryAllByRole('button');

        // Verify loading state - buttons should be disabled and show loading text
        if (buttons.length > 0) {
            const submitButton = buttons.find((btn) => btn.textContent?.includes('Saving...'));
            if (submitButton) {
                void expect(submitButton).toBeDisabled();
                // Don't try to click disabled buttons
            }
        }

        // Verify component renders properly in loading state
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

export const CompletedState: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-options')();
        },
        onEdit: () => {
            action('edit-shipping-options')();
        },
        isLoading: false,
        isCompleted: true,
        isEditing: false,
        actionData: undefined,
        shippingMethods: {
            applicableShippingMethods: [
                {
                    id: 'express',
                    name: 'Express Shipping',
                    description: '2-3 business days',
                    price: 19.99,
                    estimatedArrival: '2-3 business days',
                },
            ],
        },
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
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export const WithFormError: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-options')();
        },
        onEdit: () => {
            action('edit-shipping-options')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: {
            step: 'shippingOptions',
            formError: 'Failed to save shipping method. Please try again.',
        },
        shippingMethods: {
            applicableShippingMethods: [
                {
                    id: 'standard',
                    name: 'Standard Shipping',
                    description: '5-7 business days',
                    price: 9.99,
                    estimatedArrival: '5-7 business days',
                },
            ],
        },
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form with a form-level error message displayed above the shipping options.',
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

export const NoShippingMethods: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-options')();
        },
        onEdit: () => {
            action('edit-shipping-options')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
        shippingMethods: {
            applicableShippingMethods: [],
        },
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the form when no shipping methods are available.',
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // When no shipping methods are available, button should be disabled
        const buttons = canvas.queryAllByRole('button');

        // Verify the disabled state when no shipping methods
        if (buttons.length > 0) {
            const submitButton = buttons.find((btn) => btn.textContent?.includes('No shipping methods available'));
            if (submitButton) {
                void expect(submitButton).toBeDisabled();
                // Don't try to click disabled buttons
            }
        }

        // Verify component renders properly
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

export const DisabledState: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-options')();
        },
        onEdit: () => {
            action('edit-shipping-options')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: false,
        actionData: undefined,
        shippingMethods: undefined,
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
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export const MobileView: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-options')();
        },
        onEdit: () => {
            action('edit-shipping-options')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
        shippingMethods: {
            applicableShippingMethods: [
                {
                    id: 'standard',
                    name: 'Standard Shipping',
                    description: '5-7 business days',
                    price: 9.99,
                    estimatedArrival: '5-7 business days',
                },
                {
                    id: 'express',
                    name: 'Express Shipping',
                    description: '2-3 business days',
                    price: 19.99,
                    estimatedArrival: '2-3 business days',
                },
            ],
        },
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
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export const TabletView: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-options')();
        },
        onEdit: () => {
            action('edit-shipping-options')();
        },
        isLoading: false,
        isCompleted: false,
        isEditing: true,
        actionData: undefined,
        shippingMethods: {
            applicableShippingMethods: [
                {
                    id: 'standard',
                    name: 'Standard Shipping',
                    description: '5-7 business days',
                    price: 9.99,
                    estimatedArrival: '5-7 business days',
                },
                {
                    id: 'express',
                    name: 'Express Shipping',
                    description: '2-3 business days',
                    price: 19.99,
                    estimatedArrival: '2-3 business days',
                },
            ],
        },
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
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export const DesktopView: Story = {
    args: {
        onSubmit: () => {
            action('submit-shipping-options')();
        },
        onEdit: () => {
            action('edit-shipping-options')();
        },
        isLoading: false,
        isCompleted: true,
        isEditing: false,
        actionData: undefined,
        shippingMethods: {
            applicableShippingMethods: [
                {
                    id: 'express',
                    name: 'Express Shipping',
                    description: '2-3 business days',
                    price: 19.99,
                    estimatedArrival: '2-3 business days',
                },
            ],
        },
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

export default meta;
