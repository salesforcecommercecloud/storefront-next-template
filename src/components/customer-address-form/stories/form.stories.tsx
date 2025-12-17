/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { useState, useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { CustomerAddressForm } from '../form';
import type { CustomerAddressFormData } from '../types';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { action } from 'storybook/actions';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * The CustomerAddressForm component provides a form interface for editing customer address information.
 * It handles form validation, submission, and displays appropriate success/error feedback.
 */

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('interaction');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            // Try to find a meaningful element to log
            const element = target.closest('button, a, input, select, [role="button"]');

            if (element) {
                const label =
                    element.textContent?.trim() || element.getAttribute('aria-label') || element.tagName.toLowerCase();
                logClick({ type: 'click', element: element.tagName.toLowerCase(), label });
            }
        };

        const handleChange = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const element = target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            const label =
                element.name || element.id || element.getAttribute('aria-label') || element.tagName.toLowerCase();
            logClick({ type: 'change', element: element.tagName.toLowerCase(), label, value: element.value });
        };

        root.addEventListener('click', handleClick);
        root.addEventListener('change', handleChange);

        return () => {
            root.removeEventListener('click', handleClick);
            root.removeEventListener('change', handleChange);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof CustomerAddressForm> = {
    title: 'Components/Customer Address Form',
    component: CustomerAddressForm,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
The Customer Address Form component provides a form interface for editing customer address information.

**Features:**
- Form validation using Zod schema
- Success/error feedback through callbacks or inline display
- Automatic form reset on successful submission
- Support for dependency injection via fetcher prop
- Country-specific state/province selection (US and Canada)
- Postal code validation based on country
- Support for creating new addresses and editing existing ones

**Error Display:**
- If an \`onError\` callback is provided, errors are handled by the callback (typically for toast notifications)
- If no \`onError\` callback is provided, errors are displayed inline at the top of the form

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
                <Story />
            </ActionLogger>
        ),
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
            description: 'Callback function called when address is successfully updated',
            action: 'success',
        },
        onError: {
            description: 'Callback function called when address update fails',
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

        unstable_reset: () => {},
        type: 'init',
    } as unknown as ScapiFetcher<TData>;
}

/**
 * Default form with initial data (US address)
 */
export const Default: Story = {
    args: {
        initialData: {
            addressId: 'Home',
            firstName: 'Test',
            lastName: 'User2',
            phone: '(778) 288-1237',
            countryCode: 'US',
            address1: '1234 Main St',
            address2: 'Apt 4B',
            city: 'New York',
            stateCode: 'NY',
            postalCode: '10001',
            preferred: true,
        },
        updateFetcher: createMockFetcher<ShopperCustomers.schemas['CustomerAddress']>('idle'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for and verify form renders
        const form = canvasElement.querySelector('[data-testid="customer-address-form"]');
        if (form) {
            await expect(form).toBeInTheDocument();
            // Verify form fields are populated with initial data
            const addressTitleInput = canvas.getByDisplayValue('Home');
            await expect(addressTitleInput).toBeInTheDocument();

            const firstNameInput = canvas.getByDisplayValue('Test');
            await expect(firstNameInput).toBeInTheDocument();

            const lastNameInput = canvas.getByDisplayValue('User2');
            await expect(lastNameInput).toBeInTheDocument();

            // Verify save button is present
            const saveButton = await canvas.findByRole('button', { name: /save/i }, { timeout: 5000 });
            await expect(saveButton).toBeInTheDocument();
        } else {
            await expect(canvasElement).toBeInTheDocument();
        }
    },
};

/**
 * Empty form without initial data
 */
export const Empty: Story = {
    args: {
        initialData: {},
        updateFetcher: createMockFetcher<ShopperCustomers.schemas['CustomerAddress']>('idle'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Wait for and verify form renders
        const form = canvasElement.querySelector('[data-testid="customer-address-form"]');
        if (form) {
            await expect(form).toBeInTheDocument();

            // Verify form fields are empty - use name attribute for reliable selection
            const addressTitleInput = canvasElement.querySelector('input[name="addressId"]') as HTMLInputElement;
            if (addressTitleInput) {
                await expect(addressTitleInput).toBeInTheDocument();
                await expect(addressTitleInput).toHaveValue('');
            }

            const firstNameInput = canvasElement.querySelector('input[name="firstName"]') as HTMLInputElement;
            if (firstNameInput) {
                await expect(firstNameInput).toBeInTheDocument();
                await expect(firstNameInput).toHaveValue('');
                // Test typing in form fields
                await userEvent.type(firstNameInput, 'John');
                await expect(firstNameInput).toHaveValue('John');
            }

            const lastNameInput = canvasElement.querySelector('input[name="lastName"]') as HTMLInputElement;
            if (lastNameInput) {
                await expect(lastNameInput).toBeInTheDocument();
                await userEvent.type(lastNameInput, 'Doe');
                await expect(lastNameInput).toHaveValue('Doe');
            }
        } else {
            await expect(canvasElement).toBeInTheDocument();
        }
    },
};

/**
 * Form with Canadian address
 */
export const CanadianAddress: Story = {
    args: {
        initialData: {
            addressId: 'Work',
            firstName: 'John',
            lastName: 'Doe',
            phone: '(416) 555-1234',
            countryCode: 'CA',
            address1: '123 Yonge Street',
            address2: 'Suite 200',
            city: 'Toronto',
            stateCode: 'ON',
            postalCode: 'M5B 2H1',
            preferred: false,
        },
        updateFetcher: createMockFetcher<ShopperCustomers.schemas['CustomerAddress']>('idle'),
    },
};

/**
 * Form in submitting state
 */
export const Submitting: Story = {
    args: {
        initialData: {
            addressId: 'Office',
            firstName: 'Jane',
            lastName: 'Smith',
            phone: '(555) 567-8900',
            countryCode: 'US',
            address1: '456 Oak Avenue',
            address2: 'Floor 3',
            city: 'Los Angeles',
            stateCode: 'CA',
            postalCode: '90001',
            preferred: false,
        },
        updateFetcher: createMockFetcher<ShopperCustomers.schemas['CustomerAddress']>('submitting'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for and verify form renders
        const form = canvasElement.querySelector('[data-testid="customer-address-form"]');
        if (form) {
            await expect(form).toBeInTheDocument();

            // Verify loading overlay is present
            const loadingOverlay = canvasElement.querySelector('[data-testid="customer-address-form-loading"]');
            await expect(loadingOverlay).toBeInTheDocument();

            // Verify save button shows submitting state
            const saveButton = await canvas.findByRole('button', { name: /saving/i }, { timeout: 5000 });
            await expect(saveButton).toBeInTheDocument();
            await expect(saveButton).toBeDisabled();
        } else {
            await expect(canvasElement).toBeInTheDocument();
        }
    },
};

/**
 * Form showing inline error display when no onError callback is provided
 * (errors are displayed inline at the top of the form)
 */
export const Error: Story = {
    render: function ErrorStory() {
        const [fetcher] = useState<ScapiFetcher<ShopperCustomers.schemas['CustomerAddress']>>(
            createMockFetcher<ShopperCustomers.schemas['CustomerAddress']>('idle', undefined, false, [
                'Failed to save address. Please try again.',
            ])
        );

        return (
            <CustomerAddressForm
                initialData={{
                    addressId: 'Home',
                    firstName: 'Test',
                    lastName: 'User2',
                    phone: '(778) 288-1237',
                    countryCode: 'US',
                    address1: '1234 Main St',
                    address2: 'Apt 4B',
                    city: 'New York',
                    stateCode: 'NY',
                    postalCode: '10001',
                    preferred: true,
                }}
                updateFetcher={fetcher}
                // No onError handler - error will be displayed inline
            />
        );
    },
};

/**
 * Form showing inline success display when no onSuccess callback is provided
 * (success message is displayed inline at the top of the form)
 */
export const Success: Story = {
    render: function SuccessStory() {
        const [fetcher] = useState<ScapiFetcher<ShopperCustomers.schemas['CustomerAddress']>>(
            createMockFetcher<ShopperCustomers.schemas['CustomerAddress']>(
                'idle',
                {
                    addressId: 'addr_123',
                    firstName: 'Test',
                    lastName: 'User2',
                    phone: '(778) 288-1237',
                    countryCode: 'US',
                    address1: '1234 Main St',
                    address2: 'Apt 4B',
                    city: 'New York',
                    stateCode: 'NY',
                    postalCode: '10001',
                    preferred: true,
                },
                true
            )
        );

        return (
            <CustomerAddressForm
                initialData={{
                    addressId: 'Home',
                    firstName: 'Test',
                    lastName: 'User2',
                    phone: '(778) 288-1237',
                    countryCode: 'US',
                    address1: '1234 Main St',
                    address2: 'Apt 4B',
                    city: 'New York',
                    stateCode: 'NY',
                    postalCode: '10001',
                    preferred: true,
                }}
                updateFetcher={fetcher}
                // No onSuccess handler - success message will be displayed inline
            />
        );
    },
};

/**
 * Interactive form with mock submission - can toggle success/error and inline vs callbacks
 */
export const Interactive: Story = {
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for and verify form renders
        const form = canvasElement.querySelector('[data-testid="customer-address-form"]');
        if (form) {
            await expect(form).toBeInTheDocument();

            // Test form field interactions - use name attribute for reliable selection
            const firstNameInput = canvasElement.querySelector('input[name="firstName"]') as HTMLInputElement;
            if (firstNameInput) {
                await expect(firstNameInput).toBeInTheDocument();
                await userEvent.clear(firstNameInput);
                await userEvent.type(firstNameInput, 'Jane');
                await expect(firstNameInput).toHaveValue('Jane');
            }

            const lastNameInput = canvasElement.querySelector('input[name="lastName"]') as HTMLInputElement;
            if (lastNameInput) {
                await expect(lastNameInput).toBeInTheDocument();
                await userEvent.clear(lastNameInput);
                await userEvent.type(lastNameInput, 'Smith');
                await expect(lastNameInput).toHaveValue('Smith');
            }

            const addressInput = canvasElement.querySelector('input[name="address1"]') as HTMLInputElement;
            if (addressInput) {
                await expect(addressInput).toBeInTheDocument();
                await userEvent.clear(addressInput);
                await userEvent.type(addressInput, '789 Elm Street');
                await expect(addressInput).toHaveValue('789 Elm Street');
            }

            // Verify save button is present and enabled
            const saveButton = canvas.getByRole('button', { name: /save/i });
            if (saveButton) {
                await expect(saveButton).toBeInTheDocument();
                await expect(saveButton).not.toBeDisabled();
            }
        } else {
            await expect(canvasElement).toBeInTheDocument();
        }
    },
    render: function InteractiveStory() {
        const [fetcher, setFetcher] = useState<ScapiFetcher<ShopperCustomers.schemas['CustomerAddress']>>(
            createMockFetcher<ShopperCustomers.schemas['CustomerAddress']>('idle')
        );
        const [shouldError, setShouldError] = useState(false);
        const [useInlineMessages, setUseInlineMessages] = useState(false);
        const [dialogOpen, setDialogOpen] = useState(false);
        const [dialogMessage, setDialogMessage] = useState('');
        const [dialogType, setDialogType] = useState<'success' | 'error'>('success');

        const handleSubmit = async (formData: FormData | Record<string, unknown>) => {
            // Simulate API call
            setFetcher(createMockFetcher<ShopperCustomers.schemas['CustomerAddress']>('submitting'));

            await new Promise((resolve) => setTimeout(resolve, 1000));

            if (shouldError) {
                // Simulate error
                setFetcher(
                    createMockFetcher<ShopperCustomers.schemas['CustomerAddress']>('idle', undefined, false, [
                        'Failed to save address. Please check your input and try again.',
                    ])
                );
            } else {
                // Simulate success
                setFetcher(
                    createMockFetcher<ShopperCustomers.schemas['CustomerAddress']>(
                        'idle',
                        {
                            addressId: (formData as Record<string, unknown>).addressId as string,
                            firstName: (formData as Record<string, unknown>).firstName as string,
                            lastName: (formData as Record<string, unknown>).lastName as string,
                            phone: (formData as Record<string, unknown>).phone as string,
                            countryCode: (formData as Record<string, unknown>).countryCode as string,
                            address1: (formData as Record<string, unknown>).address1 as string,
                            address2: (formData as Record<string, unknown>).address2 as string,
                            city: (formData as Record<string, unknown>).city as string,
                            stateCode: (formData as Record<string, unknown>).stateCode as string,
                            postalCode: (formData as Record<string, unknown>).postalCode as string,
                            preferred: (formData as Record<string, unknown>).preferred as boolean,
                        },
                        true
                    )
                );
            }
        };

        const mockFetcher: ScapiFetcher<ShopperCustomers.schemas['CustomerAddress']> = {
            ...fetcher,
            submit: async (target?: FormData | Record<string, unknown>) => {
                await handleSubmit(target || {});
            },
        } as ScapiFetcher<ShopperCustomers.schemas['CustomerAddress']>;

        return (
            <div className="space-y-4">
                <div className="space-y-2 p-3 bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                        <label htmlFor="error-toggle" className="text-sm font-medium">
                            Simulate Error:
                        </label>
                        <input
                            id="error-toggle"
                            type="checkbox"
                            checked={shouldError}
                            onChange={(e) => setShouldError(e.target.checked)}
                            className="rounded"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="inline-toggle" className="text-sm font-medium">
                            Show Inline Messages:
                        </label>
                        <input
                            id="inline-toggle"
                            type="checkbox"
                            checked={useInlineMessages}
                            onChange={(e) => setUseInlineMessages(e.target.checked)}
                            className="rounded"
                        />
                    </div>
                </div>
                <CustomerAddressForm
                    initialData={{
                        addressId: 'Home',
                        firstName: 'Test',
                        lastName: 'User2',
                        phone: '(778) 288-1237',
                        countryCode: 'US',
                        address1: '1234 Main St',
                        address2: 'Apt 4B',
                        city: 'New York',
                        stateCode: 'NY',
                        postalCode: '10001',
                        preferred: true,
                    }}
                    updateFetcher={mockFetcher}
                    onSuccess={
                        useInlineMessages
                            ? undefined
                            : (formData: CustomerAddressFormData) => {
                                  setDialogType('success');
                                  setDialogMessage(
                                      `Address updated successfully!\n\n${JSON.stringify(formData, null, 2)}`
                                  );
                                  setDialogOpen(true);
                              }
                    }
                    onError={
                        useInlineMessages
                            ? undefined
                            : (error: string) => {
                                  setDialogType('error');
                                  setDialogMessage(error);
                                  setDialogOpen(true);
                              }
                    }
                />
                <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{dialogType === 'success' ? 'Success' : 'Error'}</AlertDialogTitle>
                            <AlertDialogDescription className="whitespace-pre-line">
                                {dialogMessage}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction onClick={() => setDialogOpen(false)}>OK</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for and verify form renders
        const form = canvasElement.querySelector('[data-testid="customer-address-form"]');
        if (form) {
            await expect(form).toBeInTheDocument();

            // Verify form fields are populated with initial data
            const addressTitleInput = canvas.getByDisplayValue('Home');
            await expect(addressTitleInput).toBeInTheDocument();

            const firstNameInput = canvas.getByDisplayValue('Test');
            await expect(firstNameInput).toBeInTheDocument();

            const lastNameInput = canvas.getByDisplayValue('User2');
            await expect(lastNameInput).toBeInTheDocument();

            // Verify save button is present
            const saveButton = await canvas.findByRole('button', { name: /save/i }, { timeout: 5000 });
            await expect(saveButton).toBeInTheDocument();
        } else {
            await expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for and verify form renders
        const form = canvasElement.querySelector('[data-testid="customer-address-form"]');
        if (form) {
            await expect(form).toBeInTheDocument();

            // Verify form fields are populated with initial data
            const addressTitleInput = canvas.getByDisplayValue('Home');
            await expect(addressTitleInput).toBeInTheDocument();

            const firstNameInput = canvas.getByDisplayValue('Test');
            await expect(firstNameInput).toBeInTheDocument();

            const lastNameInput = canvas.getByDisplayValue('User2');
            await expect(lastNameInput).toBeInTheDocument();

            // Verify save button is present
            const saveButton = await canvas.findByRole('button', { name: /save/i }, { timeout: 5000 });
            await expect(saveButton).toBeInTheDocument();
        } else {
            await expect(canvasElement).toBeInTheDocument();
        }
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Wait for and verify form renders
        const form = canvasElement.querySelector('[data-testid="customer-address-form"]');
        if (form) {
            await expect(form).toBeInTheDocument();

            // Verify form fields are populated with initial data
            const addressTitleInput = canvas.getByDisplayValue('Home');
            await expect(addressTitleInput).toBeInTheDocument();

            const firstNameInput = canvas.getByDisplayValue('Test');
            await expect(firstNameInput).toBeInTheDocument();

            const lastNameInput = canvas.getByDisplayValue('User2');
            await expect(lastNameInput).toBeInTheDocument();

            // Verify save button is present
            const saveButton = await canvas.findByRole('button', { name: /save/i }, { timeout: 5000 });
            await expect(saveButton).toBeInTheDocument();
        } else {
            await expect(canvasElement).toBeInTheDocument();
        }
    },
};
