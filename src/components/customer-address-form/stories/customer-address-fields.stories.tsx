import type { Meta, StoryObj } from '@storybook/react-vite';
import { CustomerAddressFields } from '../customer-address-fields';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCustomerAddressFormSchema } from '../index';
import { getTranslation } from '@/lib/i18next';
import { Form } from '@/components/ui/form';

const meta: Meta<typeof CustomerAddressFields> = {
    title: 'FORMS/CustomerAddressFields',
    component: CustomerAddressFields,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Form fields component for editing customer address information. Renders all address input fields including title, name, phone, country, address lines, city, state/province, postal code, and preferred flag.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {},
};

export default meta;
type Story = StoryObj<typeof CustomerAddressFields>;

// Helper component to wrap with form
function FormWrapper() {
    const { t } = getTranslation();
    const form = useForm({
        resolver: zodResolver(createCustomerAddressFormSchema(t)),
        defaultValues: {
            addressId: '',
            firstName: '',
            lastName: '',
            phone: '',
            countryCode: 'US' as const,
            address1: '',
            address2: '',
            city: '',
            stateCode: '',
            postalCode: '',
            preferred: false,
        },
    });

    return (
        <Form {...form}>
            <CustomerAddressFields form={form} />
        </Form>
    );
}

export const Default: Story = {
    render: () => <FormWrapper />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Find input by id directly since label association uses generated IDs
        const firstNameInput = canvasElement.querySelector('input[id="firstName"]') as HTMLInputElement;
        await expect(firstNameInput).toBeInTheDocument();
        if (firstNameInput) {
            await userEvent.type(firstNameInput, 'John');
        }
    },
};

function FormWrapperWithData() {
    const { t } = getTranslation();
    const form = useForm({
        resolver: zodResolver(createCustomerAddressFormSchema(t)),
        defaultValues: {
            addressId: 'Home',
            firstName: 'John',
            lastName: 'Doe',
            phone: '555-1234',
            countryCode: 'US' as const,
            address1: '123 Main St',
            address2: 'Apt 4B',
            city: 'San Francisco',
            stateCode: 'CA',
            postalCode: '94102',
            preferred: true,
        },
    });

    return (
        <Form {...form}>
            <CustomerAddressFields form={form} />
        </Form>
    );
}

export const WithInitialData: Story = {
    render: () => <FormWrapperWithData />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const firstNameInput = canvas.getByDisplayValue('John');
        await expect(firstNameInput).toBeInTheDocument();
    },
};

function FormWrapperWithCanadianData() {
    const { t } = getTranslation();
    const form = useForm({
        resolver: zodResolver(createCustomerAddressFormSchema(t)),
        defaultValues: {
            addressId: 'Work',
            firstName: 'Jane',
            lastName: 'Smith',
            phone: '555-5678',
            countryCode: 'CA' as const,
            address1: '456 Yonge St',
            city: 'Toronto',
            stateCode: 'ON',
            postalCode: 'M5B 2H3',
            preferred: false,
        },
    });

    return (
        <Form {...form}>
            <CustomerAddressFields form={form} />
        </Form>
    );
}

export const WithCanadianAddress: Story = {
    render: () => <FormWrapperWithCanadianData />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Find select by id directly since label association uses generated IDs
        const provinceSelect = canvasElement.querySelector('select[id="stateCode"]') as HTMLSelectElement;
        await expect(provinceSelect).toBeInTheDocument();
    },
};
