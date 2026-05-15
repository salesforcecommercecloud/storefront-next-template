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
import { Title, Description, Controls } from '@storybook/addon-docs/blocks';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { AddressFormFields } from '../index';
import { CheckoutActionLogger } from '@/components/checkout/storybook/checkout-action-logger';
import { checkoutStrictA11yParameters } from '@/components/checkout/storybook/checkout-strict-a11y-parameters';
import { createShippingAddressSchema, type ShippingAddressData } from '@/lib/checkout/schemas';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

interface BillingFormData {
    billingFirstName: string;
    billingLastName: string;
    billingAddress1: string;
    billingAddress2: string;
    billingCity: string;
    billingStateCode: string;
    billingPostalCode: string;
    billingCountryCode: string;
}

function ShippingAddressFormWrapper({
    defaultValues = {},
    showPhone = true,
    autoFocus = false,
    className,
    phoneRequired = false,
}: {
    defaultValues?: Partial<ShippingAddressData>;
    showPhone?: boolean;
    autoFocus?: boolean;
    className?: string;
    phoneRequired?: boolean;
}) {
    const form = useForm<ShippingAddressData>({
        defaultValues: {
            firstName: '',
            lastName: '',
            address1: '',
            address2: '',
            city: '',
            stateCode: '',
            postalCode: '',
            phoneCountryCode: '+1',
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
                    phoneRequired={phoneRequired}
                />
            </form>
        </Form>
    );
}

function ShippingAddressFormWrapperWithValidation() {
    const { t } = getTranslation();
    const schema = createShippingAddressSchema(t);
    const form = useForm<ShippingAddressData>({
        resolver: zodResolver(schema),
        defaultValues: {
            firstName: '',
            lastName: '',
            address1: '',
            address2: '',
            city: '',
            stateCode: '',
            postalCode: '',
            phoneCountryCode: '+1',
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
            billingCountryCode: 'US',
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
                    showCountry
                    labelsAsPlaceholders
                    className={className}
                    countryCode="US"
                />
            </form>
        </Form>
    );
}

const meta: Meta<typeof AddressFormFields> = {
    title: 'Components/AddressFormFields',
    component: AddressFormFields,
    tags: ['autodocs', 'interaction'],
    parameters: {
        ...checkoutStrictA11yParameters,
        layout: 'padded',
        a11y: {
            ...checkoutStrictA11yParameters.a11y,
            config: {
                rules: [{ id: 'color-contrast', enabled: false }],
            },
        },
        docs: {
            description: {
                component: `
### AddressFormFields Component

Shared, reusable address form fields with Google Maps Places autocomplete integration. Used by both the checkout shipping-address step and the billing-address section inside the payment step. The component is purely presentational — it renders form fields into an existing React Hook Form context and does not own form submission or validation.

**Key Features:**

- **Field prefix support** — \`fieldPrefix="billing"\` produces \`billingFirstName\`, \`billingAddress1\`, etc., allowing two address forms in the same \`<Form>\` without name collisions.
- **Google Maps autocomplete** — Typing in the Address Line 1 field triggers Places API suggestions; selecting one populates address1, city, stateCode, and postalCode.
- **Phone field** — Shown by default (\`showPhone\`). Includes a country-code dropdown (\`phoneCountryCode\`) and a phone input with format-on-blur (raw digits while typing, \`(555) 123-4567\` on blur). Hidden for billing addresses.
- **Labels as placeholders** — \`labelsAsPlaceholders\` hides \`<label>\` elements visually (sr-only) and moves label text into placeholders. Used for the billing address UX inside the payment step.
- **Country dropdown** — \`showCountry\` replaces the read-only country display with a \`<select>\`. Changing country toggles State/Province and Zip/Postal Code labels and swaps the state field between a dropdown (US/CA) and a free-text input (other countries).
- **Phone required** — \`phoneRequired\` appends an asterisk to the phone label/placeholder.
- **Autocomplete attributes** — Each field gets a proper \`autocomplete\` value scoped by section (\`shipping given-name\`, \`billing given-name\`), enabling correct browser autofill even with two address forms on the same page.

**Dependencies:**

- \`react-hook-form\`: form state, field registration, validation
- \`@/components/form-fields\`: \`FormInput\`, \`FormNativeSelect\` wrappers
- \`@/components/address-suggestion-dropdown\`: Google Maps Places autocomplete dropdown
- \`@/hooks/use-autocomplete-suggestions\`: Places API integration hook
- \`@/lib/address/phone-utils\`: \`formatPhoneInput\`, \`stripNonDigits\`, \`stripCountryCode\`
- \`@/lib/address/country-codes\`: phone country-code list
- \`@/components/customer-address-form/constants\`: \`COUNTRY_CODES\` array
`,
            },
            page: () => (
                <>
                    <Title />
                    <Description />
                    <Controls />
                </>
            ),
        },
    },
    decorators: [
        (Story) => (
            <CheckoutActionLogger name="address-form-fields">
                <Story />
            </CheckoutActionLogger>
        ),
        (Story) => (
            <div className="max-w-2xl">
                <Story />
            </div>
        ),
    ],
    argTypes: {
        form: {
            description:
                'React Hook Form instance from `useForm()`. The component renders fields into this form context.',
            table: { type: { summary: 'UseFormReturn<TFormValues>' } },
        },
        fieldPrefix: {
            description:
                'Prefix for field names. When `"billing"`, field names become `billingFirstName`, `billingAddress1`, etc. Empty string (default) produces unprefixed names for shipping.',
            control: 'text',
            table: { type: { summary: 'string' } },
        },
        showPhone: {
            description: 'Whether to show the phone country-code dropdown and phone number input. Default: `true`.',
            control: 'boolean',
            table: { type: { summary: 'boolean' } },
        },
        autoFocus: {
            description: 'Whether to auto-focus a field when the form renders. Default: `false`.',
            control: 'boolean',
            table: { type: { summary: 'boolean' } },
        },
        autoFocusField: {
            description:
                'Which field receives focus when `autoFocus` is true: `"firstName"` or `"address1"`. Default: `"address1"`.',
            control: 'radio',
            options: ['firstName', 'address1'],
            table: { type: { summary: "'firstName' | 'address1'" } },
        },
        countryCode: {
            description:
                'Country code for Google Maps autocomplete and for determining State vs Province / Zip vs Postal Code labels. Default: `"US"`.',
            control: 'text',
            table: { type: { summary: 'string' } },
        },
        className: {
            description: 'Custom CSS class name applied to the outermost container `<div>`.',
            control: 'text',
            table: { type: { summary: 'string' } },
        },
        labelsAsPlaceholders: {
            description:
                'Hides `<label>` elements visually (sr-only) and moves label text into input placeholders. Used for the billing address UX. Default: `false`.',
            control: 'boolean',
            table: { type: { summary: 'boolean' } },
        },
        showCountry: {
            description:
                'Replaces the read-only country display with a `<select>` dropdown. Changing country toggles State/Province and Zip/Postal Code labels. Default: `false`.',
            control: 'boolean',
            table: { type: { summary: 'boolean' } },
        },
        phoneRequired: {
            description:
                'Appends an asterisk to the phone label/placeholder to indicate the field is required. Default: `false`.',
            control: 'boolean',
            table: { type: { summary: 'boolean' } },
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default empty shipping address form with all fields visible including phone.
 */
export const EditView: Story = {
    render: () => <ShippingAddressFormWrapper />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('textbox', { name: /first name/i })).toBeInTheDocument();
        await expect(canvas.getByRole('textbox', { name: /last name/i })).toBeInTheDocument();
        await expect(canvas.getByRole('textbox', { name: /address line 1/i })).toBeInTheDocument();
        await expect(canvas.getByRole('textbox', { name: /address line 2/i })).toBeInTheDocument();
        await expect(canvas.getByRole('textbox', { name: /city/i })).toBeInTheDocument();
        await expect(canvas.getByLabelText(/state/i)).toBeInTheDocument();
        await expect(canvas.getByRole('textbox', { name: /zip code/i })).toBeInTheDocument();
        await expect(canvas.getByLabelText(/phone number/i)).toBeInTheDocument();
    },
};

/**
 * Shipping address form pre-filled with valid data. Verifies that defaultValues
 * propagate correctly through react-hook-form and that the state dropdown shows
 * the correct option.
 */
export const EditViewWithPrefilledData: Story = {
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

        await expect(canvas.getByRole('textbox', { name: /first name/i })).toHaveValue('John');
        await expect(canvas.getByRole('textbox', { name: /last name/i })).toHaveValue('Doe');
        await expect(canvas.getByRole('textbox', { name: /address line 1/i })).toHaveValue('123 Main Street');
        await expect(canvas.getByRole('textbox', { name: /address line 2/i })).toHaveValue('Apt 4B');
        await expect(canvas.getByRole('textbox', { name: /city/i })).toHaveValue('New York');
        await expect(canvas.getByRole('combobox', { name: /state/i })).toHaveValue('NY');
        await expect(canvas.getByRole('textbox', { name: /zip code/i })).toHaveValue('10001');
        await expect(canvas.getByRole('textbox', { name: /phone/i })).toHaveValue('5551234567');
    },
};

/**
 * Shipping address form with phone hidden. Verifies the phone field and
 * country code dropdown are not rendered.
 */
export const EditViewWithoutPhone: Story = {
    render: () => <ShippingAddressFormWrapper showPhone={false} />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.queryByLabelText(/phone number/i)).not.toBeInTheDocument();
        await expect(canvas.queryByLabelText(/^code$/i)).not.toBeInTheDocument();

        await expect(canvas.getByRole('textbox', { name: /first name/i })).toBeInTheDocument();
        await expect(canvas.getByRole('textbox', { name: /last name/i })).toBeInTheDocument();
    },
};

/**
 * Shipping address form with phoneRequired — the phone label shows an asterisk.
 */
export const EditViewWithPhoneRequired: Story = {
    render: () => <ShippingAddressFormWrapper phoneRequired />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const phoneLabel = canvas.getByText(/phone number\*/i);
        await expect(phoneLabel).toBeInTheDocument();
    },
};

/**
 * Submit empty form to trigger react-hook-form validation errors.
 * Asserts the exact translated error messages for all required fields.
 */
export const WithValidationErrors: Story = {
    render: () => <ShippingAddressFormWrapperWithValidation />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const saveButton = canvas.getByRole('button', { name: /save/i });
        await userEvent.click(saveButton);

        await expect(canvas.getByText('Please enter your first name.')).toBeInTheDocument();
        await expect(canvas.getByText('Please enter your last name.')).toBeInTheDocument();
        await expect(canvas.getByText('Please enter your address.')).toBeInTheDocument();
        await expect(canvas.getByText('Please enter your city.')).toBeInTheDocument();
        await expect(canvas.getByText('Please select your state.')).toBeInTheDocument();
        await expect(canvas.getByText('Please enter your zip code.')).toBeInTheDocument();
    },
};

/**
 * Billing address form with `fieldPrefix="billing"`, `showCountry`, and
 * `labelsAsPlaceholders`. Verifies prefixed field names, billing autocomplete
 * attributes, country dropdown, and sr-only labels.
 */
export const BillingAddress: Story = {
    render: () => <BillingAddressFormWrapper />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const firstNameInput = canvas.getByPlaceholderText(/first name\*/i);
        await expect(firstNameInput).toHaveAttribute('name', 'billingFirstName');
        await expect(firstNameInput).toHaveAttribute('autocomplete', 'billing given-name');

        await expect(canvas.getByRole('combobox', { name: /country/i })).toBeInTheDocument();

        await expect(canvas.queryByLabelText(/phone number/i)).not.toBeInTheDocument();
    },
};
