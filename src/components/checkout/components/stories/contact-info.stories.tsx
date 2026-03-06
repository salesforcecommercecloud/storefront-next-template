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
import ContactInfo from '../contact-info';
import { expect, within, userEvent } from 'storybook/test';
import { action } from 'storybook/actions';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('contact-info-click');
        const logSubmit = action('contact-info-submit');
        const logEdit = action('contact-info-edit');
        const logHover = action('contact-info-hover');
        const logInputFocus = action('contact-info-input-focus');
        const logInput = action('contact-info-input');
        const logInputValue = action('contact-info-input-value');

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
                const text = labelledElement?.textContent?.trim();
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

        const syncSubmitButtonState = (form: HTMLFormElement | null) => {
            if (!form) {
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');
            if (!(submitButton instanceof HTMLButtonElement)) {
                return;
            }

            const emailInput = form.querySelector<HTMLInputElement>('input[type="email"]');
            const phoneInput = form.querySelector<HTMLInputElement>('input[type="tel"]');

            const hasEmail = Boolean(emailInput?.value.trim());
            const hasPhone = phoneInput ? Boolean(phoneInput.value.trim()) : true;

            requestAnimationFrame(() => {
                submitButton.disabled = !(hasEmail && hasPhone);
            });
        };

        const enableSubmitButton = (element: Element) => {
            const form = element.closest('form');
            syncSubmitButtonState(form instanceof HTMLFormElement ? form : null);
        };

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

            if (interactive instanceof HTMLButtonElement && interactive.type === 'submit') {
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
                logInputValue({ label: value });

                enableSubmitButton(interactive);
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
                logInputValue({ label: selectedText });

                enableSubmitButton(interactive);
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
            if (!interactive || !isInsideHarness(interactive)) {
                return;
            }

            if (!isSupportedInteractiveElement(interactive)) {
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

        const initialForm = root.querySelector('form');
        syncSubmitButtonState(initialForm instanceof HTMLFormElement ? initialForm : null);

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

const meta: Meta<typeof ContactInfo> = {
    component: ContactInfo,
    title: 'CHECKOUT/ContactInfo',
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
### ContactInfo Component

This component handles the first step of the checkout process - collecting the customer's email address. It uses a ToggleCard to show either an editable form or a summary view based on the step state.

**Key Features:**
- **Form Validation**: Uses react-hook-form with Zod schema validation for email input
- **Toggle States**: Shows edit form when \`isEditing\` is true, summary when \`isCompleted\` is true
- **Loading States**: Displays loading spinner and disabled state during submission
- **Error Handling**: Shows form errors and validation messages
- **Basket Integration**: Pre-fills email from existing basket data

**Dependencies:**
- \`react-hook-form\`: Form state management and validation
- \`@hookform/resolvers/zod\`: Zod schema validation integration
- \`@/providers/basket\`: Access to current basket data
- \`@/components/toggle-card\`: Toggle between edit and summary views
- \`@/lib/checkout-schemas\`: Email validation schema
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => {
            return (
                <div className="max-w-2xl mx-auto p-6">
                    <ActionLogger>
                        <Story />
                    </ActionLogger>
                </div>
            );
        },
    ],
    argTypes: {
        onSubmit: {
            description: 'Callback function called when the form is submitted with valid data',
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
};

type Story = StoryObj<typeof meta>;

const createArgs = (overrides: Partial<Story['args']> = {}): Story['args'] => ({
    onSubmit: () => undefined,
    onEdit: () => undefined,
    isLoading: false,
    isCompleted: false,
    isEditing: true,
    actionData: undefined,
    ...overrides,
});

export const Default: Story = {
    args: createArgs(),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test contact info form interaction
        const inputs = canvas.queryAllByRole('textbox');
        void expect(inputs.length).toBeGreaterThan(0);

        // Test typing in contact fields
        if (inputs.length > 0) {
            await userEvent.type(inputs[0], 'test@example.com');
        }
    },
};

export const WithExistingEmail: Story = {
    args: createArgs(),
    parameters: {
        docs: {
            description: {
                story: 'Shows the form in editing mode with email input field.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test contact info form interaction
        const inputs = canvas.queryAllByRole('textbox');
        void expect(inputs.length).toBeGreaterThan(0);

        // Test typing in contact fields
        if (inputs.length > 0) {
            await userEvent.type(inputs[0], 'test@example.com');
        }
    },
};

export const LoadingState: Story = {
    args: createArgs({
        isLoading: true,
    }),
    parameters: {
        docs: {
            description: {
                story: 'Shows the form in a loading state with disabled inputs and loading button text.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test contact info form interaction
        const inputs = canvas.queryAllByRole('textbox');
        void expect(inputs.length).toBeGreaterThan(0);

        // Test typing in contact fields
        if (inputs.length > 0) {
            await userEvent.type(inputs[0], 'test@example.com');
        }
    },
};

export const CompletedState: Story = {
    args: createArgs({
        isCompleted: true,
        isEditing: false,
    }),
    parameters: {
        docs: {
            description: {
                story: 'Shows the completed state with a summary view and edit button.',
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // In completed state, we show summary, not form inputs
        const inputs = canvas.queryAllByRole('textbox');
        void expect(inputs.length).toBe(0);

        // Test that component renders in completed state
        void expect(canvasElement).toBeInTheDocument();
        void expect(canvasElement.children.length).toBeGreaterThan(0);
    },
};

export const WithFormError: Story = {
    args: createArgs({
        actionData: {
            step: 'contactInfo',
            formError: 'Failed to save contact information. Please try again.',
        },
    }),
    parameters: {
        docs: {
            description: {
                story: 'Shows the form with a form-level error message displayed above the input field.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test contact info form interaction
        const inputs = canvas.queryAllByRole('textbox');
        void expect(inputs.length).toBeGreaterThan(0);

        // Test typing in contact fields
        if (inputs.length > 0) {
            await userEvent.type(inputs[0], 'test@example.com');
        }
    },
};

export const WithValidationError: Story = {
    args: createArgs({
        actionData: {
            step: 'contactInfo',
            fieldErrors: {
                email: 'Please enter a valid email address',
            },
        },
    }),
    parameters: {
        docs: {
            description: {
                story: 'Shows the form with field-level validation errors.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Test contact info form interaction
        const inputs = canvas.queryAllByRole('textbox');
        void expect(inputs.length).toBeGreaterThan(0);

        // Test typing in contact fields
        if (inputs.length > 0) {
            await userEvent.type(inputs[0], 'test@example.com');
        }
    },
};

export const DisabledState: Story = {
    args: createArgs({
        isEditing: false,
    }),
    parameters: {
        docs: {
            description: {
                story: 'Shows the disabled state when neither editing nor completed (upcoming step).',
            },
        },
    },
    play: ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // In disabled state (not editing), we show summary, not form inputs
        const inputs = canvas.queryAllByRole('textbox');
        void expect(inputs.length).toBe(0);

        // Test that component renders in completed state
        void expect(canvasElement).toBeInTheDocument();
        void expect(canvasElement.children.length).toBeGreaterThan(0);
    },
};

export default meta;
