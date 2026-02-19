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
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { PaymentMethods } from '../payment-methods';

const meta: Meta<typeof PaymentMethods> = {
    title: 'Components/Payment Methods/Payment Methods Component',
    component: PaymentMethods,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockCustomer: ShopperCustomers.schemas['Customer'] = {
    customerId: 'customer-1',
    addresses: [
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
    ],
};

export const WithPaymentMethods: Story = {
    args: {
        customer: mockCustomer,
    },
};

export const NoCustomer: Story = {
    args: {
        customer: null,
    },
};
