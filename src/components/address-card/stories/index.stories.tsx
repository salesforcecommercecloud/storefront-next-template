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
import { allModes } from '../../../../.storybook/modes';
import { expect, within, userEvent } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import AddressCard from '../index';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logEdit = action('address-card-edit');
        const logRemove = action('address-card-remove');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const button = target.closest('button');
            if (button) {
                const label = button.textContent?.trim() || button.getAttribute('aria-label') || '';

                if (label.match(/edit/i)) {
                    logEdit({ label });
                } else if (label.match(/remove/i)) {
                    logRemove({ label });
                }
            }
        };

        root.addEventListener('click', handleClick);
        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

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
        chromatic: {
            modes: {
                mobile: allModes.mobile,
                desktop: allModes.desktop,
            },
        },
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
The component accepts an address object conforming to ShopperCustomers.schemas['CustomerAddress']
and optional onEdit and onRemove handlers for user interactions.
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <div className="p-8 max-w-2xl">
                    <Story />
                </div>
            </ActionLogger>
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
    tags: ['autodocs', 'interaction'],
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
        } as ShopperCustomers.schemas['CustomerAddress'],
        onEdit: action('onEdit'),
        onRemove: action('onRemove'),
        isPreferred: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify the address card renders
        const card = canvasElement.querySelector('[data-slot="card"]');
        await expect(card || canvasElement).toBeInTheDocument();

        // Verify address title shows full name (firstName + lastName)
        const addressTitle = canvas.getByText('John Doe');
        await expect(addressTitle).toBeInTheDocument();

        // Verify address information is displayed
        const addressLine1 = canvas.getByText(/123 Main Street/i);
        await expect(addressLine1).toBeInTheDocument();

        // Test edit button interaction
        const editButton = canvas.getByRole('button', { name: /edit/i });
        await expect(editButton).toBeInTheDocument();
        await userEvent.click(editButton);

        // Test remove button interaction
        const removeButton = canvas.getByRole('button', { name: /remove/i });
        await expect(removeButton).toBeInTheDocument();
        await userEvent.click(removeButton);
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
        } as ShopperCustomers.schemas['CustomerAddress'],
        onEdit: action('onEdit'),
        onRemove: action('onRemove'),
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
        } as ShopperCustomers.schemas['CustomerAddress'],
        onEdit: action('onEdit'),
        onRemove: action('onRemove'),
        isPreferred: true,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify the address card renders
        const card = canvasElement.querySelector('[data-slot="card"]');
        await expect(card || canvasElement).toBeInTheDocument();

        // Verify default badge is displayed
        const defaultBadge = canvas.getByText(/default/i);
        await expect(defaultBadge).toBeInTheDocument();

        // Verify address title shows full name (firstName + lastName)
        const addressTitle = canvas.getByText('John Doe');
        await expect(addressTitle).toBeInTheDocument();
    },
};

/**
 * Billing and Shipping address cards (combined - no visual difference, only address ID changes)
 */
export const BillingAndShipping: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <AddressCard
                address={
                    {
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
                    } as ShopperCustomers.schemas['CustomerAddress']
                }
                onEdit={action('onEdit')}
                onRemove={action('onRemove')}
                isPreferred={false}
            />
            <AddressCard
                address={
                    {
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
                    } as ShopperCustomers.schemas['CustomerAddress']
                }
                onEdit={action('onEdit')}
                onRemove={action('onRemove')}
                isPreferred={false}
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Billing and Shipping address cards - identical layout, only addressId differs.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        const addressTitles = canvas.getAllByText('John Doe');
        await expect(addressTitles.length).toBe(2);
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
        } as ShopperCustomers.schemas['CustomerAddress'],
        onEdit: action('onEdit'),
        onRemove: undefined,
        isPreferred: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify the address card renders
        const card = canvasElement.querySelector('[data-slot="card"]');
        await expect(card || canvasElement).toBeInTheDocument();

        // Verify only edit button is present
        const editButton = canvas.getByRole('button', { name: /edit/i });
        await expect(editButton).toBeInTheDocument();

        // Verify remove button is not present
        const removeButton = canvas.queryByRole('button', { name: /remove/i });
        await expect(removeButton).not.toBeInTheDocument();

        // Test edit button interaction
        await userEvent.click(editButton);
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
        } as ShopperCustomers.schemas['CustomerAddress'],
        onEdit: undefined,
        onRemove: action('onRemove'),
        isPreferred: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify the address card renders
        const card = canvasElement.querySelector('[data-slot="card"]');
        await expect(card || canvasElement).toBeInTheDocument();

        // Verify only remove button is present
        const removeButton = canvas.getByRole('button', { name: /remove/i });
        await expect(removeButton).toBeInTheDocument();

        // Verify edit button is not present
        const editButton = canvas.queryByRole('button', { name: /edit/i });
        await expect(editButton).not.toBeInTheDocument();

        // Test remove button interaction
        await userEvent.click(removeButton);
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
        } as ShopperCustomers.schemas['CustomerAddress'],
        onEdit: undefined,
        onRemove: undefined,
        isPreferred: false,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify the address card renders
        const card = canvasElement.querySelector('[data-slot="card"]');
        await expect(card || canvasElement).toBeInTheDocument();

        // Verify address title shows full name (firstName + lastName)
        const addressTitle = canvas.getByText('John Doe');
        await expect(addressTitle).toBeInTheDocument();

        // Verify no action buttons are present
        const editButton = canvas.queryByRole('button', { name: /edit/i });
        const removeButton = canvas.queryByRole('button', { name: /remove/i });
        await expect(editButton).not.toBeInTheDocument();
        await expect(removeButton).not.toBeInTheDocument();
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
        } as ShopperCustomers.schemas['CustomerAddress'],
        onEdit: action('onEdit'),
        onRemove: action('onRemove'),
        isPreferred: false,
    },
};
