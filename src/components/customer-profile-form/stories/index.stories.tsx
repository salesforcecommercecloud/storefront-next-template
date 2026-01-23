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
import { CustomerProfileForm } from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, useState, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import type { CustomerProfileFetcherData, CustomerProfileFormData } from '../types';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { getTranslation } from '@/lib/i18next';

function CustomerProfileFormStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInput = action('customer-profile-form-input');
        const logSubmit = action('customer-profile-form-submit');
        const logCancel = action('customer-profile-form-cancel');

        const handleChange = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            if (target instanceof HTMLInputElement) {
                logInput({ field: target.name || target.id, value: target.value });
            }
        };

        const handleSubmit = (event: SubmitEvent) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !root.contains(form)) return;
            event.preventDefault();
            logSubmit({});
        };

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            const button = target.closest('button');
            if (button && button.type === 'button' && button.textContent?.toLowerCase().includes('cancel')) {
                logCancel({});
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

const meta: Meta<typeof CustomerProfileForm> = {
    title: 'ACCOUNT/Customer Profile Form',
    component: CustomerProfileForm,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Customer Profile Form component for editing customer profile information.

### Features:
- First name, last name, email, and phone fields
- Gender selection dropdown (optional)
- Date of birth picker (optional)
- Form validation using Zod schema
- Success/error feedback through callbacks
- Automatic form reset on successful submission
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <CustomerProfileFormStoryHarness>
                <div className="p-8 max-w-2xl">
                    <Story />
                </div>
            </CustomerProfileFormStoryHarness>
        ),
    ],
    argTypes: {
        initialData: {
            description: 'Initial data to populate the form fields',
            control: 'object',
        },
        updateFetcher: {
            description: 'Fetcher instance for handling form submission',
            control: false,
        },
        onSuccess: {
            description: 'Callback function called when profile is successfully updated',
            action: 'success',
        },
        onError: {
            description: 'Callback function called when profile update fails',
            action: 'error',
        },
        onCancel: {
            description: 'Callback function called when user cancels the form',
            action: 'cancel',
        },
    },
};

export default meta;
type Story = StoryObj<typeof CustomerProfileForm>;

export const Default: Story = {
    render: function DefaultStory() {
        const [fetcher, setFetcher] = useState<ScapiFetcher<CustomerProfileFetcherData>>(
            createMockFetcher<CustomerProfileFetcherData>('idle')
        );

        const handleSubmit = async (formData: FormData | Record<string, unknown>) => {
            setFetcher(createMockFetcher<CustomerProfileFetcherData>('submitting'));
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const data = formData as Record<string, unknown>;
            setFetcher(
                createMockFetcher<CustomerProfileFetcherData>(
                    'idle',
                    {
                        success: true,
                        customer: {
                            firstName: data.firstName as string,
                            lastName: data.lastName as string,
                            email: data.email as string,
                            phoneHome: data.phoneHome as string,
                            gender: data.gender ? Number(data.gender) : undefined,
                            birthday: data.birthday as string,
                        },
                    },
                    true
                )
            );
        };

        const mockFetcher: ScapiFetcher<CustomerProfileFetcherData> = {
            ...fetcher,
            submit: async (target?: FormData | Record<string, unknown>) => {
                await handleSubmit(target || {});
            },
        } as ScapiFetcher<CustomerProfileFetcherData>;

        return (
            <CustomerProfileForm
                updateFetcher={mockFetcher}
                onSuccess={(formData: CustomerProfileFormData) => {
                    action('profile-updated')(formData);
                }}
                onError={(error: string) => {
                    action('profile-update-error')(error);
                }}
            />
        );
    },
    parameters: {
        docs: {
            story: `
Default customer profile form with mock submission.

### Features:
- Empty form fields
- Mock submission handler
- Success/error callbacks
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Check for form fields
        const firstNameInput = await canvas.findByPlaceholderText(
            t('account:profile.firstNamePlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(firstNameInput).toBeInTheDocument();

        const emailInput = await canvas.findByPlaceholderText(
            t('account:profile.emailPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(emailInput).toBeInTheDocument();
    },
};

export const WithInitialData: Story = {
    render: function WithInitialDataStory() {
        const [fetcher, setFetcher] = useState<ScapiFetcher<CustomerProfileFetcherData>>(
            createMockFetcher<CustomerProfileFetcherData>('idle')
        );

        const handleSubmit = async (formData: FormData | Record<string, unknown>) => {
            setFetcher(createMockFetcher<CustomerProfileFetcherData>('submitting'));
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const data = formData as Record<string, unknown>;
            setFetcher(
                createMockFetcher<CustomerProfileFetcherData>(
                    'idle',
                    {
                        success: true,
                        customer: {
                            firstName: data.firstName as string,
                            lastName: data.lastName as string,
                            email: data.email as string,
                            phoneHome: data.phoneHome as string,
                            gender: data.gender ? Number(data.gender) : undefined,
                            birthday: data.birthday as string,
                        },
                    },
                    true
                )
            );
        };

        const mockFetcher: ScapiFetcher<CustomerProfileFetcherData> = {
            ...fetcher,
            submit: async (target?: FormData | Record<string, unknown>) => {
                await handleSubmit(target || {});
            },
        } as ScapiFetcher<CustomerProfileFetcherData>;

        return (
            <CustomerProfileForm
                initialData={{
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com',
                    phone: '555-1234',
                    gender: '1',
                    birthday: '1990-05-15',
                }}
                updateFetcher={mockFetcher}
                onSuccess={(formData: CustomerProfileFormData) => {
                    action('profile-updated')(formData);
                }}
                onError={(error: string) => {
                    action('profile-update-error')(error);
                }}
            />
        );
    },
    parameters: {
        docs: {
            story: `
Customer profile form with pre-filled initial data.

### Features:
- Pre-populated form fields
- Shows existing customer data
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Verify form fields are populated
        const firstNameInput = await canvas.findByDisplayValue('John', {}, { timeout: 5000 });
        await expect(firstNameInput).toBeInTheDocument();

        const lastNameInput = await canvas.findByDisplayValue('Doe', {}, { timeout: 5000 });
        await expect(lastNameInput).toBeInTheDocument();

        const emailInput = await canvas.findByDisplayValue('john.doe@example.com', {}, { timeout: 5000 });
        await expect(emailInput).toBeInTheDocument();

        // Verify gender dropdown has correct value
        const genderSelect = canvas.getByRole('combobox', { name: t('account:profile.gender') });
        await expect(genderSelect).toHaveValue('1');

        // Verify birthday field has correct value
        const birthdayInput = canvas.getByLabelText(t('account:profile.dateOfBirth'));
        await expect(birthdayInput).toHaveValue('1990-05-15');
    },
};

export const Interactive: Story = {
    render: function InteractiveStory() {
        const [fetcher, setFetcher] = useState<ScapiFetcher<CustomerProfileFetcherData>>(
            createMockFetcher<CustomerProfileFetcherData>('idle')
        );

        const handleSubmit = async (formData: FormData | Record<string, unknown>) => {
            setFetcher(createMockFetcher<CustomerProfileFetcherData>('submitting'));
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const data = formData as Record<string, unknown>;
            setFetcher(
                createMockFetcher<CustomerProfileFetcherData>(
                    'idle',
                    {
                        success: true,
                        customer: {
                            firstName: data.firstName as string,
                            lastName: data.lastName as string,
                            email: data.email as string,
                            phoneHome: data.phoneHome as string,
                            gender: data.gender ? Number(data.gender) : undefined,
                            birthday: data.birthday as string,
                        },
                    },
                    true
                )
            );
        };

        const mockFetcher: ScapiFetcher<CustomerProfileFetcherData> = {
            ...fetcher,
            submit: async (target?: FormData | Record<string, unknown>) => {
                await handleSubmit(target || {});
            },
        } as ScapiFetcher<CustomerProfileFetcherData>;

        return (
            <CustomerProfileForm
                updateFetcher={mockFetcher}
                onSuccess={(formData: CustomerProfileFormData) => {
                    action('profile-updated')(formData);
                }}
                onError={(error: string) => {
                    action('profile-update-error')(error);
                }}
            />
        );
    },
    parameters: {
        docs: {
            story: `
Interactive customer profile form for testing user interactions.

### Features:
- Form field interactions
- Input validation
- Submit handling
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Find and interact with form fields
        const firstNameInput = await canvas.findByPlaceholderText(
            t('account:profile.firstNamePlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(firstNameInput, 'Jane');
        await expect(firstNameInput).toHaveValue('Jane');

        const lastNameInput = await canvas.findByPlaceholderText(
            t('account:profile.lastNamePlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(lastNameInput, 'Smith');
        await expect(lastNameInput).toHaveValue('Smith');

        const emailInput = await canvas.findByPlaceholderText(
            t('account:profile.emailPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(emailInput, 'jane.smith@example.com');
        await expect(emailInput).toHaveValue('jane.smith@example.com');

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
