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
import { expect, within } from 'storybook/test';
import { action } from 'storybook/actions';
import { waitForStorybookReady } from '@storybook/test-utils';
import { AddAddressDialog } from '../add-address-dialog';
import { useEffect, useRef, useState, type ReactNode, type ReactElement } from 'react';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('add-address-dialog-click');
        const logSave = action('add-address-dialog-save');
        const logCancel = action('add-address-dialog-cancel');

        const handleClick = (event: MouseEvent) => {
            if (event.isTrusted === false) return;

            const target = event.target;
            if (!(target instanceof Element)) return;

            const interactive = target.closest('button, [role="button"], a, [role="link"]');
            if (!interactive || !root.contains(interactive)) return;

            if (interactive instanceof HTMLAnchorElement) {
                event.preventDefault();
            }

            const label = interactive.textContent?.trim() || interactive.getAttribute('aria-label') || '';

            if (label.toLowerCase().includes('save')) {
                logSave({ label });
            } else if (label.toLowerCase().includes('cancel')) {
                logCancel({ label });
            } else {
                logClick({ label });
            }
        };

        root.addEventListener('click', handleClick, true);

        return () => {
            root.removeEventListener('click', handleClick, true);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof AddAddressDialog> = {
    component: AddAddressDialog,
    title: 'CHECKOUT/AddAddressDialog',
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
### AddAddressDialog Component

This component provides a dialog form for adding a new shipping address during the multi-address checkout process. It includes all necessary address fields with validation.

**Key Features:**
- **Address Form**: Complete address form with first name, last name, address lines, city, state/province, postal code, country, and phone
- **Country Selection**: Dynamic state/province options based on selected country
- **Form Validation**: Client-side validation with error messages
- **Responsive Design**: Mobile and desktop optimized layouts
- **Internationalization**: Supports multiple countries and regions

**Dependencies:**
- \`@/components/ui/dialog\`: Dialog component
- \`@/components/ui/form\`: Form components with validation
- \`@/components/customer-address-form\`: Address form schema and utilities
- \`react-hook-form\`: Form state management
- \`zod\`: Schema validation
                `,
            },
        },
    },
    decorators: [
        (Story: React.ComponentType) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
    argTypes: {
        open: {
            control: 'boolean',
            description: 'Whether the dialog is open',
        },
        onOpenChange: {
            description: 'Callback function called when the dialog open state changes',
        },
        onSave: {
            description: 'Callback function called when the address is saved',
        },
        defaultValues: {
            control: 'object',
            description: 'Default values for the address form fields',
        },
    },
};

export default meta;
type Story = StoryObj<typeof AddAddressDialog>;

function DefaultDialog() {
    const [open, setOpen] = useState(true);
    return (
        <AddAddressDialog
            open={open}
            onOpenChange={setOpen}
            onSave={(address) => {
                action('address-saved')(address);
                setOpen(false);
            }}
        />
    );
}

export const Default: Story = {
    render: () => <DefaultDialog />,
    parameters: {
        docs: {
            description: {
                story: `
Default add address dialog with empty form fields.

### Features:
- All form fields are empty
- Country defaults to US
- Form validation enabled
- Save and cancel buttons available
                `,
            },
        },
    },
    play: async () => {
        const documentBody = within(document.body);

        // Wait for dialog to be ready
        await waitForStorybookReady(document.body);

        // Check for dialog
        const dialog = await documentBody.findByRole('dialog', {}, { timeout: 5000 });
        await expect(dialog).toBeInTheDocument();

        // Check for title
        const title = await documentBody.findByText(/add address/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();

        // Check for form fields
        const firstNameInput = await documentBody.findByPlaceholderText(/first name/i, {}, { timeout: 5000 });
        await expect(firstNameInput).toBeInTheDocument();

        const lastNameInput = await documentBody.findByPlaceholderText(/last name/i, {}, { timeout: 5000 });
        await expect(lastNameInput).toBeInTheDocument();

        // Check for buttons
        const cancelButton = await documentBody.findByRole('button', { name: /cancel/i }, { timeout: 5000 });
        await expect(cancelButton).toBeInTheDocument();

        const saveButton = await documentBody.findByRole('button', { name: /save/i }, { timeout: 5000 });
        await expect(saveButton).toBeInTheDocument();
    },
};

function WithDefaultValuesDialog() {
    const [open, setOpen] = useState(true);
    const defaultValues: Partial<ShopperCustomers.schemas['CustomerAddress']> = {
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main Street',
        address2: 'Apt 4B',
        city: 'San Francisco',
        stateCode: 'CA',
        postalCode: '94102',
        countryCode: 'US',
        phone: '555-123-4567',
        preferred: true,
    };
    return (
        <AddAddressDialog
            open={open}
            onOpenChange={setOpen}
            onSave={(address) => {
                action('address-saved')(address);
                setOpen(false);
            }}
            defaultValues={defaultValues}
        />
    );
}

export const WithDefaultValues: Story = {
    render: () => <WithDefaultValuesDialog />,
    parameters: {
        docs: {
            description: {
                story: `
Add address dialog with pre-filled default values.

### Features:
- Form fields are pre-populated with address data
- Useful for editing existing addresses
- All fields can still be modified
                `,
            },
        },
    },
    play: async () => {
        const documentBody = within(document.body);

        await waitForStorybookReady(document.body);

        // Check for dialog
        const dialog = await documentBody.findByRole('dialog', {}, { timeout: 5000 });
        await expect(dialog).toBeInTheDocument();

        // Check that form fields have default values
        const firstNameInput = await documentBody.findByDisplayValue('John', {}, { timeout: 5000 });
        await expect(firstNameInput).toBeInTheDocument();

        const lastNameInput = await documentBody.findByDisplayValue('Doe', {}, { timeout: 5000 });
        await expect(lastNameInput).toBeInTheDocument();
    },
};

function ClosedDialog() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button onClick={() => setOpen(true)}>Open Add Address Dialog</button>
            <AddAddressDialog
                open={open}
                onOpenChange={setOpen}
                onSave={(address) => {
                    action('address-saved')(address);
                    setOpen(false);
                }}
            />
        </>
    );
}

export const Closed: Story = {
    render: () => <ClosedDialog />,
    parameters: {
        docs: {
            description: {
                story: `
Add address dialog in closed state.

### Features:
- Dialog is not visible
- Can be opened via button
- Useful for testing dialog opening behavior
                `,
            },
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check that dialog is not visible
        const openButton = await canvas.findByRole('button', { name: /open add address dialog/i }, { timeout: 5000 });
        await expect(openButton).toBeInTheDocument();

        // Dialog should not be in document body
        const documentBody = within(document.body);
        const dialog = documentBody.queryByRole('dialog');
        await expect(dialog).toBeNull();
    },
};

function InternationalAddressDialog() {
    const [open, setOpen] = useState(true);
    const defaultValues: Partial<ShopperCustomers.schemas['CustomerAddress']> = {
        firstName: 'Jean',
        lastName: 'Dupont',
        address1: '123 Main Street',
        city: 'Toronto',
        stateCode: 'ON',
        postalCode: 'M5H 2N2',
        countryCode: 'CA',
        phone: '+1 416 555 1234',
    };
    return (
        <AddAddressDialog
            open={open}
            onOpenChange={setOpen}
            onSave={(address) => {
                action('address-saved')(address);
                setOpen(false);
            }}
            defaultValues={defaultValues}
        />
    );
}

export const InternationalAddress: Story = {
    render: () => <InternationalAddressDialog />,
    parameters: {
        docs: {
            description: {
                story: `
Add address dialog with international address (non-US).

### Features:
- Country selection set to non-US country
- State/province field adapts to selected country
- Postal code label adapts to country (ZIP vs Postal Code)
- Demonstrates international address support
                `,
            },
        },
    },
    play: async () => {
        const documentBody = within(document.body);

        await waitForStorybookReady(document.body);

        // Check for dialog
        const dialog = await documentBody.findByRole('dialog', {}, { timeout: 5000 });
        await expect(dialog).toBeInTheDocument();

        // Check that country is set to Canada
        // Find the country select by name attribute (more reliable than role when multiple selects exist)
        const countrySelect = document.querySelector('select[name="countryCode"]') as HTMLSelectElement;
        await expect(countrySelect).toBeInTheDocument();
        await expect(countrySelect).toHaveValue('CA');

        // Verify the selected option text shows "Canada"
        const selectedOption = countrySelect.options[countrySelect.selectedIndex];
        await expect(selectedOption?.textContent).toMatch(/canada/i);
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async () => {
        const documentBody = within(document.body);

        await waitForStorybookReady(document.body);

        // Check for dialog
        const dialog = await documentBody.findByRole('dialog', {}, { timeout: 5000 });
        await expect(dialog).toBeInTheDocument();

        // Check for title
        const title = await documentBody.findByText(/add address/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();

        // Check for form fields
        const firstNameInput = await documentBody.findByPlaceholderText(/first name/i, {}, { timeout: 5000 });
        await expect(firstNameInput).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async () => {
        const documentBody = within(document.body);

        await waitForStorybookReady(document.body);

        // Check for dialog
        const dialog = await documentBody.findByRole('dialog', {}, { timeout: 5000 });
        await expect(dialog).toBeInTheDocument();

        // Check for title
        const title = await documentBody.findByText(/add address/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async () => {
        const documentBody = within(document.body);

        await waitForStorybookReady(document.body);

        // Check for dialog
        const dialog = await documentBody.findByRole('dialog', {}, { timeout: 5000 });
        await expect(dialog).toBeInTheDocument();

        // Check for title
        const title = await documentBody.findByText(/add address/i, {}, { timeout: 5000 });
        await expect(title).toBeInTheDocument();
    },
};
