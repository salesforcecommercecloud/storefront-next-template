/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PasswordUpdateForm } from './form';
import type { PasswordUpdateFetcherData, PasswordUpdateFormData } from './types';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';

/**
 * The PasswordUpdateForm component provides a form interface for changing user password.
 * It handles form validation, submission, and displays appropriate success/error feedback through toasts.
 */
const meta: Meta<typeof PasswordUpdateForm> = {
    title: 'Components/Password Update Form',
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
            <div className="p-8 max-w-2xl">
                <Story />
            </div>
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
    tags: ['autodocs'],
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
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        load: async () => {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        submit: async () => {},
        formAction: undefined,
        formData: undefined,
        formEncType: 'application/x-www-form-urlencoded',
        formMethod: 'GET',
        formTarget: undefined,
        text: undefined,
        json: undefined,
        Form: undefined as unknown,
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        unstable_reset: () => {},
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
};
