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
import AddressDisplay from '../index';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';

function AddressDisplayStoryHarness({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('address-display-click');
        const logHover = action('address-display-hover');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            logClick({ element: target.textContent?.trim() || '' });
        };

        const handleMouseOver = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;
            logHover({ element: target.textContent?.trim() || '' });
        };

        root.addEventListener('click', handleClick);
        root.addEventListener('mouseover', handleMouseOver);
        return () => {
            root.removeEventListener('click', handleClick);
            root.removeEventListener('mouseover', handleMouseOver);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

const meta: Meta<typeof AddressDisplay> = {
    title: 'COMMON/Address Display',
    component: AddressDisplay,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: `
A component that displays address information in a formatted way. Supports both OrderAddress and CustomerAddress types from the Commerce SDK.

### Features:
- Displays full name (firstName + lastName)
- Shows address lines (address1, address2)
- Formats city, state, and postal code
- Shows country code and phone number when available
- Handles missing address gracefully
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <AddressDisplayStoryHarness>
                <Story />
            </AddressDisplayStoryHarness>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof AddressDisplay>;

// Mock address data based on checkout-data.js structure
const mockAddress = {
    address1: '123 Main St',
    city: 'South Jordan',
    countryCode: 'US',
    firstName: 'Gurpreet',
    lastName: 'Saini',
    phone: '1233211234',
    postalCode: '84095',
    stateCode: 'UT',
};

const mockAddressWithAddress2 = {
    ...mockAddress,
    address2: 'Apt 4B',
};

const mockAddressMinimal = {
    address1: '456 Oak Avenue',
    city: 'Boston',
    countryCode: 'US',
    firstName: 'John',
    lastName: 'Doe',
    postalCode: '02101',
    stateCode: 'MA',
};

export const Default: Story = {
    render: () => <AddressDisplay address={mockAddress} />,
    parameters: {
        docs: {
            story: `
Standard address display with all common fields.

### Features:
- Address line 1
- Location line (postal code, city, state, country)
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for address
        const address = await canvas.findByText(/123 main st/i, {}, { timeout: 5000 });
        await expect(address).toBeInTheDocument();

        // Check for location line (postal, city, state, country)
        const locationLine = await canvas.findByText(/south jordan/i, {}, { timeout: 5000 });
        await expect(locationLine).toBeInTheDocument();
    },
};

export const WithAddress2: Story = {
    render: () => <AddressDisplay address={mockAddressWithAddress2} />,
    parameters: {
        docs: {
            story: `
Address display with a second address line (apartment, suite, etc.).

Note: The simplified AddressDisplay only shows address1 and location line.
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for address1 (address2 is not displayed in simplified view)
        const address = await canvas.findByText(/123 main st/i, {}, { timeout: 5000 });
        await expect(address).toBeInTheDocument();
    },
};

export const Minimal: Story = {
    render: () => <AddressDisplay address={mockAddressMinimal} />,
    parameters: {
        docs: {
            story: `
Address display with minimal required fields only.

### Features:
- Address line 1
- Location line (postal code, city, state, country)
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for address
        const address = await canvas.findByText(/456 oak avenue/i, {}, { timeout: 5000 });
        await expect(address).toBeInTheDocument();
    },
};

export const NoAddress: Story = {
    render: () => <AddressDisplay address={null as unknown as typeof mockAddress} />,
    parameters: {
        docs: {
            story: `
Handles the case when no address is provided.

### Features:
- Shows "No address provided" message
- Graceful fallback
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Check for no address message
        const message = await canvas.findByText(/no address provided/i, {}, { timeout: 5000 });
        await expect(message).toBeInTheDocument();
    },
};

export const WithName: Story = {
    render: () => <AddressDisplay address={mockAddress} showName />,
    parameters: {
        docs: {
            story: `
Address display with the name visible.

### Features:
- Shows full name (firstName + lastName) at the top
- Address line 1
- Location line (postal code, city, state, country)
            `,
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await waitForStorybookReady(canvasElement);

        // Check for full name
        const name = await canvas.findByText(/gurpreet saini/i, {}, { timeout: 5000 });
        await expect(name).toBeInTheDocument();

        // Check for address
        const address = await canvas.findByText(/123 main st/i, {}, { timeout: 5000 });
        await expect(address).toBeInTheDocument();
    },
};
