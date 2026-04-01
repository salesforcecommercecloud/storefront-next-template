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
import { allModes } from '../../../../.storybook/modes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { action } from 'storybook/actions';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { Form } from '@/components/ui/form';
import { CustomerProfileFields } from '../customer-profile-fields';
import { createCustomerProfileFormSchema, type CustomerProfileFormData } from '../index';
import type { CustomerProfileFetcherData } from '../types';
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
            event.stopImmediatePropagation?.();

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
 * CustomerProfileFields component that renders the form fields for editing customer profile.
 */
const meta: Meta<typeof CustomerProfileFields> = {
    title: 'ACCOUNT/Customer Profile Form/Customer Profile Fields',
    component: CustomerProfileFields,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        chromatic: {
            modes: {
                mobile: allModes.mobile,
                desktop: allModes.desktop,
            },
        },
        docs: {
            description: {
                component: `
The Customer Profile Fields component renders the form fields for editing customer profile information.

**Features:**
- First name and last name fields
- Email field
- Phone number field (optional)
- Gender dropdown (optional) - Male/Female selection
- Date of birth field (optional) - Date picker
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
            description: 'React Router fetcher for handling profile update requests',
            control: false,
        },
        onCancel: {
            description: 'Optional callback function to handle cancel action',
            action: 'cancel',
        },
    },
};

export default meta;
type Story = StoryObj<typeof CustomerProfileFields>;

/**
 * Default fields with empty form
 */
export const Default: Story = {
    render: function DefaultStory() {
        const { t } = getTranslation();
        const customerProfileFormSchema = createCustomerProfileFormSchema(t);
        const form = useForm<CustomerProfileFormData>({
            resolver: zodResolver(customerProfileFormSchema),
            defaultValues: {
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                gender: '',
                birthday: '',
            },
        });

        const updateFetcher = createMockFetcher<CustomerProfileFetcherData>('idle');

        const handleSubmit = form.handleSubmit(() => {
            // Form submission handled by story
        });

        return (
            <Form {...form}>
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="customer-profile-fields-form">
                    <CustomerProfileFields form={form} updateFetcher={updateFetcher} />
                </form>
            </Form>
        );
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Verify form fields are present
        const firstNameInput = canvas.getByPlaceholderText(t('account:profile.firstNamePlaceholder'));
        await expect(firstNameInput).toBeInTheDocument();

        const lastNameInput = canvas.getByPlaceholderText(t('account:profile.lastNamePlaceholder'));
        await expect(lastNameInput).toBeInTheDocument();

        // Email is read-only (no placeholder) — find by label
        const emailInput = canvas.getByLabelText(t('account:profile.email'));
        await expect(emailInput).toBeInTheDocument();
        await expect(emailInput).toHaveAttribute('readonly');

        // Phone is editable — verify by placeholder
        const phoneInput = canvas.getByPlaceholderText(t('account:profile.phonePlaceholder'));
        await expect(phoneInput).toBeInTheDocument();
        await expect(phoneInput).not.toHaveAttribute('readonly');

        // Verify gender dropdown is present
        const genderSelect = canvas.getByRole('combobox', { name: t('account:profile.gender') });
        await expect(genderSelect).toBeInTheDocument();

        // Verify date of birth field is present
        const birthdayInput = canvas.getByLabelText(t('account:profile.dateOfBirth'));
        await expect(birthdayInput).toBeInTheDocument();

        // Verify submit button
        const submitButton = canvas.getByRole('button', { name: t('account:profile.saveButton') });
        await expect(submitButton).toBeInTheDocument();
    },
};

/**
 * Fields with initial values
 */
export const WithInitialValues: Story = {
    render: function WithInitialValuesStory() {
        const { t } = getTranslation();
        const customerProfileFormSchema = createCustomerProfileFormSchema(t);
        const form = useForm<CustomerProfileFormData>({
            resolver: zodResolver(customerProfileFormSchema),
            defaultValues: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '555-1234',
                gender: '1',
                birthday: '1990-05-15',
            },
        });

        const updateFetcher = createMockFetcher<CustomerProfileFetcherData>('idle');

        const handleSubmit = form.handleSubmit(() => {
            // Form submission handled by story
        });

        return (
            <Form {...form}>
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="customer-profile-fields-form">
                    <CustomerProfileFields form={form} updateFetcher={updateFetcher} />
                </form>
            </Form>
        );
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Verify form fields are populated
        const firstNameInput = canvas.getByDisplayValue('John');
        await expect(firstNameInput).toBeInTheDocument();

        const lastNameInput = canvas.getByDisplayValue('Doe');
        await expect(lastNameInput).toBeInTheDocument();

        const emailInput = canvas.getByDisplayValue('john.doe@example.com');
        await expect(emailInput).toBeInTheDocument();

        // Verify gender dropdown has correct value
        const genderSelect = canvas.getByRole('combobox', { name: t('account:profile.gender') });
        await expect(genderSelect).toHaveValue('1');

        // Verify birthday field has correct value
        const birthdayInput = canvas.getByLabelText(t('account:profile.dateOfBirth'));
        await expect(birthdayInput).toHaveValue('1990-05-15');
    },
};

/**
 * Fields with cancel button
 */
export const WithCancelButton: Story = {
    render: function WithCancelButtonStory() {
        const { t } = getTranslation();
        const customerProfileFormSchema = createCustomerProfileFormSchema(t);
        const form = useForm<CustomerProfileFormData>({
            resolver: zodResolver(customerProfileFormSchema),
            defaultValues: {
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                gender: '',
                birthday: '',
            },
        });

        const updateFetcher = createMockFetcher<CustomerProfileFetcherData>('idle');

        const handleSubmit = form.handleSubmit(() => {
            // Form submission handled by story
        });

        const handleCancel = () => {};

        return (
            <Form {...form}>
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="customer-profile-fields-form">
                    <CustomerProfileFields form={form} updateFetcher={updateFetcher} onCancel={handleCancel} />
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
            { name: t('account:profile.cancelButton') },
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
        const customerProfileFormSchema = createCustomerProfileFormSchema(t);
        const form = useForm<CustomerProfileFormData>({
            resolver: zodResolver(customerProfileFormSchema),
            defaultValues: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                phone: '555-1234',
                gender: '1',
                birthday: '1990-05-15',
            },
        });

        const updateFetcher = createMockFetcher<CustomerProfileFetcherData>('submitting');

        const handleSubmit = form.handleSubmit(() => {
            // Form submission handled by story
        });

        return (
            <Form {...form}>
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="customer-profile-fields-form">
                    <CustomerProfileFields form={form} updateFetcher={updateFetcher} />
                </form>
            </Form>
        );
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Verify submit button is disabled during submission
        const submitButton = await canvas.findByRole(
            'button',
            { name: t('account:profile.savingButton') },
            { timeout: 5000 }
        );
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
        const customerProfileFormSchema = createCustomerProfileFormSchema(t);
        const form = useForm<CustomerProfileFormData>({
            resolver: zodResolver(customerProfileFormSchema),
            defaultValues: {
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                gender: '',
                birthday: '',
            },
        });

        const updateFetcher = createMockFetcher<CustomerProfileFetcherData>('idle');

        const handleSubmit = form.handleSubmit(() => {
            // Form submission handled by story
        });

        return (
            <Form {...form}>
                <form onSubmit={(e) => void handleSubmit(e)} data-testid="customer-profile-fields-form">
                    <CustomerProfileFields form={form} updateFetcher={updateFetcher} />
                </form>
            </Form>
        );
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Interact with form fields
        const firstNameInput = canvas.getByPlaceholderText(t('account:profile.firstNamePlaceholder'));
        await userEvent.type(firstNameInput, 'Jane');
        await expect(firstNameInput).toHaveValue('Jane');

        const lastNameInput = canvas.getByPlaceholderText(t('account:profile.lastNamePlaceholder'));
        await userEvent.type(lastNameInput, 'Smith');
        await expect(lastNameInput).toHaveValue('Smith');

        // Test phone number input
        const phoneInput = canvas.getByPlaceholderText(t('account:profile.phonePlaceholder'));
        await userEvent.type(phoneInput, '555-0123');
        await expect(phoneInput).toHaveValue('555-0123');

        // Email is read-only — verify it exists and is not editable
        const emailInput = canvas.getByLabelText(t('account:profile.email'));
        await expect(emailInput).toHaveAttribute('readonly');

        // Select gender
        const genderSelect = canvas.getByRole('combobox', { name: t('account:profile.gender') });
        await userEvent.selectOptions(genderSelect, '2');
        await expect(genderSelect).toHaveValue('2');

        // Enter birthday
        const birthdayInput = canvas.getByLabelText(t('account:profile.dateOfBirth'));
        await userEvent.clear(birthdayInput);
        await userEvent.type(birthdayInput, '1995-08-20');
        await expect(birthdayInput).toHaveValue('1995-08-20');
    },
};
