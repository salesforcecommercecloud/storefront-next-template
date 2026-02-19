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
import { action } from 'storybook/actions';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { AddPaymentMethodDialog } from '../add-payment-method-dialog';

const meta: Meta<typeof AddPaymentMethodDialog> = {
    title: 'Components/Payment Methods/Add Payment Method Dialog',
    component: AddPaymentMethodDialog,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockAddresses: ShopperCustomers.schemas['CustomerAddress'][] = [
    {
        addressId: 'address-1',
        firstName: 'John',
        lastName: 'Doe',
        address1: '123 Main Street',
        city: 'New York',
        stateCode: 'NY',
        postalCode: '10001',
        countryCode: 'US',
    },
    {
        addressId: 'address-2',
        firstName: 'Jane',
        lastName: 'Smith',
        address1: '456 Oak Avenue',
        city: 'Seattle',
        stateCode: 'WA',
        postalCode: '98101',
        countryCode: 'US',
    },
];

export const Default: Story = {
    args: {
        open: true,
        onOpenChange: action('onOpenChange'),
        onSubmit: action('onSubmit'),
        addresses: mockAddresses,
    },
};

export const NoAddresses: Story = {
    args: {
        open: true,
        onOpenChange: action('onOpenChange'),
        onSubmit: action('onSubmit'),
        addresses: [],
    },
};
