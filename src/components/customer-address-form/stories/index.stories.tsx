import type { Meta, StoryObj } from '@storybook/react-vite';
import { CustomerAddressForm } from '../index';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import type { ScapiFetcher } from '@/hooks/use-scapi-fetcher';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';

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

        // Find input by id attribute directly
        const firstNameInput = canvasElement.querySelector('input[id="firstName"]') as HTMLInputElement;
        await expect(firstNameInput).toBeInTheDocument();
        if (firstNameInput) {
            await userEvent.type(firstNameInput, 'John');
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
