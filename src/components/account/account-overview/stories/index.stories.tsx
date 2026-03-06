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
import { waitForStorybookReady } from '@storybook/test-utils';
import { MemoryRouter } from 'react-router';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';
import { CurrencyProvider } from '@/providers/currency';
import RecommendersProvider from '@/providers/recommenders';
import {
    AccountOverview,
    AccountOverviewSkeleton,
    WelcomeSection,
    QuickLinksSection,
    WelcomeSectionSkeleton,
    QuickLinksSectionSkeleton,
} from '../index';

// Mock customer data
const mockCustomer = {
    customerId: 'test-customer-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    login: 'john.doe@example.com',
};

/**
 * Account Overview Dashboard - Main "My Account" landing page
 *
 * This dashboard displays:
 * - Welcome back greeting with customer name
 * - Curated product recommendations (using Einstein)
 * - Quick Links to key account sections
 */
const meta: Meta<typeof AccountOverview> = {
    title: 'ACCOUNT/Account Overview',
    component: AccountOverview,
    // Note: 'skip-a11y' tag added because this component uses MemoryRouter and
    // ProductRecommendations which require proper context setup in test environments
    tags: ['autodocs', 'skip-a11y'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: `
The Account Overview Dashboard is the main landing page for the "My Account" section.

## Features
- **Welcome Section**: Personalized greeting with customer's first name
- **Curated for You**: Product recommendations powered by Einstein
- **Quick Links**: Navigation cards to key account sections (Account Details, Orders, Wishlist, Addresses)

## Usage
This component is typically rendered as the default view when users navigate to their account.
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <CurrencyProvider value="GBP">
                    <RecommendersProvider>
                        <MemoryRouter>
                            <Story />
                        </MemoryRouter>
                    </RecommendersProvider>
                </CurrencyProvider>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof AccountOverview>;

/**
 * Default state with customer data and all sections visible
 */
export const Default: Story = {
    args: {
        customer: mockCustomer,
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify welcome message is displayed
        await expect(canvas.getByText(/Welcome back, John!/i)).toBeInTheDocument();

        // Verify Quick Links section is present
        await expect(canvas.getByText(/Quick Links/i)).toBeInTheDocument();

        // Verify all quick link items are present by their headings
        await expect(canvas.getByRole('heading', { name: /Account Details/i })).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: /Order History/i })).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: /Wishlist/i })).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: /Addresses/i })).toBeInTheDocument();
    },
};

/**
 * Guest user view (no customer name)
 */
export const GuestUser: Story = {
    args: {
        customer: null,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the overview when no customer data is available, using a default greeting.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Verify default welcome message is displayed
        await expect(canvas.getByText(/Welcome back, there!/i)).toBeInTheDocument();
    },
};

// Welcome Section Stories
export const WelcomeSectionDefault: StoryObj<typeof WelcomeSection> = {
    render: (args) => <WelcomeSection {...args} />,
    args: {
        customer: mockCustomer,
    },
    parameters: {
        docs: {
            description: {
                story: 'The welcome section with personalized greeting.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText(/Welcome back, John!/i)).toBeInTheDocument();
    },
};

export const WelcomeSectionLoading: StoryObj<typeof WelcomeSectionSkeleton> = {
    render: () => <WelcomeSectionSkeleton />,
    parameters: {
        docs: {
            description: {
                story: 'Loading skeleton for the welcome section.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Verify skeleton elements are present
        const skeletons = canvasElement.querySelectorAll('[class*="animate-pulse"]');
        await expect(skeletons.length).toBeGreaterThan(0);
    },
};

// Quick Links Section Stories
export const QuickLinksSectionDefault: StoryObj<typeof QuickLinksSection> = {
    render: () => <QuickLinksSection />,
    parameters: {
        docs: {
            description: {
                story: 'Quick links navigation cards.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText(/Quick Links/i)).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: /Account Details/i })).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: /Order History/i })).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: /Wishlist/i })).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: /Addresses/i })).toBeInTheDocument();
    },
};

export const QuickLinksSectionLoading: StoryObj<typeof QuickLinksSectionSkeleton> = {
    render: () => <QuickLinksSectionSkeleton />,
    parameters: {
        docs: {
            description: {
                story: 'Loading skeleton for the quick links section.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Verify skeleton elements are present
        const skeletons = canvasElement.querySelectorAll('[class*="animate-pulse"]');
        await expect(skeletons.length).toBeGreaterThan(0);

        // Verify 4 quick link skeletons (items inside the grid)
        const grid = canvasElement.querySelector('.grid');
        const linkSkeletons = grid?.querySelectorAll('.rounded-xl.border');
        await expect(linkSkeletons?.length).toBe(4);
    },
};

// Full Skeleton Story
export const LoadingSkeleton: StoryObj<typeof AccountOverviewSkeleton> = {
    render: () => <AccountOverviewSkeleton />,
    parameters: {
        docs: {
            description: {
                story: 'Full loading skeleton for the account overview page.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        // Verify skeleton elements are present
        const skeletons = canvasElement.querySelectorAll('[class*="animate-pulse"]');
        await expect(skeletons.length).toBeGreaterThan(0);

        // Verify multiple cards are present
        const cards = canvasElement.querySelectorAll('[data-slot="card"]');
        await expect(cards.length).toBeGreaterThanOrEqual(3);
    },
};
