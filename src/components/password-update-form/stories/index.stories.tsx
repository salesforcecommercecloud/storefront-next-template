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
import PasswordUpdateForm from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, useState, type ReactNode, type ReactElement } from 'react';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import type { PasswordUpdateFetcherData, PasswordUpdateFormData } from '../types';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { getTranslation } from '@/lib/i18next';

function PasswordUpdateFormStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInput = action('password-update-form-input');
        const logSubmit = action('password-update-form-submit');
        const logCancel = action('password-update-form-cancel');

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

const meta: Meta<typeof PasswordUpdateForm> = {
    title: 'ACCOUNT/Password Update Form',
    component: PasswordUpdateForm,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
Password Update Form component for changing user password.

### Features:
- Current password, new password, and confirm password fields
- Form validation using Zod schema
- Password strength requirements
- Success/error feedback through callbacks
- Automatic form reset on successful submission
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <PasswordUpdateFormStoryHarness>
                <div className="p-8 max-w-2xl">
                    <Story />
                </div>
            </PasswordUpdateFormStoryHarness>
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
            description: 'Callback function called when password is successfully updated',
            action: 'success',
        },
        onError: {
            description: 'Callback function called when password update fails',
            action: 'error',
        },
        onCancel: {
            description: 'Callback function called when user cancels the form',
            action: 'cancel',
        },
    },
};

export default meta;
type Story = StoryObj<typeof PasswordUpdateForm>;

export const Default: Story = {
    render: function DefaultStory() {
        const [fetcher, setFetcher] = useState<ScapiFetcher<PasswordUpdateFetcherData>>(
            createMockFetcher<PasswordUpdateFetcherData>('idle')
        );

        const handleSubmit = async (_formData: FormData | Record<string, unknown>) => {
            setFetcher(createMockFetcher<PasswordUpdateFetcherData>('submitting'));
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setFetcher(
                createMockFetcher<PasswordUpdateFetcherData>(
                    'idle',
                    {
                        success: true,
                    },
                    true
                )
            );
        };

        const mockFetcher: ScapiFetcher<PasswordUpdateFetcherData> = {
            ...fetcher,
            submit: async (target?: FormData | Record<string, unknown>) => {
                await handleSubmit(target || {});
            },
        } as ScapiFetcher<PasswordUpdateFetcherData>;

        return (
            <PasswordUpdateForm
                updateFetcher={mockFetcher}
                onSuccess={(_formData: PasswordUpdateFormData) => {
                    action('password-updated')(_formData);
                }}
                onError={(error: string) => {
                    action('password-update-error')(error);
                }}
            />
        );
    },
    parameters: {
        docs: {
            story: `
Default password update form with mock submission.

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

        // Check for current password field
        const currentPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.currentPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(currentPasswordInput).toBeInTheDocument();

        // Check for new password field
        const newPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.newPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(newPasswordInput).toBeInTheDocument();
    },
};

export const WithInitialData: Story = {
    render: function WithInitialDataStory() {
        const [fetcher, setFetcher] = useState<ScapiFetcher<PasswordUpdateFetcherData>>(
            createMockFetcher<PasswordUpdateFetcherData>('idle')
        );

        const handleSubmit = async (_formData: FormData | Record<string, unknown>) => {
            setFetcher(createMockFetcher<PasswordUpdateFetcherData>('submitting'));
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setFetcher(
                createMockFetcher<PasswordUpdateFetcherData>(
                    'idle',
                    {
                        success: true,
                    },
                    true
                )
            );
        };

        const mockFetcher: ScapiFetcher<PasswordUpdateFetcherData> = {
            ...fetcher,
            submit: async (target?: FormData | Record<string, unknown>) => {
                await handleSubmit(target || {});
            },
        } as ScapiFetcher<PasswordUpdateFetcherData>;

        return (
            <PasswordUpdateForm
                initialData={{
                    currentPassword: 'OldPassword123',
                    password: 'NewPassword123!',
                    confirmPassword: 'NewPassword123!',
                }}
                updateFetcher={mockFetcher}
                onSuccess={(_formData: PasswordUpdateFormData) => {
                    action('password-updated')(_formData);
                }}
                onError={(error: string) => {
                    action('password-update-error')(error);
                }}
            />
        );
    },
    parameters: {
        docs: {
            story: `
Password update form with pre-filled initial data.

### Features:
- Pre-populated form fields
- Shows example password data
            `,
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Verify form fields are populated using placeholder text to avoid duplicates
        const currentPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.currentPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(currentPasswordInput).toBeInTheDocument();
        await expect(currentPasswordInput).toHaveValue('OldPassword123');

        const newPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.newPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await expect(newPasswordInput).toBeInTheDocument();
        await expect(newPasswordInput).toHaveValue('NewPassword123!');
    },
};

export const Interactive: Story = {
    render: function InteractiveStory() {
        const [fetcher, setFetcher] = useState<ScapiFetcher<PasswordUpdateFetcherData>>(
            createMockFetcher<PasswordUpdateFetcherData>('idle')
        );

        const handleSubmit = async (_formData: FormData | Record<string, unknown>) => {
            setFetcher(createMockFetcher<PasswordUpdateFetcherData>('submitting'));
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setFetcher(
                createMockFetcher<PasswordUpdateFetcherData>(
                    'idle',
                    {
                        success: true,
                    },
                    true
                )
            );
        };

        const mockFetcher: ScapiFetcher<PasswordUpdateFetcherData> = {
            ...fetcher,
            submit: async (target?: FormData | Record<string, unknown>) => {
                await handleSubmit(target || {});
            },
        } as ScapiFetcher<PasswordUpdateFetcherData>;

        return (
            <PasswordUpdateForm
                updateFetcher={mockFetcher}
                onSuccess={(_formData: PasswordUpdateFormData) => {
                    action('password-updated')(_formData);
                }}
                onError={(error: string) => {
                    action('password-update-error')(error);
                }}
            />
        );
    },
    parameters: {
        docs: {
            story: `
Interactive password update form for testing user interactions.

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
        const currentPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.currentPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(currentPasswordInput, 'CurrentPass123');
        await expect(currentPasswordInput).toHaveValue('CurrentPass123');

        const newPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.newPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(newPasswordInput, 'NewSecurePass123!');
        await expect(newPasswordInput).toHaveValue('NewSecurePass123!');

        const confirmPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.confirmPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(confirmPasswordInput, 'NewSecurePass123!');
        await expect(confirmPasswordInput).toHaveValue('NewSecurePass123!');
    },
};
