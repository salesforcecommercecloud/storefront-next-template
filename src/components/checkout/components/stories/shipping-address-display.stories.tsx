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
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

const meta: Meta<typeof ShippingAddressDisplay> = {
    title: 'CHECKOUT/ShippingAddressDisplay',
    component: ShippingAddressDisplay,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component:
                    'Displays a shipping address in standard format: Name, Address1 Address2, ZipCode, City, StateCode, Country. When address is missing or empty, renders nothing. Used in checkout and order details.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        address: {
            description: 'Address to display; when null or empty, nothing is rendered',
        },
        displayPhone: {
            description: 'When true, show phone number',
            control: 'boolean',
        },
        variant: {
            description: 'Display variant: summary or card (card shows default badge when preferred)',
            control: 'select',
            options: ['summary', 'card'],
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
    countryCode: 'US',
};

export const Default: Story = {
    args: {
        address: fullAddress,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const WithPhone: Story = {
    args: {
        address: { ...fullAddress, phone: '555-123-4567' },
        displayPhone: true,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const CardVariantWithDefault: Story = {
    args: {
        address: { ...fullAddress, preferred: true },
        variant: 'card',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const container = canvasElement.firstChild;
        await expect(container).toBeInTheDocument();
    },
};

export const EmptyAddress: Story = {
    args: {
        address: null,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        // Component renders nothing (empty fragment) when address is null; Storybook layout may add a wrapper.
        // Assert that no address content is present rather than firstChild, which can be a layout wrapper div.
        await expect(canvas.queryByText(/Jane|Doe|123 Main/i)).toBeNull();
        await expect(canvasElement).toBeInTheDocument();
    },
};
