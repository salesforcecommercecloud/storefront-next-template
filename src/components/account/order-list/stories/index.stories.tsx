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

// Test data for stories
// Supported statuses: 'new', 'completed', 'cancelled'
const testOrders: Order[] = [
    { orderNo: 'INV001', status: 'new', method: 'Credit Card', amount: 54.0 },
    { orderNo: 'INV002', status: 'new', method: 'Credit Card', amount: 43.0 },
    { orderNo: 'INV003', status: 'completed', method: 'Credit Card', amount: 48.38 },
    { orderNo: 'INV004', status: 'cancelled', method: 'Credit Card', amount: 95.92 },
    { orderNo: 'INV005', status: 'completed', method: 'Credit Card', amount: 250.0 },
];

const singleOrder: Order[] = [{ orderNo: 'INV001', status: 'completed', method: 'Credit Card', amount: 250.0 }];

const meta: Meta<typeof OrderList> = {
    title: 'ACCOUNT/Order List',
    component: OrderList,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'A reusable component to display a list of customer orders with status badges, payment methods, and action buttons.',
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
        onViewDetails: {
            description: 'Callback when View Details button is clicked',
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
        const heading = canvas.getByRole('heading', { level: 1 });
        await expect(heading).toHaveTextContent('Order History');

        // Check subtitle is rendered
        await expect(canvas.getByText('View and track your orders')).toBeInTheDocument();

        // Check orders are rendered
        await expect(canvas.getByText('INV001')).toBeInTheDocument();
        await expect(canvas.getByText('INV002')).toBeInTheDocument();

        // Check View Details buttons exist
        const viewDetailsButtons = canvas.getAllByRole('button', { name: /view details/i });
        await expect(viewDetailsButtons.length).toBe(5);
    },
};

export const WithCompletedStatus: Story = {
    args: {
        title: 'Completed Orders',
        orders: [
            { orderNo: 'INV001', status: 'completed', method: 'Credit Card', amount: 150.0 },
            { orderNo: 'INV002', status: 'completed', method: 'PayPal', amount: 200.0 },
        ],
        onViewDetails: action('viewDetails'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check that completed status badges are rendered with success styling
        const completedBadges = canvas.getAllByText('completed');
        await expect(completedBadges.length).toBe(2);

        // Check first badge has success class
        const firstBadge = completedBadges[0].closest('span');
        await expect(firstBadge).toHaveClass('bg-success/85');
    },
};

export const SingleOrder: Story = {
    args: {
        title: 'Recent Order',
        subtitle: 'Your most recent purchase',
        orders: singleOrder,
        onViewDetails: action('viewDetails'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('INV001')).toBeInTheDocument();
        await expect(canvas.getByText('$250.00')).toBeInTheDocument();

        const viewDetailsButtons = canvas.getAllByRole('button', { name: /view details/i });
        await expect(viewDetailsButtons.length).toBe(1);
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

        // Check empty message is displayed
        await expect(
            canvas.getByText('No orders found. Start shopping to see your order history!')
        ).toBeInTheDocument();

        // Check no View Details buttons exist
        const viewDetailsButtons = canvas.queryAllByRole('button', { name: /view details/i });
        await expect(viewDetailsButtons.length).toBe(0);
    },
};

export const CustomEmptyMessage: Story = {
    args: {
        title: 'Order History',
        orders: [],
        emptyMessage: 'You have no orders yet. Browse our catalog to get started!',
        onViewDetails: action('viewDetails'),
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
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('My Orders');
        // Subtitle should not be present
        await expect(canvas.queryByText('View and track your orders')).not.toBeInTheDocument();
    },
};

export const ClickViewDetails: Story = {
    args: {
        title: 'Order History',
        orders: singleOrder,
        onViewDetails: action('viewDetails'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        const viewDetailsButton = canvas.getByRole('button', { name: /view details/i });
        await userEvent.click(viewDetailsButton);

        // The action logger will capture the click
        await expect(viewDetailsButton).toBeInTheDocument();
    },
};

export const MixedStatuses: Story = {
    args: {
        title: 'All Orders',
        subtitle: 'Orders with various statuses',
        orders: [
            { orderNo: 'INV001', status: 'new', method: 'Credit Card', amount: 100.0 },
            { orderNo: 'INV002', status: 'completed', method: 'PayPal', amount: 200.0 },
            { orderNo: 'INV003', status: 'cancelled', method: 'Credit Card', amount: 150.0 },
        ],
        onViewDetails: action('viewDetails'),
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Check all statuses are rendered with correct styling
        const newBadge = canvas.getByText('new').closest('span');
        await expect(newBadge).toHaveClass('bg-primary/20');

        const completedBadge = canvas.getByText('completed').closest('span');
        await expect(completedBadge).toHaveClass('bg-success/85');

        const cancelledBadge = canvas.getByText('cancelled').closest('span');
        await expect(cancelledBadge).toHaveClass('bg-destructive/20');
    },
};

export const Mobile: Story = {
    ...Default,
    globals: {
        viewport: 'mobile2',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Order History');
        await expect(canvas.getByText('INV001')).toBeInTheDocument();
    },
};

export const Tablet: Story = {
    ...Default,
    globals: {
        viewport: 'tablet',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Order History');
        await expect(canvas.getByText('INV001')).toBeInTheDocument();
    },
};

export const Desktop: Story = {
    ...Default,
    globals: {
        viewport: 'desktop',
    },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('heading', { level: 1 })).toHaveTextContent('Order History');
        await expect(canvas.getByText('INV001')).toBeInTheDocument();
    },
};
