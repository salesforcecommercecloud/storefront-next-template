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
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig, mockLocale } from '@/test-utils/config';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';
import RecommendersProvider from '@/providers/recommenders';
import {
    AccountOverview,
    AccountOverviewSkeleton,
    WelcomeSection,
    QuickLinksSection,
    WelcomeSectionSkeleton,
    QuickLinksSectionSkeleton,
    AccountOverviewOrdersAwait,
    RecentOrdersSectionSkeleton,
} from '../index';
import type { CustomerOrdersResult } from '@/lib/api/order.server';
import heroNewArrivals from '/images/hero-02.webp';

const mockCustomer = {
    customerId: 'test-customer-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    login: 'john.doe@example.com',
};

const mockOrders: CustomerOrdersResult = {
    orders: [
        {
            orderNo: 'INV001',
            orderDate: '2024-09-14T10:30:00Z',
            status: 'ready_for_pickup',
            statusLabel: 'Ready for Pickup',
            total: 250.0,
            currency: 'GBP',
            itemCount: 4,
            productItems: [
                { productId: 'prod-1', quantity: 1, imageUrl: heroNewArrivals, imageAlt: 'Classic White Shirt' },
                { productId: 'prod-2', quantity: 1, imageUrl: heroNewArrivals, imageAlt: 'Blue Dress Pants' },
                { productId: 'prod-3', quantity: 1, imageUrl: heroNewArrivals, imageAlt: 'Silk Scarf' },
                { productId: 'prod-4', quantity: 1, imageUrl: heroNewArrivals, imageAlt: 'Leather Handbag' },
            ],
            pickupLocation: {
                name: 'Market Street San Francisco',
                address: '415 Mission Street',
                city: 'San Francisco',
                state: 'CA',
                postalCode: '94105',
            },
        },
        {
            orderNo: 'INV002',
            orderDate: '2024-09-10T14:00:00Z',
            status: 'completed',
            statusLabel: 'Completed',
            total: 89.99,
            currency: 'GBP',
            itemCount: 1,
            productItems: [{ productId: 'prod-5', quantity: 1, imageUrl: heroNewArrivals, imageAlt: 'Running Shoes' }],
        },
    ],
    total: 2,
    offset: 0,
    limit: 5,
};

const emptyOrders: CustomerOrdersResult = {
    orders: [],
    total: 0,
    offset: 0,
    limit: 5,
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
- **Quick Links**: Navigation cards to key account sections (Account Details, Manage Addresses, Payment Methods, Order History)

## Usage
This component is typically rendered as the default view when users navigate to their account.
                `,
            },
        },
    },
    decorators: [
        (Story) => (
            <ConfigProvider config={mockConfig}>
                <SiteProvider site={mockConfig.commerce.sites[0]} locale={mockLocale} language="en-GB" currency="GBP">
                    <RecommendersProvider>
                        <MemoryRouter>
                            <Story />
                        </MemoryRouter>
                    </RecommendersProvider>
                </SiteProvider>
            </ConfigProvider>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof AccountOverview>;

/**
 * Default state with customer data, recent orders, and all sections visible
 */
export const Default: Story = {
    args: {
        customer: mockCustomer,
        ordersPromise: Promise.resolve(mockOrders),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText(/Welcome back, John!/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Recent Orders/i)).toBeInTheDocument();
        await expect(canvas.getByText(/Quick Links/i)).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: /Account Details/i })).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: /Manage Addresses/i })).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: /Payment Methods/i })).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: /Order History/i })).toBeInTheDocument();
    },
};

/**
 * Guest user view (no customer name)
 */
export const GuestUser: Story = {
    args: {
        customer: null,
        ordersPromise: Promise.resolve(emptyOrders),
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

        await expect(canvas.getByText(/Welcome back, there!/i)).toBeInTheDocument();
    },
};

/**
 * Overview without orders (no ordersPromise provided)
 */
export const WithoutOrders: Story = {
    args: {
        customer: mockCustomer,
    },
    parameters: {
        docs: {
            description: {
                story: 'Account overview without the recent orders section (ordersPromise not provided).',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText(/Welcome back, John!/i)).toBeInTheDocument();
        await expect(canvas.queryByText(/Recent Orders/i)).not.toBeInTheDocument();
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

// Recent Orders Section Stories
export const RecentOrdersDefault: StoryObj<typeof AccountOverviewOrdersAwait> = {
    render: (args) => <AccountOverviewOrdersAwait {...args} />,
    args: {
        ordersPromise: Promise.resolve(mockOrders),
    },
    parameters: {
        docs: {
            description: {
                story: 'Recent orders section showing the last 5 orders with a View All link.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText(/Recent Orders/i)).toBeInTheDocument();
        await expect(canvas.getByRole('link', { name: /View All/i })).toBeInTheDocument();
        await expect(canvas.getByText('INV001')).toBeInTheDocument();
        await expect(canvas.getByText('INV002')).toBeInTheDocument();
    },
};

export const RecentOrdersEmpty: StoryObj<typeof AccountOverviewOrdersAwait> = {
    render: (args) => <AccountOverviewOrdersAwait {...args} />,
    args: {
        ordersPromise: Promise.resolve(emptyOrders),
    },
    parameters: {
        docs: {
            description: {
                story: 'Recent orders section when the shopper has no order history.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText(/Recent Orders/i)).toBeInTheDocument();
        await expect(canvas.getByRole('link', { name: /View All/i })).toBeInTheDocument();
    },
};

export const RecentOrdersLoading: StoryObj<typeof RecentOrdersSectionSkeleton> = {
    render: () => <RecentOrdersSectionSkeleton />,
    parameters: {
        docs: {
            description: {
                story: 'Loading skeleton for the recent orders section.',
            },
        },
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);

        const skeletons = canvasElement.querySelectorAll('[data-slot="skeleton"]');
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
        await expect(canvas.getByRole('heading', { name: /Manage Addresses/i })).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: /Payment Methods/i })).toBeInTheDocument();
        await expect(canvas.getByRole('heading', { name: /Order History/i })).toBeInTheDocument();
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
        const linkSkeletons = grid?.querySelectorAll('.rounded-none.border');
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
