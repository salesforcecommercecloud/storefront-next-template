/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import AddressCard from './index';
import type { ShopperCustomersTypes } from 'commerce-sdk-isomorphic';

/**
 * The AddressCard component displays a single customer address with edit and remove actions.
 * It provides a card-based layout for displaying address information with optional
 * edit and remove handlers.
 */
const meta: Meta<typeof AddressCard> = {
    title: 'Components/Address Card',
    component: AddressCard,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
The Address Card component provides a card-based layout for displaying customer address information.

**Features:**
- Displays address information using AddressDisplay component
- Shows address type badges (Billing/Shipping) when applicable
- Shows preferred badge for preferred addresses
- Edit and remove action buttons
- Responsive design with shadcn/ui components

**Usage:**
The component accepts an address object conforming to ShopperCustomersTypes.CustomerAddress
and optional onEdit and onRemove handlers for user interactions.
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
        address: {
            description: 'The address data to display',
            control: 'object',
        },
        onEdit: {
            description: 'Callback function called when the edit button is clicked',
            action: 'edit',
        },
        onRemove: {
            description: 'Callback function called when the remove button is clicked',
            action: 'remove',
        },
        isPreferred: {
            description: 'Whether this address is the preferred address',
            control: 'boolean',
        },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default address card with complete address information
 */
export const Default: Story = {
    args: {
        address: {
            addressId: 'address-1',
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main Street',
            address2: 'Apt 4B',
            city: 'New York',
            stateCode: 'NY',
            postalCode: '10001',
            countryCode: 'US',
            phone: '555-123-4567',
        } as ShopperCustomersTypes.CustomerAddress,
        onEdit: () => {
            // eslint-disable-next-line no-console
            console.log('Edit clicked');
        },
        onRemove: () => {
            // eslint-disable-next-line no-console
            console.log('Remove clicked');
        },
        isPreferred: false,
    },
};

/**
 * Address card with minimal address information
 */
export const MinimalAddress: Story = {
    args: {
        address: {
            addressId: 'address-2',
            firstName: 'Jane',
            lastName: 'Smith',
            address1: '456 Oak Avenue',
            city: 'Seattle',
            countryCode: 'US',
        } as ShopperCustomersTypes.CustomerAddress,
        onEdit: () => {
            // eslint-disable-next-line no-console
            console.log('Edit clicked');
        },
        onRemove: () => {
            // eslint-disable-next-line no-console
            console.log('Remove clicked');
        },
        isPreferred: false,
    },
};

/**
 * Preferred address card
 */
export const PreferredAddress: Story = {
    args: {
        address: {
            addressId: 'address-3',
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main Street',
            address2: 'Apt 4B',
            city: 'New York',
            stateCode: 'NY',
            postalCode: '10001',
            countryCode: 'US',
            phone: '555-123-4567',
            preferred: true,
        } as ShopperCustomersTypes.CustomerAddress,
        onEdit: () => {
            // eslint-disable-next-line no-console
            console.log('Edit clicked');
        },
        onRemove: () => {
            // eslint-disable-next-line no-console
            console.log('Remove clicked');
        },
        isPreferred: true,
    },
};

/**
 * Billing address card
 */
export const BillingAddress: Story = {
    args: {
        address: {
            addressId: 'billing-address-1',
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main Street',
            address2: 'Apt 4B',
            city: 'New York',
            stateCode: 'NY',
            postalCode: '10001',
            countryCode: 'US',
            phone: '555-123-4567',
        } as ShopperCustomersTypes.CustomerAddress,
        onEdit: () => {
            // eslint-disable-next-line no-console
            console.log('Edit clicked');
        },
        onRemove: () => {
            // eslint-disable-next-line no-console
            console.log('Remove clicked');
        },
        isPreferred: false,
    },
};

/**
 * Shipping address card
 */
export const ShippingAddress: Story = {
    args: {
        address: {
            addressId: 'shipping-address-1',
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main Street',
            address2: 'Apt 4B',
            city: 'New York',
            stateCode: 'NY',
            postalCode: '10001',
            countryCode: 'US',
            phone: '555-123-4567',
        } as ShopperCustomersTypes.CustomerAddress,
        onEdit: () => {
            // eslint-disable-next-line no-console
            console.log('Edit clicked');
        },
        onRemove: () => {
            // eslint-disable-next-line no-console
            console.log('Remove clicked');
        },
        isPreferred: false,
    },
};

/**
 * Address card with only edit action
 */
export const EditOnly: Story = {
    args: {
        address: {
            addressId: 'address-4',
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main Street',
            city: 'New York',
            stateCode: 'NY',
            postalCode: '10001',
            countryCode: 'US',
        } as ShopperCustomersTypes.CustomerAddress,
        onEdit: () => {
            // eslint-disable-next-line no-console
            console.log('Edit clicked');
        },
        isPreferred: false,
    },
};

/**
 * Address card with only remove action
 */
export const RemoveOnly: Story = {
    args: {
        address: {
            addressId: 'address-5',
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main Street',
            city: 'New York',
            stateCode: 'NY',
            postalCode: '10001',
            countryCode: 'US',
        } as ShopperCustomersTypes.CustomerAddress,
        onRemove: () => {
            // eslint-disable-next-line no-console
            console.log('Remove clicked');
        },
        isPreferred: false,
    },
};

/**
 * Address card without actions
 */
export const NoActions: Story = {
    args: {
        address: {
            addressId: 'address-6',
            firstName: 'John',
            lastName: 'Doe',
            address1: '123 Main Street',
            city: 'New York',
            stateCode: 'NY',
            postalCode: '10001',
            countryCode: 'US',
        } as ShopperCustomersTypes.CustomerAddress,
        isPreferred: false,
    },
};

/**
 * International address card (UK)
 */
export const InternationalAddress: Story = {
    args: {
        address: {
            addressId: 'address-7',
            firstName: 'David',
            lastName: 'Taylor',
            address1: '10 Downing Street',
            city: 'London',
            postalCode: 'SW1A 2AA',
            countryCode: 'GB',
            phone: '+44 20 1234 5678',
        } as ShopperCustomersTypes.CustomerAddress,
        onEdit: () => {
            // eslint-disable-next-line no-console
            console.log('Edit clicked');
        },
        onRemove: () => {
            // eslint-disable-next-line no-console
            console.log('Remove clicked');
        },
        isPreferred: false,
    },
};
