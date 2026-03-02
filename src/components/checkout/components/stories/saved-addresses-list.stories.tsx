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
import { expect, within, userEvent } from 'storybook/test';
import { action } from 'storybook/actions';
import { waitForStorybookReady } from '@storybook/test-utils';
import { SavedAddressesList } from '../saved-addresses-list';
import type { AddressBookItem } from '@/lib/customer-profile-utils';

const addresses: AddressBookItem[] = [
    {
        id: 'addr-1',
        firstName: 'Jane',
        lastName: 'Doe',
        address1: '123 Main St',
        address2: 'Apt 4',
        city: 'San Francisco',
        stateCode: 'CA',
        postalCode: '94102',
        countryCode: 'US',
        preferred: true,
    },
    {
        id: 'addr-2',
        firstName: 'Bob',
        lastName: 'Smith',
        address1: '456 Oak Ave',
        city: 'Boston',
        stateCode: 'MA',
        postalCode: '02101',
        countryCode: 'US',
        preferred: false,
    },
    {
        id: 'addr-3',
        firstName: 'Alice',
        lastName: 'Johnson',
        address1: '789 Pine Rd',
        city: 'Portland',
        stateCode: 'OR',
        postalCode: '97201',
        countryCode: 'US',
        preferred: false,
    },
    {
        id: 'addr-4',
        firstName: 'Charlie',
        lastName: 'Brown',
        address1: '321 Elm Blvd',
        city: 'Denver',
        stateCode: 'CO',
        postalCode: '80202',
        countryCode: 'US',
        preferred: false,
    },
    {
        id: 'addr-5',
        firstName: 'Diana',
        lastName: 'Prince',
        address1: '555 Cedar Ln',
        city: 'Seattle',
        stateCode: 'WA',
        postalCode: '98101',
        countryCode: 'US',
        preferred: false,
    },
];

const meta: Meta<typeof SavedAddressesList> = {
    title: 'CHECKOUT/SavedAddressesList',
    component: SavedAddressesList,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Displays multiple saved addresses as selectable radio cards in the Shipping Address checkout stage. Shows up to `maxVisible` (default 3) addresses with a "View All" control to expand the list.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        addresses: {
            description: 'List of saved addresses to display',
        },
        maxVisible: {
            control: 'number',
            description: 'Max number of addresses shown before "View All" (default 3)',
        },
        value: {
            control: 'text',
            description: 'Currently selected address id (controlled)',
        },
        onValueChange: {
            description: 'Callback when selection changes',
        },
        'aria-label': {
            control: 'text',
            description: 'Accessible label for the radio group',
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        addresses: addresses.slice(0, 2),
        onValueChange: action('onValueChange'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const radioGroup = canvas.getByRole('radiogroup');
        void expect(radioGroup).toBeInTheDocument();

        const radios = canvas.getAllByRole('radio');
        void expect(radios.length).toBe(2);

        void expect(canvas.getByText('Jane Doe')).toBeInTheDocument();
        void expect(canvas.getByText('Bob Smith')).toBeInTheDocument();
    },
};

export const PreferredSelected: Story = {
    args: {
        addresses: addresses.slice(0, 3),
        onValueChange: action('onValueChange'),
    },
    parameters: {
        docs: {
            description: {
                story: 'The preferred address is automatically selected by default.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const preferredRadio = canvas.getByRole('radio', { name: /jane doe/i });
        void expect(preferredRadio).toBeChecked();
    },
};

export const ControlledSelection: Story = {
    args: {
        addresses: addresses.slice(0, 3),
        value: 'addr-2',
        onValueChange: action('onValueChange'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Selection controlled externally via the `value` prop, overriding the default preferred address.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const selectedRadio = canvas.getByRole('radio', { name: /bob smith/i });
        void expect(selectedRadio).toBeChecked();

        const preferredRadio = canvas.getByRole('radio', { name: /jane doe/i });
        void expect(preferredRadio).not.toBeChecked();
    },
};

export const WithViewAll: Story = {
    args: {
        addresses,
        maxVisible: 3,
        onValueChange: action('onValueChange'),
    },
    parameters: {
        docs: {
            description: {
                story: 'When more addresses than `maxVisible` exist, a "View All" button appears to expand the full list.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        let radios = canvas.getAllByRole('radio');
        void expect(radios.length).toBe(3);

        const viewAllButton = canvas.getByRole('button', { name: /view all/i });
        void expect(viewAllButton).toBeInTheDocument();

        await userEvent.click(viewAllButton);

        radios = canvas.getAllByRole('radio');
        void expect(radios.length).toBe(5);

        const viewLessButton = canvas.getByRole('button', { name: /view less/i });
        void expect(viewLessButton).toBeInTheDocument();
    },
};

export const SingleAddress: Story = {
    args: {
        addresses: [addresses[0]],
        onValueChange: action('onValueChange'),
    },
    parameters: {
        docs: {
            description: {
                story: 'Only one saved address — no "View All" button is shown.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const radios = canvas.getAllByRole('radio');
        void expect(radios.length).toBe(1);

        void expect(canvas.queryByRole('button', { name: /view all/i })).toBeNull();
    },
};

export const EmptyAddresses: Story = {
    args: {
        addresses: [],
    },
    parameters: {
        docs: {
            description: {
                story: 'Renders nothing when the addresses list is empty.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        void expect(canvas.queryByRole('radiogroup')).toBeNull();
    },
};
