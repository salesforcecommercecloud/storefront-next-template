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
import { waitForStorybookReady } from '@storybook/test-utils';
import { action } from 'storybook/actions';
import { useEffect, useRef, type ReactNode, type ReactElement } from 'react';
import { OrderList, type Order } from '../index';
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
            { productId: 'prod-1', productName: 'Classic Shirt', quantity: 1, imageUrl: heroNewArrivals },
            { productId: 'prod-2', productName: 'Dress Pants', quantity: 2, imageUrl: heroNewArrivals },
        ],
        pickupLocation: {
            name: 'Salesforce Foundations San Francisco',
            address: '415 Mission Street',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94105',
            pickupWindowStart: '2024-09-16',
            pickupWindowEnd: '2024-09-20',
        },
    },
    {
        orderNo: 'INV002',
        orderDate: '2024-09-12T14:00:00Z',
        status: 'new',
        statusLabel: 'New',
        total: 43.0,
        itemCount: 1,
        productItems: [{ productId: 'prod-3', productName: 'Summer Dress', quantity: 2, imageUrl: heroNewArrivals }],
    },
    {
        orderNo: 'INV003',
        orderDate: '2024-09-10T08:00:00Z',
        status: 'failed_with_reopen',
        statusLabel: 'Failed With Reopen',
        total: 54.0,
        itemCount: 4,
        productItems: [
            { productId: 'prod-4', productName: 'Item 1', quantity: 3, imageUrl: heroNewArrivals },
            { productId: 'prod-5', productName: 'Item 2', quantity: 2, imageUrl: heroNewArrivals },
            { productId: 'prod-6', productName: 'Item 3', quantity: 4, imageUrl: heroNewArrivals },
            { productId: 'prod-7', productName: 'Item 4', quantity: 1, imageUrl: heroNewArrivals },
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
            { productId: 'prod-8', productName: 'Cancelled Item 1', quantity: 2, imageUrl: heroNewArrivals },
            { productId: 'prod-9', productName: 'Cancelled Item 2', quantity: 3, imageUrl: heroNewArrivals },
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
            productName: `Product ${i + 1}`,
            quantity: i % 3 === 0 ? 2 : 1,
            imageUrl: heroNewArrivals,
        })),
    },
];

const singleOrder: Order[] = [
    {
        orderNo: 'INV001',
        orderDate: '2024-09-14T10:30:00Z',
        status: 'completed',
        statusLabel: 'Completed',
        total: 250.0,
        itemCount: 3,
        productItems: [
            { productId: 'prod-1', productName: 'Classic Shirt', quantity: 1, imageUrl: heroNewArrivals },
            { productId: 'prod-2', productName: 'Dress Pants', quantity: 1, imageUrl: heroNewArrivals },
            { productId: 'prod-3', productName: 'Summer Dress', quantity: 1, imageUrl: heroNewArrivals },
        ],
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
        onDownloadReceipt: {
            description: 'Callback when Download Receipt is clicked',
            action: 'downloadReceipt',
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
        onDownloadReceipt: action('downloadReceipt'),
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

export const WithDeliveredStatus: Story = {
    args: {
        title: 'Completed Orders',
        orders: [
            {
                orderNo: 'INV001',
                orderDate: '2024-09-01T09:00:00Z',
                status: 'completed',
                statusLabel: 'Completed',
                total: 150.0,
                itemCount: 2,
                productItems: [
                    { productId: 'prod-1', productName: 'Item 1', quantity: 1, imageUrl: heroNewArrivals },
                    { productId: 'prod-2', productName: 'Item 2', quantity: 1, imageUrl: heroNewArrivals },
                ],
            },
            {
                orderNo: 'INV002',
                orderDate: '2024-08-25T14:00:00Z',
                status: 'completed',
                statusLabel: 'Completed',
                total: 200.0,
                itemCount: 1,
                productItems: [{ productId: 'prod-3', productName: 'Item 3', quantity: 1, imageUrl: heroNewArrivals }],
            },
        ],
        onViewDetails: action('viewDetails'),
        onDownloadReceipt: action('downloadReceipt'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check that delivered status badges are rendered
        const deliveredBadges = canvas.getAllByText('Completed');
        await expect(deliveredBadges.length).toBe(2);

        // Check first badge has success styling
        const firstBadge = deliveredBadges[0].closest('span');
        await expect(firstBadge).toHaveClass('bg-order-status-completed');
    },
};

export const SingleOrder: Story = {
    args: {
        title: 'Recent Order',
        subtitle: 'Your most recent purchase',
        orders: singleOrder,
        onViewDetails: action('viewDetails'),
        onDownloadReceipt: action('downloadReceipt'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('$250.00')).toBeInTheDocument();
        await expect(canvas.getByText('Completed')).toBeInTheDocument();

        const viewDetailsLinks = canvas.getAllByText('View Order Details');
        await expect(viewDetailsLinks.length).toBe(1);
    },
};

export const EmptyState: Story = {
    args: {
        title: 'Order History',
        subtitle: 'View and track your orders',
        orders: [],
        onViewDetails: action('viewDetails'),
        onDownloadReceipt: action('downloadReceipt'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check empty message is displayed
        await expect(
            canvas.getByText('No orders found. Start shopping to see your order history!')
        ).toBeInTheDocument();

        // Check no View Order Details links exist
        const viewDetailsLinks = canvas.queryAllByText('View Order Details');
        await expect(viewDetailsLinks.length).toBe(0);
    },
};

export const CustomEmptyMessage: Story = {
    args: {
        title: 'Order History',
        orders: [],
        emptyMessage: 'You have no orders yet. Browse our catalog to get started!',
        onViewDetails: action('viewDetails'),
        onDownloadReceipt: action('downloadReceipt'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(
            canvas.getByText('You have no orders yet. Browse our catalog to get started!')
        ).toBeInTheDocument();
    },
};

export const WithoutSubtitle: Story = {
    args: {
        title: 'My Orders',
        orders: testOrders,
        onViewDetails: action('viewDetails'),
        onDownloadReceipt: action('downloadReceipt'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('heading', { level: 3 })).toHaveTextContent('My Orders');
        // Subtitle should not be present
        await expect(canvas.queryByText('View and track your orders')).not.toBeInTheDocument();
    },
};

export const ClickViewDetails: Story = {
    args: {
        title: 'Order History',
        orders: singleOrder,
        onViewDetails: action('viewDetails'),
        onDownloadReceipt: action('downloadReceipt'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const viewDetailsLink = canvas.getByText('View Order Details');
        await expect(viewDetailsLink).toBeInTheDocument();
        await userEvent.click(viewDetailsLink);
    },
};

export const MixedStatuses: Story = {
    args: {
        title: 'All Orders',
        subtitle: 'Orders with various statuses',
        orders: [
            {
                orderNo: 'INV001',
                orderDate: '2024-09-14T10:30:00Z',
                status: 'new',
                statusLabel: 'New',
                total: 100.0,
                itemCount: 1,
                productItems: [{ productId: 'prod-1', productName: 'Item 1', quantity: 1, imageUrl: heroNewArrivals }],
            },
            {
                orderNo: 'INV002',
                orderDate: '2024-09-10T09:00:00Z',
                status: 'completed',
                statusLabel: 'Completed',
                total: 200.0,
                itemCount: 2,
                productItems: [
                    { productId: 'prod-2', productName: 'Item 2', quantity: 1, imageUrl: heroNewArrivals },
                    { productId: 'prod-3', productName: 'Item 3', quantity: 1, imageUrl: heroNewArrivals },
                ],
            },
            {
                orderNo: 'INV003',
                orderDate: '2024-09-08T11:30:00Z',
                status: 'cancelled',
                statusLabel: 'Cancelled',
                total: 150.0,
                itemCount: 1,
                productItems: [{ productId: 'prod-4', productName: 'Item 4', quantity: 1, imageUrl: heroNewArrivals }],
            },
        ],
        onViewDetails: action('viewDetails'),
        onDownloadReceipt: action('downloadReceipt'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check all statuses are rendered
        await expect(canvas.getByText('New')).toBeInTheDocument();
        await expect(canvas.getByText('Completed')).toBeInTheDocument();
        await expect(canvas.getByText('Cancelled')).toBeInTheDocument();

        // Check cancelled badge has destructive styling
        const cancelledBadge = canvas.getByText('Cancelled').closest('span');
        await expect(cancelledBadge).toHaveClass('bg-order-status-cancelled');
    },
};

export const WithPickupLocation: Story = {
    args: {
        title: 'Orders with Pickup',
        subtitle: 'Orders ready for in-store pickup',
        orders: [testOrders[0]], // First order has pickup location
        onViewDetails: action('viewDetails'),
        onDownloadReceipt: action('downloadReceipt'),
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

export const WithManyProducts: Story = {
    args: {
        title: 'Large Order',
        subtitle: 'Order with many items showing overflow',
        orders: [testOrders[4]], // Last order has 18 items
        maxThumbnails: 12,
        onViewDetails: action('viewDetails'),
        onDownloadReceipt: action('downloadReceipt'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check that overflow indicator is shown (+6 for 18 items with max 12)
        await expect(canvas.getByText('+6')).toBeInTheDocument();
    },
};
