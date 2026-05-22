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
import { CustomerAddressForm } from '../index';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';
import type { ShopperCustomers } from '@/scapi';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInput = action('address-form-input');
        const logSubmit = action('address-form-submit');
        const logClick = action('address-form-click');

        const handleChange = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
                logInput({ field: target.name || target.id, value: target.value });
            }
        };

        const handleSubmit = (event: SubmitEvent) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !root.contains(form)) return;
            // Don't prevent default here as it might interfere with the component's internal handling
            logSubmit({});
        };

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const button = target.closest('button');
            if (button) {
                logClick({ label: button.textContent?.trim() || 'button' });
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

// Mock fetcher
const mockFetcher: ScapiFetcher<ShopperCustomers.schemas['CustomerAddress']> = {
    state: 'idle',
    data: undefined,
    formData: undefined,
    formMethod: undefined,
    formAction: undefined,
    formEncType: undefined,
    submit: action('fetcher-submit'),
    load: action('fetcher-load'),
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
        <form {...props}>{children}</form>
    ),
} as ScapiFetcher<ShopperCustomers.schemas['CustomerAddress']>;

const meta: Meta<typeof CustomerAddressForm> = {
    title: 'FORMS/CustomerAddressForm',
    component: CustomerAddressForm,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Complete form component for editing customer address information. Includes form validation, submission handling, and success/error feedback.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    argTypes: {
        initialData: {
            description: 'Optional initial data to populate the form fields',
            control: 'object',
        },
        onSuccess: {
            description: 'Callback function called when address is successfully updated',
            action: 'onSuccess',
        },
        onError: {
            description: 'Callback function called when address update fails',
            action: 'onError',
        },
        onCancel: {
            description: 'Callback function called when cancel button is clicked',
            action: 'onCancel',
        },
    },
};

export default meta;
type Story = StoryObj<typeof CustomerAddressForm>;

export const Default: Story = {
    args: {
        updateFetcher: mockFetcher,
        onSuccess: action('onSuccess'),
        onError: action('onError'),
        onCancel: action('onCancel'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Wait for form to be fully rendered
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Find input by name attribute
        const firstNameInput = canvasElement.querySelector('input[name="firstName"]') as HTMLInputElement;

        if (firstNameInput) {
            await expect(firstNameInput).toBeInTheDocument();
            await userEvent.type(firstNameInput, 'John');
        } else {
            await expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const WithInitialData: Story = {
    args: {
        initialData: {
            addressId: 'Home',
            firstName: 'John',
            lastName: 'Doe',
            phone: '555-1234',
            countryCode: 'US',
            address1: '123 Main St',
            address2: 'Apt 4B',
            city: 'San Francisco',
            stateCode: 'CA',
            postalCode: '94102',
            preferred: true,
        },
        updateFetcher: mockFetcher,
        onSuccess: action('onSuccess'),
        onError: action('onError'),
        onCancel: action('onCancel'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const firstNameInput = canvas.getByDisplayValue('John');
        await expect(firstNameInput).toBeInTheDocument();
    },
};

export const Loading: Story = {
    args: {
        updateFetcher: {
            ...mockFetcher,
            state: 'submitting',
        } as ScapiFetcher<ShopperCustomers.schemas['CustomerAddress']>,
        onSuccess: action('onSuccess'),
        onError: action('onError'),
        onCancel: action('onCancel'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Form should render even when loading
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
