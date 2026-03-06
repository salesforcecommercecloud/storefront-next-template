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
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { OrderList, OrderListHeader, OrderListBody, type Order } from '../index';
import heroNewArrivals from '/images/hero-new-arrivals.webp';

function ActionLogger({ children }: { children: ReactNode }): ReactElement {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        const logClick = action('interaction');

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target || !root.contains(target)) return;

            const element = target.closest('button, a, input, select, [role="button"]');

            if (element) {
                const label =
                    element.textContent?.trim() || element.getAttribute('aria-label') || element.tagName.toLowerCase();
                logClick({ type: 'click', element: element.tagName.toLowerCase(), label });
            }
        };

        root.addEventListener('click', handleClick);

        return () => {
            root.removeEventListener('click', handleClick);
        };
    }, []);

    return <div ref={containerRef}>{children}</div>;
}

// Test data for stories with new Order type structure
const testOrders: Order[] = [
    {
        orderNo: 'INV001',
        orderDate: '2024-09-14T10:30:00Z',
        status: 'created',
        statusLabel: 'Created',
        total: 48.38,
        itemCount: 2,
        productItems: [
            { productId: 'prod-1', imageAlt: 'Classic Shirt', quantity: 1, imageUrl: heroNewArrivals },
            { productId: 'prod-2', imageAlt: 'Dress Pants', quantity: 2, imageUrl: heroNewArrivals },
        ],
        pickupLocation: {
            name: 'Salesforce Foundations San Francisco',
            address: '415 Mission Street',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94105',
        },
    },
    {
        orderNo: 'INV002',
        orderDate: '2024-09-12T14:00:00Z',
        status: 'new',
        statusLabel: 'New',
        total: 43.0,
        itemCount: 1,
        productItems: [{ productId: 'prod-3', imageAlt: 'Summer Dress', quantity: 2, imageUrl: heroNewArrivals }],
    },
    {
        orderNo: 'INV003',
        orderDate: '2024-09-10T08:00:00Z',
        status: 'failed_with_reopen',
        statusLabel: 'Failed With Reopen',
        total: 54.0,
        itemCount: 4,
        productItems: [
            { productId: 'prod-4', imageAlt: 'Item 1', quantity: 3, imageUrl: heroNewArrivals },
            { productId: 'prod-5', imageAlt: 'Item 2', quantity: 2, imageUrl: heroNewArrivals },
            { productId: 'prod-6', imageAlt: 'Item 3', quantity: 4, imageUrl: heroNewArrivals },
            { productId: 'prod-7', imageAlt: 'Item 4', quantity: 1, imageUrl: heroNewArrivals },
        ],
    },
    {
        orderNo: 'INV004',
        orderDate: '2024-09-08T11:30:00Z',
        status: 'cancelled',
        statusLabel: 'Cancelled',
        total: 95.92,
        itemCount: 2,
        productItems: [
            { productId: 'prod-8', imageAlt: 'Cancelled Item 1', quantity: 2, imageUrl: heroNewArrivals },
            { productId: 'prod-9', imageAlt: 'Cancelled Item 2', quantity: 3, imageUrl: heroNewArrivals },
        ],
    },
    {
        orderNo: 'INV005',
        orderDate: '2024-09-01T09:00:00Z',
        status: 'completed',
        statusLabel: 'Completed',
        total: 405.0,
        itemCount: 18,
        productItems: Array.from({ length: 18 }, (_, i) => ({
            productId: `prod-${i + 10}`,
            imageAlt: `Product ${i + 1}`,
            quantity: i % 3 === 0 ? 2 : 1,
            imageUrl: heroNewArrivals,
        })),
    },
];

const meta: Meta<typeof OrderList> = {
    title: 'ACCOUNT/Order List',
    component: OrderList,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'A reusable component to display a list of customer orders with product thumbnails, status badges, pickup locations, and action buttons.',
            },
        },
    },
    tags: ['autodocs', 'interaction'],
    argTypes: {
        title: {
            description: 'Title/header text to display',
            control: 'text',
        },
        subtitle: {
            description: 'Subtitle/description text to display',
            control: 'text',
        },
        orders: {
            description: 'Array of orders to display',
            control: false,
        },
        emptyMessage: {
            description: 'Text to display when no orders are found',
            control: 'text',
        },
        maxThumbnails: {
            description: 'Maximum number of product thumbnails to show per order',
            control: { type: 'number', min: 1, max: 20 },
        },
        onViewDetails: {
            description: 'Callback when View Details is clicked',
            action: 'viewDetails',
        },
    },
    decorators: [
        (Story) => (
            <ActionLogger>
                <Story />
            </ActionLogger>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof OrderList>;

export const Default: Story = {
    args: {
        title: 'Order History',
        subtitle: 'View and track your orders',
        orders: testOrders,
        onViewDetails: action('viewDetails'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check title is rendered
        const heading = canvas.getByRole('heading', { level: 3 });
        await expect(heading).toHaveTextContent('Order History');

        // Check subtitle is rendered
        await expect(canvas.getByText('View and track your orders')).toBeInTheDocument();

        // Check orders are rendered (via status labels)
        await expect(canvas.getByText('Created')).toBeInTheDocument();
        await expect(canvas.getByText('New')).toBeInTheDocument();

        // Check View Order Details links exist
        const viewDetailsLinks = canvas.getAllByText('View Order Details');
        await expect(viewDetailsLinks.length).toBe(5);
    },
};

export const EmptyState: Story = {
    args: {
        title: 'Order History',
        subtitle: 'View and track your orders',
        orders: [],
        onViewDetails: action('viewDetails'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check empty message is displayed (from translation key orders.empty)
        await expect(
            canvas.getByText("You haven't placed an order yet. Once you place an order the details will show up here.")
        ).toBeInTheDocument();

        // Check Continue Shopping button is displayed
        const continueShoppingLink = canvas.getByRole('link', { name: 'Continue Shopping' });
        await expect(continueShoppingLink).toBeInTheDocument();
        await expect(continueShoppingLink).toHaveAttribute('href', '/');

        // Check no View Order Details links exist
        const viewDetailsLinks = canvas.queryAllByText('View Order Details');
        await expect(viewDetailsLinks.length).toBe(0);
    },
};

export const WithPickupLocation: Story = {
    args: {
        title: 'Orders with Pickup',
        subtitle: 'Orders ready for in-store pickup',
        orders: [testOrders[0]], // First order has pickup location
        onViewDetails: action('viewDetails'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check pickup location is displayed
        await expect(canvas.getByText('Pickup Location')).toBeInTheDocument();
        await expect(canvas.getByText('Salesforce Foundations San Francisco')).toBeInTheDocument();
        await expect(canvas.getByText('415 Mission Street, San Francisco, CA 94105')).toBeInTheDocument();
    },
};

export const WithProductImages: Story = {
    args: {
        title: 'Orders with Product Images',
        subtitle: 'Orders showing product thumbnails with alt text',
        orders: [
            {
                orderNo: 'INV010',
                orderDate: '2024-09-14T10:30:00Z',
                status: 'completed',
                statusLabel: 'Completed',
                total: 120.0,
                itemCount: 2,
                productItems: [
                    {
                        productId: 'prod-1',
                        quantity: 1,
                        imageUrl: heroNewArrivals,
                        imageAlt: 'Classic White Shirt - Front View',
                    },
                    {
                        productId: 'prod-2',
                        quantity: 1,
                        imageUrl: heroNewArrivals,
                        imageAlt: 'Blue Dress Pants - Side View',
                    },
                ],
            },
        ],
        onViewDetails: action('viewDetails'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const images = canvas.getAllByRole('img');
        await expect(images.length).toBe(2);
        await expect(images[0]).toHaveAttribute('alt', 'Classic White Shirt - Front View');
        await expect(images[1]).toHaveAttribute('alt', 'Blue Dress Pants - Side View');
    },
};

export const WithoutProductImages: Story = {
    args: {
        title: 'Orders Without Images',
        subtitle: 'Orders where product images are not available',
        orders: [
            {
                orderNo: 'INV011',
                orderDate: '2024-09-14T10:30:00Z',
                status: 'new',
                statusLabel: 'New',
                total: 75.0,
                itemCount: 2,
                productItems: [
                    { productId: 'prod-1', imageAlt: 'Product A', quantity: 1 },
                    { productId: 'prod-2', imageAlt: 'Product B', quantity: 3 },
                ],
            },
        ],
        onViewDetails: action('viewDetails'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const images = canvas.queryAllByRole('img');
        await expect(images.length).toBe(0);
    },
};

export const WithManyProducts: Story = {
    args: {
        title: 'Large Order',
        subtitle: 'Order with many items showing overflow',
        orders: [testOrders[4]], // Last order has 18 items
        maxThumbnails: 12,
        onViewDetails: action('viewDetails'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check that overflow indicator is shown (+6 for 18 items with max 12)
        await expect(canvas.getByText('+6')).toBeInTheDocument();
    },
};

// --- OrderListHeader Stories ---

export const HeaderWithSubtitle: StoryObj<typeof OrderListHeader> = {
    render: () => <OrderListHeader title="Order History" subtitle="View and track your orders" />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('heading', { level: 3 })).toHaveTextContent('Order History');
        await expect(canvas.getByText('View and track your orders')).toBeInTheDocument();
    },
};

export const HeaderWithoutSubtitle: StoryObj<typeof OrderListHeader> = {
    render: () => <OrderListHeader title="My Orders" />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('heading', { level: 3 })).toHaveTextContent('My Orders');
    },
};

// --- OrderListBody Stories ---

export const BodyWithOrders: StoryObj<typeof OrderListBody> = {
    render: () => (
        <ActionLogger>
            <OrderListBody orders={testOrders} onViewDetails={action('viewDetails')} />
        </ActionLogger>
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Created')).toBeInTheDocument();
        await expect(canvas.getByText('New')).toBeInTheDocument();
        const viewDetailsLinks = canvas.getAllByText('View Order Details');
        await expect(viewDetailsLinks.length).toBe(5);
    },
};

export const BodyEmpty: StoryObj<typeof OrderListBody> = {
    render: () => <OrderListBody orders={[]} />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(
            canvas.getByText("You haven't placed an order yet. Once you place an order the details will show up here.")
        ).toBeInTheDocument();
        await expect(canvas.getByRole('link', { name: 'Continue Shopping' })).toBeInTheDocument();
    },
};

export const BodyWithCustomEmptyMessage: StoryObj<typeof OrderListBody> = {
    render: () => <OrderListBody orders={[]} emptyMessage="No recent purchases found." />,
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('No recent purchases found.')).toBeInTheDocument();
    },
};
