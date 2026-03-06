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

import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { action } from 'storybook/actions';
import { expect, within, userEvent, waitFor } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { Form } from '@/components/ui/form';
import {
    PasswordUpdateFields,
    createPasswordUpdateFormSchema,
    type PasswordUpdateFormData,
    type PasswordUpdateFetcherData,
} from '../index';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { getTranslation } from '@/lib/i18next';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInput = action('form-input');
        const logInputValue = action('form-input-value');
        const logSubmit = action('form-submit');
        const logCancel = action('form-cancel');

        const isInsideHarness = (element: Element) => root.contains(element);

        const deriveLabel = (element: HTMLElement): string => {
            const ariaLabel = element.getAttribute('aria-label')?.trim();
            if (ariaLabel) return ariaLabel;

            if (element instanceof HTMLElement) {
                const label = element.closest('label');
                if (label) {
                    const labelText = label.textContent?.replace(/\s+/g, ' ').trim();
                    if (labelText) return labelText;
                }
            }

            if (element instanceof HTMLInputElement) {
                const placeholder = element.placeholder?.trim();
                if (placeholder) return placeholder;
            }

            const testId = element.getAttribute('data-testid')?.trim();
            return testId ?? '';
        };

        const handleChange = (event: Event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement) || !isInsideHarness(target)) return;

            const label = deriveLabel(target);
            if (!label) return;

            logInput({ label });
            logInputValue({ label, value: target.value });
        };

        const handleSubmit = (event: SubmitEvent) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !isInsideHarness(form)) return;

            event.preventDefault();

            logSubmit({});
        };

        const handleClick = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof HTMLElement) || !isInsideHarness(target)) return;

            if (target instanceof HTMLButtonElement && target.type === 'button') {
                const label = deriveLabel(target);
                if (label && label.toLowerCase().includes('cancel')) {
                    logCancel({});
                }
            }
        };

        root.addEventListener('change', handleChange, true);
        root.addEventListener('submit', handleSubmit, true);
        root.addEventListener('click', handleClick, true);

        return () => {
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('submit', handleSubmit, true);
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

// Helper function to create a mock fetcher
function createMockFetcher<TData = unknown>(
    initialState: 'idle' | 'loading' | 'submitting' = 'idle',
    initialData?: TData,
    initialSuccess: boolean = false,
    initialErrors?: string[]
): ScapiFetcher<TData> {
    return {
        state: initialState,
        data: initialData,
        success: initialSuccess,
        errors: initialErrors,

        load: async () => {},

        submit: async () => {},
        formAction: undefined,
        formData: undefined,
        formEncType: 'application/x-www-form-urlencoded',
        formMethod: 'GET',
        formTarget: undefined,
        text: undefined,
        json: undefined,
        Form: undefined as unknown,

        reset: () => {},
        type: 'init',
    } as unknown as ScapiFetcher<TData>;
}

/**
 * PasswordUpdateFields component that renders the form fields for changing password.
 */
const meta: Meta<typeof PasswordUpdateFields> = {
    title: 'ACCOUNT/Password Update Form',
    component: PasswordUpdateFields,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
The Password Update Fields component renders the form fields for changing user password.

**Features:**
- Current password field
- New password field
- Confirm password field
- Password requirements indicator
- Submit and cancel buttons
- Form validation feedback
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <div className="p-8 max-w-2xl">
                    <Story />
                </div>
            </ActionLogger>
        ),
    ],
    argTypes: {
        form: {
            description: 'React Hook Form instance for managing form state and validation',
            control: false,
        },
        updateFetcher: {
            description: 'React Router fetcher for handling password update requests',
            control: false,
        },
        onCancel: {
            description: 'Optional callback function to handle cancel action',
            action: 'cancel',
        },
    },
};

export default meta;
type Story = StoryObj<typeof PasswordUpdateFields>;

/**
 * Default fields with empty form
 */
export const Default: Story = {
    render: function DefaultStory() {
        const { t } = getTranslation();
        const passwordUpdateFormSchema = createPasswordUpdateFormSchema(t);
        const form = useForm<PasswordUpdateFormData>({
            resolver: zodResolver(passwordUpdateFormSchema),
            defaultValues: {
                currentPassword: '',
                password: '',
                confirmPassword: '',
            },
        });

        const updateFetcher = createMockFetcher<PasswordUpdateFetcherData>('idle');

        const handleSubmit = form.handleSubmit(() => {
            // Form submission handled by story
        });

        return (
            <Form {...form}>
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="password-update-fields-form">
                    <PasswordUpdateFields form={form} updateFetcher={updateFetcher} />
                </form>
            </Form>
        );
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Verify form fields are present
        const currentPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.currentPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(currentPasswordInput).toBeInTheDocument();

        const passwordInput = await canvas.findByPlaceholderText(
            t('account:password.newPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(passwordInput).toBeInTheDocument();

        const confirmPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.confirmPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(confirmPasswordInput).toBeInTheDocument();

        // Verify submit button
        const submitButton = await canvas.findByRole(
            'button',
            { name: t('account:password.saveButton') },
            { timeout: 5000 }
        );
        await expect(submitButton).toBeInTheDocument();
    },
};

/**
 * Fields with initial values
 */
export const WithInitialValues: Story = {
    render: function WithInitialValuesStory() {
        const { t } = getTranslation();
        const passwordUpdateFormSchema = createPasswordUpdateFormSchema(t);
        const form = useForm<PasswordUpdateFormData>({
            resolver: zodResolver(passwordUpdateFormSchema),
            defaultValues: {
                currentPassword: 'OldPassword123',
                password: 'NewPassword123!',
                confirmPassword: 'NewPassword123!',
            },
        });

        const updateFetcher = createMockFetcher<PasswordUpdateFetcherData>('idle');

        const handleSubmit = form.handleSubmit(() => {
            // Form submission handled by story
        });

        return (
            <Form {...form}>
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="password-update-fields-form">
                    <PasswordUpdateFields form={form} updateFetcher={updateFetcher} />
                </form>
            </Form>
        );
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Verify form fields are populated
        const currentPasswordInput = canvas.getByDisplayValue('OldPassword123');
        await expect(currentPasswordInput).toBeInTheDocument();

        // Use placeholder to get password field (since password and confirmPassword have same value)
        const passwordInput = await canvas.findByPlaceholderText(
            t('account:password.newPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(passwordInput).toBeInTheDocument();
        await expect(passwordInput).toHaveValue('NewPassword123!');

        // Verify confirm password field
        const confirmPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.confirmPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(confirmPasswordInput).toBeInTheDocument();
        await expect(confirmPasswordInput).toHaveValue('NewPassword123!');
    },
};

/**
 * Fields with cancel button
 */
export const WithCancelButton: Story = {
    render: function WithCancelButtonStory() {
        const { t } = getTranslation();
        const passwordUpdateFormSchema = createPasswordUpdateFormSchema(t);
        const form = useForm<PasswordUpdateFormData>({
            resolver: zodResolver(passwordUpdateFormSchema),
            defaultValues: {
                currentPassword: '',
                password: '',
                confirmPassword: '',
            },
        });

        const updateFetcher = createMockFetcher<PasswordUpdateFetcherData>('idle');

        const handleSubmit = form.handleSubmit(() => {
            // Form submission handled by story
        });

        const handleCancel = () => {};

        return (
            <Form {...form}>
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="password-update-fields-form">
                    <PasswordUpdateFields form={form} updateFetcher={updateFetcher} onCancel={handleCancel} />
                </form>
            </Form>
        );
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Verify cancel button is present
        const cancelButton = await canvas.findByRole(
            'button',
            { name: t('account:password.cancelButton') },
            { timeout: 5000 }
        );
        await expect(cancelButton).toBeInTheDocument();
    },
};

/**
 * Fields in submitting state
 */
export const Submitting: Story = {
    render: function SubmittingStory() {
        const { t } = getTranslation();
        const passwordUpdateFormSchema = createPasswordUpdateFormSchema(t);
        const form = useForm<PasswordUpdateFormData>({
            resolver: zodResolver(passwordUpdateFormSchema),
            defaultValues: {
                currentPassword: 'OldPassword123',
                password: 'NewPassword123!',
                confirmPassword: 'NewPassword123!',
            },
        });

        const updateFetcher = createMockFetcher<PasswordUpdateFetcherData>('submitting');

        const handleSubmit = form.handleSubmit(() => {
            // Form submission handled by story
        });

        return (
            <Form {...form}>
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="password-update-fields-form">
                    <PasswordUpdateFields form={form} updateFetcher={updateFetcher} />
                </form>
            </Form>
        );
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify submit button is disabled during submission
        const submitButton = await canvas.findByRole('button', { name: 'Saving...' }, { timeout: 5000 });
        await expect(submitButton).toBeInTheDocument();
        await expect(submitButton).toBeDisabled();
    },
};

/**
 * Interactive fields with user input
 */
export const Interactive: Story = {
    render: function InteractiveStory() {
        const { t } = getTranslation();
        const passwordUpdateFormSchema = createPasswordUpdateFormSchema(t);
        const form = useForm<PasswordUpdateFormData>({
            resolver: zodResolver(passwordUpdateFormSchema),
            defaultValues: {
                currentPassword: '',
                password: '',
                confirmPassword: '',
            },
        });

        const updateFetcher = createMockFetcher<PasswordUpdateFetcherData>('idle');

        const handleSubmit = form.handleSubmit(() => {
            // Form submission handled by story
        });

        return (
            <Form {...form}>
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="password-update-fields-form">
                    <PasswordUpdateFields form={form} updateFetcher={updateFetcher} />
                </form>
            </Form>
        );
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Interact with form fields - use findByPlaceholderText to wait for elements
        const currentPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.currentPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(currentPasswordInput, 'OldPassword123', { delay: 10 });
        await expect(currentPasswordInput).toHaveValue('OldPassword123');

        const passwordInput = await canvas.findByPlaceholderText(
            t('account:password.newPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(passwordInput, 'NewPassword123!', { delay: 10 });
        await expect(passwordInput).toHaveValue('NewPassword123!');

        const confirmPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.confirmPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(confirmPasswordInput, 'NewPassword123!', { delay: 10 });
        await expect(confirmPasswordInput).toHaveValue('NewPassword123!');
    },
};

/**
 * Password mismatch error state - New Password and Confirm New Password do not match
 */
export const PasswordMismatchError: Story = {
    render: function PasswordMismatchErrorStory() {
        const { t } = getTranslation();
        const passwordUpdateFormSchema = createPasswordUpdateFormSchema(t);
        const form = useForm<PasswordUpdateFormData>({
            resolver: zodResolver(passwordUpdateFormSchema),
            defaultValues: {
                currentPassword: '',
                password: '',
                confirmPassword: '',
            },
        });

        const updateFetcher = createMockFetcher<PasswordUpdateFetcherData>('idle');

        const handleSubmit = form.handleSubmit(() => {});

        return (
            <Form {...form}>
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="password-update-fields-form">
                    <PasswordUpdateFields form={form} updateFetcher={updateFetcher} />
                </form>
            </Form>
        );
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        const currentPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.currentPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(currentPasswordInput, 'OldPassword123', { delay: 10 });

        const passwordInput = await canvas.findByPlaceholderText(
            t('account:password.newPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(passwordInput, 'NewPassword123!', { delay: 10 });

        const confirmPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.confirmPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(confirmPasswordInput, 'DifferentPassword123!', { delay: 10 });

        const submitButton = await canvas.findByRole(
            'button',
            { name: t('account:password.saveButton') },
            { timeout: 5000 }
        );
        await userEvent.click(submitButton);

        // Wait for validation to run and error to appear
        await waitFor(
            async () => {
                await expect(confirmPasswordInput).toHaveAttribute('aria-invalid', 'true');
                const formMessages = canvasElement.querySelectorAll('[data-slot="form-message"]');
                const hasPasswordError = Array.from(formMessages).some((el) =>
                    /don't match|non corrispondono|passwordsDoNotMatch/i.test(el.textContent ?? '')
                );
                expect(hasPasswordError).toBe(true);
            },
            { timeout: 5000 }
        );
    },
};
