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
import ShippingAddressDisplay from '../shipping-address-display';
import { expect } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

const meta: Meta<typeof ShippingAddressDisplay> = {
    title: 'CHECKOUT/ShippingAddressDisplay',
    component: ShippingAddressDisplay,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Displays a shipping address (name, lines, city/state/postal, phone). When address is missing or empty, shows notProvidedText. Used in checkout and order details.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        address: {
            description: 'Address to display; when null or empty, notProvidedText is shown',
        },
        displayPhone: {
            description: 'Optional phone to show instead of address.phone',
            control: 'text',
        },
        notProvidedText: {
            description: 'Shown when address is missing or empty',
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof ShippingAddressDisplay>;

const fullAddress = {
    firstName: 'Jane',
    lastName: 'Doe',
    address1: '123 Main St',
    address2: 'Apt 4',
    city: 'San Francisco',
    stateCode: 'CA',
    postalCode: '94102',
    phone: '(555) 123-4567',
};

export const Default: Story = {
    args: {
        address: fullAddress,
        notProvidedText: 'Shipping address not provided yet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const NotProvided: Story = {
    args: {
        address: null,
        notProvidedText: 'Shipping address not provided yet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};
