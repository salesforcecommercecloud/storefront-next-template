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

import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { AddressFormFields } from '../index';
import { createShippingAddressSchema } from '@/lib/checkout-schemas';
import { getTranslation } from '@/lib/i18next';

/**
 * The AddressFormFields component provides shared address form fields with Google Maps
 * autocomplete integration. It can be used for both shipping and billing addresses
 * by using the fieldPrefix prop.
 */

// Form data interfaces
interface ShippingFormData {
    firstName: string;
    lastName: string;
    address1: string;
    address2: string;
    city: string;
    stateCode: string;
    postalCode: string;
    phone: string;
}

interface BillingFormData {
    billingFirstName: string;
    billingLastName: string;
    billingAddress1: string;
    billingAddress2: string;
    billingCity: string;
    billingStateCode: string;
    billingPostalCode: string;
}

// Action logger for Storybook
function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logFieldChange = action('field-change');
        const logFieldFocus = action('field-focus');
        const logFieldBlur = action('field-blur');

        const deriveLabel = (el: HTMLInputElement | HTMLTextAreaElement): string => {
            if ('labels' in el && el.labels && el.labels.length > 0) {
                return el.labels[0].textContent?.trim() || '';
            }
            return el.getAttribute('name') || el.getAttribute('aria-label') || '';
        };

        const handleChange = (event: Event) => {
            const el = event.target as HTMLElement | null;
            if (!el || !root.contains(el)) return;

            if (el instanceof HTMLInputElement) {
                const label = deriveLabel(el);
                logFieldChange({ label, value: el.value });
            }
        };

        const handleFocus = (event: Event) => {
            const el = event.target as HTMLElement | null;
            if (!el || !root.contains(el)) return;
            if (el instanceof HTMLInputElement) {
                const label = deriveLabel(el);
                if (label) logFieldFocus({ label });
            }
        };

        const handleBlur = (event: Event) => {
            const el = event.target as HTMLElement | null;
            if (!el || !root.contains(el)) return;
            if (el instanceof HTMLInputElement) {
                const label = deriveLabel(el);
                if (label) logFieldBlur({ label });
            }
        };

        root.addEventListener('change', handleChange, true);
        root.addEventListener('focus', handleFocus, true);
        root.addEventListener('blur', handleBlur, true);

        return () => {
            root.removeEventListener('change', handleChange, true);
            root.removeEventListener('focus', handleFocus, true);
            root.removeEventListener('blur', handleBlur, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

// Wrapper component for shipping address form
function ShippingAddressFormWrapper({
    defaultValues = {},
    showPhone = true,
    autoFocus = false,
    className,
}: {
    defaultValues?: Partial<ShippingFormData>;
    showPhone?: boolean;
    autoFocus?: boolean;
    className?: string;
}) {
    const form = useForm<ShippingFormData>({
        defaultValues: {
            firstName: '',
            lastName: '',
            address1: '',
            address2: '',
            city: '',
            stateCode: '',
            postalCode: '',
            phone: '',
            ...defaultValues,
        },
    });

    return (
        <Form {...form}>
            <form data-testid="address-form-fields-form" className="space-y-4">
                <AddressFormFields
                    form={form}
                    showPhone={showPhone}
                    autoFocus={autoFocus}
                    className={className}
                    countryCode="US"
                />
            </form>
        </Form>
    );
}

// Wrapper with validation for FieldErrorValidation story
function ShippingAddressFormWrapperWithValidation() {
    const { t } = getTranslation();
    const schema = createShippingAddressSchema(t);
    const form = useForm<ShippingFormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            firstName: '',
            lastName: '',
            address1: '',
            address2: '',
            city: '',
            stateCode: '',
            postalCode: '',
            phone: '',
        },
    });

    return (
        <Form {...form}>
            <form
                data-testid="address-form-fields-form"
                className="space-y-4"
                onSubmit={(e) => void form.handleSubmit(() => {})(e)}>
                <AddressFormFields form={form} showPhone={true} countryCode="US" />
                <button type="submit">Save</button>
            </form>
        </Form>
    );
}

// Wrapper component for billing address form
function BillingAddressFormWrapper({
    defaultValues = {},
    className,
}: {
    defaultValues?: Partial<BillingFormData>;
    className?: string;
}) {
    const form = useForm<BillingFormData>({
        defaultValues: {
            billingFirstName: '',
            billingLastName: '',
            billingAddress1: '',
            billingAddress2: '',
            billingCity: '',
            billingStateCode: '',
            billingPostalCode: '',
            ...defaultValues,
        },
    });

    return (
        <Form {...form}>
            <form data-testid="billing-address-form-fields-form" className="space-y-4">
                <AddressFormFields
                    form={form}
                    fieldPrefix="billing"
                    showPhone={false}
                    className={className}
                    countryCode="US"
                />
            </form>
        </Form>
    );
}

const meta: Meta<typeof AddressFormFields> = {
    title: 'Components/Address Form Fields',
    component: AddressFormFields,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
The Address Form Fields component provides a reusable set of address input fields with Google Maps Places autocomplete integration.

**Features:**
- First name, last name, address, city, state, postal code, and phone fields
- Google Maps Places autocomplete for address suggestions
- Support for field name prefixes (e.g., 'billing' for billing addresses)
- Configurable phone field visibility
- Proper autocomplete attributes for browser autofill
- Responsive layout with grid-based field arrangement

**Usage:**
This component is designed to be used within a React Hook Form context. Pass the form instance
from useForm() to integrate with form validation and submission.

\`\`\`tsx
// For shipping address (no prefix)
<AddressFormFields form={form} showPhone={true} />

// For billing address (with prefix)
<AddressFormFields form={form} fieldPrefix="billing" showPhone={false} />
\`\`\`
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
        fieldPrefix: {
            description:
                'Prefix for field names (e.g., "billing" for billing address). When provided, field names become "billingFirstName", etc.',
            control: 'text',
        },
        showPhone: {
            description: 'Whether to show the phone field',
            control: 'boolean',
        },
        autoFocus: {
            description: 'Whether the address1 field should have autoFocus',
            control: 'boolean',
        },
        countryCode: {
            description: 'Country code for address autocomplete (default: "US")',
            control: 'text',
        },
        className: {
            description: 'Custom class name for the container',
            control: 'text',
        },
    },
    tags: ['autodocs', 'interaction'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default shipping address form with all fields
 */
export const Default: Story = {
    render: () => <ShippingAddressFormWrapper />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify form renders with all expected fields
        const form = canvasElement.querySelector('[data-testid="address-form-fields-form"]');
        await expect(form).toBeInTheDocument();

        // Verify all field labels are present
        await expect(canvas.getByText(/first name/i)).toBeInTheDocument();
        await expect(canvas.getByText(/last name/i)).toBeInTheDocument();
        await expect(canvas.getByText(/^address$/i)).toBeInTheDocument();
        await expect(canvas.getByText(/address line 2/i)).toBeInTheDocument();
        await expect(canvas.getByText(/^city$/i)).toBeInTheDocument();
        await expect(canvas.getByText(/state\/province/i)).toBeInTheDocument();
        await expect(canvas.getByText(/postal code/i)).toBeInTheDocument();
        await expect(canvas.getByText(/phone number/i)).toBeInTheDocument();

        // Test typing in first name field
        const firstNameInput = canvas.getByPlaceholderText(/first name/i);
        await expect(firstNameInput).toBeInTheDocument();
        await userEvent.type(firstNameInput, 'John');
        await expect(firstNameInput).toHaveValue('John');
    },
};

/**
 * Pre-filled shipping address form
 */
export const PrefilledShippingAddress: Story = {
    render: () => (
        <ShippingAddressFormWrapper
            defaultValues={{
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main Street',
                address2: 'Apt 4B',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                phone: '5551234567',
            }}
        />
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify form fields are populated with initial data (use role+name to avoid multiple matches)
        await expect(canvas.getByRole('textbox', { name: /first name/i })).toHaveValue('John');
        await expect(canvas.getByRole('textbox', { name: /last name/i })).toHaveValue('Doe');
        await expect(canvas.getByRole('textbox', { name: /^address$/i })).toHaveValue('123 Main Street');
        await expect(canvas.getByRole('textbox', { name: /address line 2/i })).toHaveValue('Apt 4B');
        await expect(canvas.getByRole('textbox', { name: /^city$/i })).toHaveValue('New York');
        await expect(canvas.getByRole('combobox', { name: /state/i })).toHaveValue('NY');
        await expect(canvas.getByRole('textbox', { name: /postal code/i })).toHaveValue('10001');
        await expect(canvas.getByRole('textbox', { name: /phone/i })).toHaveValue('5551234567');
    },
};

/**
 * Shipping address form without phone field
 */
export const WithoutPhone: Story = {
    render: () => <ShippingAddressFormWrapper showPhone={false} />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify phone field is not present
        await expect(canvas.queryByText(/phone number/i)).not.toBeInTheDocument();
        await expect(canvas.queryByPlaceholderText(/\(555\) 123-4567/i)).not.toBeInTheDocument();

        // Other fields should still be present
        await expect(canvas.getByText(/first name/i)).toBeInTheDocument();
        await expect(canvas.getByText(/last name/i)).toBeInTheDocument();
    },
};

/**
 * Billing address form with prefix
 */
export const BillingAddress: Story = {
    render: () => <BillingAddressFormWrapper />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify form renders
        const form = canvasElement.querySelector('[data-testid="billing-address-form-fields-form"]');
        await expect(form).toBeInTheDocument();

        // Verify field names have billing prefix
        const firstNameInput = canvas.getByPlaceholderText(/first name/i);
        await expect(firstNameInput).toHaveAttribute('name', 'billingFirstName');

        // Verify billing autocomplete attributes
        await expect(firstNameInput).toHaveAttribute('autocomplete', 'billing given-name');
    },
};

/**
 * Pre-filled billing address form
 */
export const PrefilledBillingAddress: Story = {
    render: () => (
        <BillingAddressFormWrapper
            defaultValues={{
                billingFirstName: 'Jane',
                billingLastName: 'Smith',
                billingAddress1: '456 Oak Avenue',
                billingAddress2: 'Suite 200',
                billingCity: 'Los Angeles',
                billingStateCode: 'CA',
                billingPostalCode: '90001',
            }}
        />
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify form fields are populated with billing address data (use role+name to avoid display-value ambiguity)
        await expect(canvas.getByRole('textbox', { name: /first name/i })).toHaveValue('Jane');
        await expect(canvas.getByRole('textbox', { name: /last name/i })).toHaveValue('Smith');
        await expect(canvas.getByRole('textbox', { name: /^address$/i })).toHaveValue('456 Oak Avenue');
        await expect(canvas.getByRole('textbox', { name: /address line 2/i })).toHaveValue('Suite 200');
        await expect(canvas.getByRole('textbox', { name: /^city$/i })).toHaveValue('Los Angeles');
        await expect(canvas.getByRole('combobox', { name: /state/i })).toHaveValue('CA');
        await expect(canvas.getByRole('textbox', { name: /postal code/i })).toHaveValue('90001');
    },
};

/**
 * Interactive form with field interactions
 */
export const Interactive: Story = {
    render: () => <ShippingAddressFormWrapper />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Fill out all form fields
        const firstNameInput = canvas.getByPlaceholderText(/first name/i);
        await userEvent.type(firstNameInput, 'Alice');
        await expect(firstNameInput).toHaveValue('Alice');

        const lastNameInput = canvas.getByPlaceholderText(/last name/i);
        await userEvent.type(lastNameInput, 'Johnson');
        await expect(lastNameInput).toHaveValue('Johnson');

        const addressInput = canvas.getByPlaceholderText(/street address/i);
        await userEvent.type(addressInput, '789 Pine Road');
        await expect(addressInput).toHaveValue('789 Pine Road');

        const address2Input = canvas.getByPlaceholderText(/apartment, suite/i);
        await userEvent.type(address2Input, 'Floor 3');
        await expect(address2Input).toHaveValue('Floor 3');

        const cityInput = canvas.getByPlaceholderText(/^city$/i);
        await userEvent.type(cityInput, 'Chicago');
        await expect(cityInput).toHaveValue('Chicago');

        const stateSelect = canvas.getByRole('combobox', { name: /state/i });
        await userEvent.selectOptions(stateSelect, 'IL');
        await expect(stateSelect).toHaveValue('IL');

        const postalCodeInput = canvas.getByPlaceholderText(/postal code/i);
        await userEvent.type(postalCodeInput, '60601');
        await expect(postalCodeInput).toHaveValue('60601');

        const phoneInput = canvas.getByPlaceholderText(/\(555\) 123-4567/i);
        await userEvent.type(phoneInput, '3125551234');
        await expect(phoneInput).toHaveValue('3125551234');
    },
};

/**
 * Field error validation - submit empty form and verify validation errors appear
 */
export const FieldErrorValidation: Story = {
    render: () => <ShippingAddressFormWrapperWithValidation />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const form = canvasElement.querySelector('[data-testid="address-form-fields-form"]');
        if (!form) {
            await expect(canvasElement).toBeInTheDocument();
            return;
        }

        const saveButton = canvas.getByRole('button', { name: /save/i });
        await userEvent.click(saveButton);

        // Validation shows multiple errors (firstName, lastName, address1, city) - use getAllByText
        const errors = canvas.getAllByText(/(first name|last name|address|city).*required/i);
        await expect(errors.length).toBeGreaterThanOrEqual(1);
    },
};

/**
 * Form with custom className
 */
export const WithCustomClassName: Story = {
    render: () => <ShippingAddressFormWrapper className="bg-muted p-4 rounded-lg" />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Verify custom class is applied
        const container = canvasElement.querySelector('.bg-muted.p-4.rounded-lg');
        await expect(container).toBeInTheDocument();
    },
};
