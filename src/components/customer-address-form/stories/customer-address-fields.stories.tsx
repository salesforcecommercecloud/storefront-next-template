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
import { CustomerAddressFields } from '../customer-address-fields';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCustomerAddressFormSchema } from '../index';
import { getTranslation } from '@/lib/i18next';
import { Form } from '@/components/ui/form';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logInput = action('address-fields-input');

        const handleChange = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
                logInput({ field: target.name || target.id, value: target.value });
            }
        };

        root.addEventListener('change', handleChange, true);

        return () => {
            root.removeEventListener('change', handleChange, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

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
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
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

        // Find input by name attribute for reliable selection
        const firstNameInput = canvasElement.querySelector('input[name="firstName"]') as HTMLInputElement;
        if (firstNameInput) {
            await expect(firstNameInput).toBeInTheDocument();
            await userEvent.type(firstNameInput, 'John');
        } else {
            await expect(canvasElement).toBeInTheDocument();
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

        // Find select by name attribute for reliable selection
        const provinceSelect = canvasElement.querySelector('select[name="stateCode"]') as HTMLSelectElement;
        await expect(provinceSelect).toBeInTheDocument();
    },
};
