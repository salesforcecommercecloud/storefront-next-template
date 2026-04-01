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
import { useState } from 'react';
import { AddressModal } from '../address-modal';
import { checkoutStrictA11yParameters } from '@/components/checkout/storybook/checkout-strict-a11y-parameters';

const meta: Meta<typeof AddressModal> = {
    title: 'CHECKOUT/AddressModal',
    component: AddressModal,
    parameters: {
        ...checkoutStrictA11yParameters,
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Modal for adding a new shipping address during checkout. Save applies the address to the basket and closes the modal.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        open: {
            control: 'boolean',
            description: 'Whether the modal is open',
        },
        onOpenChange: {
            description: 'Callback when open state changes (e.g. cancel or close)',
        },
        countryCode: {
            control: 'text',
            description: 'Default country code (defaults to US)',
        },
        onSave: {
            description: 'Callback when form is submitted with valid address data; receives FormData',
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

function AddressModalWithState(args: Partial<React.ComponentProps<typeof AddressModal>>) {
    const [open, setOpen] = useState(args.open ?? false);
    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>
                Open modal
            </button>
            <AddressModal
                {...args}
                open={open}
                onOpenChange={(next) => {
                    setOpen(next);
                    args.onOpenChange?.(next);
                }}
            />
        </>
    );
}

export const Default: Story = {
    args: {
        open: true,
        onOpenChange: action('onOpenChange'),
        countryCode: 'US',
        onSave: action('onSave'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Dialog renders in a portal, so query from document.body
        const body = within(document.body);

        void expect(body.getByRole('dialog')).toBeInTheDocument();
        void expect(body.getByRole('heading', { name: 'Add New Address' })).toBeInTheDocument();
        void expect(body.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        void expect(body.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
    },
};

export const EditMode: Story = {
    args: {
        open: true,
        onOpenChange: action('onOpenChange'),
        countryCode: 'US',
        onSave: action('onSave'),
        isEditMode: true,
        defaultValues: {
            firstName: 'Jane',
            lastName: 'Doe',
            address1: '123 Main St',
            address2: 'Apt 4',
            city: 'San Francisco',
            stateCode: 'CA',
            postalCode: '94102',
        },
    },
    parameters: {
        docs: {
            description: {
                story: 'Modal in edit mode with pre-populated address fields. Title reads "Edit Address" instead of "Add Address".',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const body = within(document.body);

        void expect(body.getByRole('dialog')).toBeInTheDocument();
        void expect(body.getByRole('heading', { name: 'Edit Address' })).toBeInTheDocument();
        void expect(body.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
        void expect(body.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
    },
};

export const Closed: Story = {
    args: {
        open: false,
        onOpenChange: action('onOpenChange'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Dialog when closed is not in document (or only in canvas); check body for portaled content
        const body = within(document.body);
        void expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    },
};

export const WithCountrySelector: Story = {
    args: {
        open: true,
        onOpenChange: action('onOpenChange'),
        countryCode: 'CA',
        onSave: action('onSave'),
    },
    parameters: {
        docs: {
            description: {
                story: 'When showCountry is true, the modal includes a Country dropdown (e.g. for international addresses).',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        // Dialog renders in a portal, so query from document.body
        const body = within(document.body);

        void expect(body.getByRole('dialog')).toBeInTheDocument();
        const comboboxes = body.getAllByRole('combobox');
        void expect(comboboxes.length).toBeGreaterThanOrEqual(2);
    },
};

export const InteractiveOpenClose: Story = {
    render: (args) => <AddressModalWithState {...args} />,
    args: {
        onOpenChange: action('onOpenChange'),
        onSave: action('onSave'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Click "Open modal" to open the address modal.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        void expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
        const openButton = canvas.getByRole('button', { name: /open modal/i });
        void expect(openButton).toBeInTheDocument();
    },
};
