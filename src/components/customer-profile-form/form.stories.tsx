/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CustomerProfileForm } from './form';
import type { CustomerProfileFetcherData, CustomerProfileFormData } from './types';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';

/**
 * The CustomerProfileForm component provides a form interface for editing customer profile information.
 * It handles form validation, submission, and displays appropriate success/error feedback through toasts.
 */
const meta: Meta<typeof CustomerProfileForm> = {
    title: 'Components/Customer Profile Form',
    component: CustomerProfileForm,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
The Customer Profile Form component provides a form interface for editing customer profile information.

**Features:**
- Form validation using Zod schema
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
        const [fetcher, setFetcher] = useState<ScapiFetcher<CustomerProfileFetcherData>>(
            createMockFetcher<CustomerProfileFetcherData>('idle')
        );

        const handleSubmit = async (formData: FormData | Record<string, unknown>) => {
            // Simulate API call
            setFetcher(createMockFetcher<CustomerProfileFetcherData>('submitting'));

            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Simulate success
            setFetcher(
                createMockFetcher<CustomerProfileFetcherData>(
                    'idle',
                    {
                        success: true,
                        customer: {
                            firstName: (formData as Record<string, unknown>).firstName as string,
                            lastName: (formData as Record<string, unknown>).lastName as string,
                            email: (formData as Record<string, unknown>).email as string,
                            phoneHome: (formData as Record<string, unknown>).phoneHome as string,
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
                    // eslint-disable-next-line no-console
                    console.log('Profile updated successfully:', formData);
                }}
                onError={(error: string) => {
                    // eslint-disable-next-line no-console
                    console.error('Profile update failed:', error);
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
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            phone: '555-1234',
        },
        updateFetcher: createMockFetcher<CustomerProfileFetcherData>('idle'),
    },
};
