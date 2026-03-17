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

import { useState, useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PasswordUpdateForm, type PasswordUpdateFetcherData, type PasswordUpdateFormData } from '../index';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { action } from 'storybook/actions';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
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

/**
 * The PasswordUpdateForm component provides a form interface for changing user password.
 * It handles form validation, submission, and displays appropriate success/error feedback through toasts.
 */
const meta: Meta<typeof PasswordUpdateForm> = {
    title: 'ACCOUNT/Password Update Form/Form',
    component: PasswordUpdateForm,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
The Password Update Form component provides a form interface for changing user password.

**Features:**
- Form validation using Zod schema
- Password strength requirements
- Success/error feedback through toasts
- Automatic form reset on successful submission
- Support for dependency injection via fetcher prop

**Usage:**
The form accepts a fetcher as a prop, allowing for easy testing and Storybook integration without requiring
React Router providers or complex mocking.
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
        initialData: {
            description: 'Initial data to populate the form fields (for consistency with other forms)',
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
    tags: ['autodocs', 'interaction'],
};

export default meta;
type Story = StoryObj<typeof meta>;

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
 * Default interactive form with mock submission
 */
export const Default: Story = {
    render: function DefaultStory() {
        const [fetcher, setFetcher] = useState<ScapiFetcher<PasswordUpdateFetcherData>>(
            createMockFetcher<PasswordUpdateFetcherData>('idle')
        );

        const handleSubmit = async (_formData: FormData | Record<string, unknown>) => {
            // Simulate API call
            setFetcher(createMockFetcher<PasswordUpdateFetcherData>('submitting'));

            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Simulate success
            setFetcher(createMockFetcher<PasswordUpdateFetcherData>('idle', { success: true }, true));
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
                onSuccess={(formData: PasswordUpdateFormData) => {
                    // eslint-disable-next-line no-console
                    console.log('Password updated successfully:', formData);
                }}
                onError={(error: string) => {
                    // eslint-disable-next-line no-console
                    console.error('Password update failed:', error);
                }}
            />
        );
    },
};

/**
 * Form with initial data
 */
export const WithInitialData: Story = {
    args: {
        initialData: {
            currentPassword: 'bad_password',
            password: 'Good_Pa$$word_123',
            confirmPassword: 'Good_Pa$$word_123',
        },
        updateFetcher: createMockFetcher<PasswordUpdateFetcherData>('idle'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const { t } = getTranslation();

        // Verify form fields are populated
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
    },
};

/**
 * Interactive form with user interactions
 */
export const Interactive: Story = {
    render: function InteractiveStory() {
        const [fetcher, setFetcher] = useState<ScapiFetcher<PasswordUpdateFetcherData>>(
            createMockFetcher<PasswordUpdateFetcherData>('idle')
        );

        const handleSubmit = async (_formData: FormData | Record<string, unknown>) => {
            setFetcher(createMockFetcher<PasswordUpdateFetcherData>('submitting'));
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setFetcher(createMockFetcher<PasswordUpdateFetcherData>('idle', { success: true }, true));
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
                onSuccess={(formData: PasswordUpdateFormData) => {
                    // eslint-disable-next-line no-console
                    console.log('Password updated successfully:', formData);
                }}
                onError={(error: string) => {
                    // eslint-disable-next-line no-console
                    console.error('Password update failed:', error);
                }}
            />
        );
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
        await userEvent.type(currentPasswordInput, 'OldPassword123');
        await expect(currentPasswordInput).toHaveValue('OldPassword123');

        const passwordInput = await canvas.findByPlaceholderText(
            t('account:password.newPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(passwordInput, 'NewPassword123!');
        await expect(passwordInput).toHaveValue('NewPassword123!');

        const confirmPasswordInput = await canvas.findByPlaceholderText(
            t('account:password.confirmPasswordPlaceholder'),
            {},
            { timeout: 5000 }
        );
        await userEvent.type(confirmPasswordInput, 'NewPassword123!');
        await expect(confirmPasswordInput).toHaveValue('NewPassword123!');
    },
};
