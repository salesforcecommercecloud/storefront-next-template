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
import { waitForStorybookReady } from '@storybook/test-utils';
import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { action } from 'storybook/actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { PromoCodeFields, createPromoCodeFormSchema } from '../index';
import { getTranslation } from '@/lib/i18next';

// Mock fetcher for Storybook
const mockFetcher = {
    state: 'idle',
    data: undefined,
    formData: undefined,
    formMethod: undefined,
    formAction: undefined,
    formEncType: undefined,
    submit: (..._args: unknown[]) => undefined,
    load: (..._args: unknown[]) => undefined,
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
        <form {...props}>{children}</form>
    ),
};

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logType = action('promo-fields-input');
        const logTypeValue = action('promo-fields-input-value');
        const logApply = action('promo-fields-apply');

        const isInsideHarness = (element: Element) => root.contains(element);

        const deriveLabel = (element: HTMLElement): string => {
            const ariaLabel = element.getAttribute('aria-label')?.trim();
            if (ariaLabel) {
                return ariaLabel;
            }

            if (element instanceof HTMLInputElement) {
                const placeholder = element.placeholder?.trim();
                if (placeholder) {
                    return placeholder;
                }
            }

            const text = element.textContent?.replace(/\s+/g, ' ').trim();
            if (text) {
                return text;
            }

            const title = element.getAttribute('title')?.trim();
            if (title) {
                return title;
            }

            const testId = element.getAttribute('data-testid')?.trim();
            return testId ?? '';
        };

        const findInteractiveElement = (start: Element | null): HTMLElement | null => {
            if (!start) {
                return null;
            }

            const selectors = [
                'button',
                'a',
                '[role="button"]',
                'input',
                'textarea',
                'select',
                '[data-testid]',
                '[tabindex]',
                'label',
            ].join(', ');

            const match = start.closest(selectors);
            if (match instanceof HTMLElement) {
                return match;
            }

            if (start instanceof HTMLElement) {
                return start;
            }

            return start.parentElement ? findInteractiveElement(start.parentElement) : null;
        };

        const handleChange = (event: Event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || !isInsideHarness(target)) {
                return;
            }

            const label = deriveLabel(target);
            if (!label) {
                return;
            }

            logType({ label });

            const value = target.value ?? '';
            logTypeValue({ label: value });
        };

        const handleSubmit = (event: SubmitEvent) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !isInsideHarness(form)) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation?.();

            const submitter = (event.submitter as Element | null) ?? form.querySelector('[type="submit"]');
            const interactive = submitter ? findInteractiveElement(submitter) : null;
            const label = interactive ? deriveLabel(interactive) : 'Apply';

            if (label) {
                logApply({ label });
            }
        };

        root.addEventListener('change', handleChange, true);
        root.addEventListener('submit', handleSubmit, true);

        return () => {
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('submit', handleSubmit, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof PromoCodeFields> = {
    component: PromoCodeFields,
    title: 'CART/PromoCodeFields',
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
### PromoCodeFields Component

This component renders the form fields for entering and applying promo codes. It provides the input field and submit button for the promo code form.

**Key Features:**
- **Form Fields**: Input field for entering promo codes with proper labeling
- **Submit Button**: Button to apply the promo code with loading states
- **Form Integration**: Integrates with React Hook Form for validation and state management
- **Fetcher Integration**: Uses React Router fetcher for handling form submissions
- **Loading States**: Shows loading state on the submit button during submission
- **Validation**: Displays form validation messages

**Dependencies:**
- \`react-hook-form\`: Form state management
- \`react-router\`: Fetcher for form submissions
- \`@/components/ui/form\`: Form components
- \`@/components/ui/button\`: Button component
- \`@/components/ui/input\`: Input component
- \`@/lib/fetcher-states\`: Fetcher state management

**Props:**
- \`form\`: React Hook Form instance for managing form state and validation
- \`applyFetcher\`: React Router fetcher for handling promo code application requests
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => {
            return (
                <ActionLogger>
                    <div className="max-w-md mx-auto p-6">
                        <Story />
                    </div>
                </ActionLogger>
            );
        },
    ],
    argTypes: {
        form: {
            description: 'React Hook Form instance for managing form state and validation',
        },
        applyFetcher: {
            description: 'React Router fetcher for handling promo code application requests',
        },
    },
};

type Story = StoryObj<typeof meta>;

// Wrapper components for each story
const DefaultWrapper = () => {
    const { t } = getTranslation();
    const promoCodeFormSchema = createPromoCodeFormSchema(t);
    const form = useForm({
        resolver: zodResolver(promoCodeFormSchema),
        defaultValues: { code: '' },
    });
    return (
        <Form {...form}>
            <PromoCodeFields form={form} applyFetcher={mockFetcher as unknown as never} />
        </Form>
    );
};

const WithInitialValueWrapper = () => {
    const { t } = getTranslation();
    const promoCodeFormSchema = createPromoCodeFormSchema(t);
    const form = useForm({
        resolver: zodResolver(promoCodeFormSchema),
        defaultValues: { code: 'SAVE10' },
    });
    return (
        <Form {...form}>
            <PromoCodeFields form={form} applyFetcher={mockFetcher as unknown as never} />
        </Form>
    );
};

const LoadingStateWrapper = () => {
    const { t } = getTranslation();
    const promoCodeFormSchema = createPromoCodeFormSchema(t);
    const form = useForm({
        resolver: zodResolver(promoCodeFormSchema),
        defaultValues: { code: '' },
    });
    const loadingFetcher = { ...mockFetcher, state: 'submitting' };
    return (
        <Form {...form}>
            <PromoCodeFields form={form} applyFetcher={loadingFetcher as unknown as never} />
        </Form>
    );
};

const WithValidationErrorWrapper = () => {
    const { t } = getTranslation();
    const promoCodeFormSchema = createPromoCodeFormSchema(t);
    const form = useForm({
        resolver: zodResolver(promoCodeFormSchema),
        defaultValues: { code: 'A' },
    });
    void form.trigger();
    return (
        <Form {...form}>
            <PromoCodeFields form={form} applyFetcher={mockFetcher as unknown as never} />
        </Form>
    );
};

const WithLongPromoCodeWrapper = () => {
    const { t } = getTranslation();
    const promoCodeFormSchema = createPromoCodeFormSchema(t);
    const form = useForm({
        resolver: zodResolver(promoCodeFormSchema),
        defaultValues: { code: 'SUMMER2024SAVE20PERCENT' },
    });
    return (
        <Form {...form}>
            <PromoCodeFields form={form} applyFetcher={mockFetcher as unknown as never} />
        </Form>
    );
};

export const Default: Story = {
    render: () => <DefaultWrapper />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test that input field is present
        const input = await canvas.findByPlaceholderText(/promo code|discount code|enter code/i);
        await expect(input).toBeInTheDocument();

        // Test that apply button is present
        const button = await canvas.findByRole('button', { name: /apply|submit/i });
        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();

        // Test that input starts empty
        await expect(input).toHaveValue('');
    },
};

export const WithInitialValue: Story = {
    render: () => <WithInitialValueWrapper />,
    parameters: {
        docs: {
            description: {
                story: 'Shows the form fields with an initial promo code value pre-filled.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test that input field is present with initial value
        const input = await canvas.findByDisplayValue('SAVE10');
        await expect(input).toBeInTheDocument();

        // Test that apply button is present
        const button = await canvas.findByRole('button', { name: /apply|submit/i });
        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();

        // Test that we can change the value
        await userEvent.clear(input);
        await userEvent.type(input, 'NEWCODE');
        await expect(input).toHaveValue('NEWCODE');
    },
};

export const LoadingState: Story = {
    render: () => <LoadingStateWrapper />,
    parameters: {
        docs: {
            description: {
                story: 'Shows the form fields in a loading state with the submit button disabled.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test that input field is present
        const input = await canvas.findByPlaceholderText(/promo code|discount code|enter code/i);
        await expect(input).toBeInTheDocument();

        // Test that apply button is present but disabled in loading state
        const button = await canvas.findByRole('button', { name: /apply|submit|loading/i });
        await expect(button).toBeInTheDocument();
        await expect(button).toBeDisabled(); // Should be disabled when loading

        // Test that input is enabled (component doesn't disable input during loading, only the button)
        await expect(input).not.toBeDisabled();
    },
};

export const WithValidationError: Story = {
    render: () => <WithValidationErrorWrapper />,
    parameters: {
        docs: {
            description: {
                story: 'Shows the form fields with a validation error for an invalid promo code.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test that input field is present with invalid value
        const input = await canvas.findByDisplayValue('A');
        await expect(input).toBeInTheDocument();

        // Test that apply button is present but may be disabled due to validation
        const button = await canvas.findByRole('button', { name: /apply|submit/i });
        await expect(button).toBeInTheDocument();

        // Test that we can type a valid code to clear the error
        await userEvent.clear(input);
        await userEvent.type(input, 'VALIDCODE');
        await expect(input).toHaveValue('VALIDCODE');
    },
};

export const WithLongPromoCode: Story = {
    render: () => <WithLongPromoCodeWrapper />,
    parameters: {
        docs: {
            description: {
                story: 'Shows the form fields with a longer promo code to test input field behavior.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Test that input field is present with long promo code
        const input = await canvas.findByDisplayValue('SUMMER2024SAVE20PERCENT');
        await expect(input).toBeInTheDocument();

        // Test that apply button is present
        const button = await canvas.findByRole('button', { name: /apply|submit/i });
        await expect(button).toBeInTheDocument();
        await expect(button).not.toBeDisabled();

        // Test that we can edit the long code
        await userEvent.clear(input);
        await userEvent.type(input, 'SHORT');
        await expect(input).toHaveValue('SHORT');
    },
};

export default meta;
